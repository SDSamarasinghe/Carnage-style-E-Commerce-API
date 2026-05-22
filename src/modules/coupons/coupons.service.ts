import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Coupon, type CouponDocument } from './schemas/coupon.schema';
import type { CreateCouponDto } from './dto/create-coupon.dto';
import type { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private readonly couponModel: Model<CouponDocument>,
  ) {}

  async create(dto: CreateCouponDto): Promise<CouponDocument> {
    const exists = await this.couponModel.findOne({ code: dto.code.toUpperCase() }).lean().exec();
    if (exists) throw new BadRequestException('Coupon code already exists');
    return this.couponModel.create({ ...dto, code: dto.code.toUpperCase() });
  }

  findAll(): Promise<CouponDocument[]> {
    return this.couponModel.find().sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<CouponDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Coupon not found');
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async findByCode(code: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findOne({ code: code.toUpperCase() }).exec();
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  async validate(code: string, orderTotal: number): Promise<CouponDocument> {
    const coupon = await this.findByCode(code);
    if (!coupon.isActive) throw new BadRequestException('Coupon is not active');
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) throw new BadRequestException('Coupon is not yet valid');
    if (coupon.endsAt && coupon.endsAt < now) throw new BadRequestException('Coupon has expired');
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (orderTotal < coupon.minOrderAmount) {
      throw new BadRequestException(`Minimum order amount for this coupon is ${coupon.minOrderAmount}`);
    }
    return coupon;
  }

  calculateDiscount(coupon: CouponDocument, subtotal: number): number {
    let discount = coupon.type === 'percentage'
      ? (subtotal * coupon.value) / 100
      : coupon.value;
    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
    return Math.min(discount, subtotal);
  }

  async incrementUsage(couponId: string): Promise<void> {
    await this.couponModel.updateOne({ _id: couponId }, { $inc: { usageCount: 1 } });
  }

  async update(id: string, dto: UpdateCouponDto): Promise<CouponDocument> {
    await this.findById(id);
    const updated = await this.couponModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    return updated!;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.couponModel.findByIdAndDelete(id);
  }
}
