import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Collection, type CollectionDocument } from './schemas/collection.schema';
import type { CreateCollectionDto } from './dto/create-collection.dto';
import type { UpdateCollectionDto } from './dto/update-collection.dto';

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class CollectionsService {
  constructor(
    @InjectModel(Collection.name)
    private readonly collectionModel: Model<CollectionDocument>,
  ) {}

  async create(dto: CreateCollectionDto): Promise<CollectionDocument> {
    const baseSlug = dto.slug ?? slugify(dto.name);
    const slug = await this.uniqueSlug(baseSlug);
    const products = dto.products?.map((id) => new Types.ObjectId(id)) ?? [];
    return this.collectionModel.create({ ...dto, slug, products });
  }

  findAll(): Promise<CollectionDocument[]> {
    return this.collectionModel
      .find({ isActive: true })
      .sort({ isFeatured: -1, createdAt: -1 })
      .exec();
  }

  async findAllPaged(
    page = 1,
    limit = 20,
  ): Promise<{
    data: CollectionDocument[];
    meta: { total: number; page: number; limit: number; pages: number };
  }> {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.collectionModel
        .find()
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.collectionModel.countDocuments().exec(),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) || 1 } };
  }

  async findBySlug(slug: string): Promise<CollectionDocument> {
    const col = await this.collectionModel
      .findOne({ slug, isActive: true })
      .populate('products')
      .exec();
    if (!col) throw new NotFoundException('Collection not found');
    return col;
  }

  async findById(id: string): Promise<CollectionDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Collection not found');
    const col = await this.collectionModel.findById(id).exec();
    if (!col) throw new NotFoundException('Collection not found');
    return col;
  }

  async update(id: string, dto: UpdateCollectionDto): Promise<CollectionDocument> {
    await this.findById(id);
    const products = dto.products
      ? dto.products.map((pid) => new Types.ObjectId(pid))
      : undefined;
    const payload = { ...dto, ...(products ? { products } : {}) };
    const updated = await this.collectionModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();
    return updated!;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.collectionModel.findByIdAndUpdate(id, { isActive: false });
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 0;
    while (await this.collectionModel.exists({ slug })) {
      counter += 1;
      slug = `${base}-${counter}`;
    }
    return slug;
  }
}
