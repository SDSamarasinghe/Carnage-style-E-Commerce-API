import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';

import type { SuperAdminSeedConfig } from '@/config/configuration';
import { User, type UserDocument } from '@/modules/users/schemas/user.schema';

@Injectable()
export class SuperAdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminSeeder.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const seed = this.config.getOrThrow<SuperAdminSeedConfig>('superAdmin');
    if (!seed.password) {
      this.logger.warn('SUPER_ADMIN_PASSWORD is not set — skipping super-admin seed.');
      return;
    }

    const email = seed.email.toLowerCase();
    const existing = await this.userModel.findOne({ email }).select('_id role').lean().exec();
    if (existing) {
      // Promote to super_admin in case the same email exists with a lower role
      if (existing.role !== 'super_admin') {
        await this.userModel.updateOne(
          { _id: existing._id },
          { role: 'super_admin', isActive: true, emailVerified: true },
        );
        this.logger.log(`Promoted ${email} to super_admin.`);
      }
      return;
    }

    const passwordHash = await bcrypt.hash(seed.password, 12);
    await this.userModel.create({
      firstName: seed.firstName,
      lastName: seed.lastName,
      email,
      passwordHash,
      role: 'super_admin',
      emailVerified: true,
      isActive: true,
    });
    this.logger.log(`Seeded super-admin: ${email}`);
  }
}
