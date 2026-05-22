import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';

import { CartService } from '@/modules/cart/cart.service';
import { CouponsService } from '@/modules/coupons/coupons.service';
import { InventoryService } from '@/modules/inventory/inventory.service';
import { BranchesService } from '@/modules/branches/branches.service';
import { ProductsModule } from '@/modules/products/products.module';
import { Product, type ProductDocument } from '@/modules/products/schemas/product.schema';
import type { AuthenticatedUser } from '@/common/types/auth.types';

import { Order, type OrderDocument } from './schemas/order.schema';
import type { CreateOrderDto, UpdateOrderStatusDto, AssignBranchDto } from './dto/order.dto';

let orderCounter = 0;

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  orderCounter += 1;
  const seq = String(orderCounter).padStart(5, '0');
  return `CRN-${year}-${seq}`;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly cartService: CartService,
    private readonly couponsService: CouponsService,
    private readonly inventoryService: InventoryService,
    private readonly branchesService: BranchesService,
  ) {}

  async placeOrder(dto: CreateOrderDto, user?: AuthenticatedUser): Promise<OrderDocument> {
    const userId = user?.id;
    const cart = await this.cartService.getCart(userId, dto.guestId);

    if (!cart.items.length) throw new BadRequestException('Cart is empty');

    // Resolve coupon
    let discountAmount = 0;
    let couponSnapshot: { code: string; type: string; value: number } | undefined;
    if (dto.couponCode || cart.coupon) {
      try {
        const subtotal = cart.items.reduce((s, i) => s + i.priceSnapshot * i.quantity, 0);
        const couponCode = dto.couponCode ?? (cart.coupon as any)?.code;
        if (couponCode) {
          const coupon = await this.couponsService.validate(couponCode, subtotal);
          discountAmount = this.couponsService.calculateDiscount(coupon, subtotal);
          couponSnapshot = { code: coupon.code, type: coupon.type, value: coupon.value };
          await this.couponsService.incrementUsage(String(coupon._id));
        }
      } catch {
        // Non-blocking: if coupon validation fails, continue without it
      }
    }

    const subtotal = cart.items.reduce((s, i) => s + i.priceSnapshot * i.quantity, 0);
    const shippingFee = subtotal >= 5000 ? 0 : 350;
    const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

    // Find fulfilling branch
    const items = cart.items.map((i) => ({
      productId: String(i.product),
      variantSku: i.variantSku,
      quantity: i.quantity,
    }));

    const allBranches = await this.branchesService.findAll(true);
    const branchIds = allBranches.map((b) => String(b._id));
    const fulfillingBranchId = await this.inventoryService.findFulfillingBranch(items, branchIds);

    // Build order items with product snapshots
    const orderItems = await Promise.all(
      cart.items.map(async (cartItem) => {
        const product = await this.productModel.findById(cartItem.product).lean().exec();
        const variant = product?.variants?.find((v) => v.sku === cartItem.variantSku);
        return {
          product: cartItem.product,
          name: product?.name ?? 'Unknown',
          image: product?.images?.[0]?.url,
          variantSku: cartItem.variantSku,
          variantSize: variant?.size,
          variantColor: variant?.color?.name,
          quantity: cartItem.quantity,
          unitPrice: cartItem.priceSnapshot,
          lineTotal: cartItem.priceSnapshot * cartItem.quantity,
        };
      }),
    );

    const paymentStatus =
      dto.paymentMethod === 'cod' ? 'pending'
      : dto.stripePaymentIntentId ? 'paid'
      : 'pending';

    const session = await this.connection.startSession();
    let order: OrderDocument;
    try {
      await session.withTransaction(async () => {
        // Decrement inventory if fulfilling branch found
        if (fulfillingBranchId) {
          await this.inventoryService.decrementStock(fulfillingBranchId, items, session);
        }

        order = await this.orderModel.create(
          [
            {
              orderNumber: generateOrderNumber(),
              user: userId ? new Types.ObjectId(userId) : null,
              guestInfo: !userId ? dto.guestInfo : undefined,
              items: orderItems,
              fulfillingBranch: fulfillingBranchId
                ? new Types.ObjectId(fulfillingBranchId)
                : undefined,
              shippingAddress: dto.shippingAddress,
              billingAddress: dto.billingAddress ?? dto.shippingAddress,
              subtotal,
              discountAmount,
              shippingFee,
              taxAmount: 0,
              totalAmount,
              coupon: couponSnapshot,
              paymentMethod: dto.paymentMethod,
              paymentStatus,
              stripePaymentIntentId: dto.stripePaymentIntentId,
              customerNote: dto.customerNote,
              statusHistory: [
                { status: 'pending', changedBy: userId ?? 'guest', changedAt: new Date() },
              ],
            },
          ],
          { session },
        ).then((docs) => docs[0]!);
      });
    } finally {
      await session.endSession();
    }

    // Clear cart after successful order
    await this.cartService.clearCart(userId, dto.guestId);

    return order!;
  }

  async findByUser(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: OrderDocument[]; meta: { total: number; page: number; limit: number; pages: number } }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { user: new Types.ObjectId(userId) };
    const [data, total] = await Promise.all([
      this.orderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findByOrderNumber(orderNumber: string, userId?: string): Promise<OrderDocument> {
    const order = await this.orderModel
      .findOne({ orderNumber })
      .populate('fulfillingBranch', 'name code city')
      .exec();
    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.user && String(order.user) !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return order;
  }

  async cancelOrder(orderNumber: string, userId: string): Promise<OrderDocument> {
    const order = await this.findByOrderNumber(orderNumber, userId);
    const cancellable = ['pending', 'confirmed'];
    if (!cancellable.includes(order.orderStatus)) {
      throw new BadRequestException('Order cannot be cancelled at this stage');
    }
    const fulfillingBranchId = order.fulfillingBranch ? String(order.fulfillingBranch) : null;
    if (fulfillingBranchId) {
      await this.inventoryService.restoreStock(
        fulfillingBranchId,
        order.items.map((i) => ({
          productId: String(i.product),
          variantSku: i.variantSku,
          quantity: i.quantity,
        })),
      );
    }
    order.orderStatus = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      changedBy: userId,
      changedAt: new Date(),
    });
    await order.save();
    return order;
  }

  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    changedBy: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');
    order.orderStatus = dto.status;
    order.statusHistory.push({
      status: dto.status,
      changedBy,
      changedAt: new Date(),
      note: dto.note,
    });
    if (dto.trackingNumber) order.trackingNumber = dto.trackingNumber;
    if (dto.courier) order.courier = dto.courier;
    await order.save();
    return order;
  }

  async findAll(
    filter: Record<string, unknown> = {},
    page = 1,
    limit = 20,
  ): Promise<{ data: OrderDocument[]; meta: { total: number; page: number; limit: number; pages: number } }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('user', 'firstName lastName email')
        .populate('fulfillingBranch', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findByBranch(
    branchId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: OrderDocument[]; meta: { total: number; page: number; limit: number; pages: number } }> {
    return this.findAll({ fulfillingBranch: new Types.ObjectId(branchId) }, page, limit);
  }

  async assignBranch(orderId: string, dto: AssignBranchDto): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) throw new NotFoundException('Order not found');
    order.fulfillingBranch = new Types.ObjectId(dto.branchId);
    await order.save();
    return order;
  }

  async updatePaymentStatus(
    stripePaymentIntentId: string,
    paymentStatus: 'paid' | 'failed' | 'refunded',
  ): Promise<void> {
    await this.orderModel.updateOne(
      { stripePaymentIntentId },
      {
        paymentStatus,
        ...(paymentStatus === 'paid' ? { 'paymentDetails.paidAt': new Date() } : {}),
      },
    );
  }
}
