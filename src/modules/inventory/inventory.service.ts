import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import { Inventory, type InventoryDocument } from './schemas/inventory.schema';
import type { AdjustStockDto, CreateInventoryDto } from './dto/adjust-stock.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
  ) {}

  async upsert(dto: CreateInventoryDto): Promise<InventoryDocument> {
    const filter = {
      product: new Types.ObjectId(dto.product),
      variantSku: dto.variantSku,
      branch: new Types.ObjectId(dto.branch),
    };
    return this.inventoryModel
      .findOneAndUpdate(
        filter,
        { $setOnInsert: { stock: dto.stock ?? 0, lowStockThreshold: dto.lowStockThreshold ?? 5 } },
        { upsert: true, new: true },
      )
      .exec() as Promise<InventoryDocument>;
  }

  async adjust(id: string, dto: AdjustStockDto): Promise<InventoryDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Inventory record not found');
    let update: Record<string, unknown> = {};
    if (dto.stock !== undefined) {
      update = { stock: dto.stock };
    } else if (dto.delta !== undefined) {
      const record = await this.inventoryModel.findById(id).lean().exec();
      if (!record) throw new NotFoundException('Inventory record not found');
      const newStock = (record.stock ?? 0) + dto.delta;
      if (newStock < 0) throw new BadRequestException('Stock cannot go below 0');
      update = { stock: newStock };
    }
    if (dto.lowStockThreshold !== undefined) {
      update.lowStockThreshold = dto.lowStockThreshold;
    }
    const updated = await this.inventoryModel
      .findByIdAndUpdate(id, update, { new: true })
      .populate('product', 'name slug')
      .populate('branch', 'name code')
      .exec();
    if (!updated) throw new NotFoundException('Inventory record not found');
    return updated;
  }

  async findByBranch(branchId: string, page = 1, limit = 50): Promise<{
    data: InventoryDocument[];
    meta: { total: number; page: number; limit: number; pages: number };
  }> {
    const skip = (page - 1) * limit;
    const filter = { branch: new Types.ObjectId(branchId) };
    const [data, total] = await Promise.all([
      this.inventoryModel
        .find(filter)
        .populate('product', 'name slug images basePrice')
        .skip(skip)
        .limit(limit)
        .exec(),
      this.inventoryModel.countDocuments(filter).exec(),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findByProductAndBranch(
    productId: string,
    branchId: string,
  ): Promise<InventoryDocument[]> {
    return this.inventoryModel
      .find({
        product: new Types.ObjectId(productId),
        branch: new Types.ObjectId(branchId),
      })
      .exec();
  }

  /** Check if a branch has enough stock for each item. Returns null if all OK, or the first failing SKU. */
  async checkAvailability(
    branchId: string,
    items: Array<{ productId: string; variantSku: string; quantity: number }>,
  ): Promise<string | null> {
    for (const item of items) {
      const inv = await this.inventoryModel
        .findOne({
          branch: new Types.ObjectId(branchId),
          product: new Types.ObjectId(item.productId),
          variantSku: item.variantSku,
        })
        .lean()
        .exec();
      const available = (inv?.stock ?? 0) - (inv?.reservedStock ?? 0);
      if (available < item.quantity) return item.variantSku;
    }
    return null;
  }

  /** Atomically decrement stock within a transaction */
  async decrementStock(
    branchId: string,
    items: Array<{ productId: string; variantSku: string; quantity: number }>,
    session: ClientSession,
  ): Promise<void> {
    for (const item of items) {
      const result = await this.inventoryModel.updateOne(
        {
          branch: new Types.ObjectId(branchId),
          product: new Types.ObjectId(item.productId),
          variantSku: item.variantSku,
          stock: { $gte: item.quantity },
        },
        { $inc: { stock: -item.quantity } },
        { session },
      );
      if (result.matchedCount === 0) {
        throw new BadRequestException(`Insufficient stock for SKU: ${item.variantSku}`);
      }
    }
  }

  /** Restore stock (on order cancel) */
  async restoreStock(
    branchId: string,
    items: Array<{ productId: string; variantSku: string; quantity: number }>,
  ): Promise<void> {
    for (const item of items) {
      await this.inventoryModel.updateOne(
        {
          branch: new Types.ObjectId(branchId),
          product: new Types.ObjectId(item.productId),
          variantSku: item.variantSku,
        },
        { $inc: { stock: item.quantity } },
      );
    }
  }

  /** Find best branch with full stock for all items */
  async findFulfillingBranch(
    items: Array<{ productId: string; variantSku: string; quantity: number }>,
    branchIds: string[],
  ): Promise<string | null> {
    for (const branchId of branchIds) {
      const failing = await this.checkAvailability(branchId, items);
      if (!failing) return branchId;
    }
    // Fallback: first branch with any stock
    return branchIds[0] ?? null;
  }
}
