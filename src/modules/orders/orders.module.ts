import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BranchesModule } from '@/modules/branches/branches.module';
import { CartModule } from '@/modules/cart/cart.module';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { ProductsModule } from '@/modules/products/products.module';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    CartModule,
    CouponsModule,
    InventoryModule,
    BranchesModule,
    ProductsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
