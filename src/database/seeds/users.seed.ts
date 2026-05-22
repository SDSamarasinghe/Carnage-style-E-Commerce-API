import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';

import { User, type UserDocument } from '@/modules/users/schemas/user.schema';
import { Branch, type BranchDocument } from '@/modules/branches/schemas/branch.schema';

interface SampleUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'customer' | 'branch_admin';
  assignedBranch?: string; // branch code for branch_admin
}

@Injectable()
export class UsersSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersSeeder.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedUsers();
  }

  private async seedUsers(): Promise<void> {
    const sampleUsers: SampleUser[] = [
      // Super admin is seeded separately by SuperAdminSeeder (driven by env config).
      // Customers
      {
        email: 'customer1@carnage.lk',
        password: 'Customer123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+94771111111',
        role: 'customer',
      },
      {
        email: 'customer2@carnage.lk',
        password: 'Customer123!',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+94772222222',
        role: 'customer',
      },
      {
        email: 'customer3@carnage.lk',
        password: 'Customer123!',
        firstName: 'Michael',
        lastName: 'Johnson',
        phone: '+94773333333',
        role: 'customer',
      },
      {
        email: 'customer4@carnage.lk',
        password: 'Customer123!',
        firstName: 'Sarah',
        lastName: 'Williams',
        phone: '+94774444444',
        role: 'customer',
      },
      // Branch Admins (will be assigned to branches after fetching them)
      {
        email: 'branchadmin1@carnage.lk',
        password: 'BranchAdmin123!',
        firstName: 'Branch',
        lastName: 'Manager One',
        phone: '+94775555555',
        role: 'branch_admin',
        assignedBranch: 'COLOMBO_HQ',
      },
      {
        email: 'branchadmin2@carnage.lk',
        password: 'BranchAdmin123!',
        firstName: 'Branch',
        lastName: 'Manager Two',
        phone: '+94776666666',
        role: 'branch_admin',
        assignedBranch: 'GALLE_STORE',
      },
      {
        email: 'branchadmin3@carnage.lk',
        password: 'BranchAdmin123!',
        firstName: 'Branch',
        lastName: 'Manager Three',
        phone: '+94777777777',
        role: 'branch_admin',
        assignedBranch: 'KANDY_STORE',
      },
    ];

    for (const userData of sampleUsers) {
      const email = userData.email.toLowerCase();
      const existingUser = await this.userModel
        .findOne({ email })
        .select('_id role')
        .lean()
        .exec();

      if (existingUser) {
        this.logger.debug(`User ${email} already exists — skipping.`);
        continue;
      }

      const passwordHash = await bcrypt.hash(userData.password, 12);

      let assignedBranchId: string | undefined;

      // For branch_admin, fetch the branch by code and assign it
      if (userData.role === 'branch_admin' && userData.assignedBranch) {
        const branch = await this.branchModel
          .findOne({ code: userData.assignedBranch })
          .select('_id')
          .lean()
          .exec();

        if (branch) {
          assignedBranchId = branch._id.toString();
        } else {
          this.logger.warn(`Branch with code ${userData.assignedBranch} not found — user will not be assigned to a branch.`);
        }
      }

      const newUser = await this.userModel.create({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email,
        passwordHash,
        phone: userData.phone,
        role: userData.role,
        emailVerified: true,
        isActive: true,
        ...(assignedBranchId && { assignedBranch: assignedBranchId }),
      });

      this.logger.log(
        `✓ Seeded ${userData.role}: ${email} | Password: ${userData.password}${
          assignedBranchId ? ` | Assigned to: ${userData.assignedBranch}` : ''
        }`,
      );
    }

    this.logger.log('User seeding completed.');
  }
}
