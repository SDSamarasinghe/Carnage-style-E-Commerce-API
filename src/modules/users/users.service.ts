import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { UpdateQuery } from 'mongoose';
import { Model, Types } from 'mongoose';

import type { Role } from '@/common/types/auth.types';

import { User, type UserDocument } from './schemas/user.schema';

interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role?: Role;
  assignedBranch?: string | Types.ObjectId;
  emailVerified?: boolean;
}

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(input: CreateUserInput): Promise<UserDocument> {
    const existing = await this.userModel
      .findOne({ email: input.email.toLowerCase() })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const created = await this.userModel.create({
      ...input,
      email: input.email.toLowerCase(),
      role: input.role ?? 'customer',
    });
    return created;
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash +refreshTokenHash')
      .exec();
  }

  findActiveByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase(), isActive: true })
      .select('+passwordHash +refreshTokenHash')
      .exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return this.userModel.findById(id).exec();
  }

  findByIdWithSecrets(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) return Promise.resolve(null);
    return this.userModel.findById(id).select('+refreshTokenHash +passwordHash').exec();
  }

  async setRefreshTokenHash(userId: string, hash: string | null): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      hash ? { refreshTokenHash: hash, lastLoginAt: new Date() } : { $unset: { refreshTokenHash: 1 } },
    );
  }

  async setPassword(userId: string, passwordHash: string): Promise<void> {
    const result = await this.userModel.updateOne(
      { _id: userId },
      {
        passwordHash,
        $unset: { passwordResetToken: 1, passwordResetExpiresAt: 1, refreshTokenHash: 1 },
      },
    );
    if (result.matchedCount === 0) throw new NotFoundException('User not found');
  }

  setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<unknown> {
    return this.userModel
      .updateOne({ _id: userId }, { passwordResetToken: token, passwordResetExpiresAt: expiresAt })
      .exec();
  }

  findByResetToken(token: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        passwordResetToken: token,
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .select('+passwordResetToken +passwordResetExpiresAt')
      .exec();
  }

  async update(userId: string, data: UpdateQuery<User>): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, data, { new: true })
      .exec();
  }

  async findAll(
    filter: Record<string, unknown> = {},
    page = 1,
    limit = 20,
  ): Promise<{ data: UserDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.userModel.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }

  async deactivate(userId: string): Promise<void> {
    const result = await this.userModel.updateOne(
      { _id: userId },
      { isActive: false },
    );
    if (result.matchedCount === 0) throw new NotFoundException('User not found');
  }
}
