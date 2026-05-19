import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';

import type {
  JwtAccessPayload,
  JwtRefreshPayload,
  Role,
} from '@/common/types/auth.types';
import type { JwtConfig } from '@/config/configuration';
import { UsersService } from '@/modules/users/users.service';
import type { UserDocument } from '@/modules/users/schemas/user.schema';

import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

const BCRYPT_ROUNDS = 12;

export interface AuthSession {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: Role;
  assignedBranch?: string;
  emailVerified: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ---------- Public flows ----------

  async register(dto: RegisterDto): Promise<AuthSession> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: 'customer',
    });
    return this.issueSession(user);
  }

  async login(dto: LoginDto): Promise<AuthSession> {
    const user = await this.users.findActiveByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid email or password');

    return this.issueSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    let payload: JwtRefreshPayload;
    try {
      const jwtCfg = this.config.getOrThrow<JwtConfig>('jwt');
      payload = await this.jwt.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: jwtCfg.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.users.findByIdWithSecrets(payload.sub);
    if (!user || !user.isActive || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) {
      // Token reuse — defensively invalidate the session
      await this.users.setRefreshTokenHash(user.id, null);
      throw new UnauthorizedException('Refresh token revoked');
    }

    return this.issueSession(user);
  }

  async logout(userId: string): Promise<void> {
    await this.users.setRefreshTokenHash(userId, null);
  }

  async forgotPassword(email: string): Promise<{ token: string | null }> {
    // Always behave the same way to prevent email enumeration.
    const user = await this.users.findByEmail(email);
    if (!user || !user.isActive) {
      return { token: null };
    }
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes
    await this.users.setPasswordResetToken(user.id, token, expiresAt);
    this.logger.log(`[dev] password-reset token for ${email}: ${token}`);
    return { token };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.users.findByResetToken(dto.token);
    if (!user) throw new BadRequestException('Reset link is invalid or expired');
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.users.setPassword(user.id, passwordHash);
  }

  // ---------- Helpers ----------

  async issueSession(user: UserDocument): Promise<AuthSession> {
    const jwtCfg = this.config.getOrThrow<JwtConfig>('jwt');
    const tokenId = crypto.randomBytes(16).toString('hex');

    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      assignedBranch: user.assignedBranch?.toString(),
    };
    const refreshPayload: JwtRefreshPayload = { sub: user.id, tokenId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: jwtCfg.accessSecret,
        expiresIn: jwtCfg.accessExpiresIn,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: jwtCfg.refreshSecret,
        expiresIn: jwtCfg.refreshExpiresIn,
      }),
    ]);

    const refreshHash = await bcrypt.hash(refreshToken, BCRYPT_ROUNDS);
    await this.users.setRefreshTokenHash(user.id, refreshHash);

    return {
      user: this.toSafeUser(user),
      accessToken,
      refreshToken,
    };
  }

  toSafeUser(user: UserDocument): SafeUser {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      assignedBranch: user.assignedBranch?.toString(),
      emailVerified: user.emailVerified,
    };
  }
}
