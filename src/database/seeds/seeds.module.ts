import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Branch, BranchSchema } from '@/modules/branches/schemas/branch.schema';
import { Category, CategorySchema } from '@/modules/categories/schemas/category.schema';
import { Collection, CollectionSchema } from '@/modules/collections/schemas/collection.schema';
import { Inventory, InventorySchema } from '@/modules/inventory/schemas/inventory.schema';
import { Product, ProductSchema } from '@/modules/products/schemas/product.schema';
import { User, UserSchema } from '@/modules/users/schemas/user.schema';
import { UsersModule } from '@/modules/users/users.module';

import { BranchesSeeder } from './branches.seed';
import { DataSeeder } from './data.seed';
import { SuperAdminSeeder } from './super-admin.seed';
import { UsersSeeder } from './users.seed';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: Branch.name, schema: BranchSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Product.name, schema: ProductSchema },
      { name: Inventory.name, schema: InventorySchema },
      { name: Collection.name, schema: CollectionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [SuperAdminSeeder, DataSeeder, BranchesSeeder, UsersSeeder],
})
export class SeedsModule {}
