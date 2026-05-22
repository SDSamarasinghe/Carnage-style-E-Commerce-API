import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Branch, BranchSchema } from '@/modules/branches/schemas/branch.schema';
import { Category, CategorySchema } from '@/modules/categories/schemas/category.schema';
import { Inventory, InventorySchema } from '@/modules/inventory/schemas/inventory.schema';
import { Product, ProductSchema } from '@/modules/products/schemas/product.schema';
import { UsersModule } from '@/modules/users/users.module';

import { DataSeeder } from './data.seed';
import { SuperAdminSeeder } from './super-admin.seed';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Branch.name, schema: BranchSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema },
      { name: Inventory.name, schema: InventorySchema },
    ]),
  ],
  providers: [SuperAdminSeeder, DataSeeder],
})
export class SeedsModule {}
