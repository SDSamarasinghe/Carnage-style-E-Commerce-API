import { Module } from '@nestjs/common';

import { UsersModule } from '@/modules/users/users.module';

import { SuperAdminSeeder } from './super-admin.seed';

@Module({
  imports: [UsersModule],
  providers: [SuperAdminSeeder],
})
export class SeedsModule {}
