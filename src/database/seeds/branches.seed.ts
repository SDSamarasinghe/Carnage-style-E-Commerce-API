import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Branch, type BranchDocument } from '@/modules/branches/schemas/branch.schema';

interface SampleBranch {
  name: string;
  code: string;
  address: string;
  city: string;
  district: string;
  phone?: string;
  email?: string;
  geoLocation?: { lat: number; lng: number };
  openingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
}

@Injectable()
export class BranchesSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(BranchesSeeder.name);

  constructor(
    @InjectModel(Branch.name) private readonly branchModel: Model<BranchDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedBranches();
  }

  private async seedBranches(): Promise<void> {
    const sampleBranches: SampleBranch[] = [
      {
        name: 'Colombo Head Quarters',
        code: 'COLOMBO_HQ',
        address: '123 Galle Road, Colombo 3',
        city: 'Colombo',
        district: 'Colombo',
        phone: '+94112345678',
        email: 'colombo@carnage.lk',
        geoLocation: {
          lat: 6.9271,
          lng: 80.7744,
        },
        openingHours: {
          monday: '10:00 AM - 9:00 PM',
          tuesday: '10:00 AM - 9:00 PM',
          wednesday: '10:00 AM - 9:00 PM',
          thursday: '10:00 AM - 9:00 PM',
          friday: '10:00 AM - 9:00 PM',
          saturday: '10:00 AM - 9:00 PM',
          sunday: '12:00 PM - 8:00 PM',
        },
      },
      {
        name: 'Galle Store',
        code: 'GALLE_STORE',
        address: '456 Main Street, Galle',
        city: 'Galle',
        district: 'Galle',
        phone: '+94912234567',
        email: 'galle@carnage.lk',
        geoLocation: {
          lat: 6.0535,
          lng: 80.2210,
        },
        openingHours: {
          monday: '10:00 AM - 8:00 PM',
          tuesday: '10:00 AM - 8:00 PM',
          wednesday: '10:00 AM - 8:00 PM',
          thursday: '10:00 AM - 8:00 PM',
          friday: '10:00 AM - 8:00 PM',
          saturday: '10:00 AM - 8:00 PM',
          sunday: '12:00 PM - 7:00 PM',
        },
      },
      {
        name: 'Kandy Store',
        code: 'KANDY_STORE',
        address: '789 Peradeniya Road, Kandy',
        city: 'Kandy',
        district: 'Kandy',
        phone: '+94812123456',
        email: 'kandy@carnage.lk',
        geoLocation: {
          lat: 7.2906,
          lng: 80.6337,
        },
        openingHours: {
          monday: '10:00 AM - 8:00 PM',
          tuesday: '10:00 AM - 8:00 PM',
          wednesday: '10:00 AM - 8:00 PM',
          thursday: '10:00 AM - 8:00 PM',
          friday: '10:00 AM - 8:00 PM',
          saturday: '10:00 AM - 8:00 PM',
          sunday: '12:00 PM - 7:00 PM',
        },
      },
      {
        name: 'Negombo Store',
        code: 'NEGOMBO_STORE',
        address: '321 Church Road, Negombo',
        city: 'Negombo',
        district: 'Gampaha',
        phone: '+94312012345',
        email: 'negombo@carnage.lk',
        geoLocation: {
          lat: 7.2081,
          lng: 79.8393,
        },
        openingHours: {
          monday: '10:00 AM - 9:00 PM',
          tuesday: '10:00 AM - 9:00 PM',
          wednesday: '10:00 AM - 9:00 PM',
          thursday: '10:00 AM - 9:00 PM',
          friday: '10:00 AM - 9:00 PM',
          saturday: '10:00 AM - 9:00 PM',
          sunday: '12:00 PM - 8:00 PM',
        },
      },
      {
        name: 'Jaffna Store',
        code: 'JAFFNA_STORE',
        address: '654 KKS Road, Jaffna',
        city: 'Jaffna',
        district: 'Jaffna',
        phone: '+94212234567',
        email: 'jaffna@carnage.lk',
        geoLocation: {
          lat: 9.6615,
          lng: 80.7855,
        },
        openingHours: {
          monday: '10:00 AM - 7:00 PM',
          tuesday: '10:00 AM - 7:00 PM',
          wednesday: '10:00 AM - 7:00 PM',
          thursday: '10:00 AM - 7:00 PM',
          friday: '10:00 AM - 7:00 PM',
          saturday: '10:00 AM - 7:00 PM',
          sunday: '12:00 PM - 6:00 PM',
        },
      },
    ];

    for (const branchData of sampleBranches) {
      const existingBranch = await this.branchModel
        .findOne({ code: branchData.code })
        .select('_id')
        .lean()
        .exec();

      if (existingBranch) {
        this.logger.debug(`Branch ${branchData.code} already exists — skipping.`);
        continue;
      }

      await this.branchModel.create({
        ...branchData,
        isActive: true,
      });

      this.logger.log(`✓ Seeded branch: ${branchData.name} (${branchData.code})`);
    }

    this.logger.log('Branch seeding completed.');
  }
}
