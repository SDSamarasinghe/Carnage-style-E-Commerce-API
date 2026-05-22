import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Product, type ProductDocument } from '@/modules/products/schemas/product.schema';
import { CouponsService } from '@/modules/coupons/coupons.service';

import { Cart, type CartDocument } from './schemas/cart.schema';
import type { AddToCartDto, ApplyCouponDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly couponsService: CouponsService,
  ) {}

  private async findOrCreate(userId?: string, guestId?: string): Promise<CartDocument> {
    const filter = userId
      ? { user: new Types.ObjectId(userId) }
      : { guestId, user: null };

    let cart = await this.cartModel.findOne(filter).exec();
    if (!cart) {
      cart = await this.cartModel.create(
        userId
          ? { user: new Types.ObjectId(userId), items: [] }
          : { guestId, items: [] },
      );
    }
    return cart;
  }

  async getCart(userId?: string, guestId?: string): Promise<CartDocument> {
    const cart = await this.findOrCreate(userId, guestId);
    return cart.populate([
      { path: 'items.product', select: 'name slug images basePrice compareAtPrice variants' },
      { path: 'coupon', select: 'code type value minOrderAmount maxDiscountAmount' },
    ]);
  }

  async addItem(dto: AddToCartDto, userId?: string, guestId?: string): Promise<CartDocument> {
    const product = await this.productModel.findById(dto.productId).lean().exec() as ProductDocument | null;
    if (!product) throw new NotFoundException('Product not found');

    const variant = product.variants?.find((v) => v.sku === dto.variantSku);
    if (!variant) throw new BadRequestException('Variant not found');

    const price = product.basePrice + (variant.additionalPrice ?? 0);
    const cart = await this.findOrCreate(userId, guestId);

    const existing = cart.items.find(
      (i) => String(i.product) === dto.productId && i.variantSku === dto.variantSku,
    );
    if (existing) {
      existing.quantity += dto.quantity ?? 1;
    } else {
      cart.items.push({
        product: new Types.ObjectId(dto.productId),
        variantSku: dto.variantSku,
        quantity: dto.quantity ?? 1,
        priceSnapshot: price,
      });
    }
    await cart.save();
    return this.getCart(userId, guestId);
  }

  async updateItem(dto: UpdateCartItemDto, userId?: string, guestId?: string): Promise<CartDocument> {
    const cart = await this.findOrCreate(userId, guestId);
    const index = cart.items.findIndex(
      (i) => String(i.product) === dto.productId && i.variantSku === dto.variantSku,
    );
    if (index === -1) throw new NotFoundException('Item not in cart');
    if (dto.quantity === 0) {
      cart.items.splice(index, 1);
    } else {
      cart.items[index].quantity = dto.quantity;
    }
    await cart.save();
    return this.getCart(userId, guestId);
  }

  async removeItem(productId: string, variantSku: string, userId?: string, guestId?: string): Promise<CartDocument> {
    return this.updateItem({ productId, variantSku, quantity: 0 }, userId, guestId);
  }

  async applyCoupon(dto: ApplyCouponDto, subtotal: number, userId?: string, guestId?: string): Promise<CartDocument> {
    const coupon = await this.couponsService.validate(dto.code, subtotal);
    const cart = await this.findOrCreate(userId, guestId);
    cart.coupon = coupon._id as Types.ObjectId;
    await cart.save();
    return this.getCart(userId, guestId);
  }

  async removeCoupon(userId?: string, guestId?: string): Promise<CartDocument> {
    const cart = await this.findOrCreate(userId, guestId);
    cart.coupon = null;
    await cart.save();
    return this.getCart(userId, guestId);
  }

  async mergeGuestCart(userId: string, guestId: string): Promise<CartDocument> {
    const guestCart = await this.cartModel.findOne({ guestId, user: null }).exec();
    if (!guestCart || guestCart.items.length === 0) {
      return this.getCart(userId);
    }

    const userCart = await this.findOrCreate(userId);
    for (const item of guestCart.items) {
      const exists = userCart.items.find(
        (i) => String(i.product) === String(item.product) && i.variantSku === item.variantSku,
      );
      if (exists) {
        exists.quantity += item.quantity;
      } else {
        userCart.items.push({ ...item });
      }
    }
    if (!userCart.coupon && guestCart.coupon) {
      userCart.coupon = guestCart.coupon;
    }
    await userCart.save();
    await this.cartModel.deleteOne({ _id: guestCart._id });
    return this.getCart(userId);
  }

  async clearCart(userId?: string, guestId?: string): Promise<void> {
    const filter = userId
      ? { user: new Types.ObjectId(userId) }
      : { guestId, user: null };
    await this.cartModel.updateOne(filter, { items: [], coupon: null });
  }

  computeTotals(cart: CartDocument, discountAmount = 0): {
    subtotal: number;
    discount: number;
    shippingFee: number;
    total: number;
  } {
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.priceSnapshot * item.quantity,
      0,
    );
    const shippingFee = subtotal >= 5000 ? 0 : 350; // free shipping over LKR 5000
    const total = Math.max(0, subtotal - discountAmount + shippingFee);
    return { subtotal, discount: discountAmount, shippingFee, total };
  }
}
