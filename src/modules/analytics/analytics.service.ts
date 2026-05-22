import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, type OrderDocument } from '@/modules/orders/schemas/order.schema';
import { Product } from '@/modules/products/schemas/product.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async getOverview(branchId?: string): Promise<object> {
    const branchFilter = branchId
      ? { fulfillingBranch: new Types.ObjectId(branchId) }
      : {};
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrders,
      todayOrders,
      monthOrders,
      revenueAgg,
      todayRevenueAgg,
    ] = await Promise.all([
      this.orderModel.countDocuments({ ...branchFilter, paymentStatus: 'paid' }).exec(),
      this.orderModel.countDocuments({
        ...branchFilter,
        createdAt: { $gte: startOfDay },
      }).exec(),
      this.orderModel.countDocuments({
        ...branchFilter,
        createdAt: { $gte: startOfMonth },
        paymentStatus: 'paid',
      }).exec(),
      this.orderModel.aggregate([
        { $match: { ...branchFilter, paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).exec(),
      this.orderModel.aggregate([
        { $match: { ...branchFilter, createdAt: { $gte: startOfDay } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]).exec(),
    ]);

    return {
      totalOrders,
      todayOrders,
      monthOrders,
      totalRevenue: revenueAgg[0]?.total ?? 0,
      todayRevenue: todayRevenueAgg[0]?.total ?? 0,
    };
  }

  async getSalesByPeriod(
    startDate: Date,
    endDate: Date,
    branchId?: string,
  ): Promise<object[]> {
    const branchFilter = branchId
      ? { fulfillingBranch: new Types.ObjectId(branchId) }
      : {};
    return this.orderModel.aggregate([
      {
        $match: {
          ...branchFilter,
          paymentStatus: 'paid',
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]).exec();
  }

  async getTopProducts(limit = 10, branchId?: string): Promise<object[]> {
    const branchFilter = branchId
      ? { fulfillingBranch: new Types.ObjectId(branchId) }
      : {};
    return this.orderModel.aggregate([
      { $match: { ...branchFilter, paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
          name: { $first: '$items.name' },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
    ]).exec();
  }

  async getBranchPerformance(): Promise<object[]> {
    return this.orderModel.aggregate([
      { $match: { paymentStatus: 'paid', fulfillingBranch: { $exists: true } } },
      {
        $group: {
          _id: '$fulfillingBranch',
          totalOrders: { $sum: 1 },
          revenue: { $sum: '$totalAmount' },
        },
      },
      {
        $lookup: {
          from: 'branches',
          localField: '_id',
          foreignField: '_id',
          as: 'branch',
        },
      },
      { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          branchName: '$branch.name',
          branchCode: '$branch.code',
          totalOrders: 1,
          revenue: 1,
        },
      },
      { $sort: { revenue: -1 } },
    ]).exec();
  }
}
