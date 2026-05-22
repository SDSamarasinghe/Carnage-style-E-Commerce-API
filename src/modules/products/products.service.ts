import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { PipelineStage } from 'mongoose';
import { Model, Types } from 'mongoose';

import { Product, type ProductDocument } from './schemas/product.schema';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { ProductQueryDto } from './dto/product-query.dto';

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    const baseSlug = dto.slug ?? slugify(dto.name);
    const slug = await this.uniqueSlug(baseSlug);
    const category = dto.category ? new Types.ObjectId(dto.category) : undefined;
    const collections = dto.collections?.map((id) => new Types.ObjectId(id)) ?? [];
    return this.productModel.create({ ...dto, slug, category, collections });
  }

  async findAll(query: ProductQueryDto): Promise<{
    data: ProductDocument[];
    meta: { total: number; page: number; limit: number; pages: number };
  }> {
    const { page = 1, limit = 24, sort, search, ...filters } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isPublished: true };

    if (search) {
      filter.$text = { $search: search };
    }
    if (filters.gender) filter.gender = filters.gender;
    if (filters.category) filter.category = new Types.ObjectId(filters.category);
    if (filters.collection) filter.collections = new Types.ObjectId(filters.collection);
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (filters.priceMin !== undefined) priceFilter.$gte = filters.priceMin;
      if (filters.priceMax !== undefined) priceFilter.$lte = filters.priceMax;
      filter.basePrice = priceFilter;
    }
    if (filters.onSale) {
      filter.compareAtPrice = { $exists: true, $gt: 0 };
      filter.$expr = { $lt: ['$basePrice', '$compareAtPrice'] };
    }
    if (filters.color) {
      filter['variants.color.name'] = { $regex: filters.color, $options: 'i' };
    }
    if (filters.size) {
      filter['variants.size'] = filters.size;
    }
    if (filters.featured) filter.isFeatured = true;
    if (filters.newArrival) filter.isNewArrival = true;

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    if (sort === 'featured') sortObj = { isFeatured: -1, createdAt: -1 };
    else if (sort === 'newest') sortObj = { createdAt: -1 };
    else if (sort === 'price_asc') sortObj = { basePrice: 1 };
    else if (sort === 'price_desc') sortObj = { basePrice: -1 };
    else if (sort === 'bestselling') sortObj = { salesCount: -1 };

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('category', 'name slug')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string, incrementView = true): Promise<ProductDocument> {
    const product = await this.productModel
      .findOne({ slug, isPublished: true })
      .populate('category', 'name slug')
      .populate('collections', 'name slug')
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    if (incrementView) {
      await this.productModel.updateOne({ _id: product._id }, { $inc: { viewCount: 1 } });
    }
    return product;
  }

  async findById(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Product not found');
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findRelated(slug: string, limit = 8): Promise<ProductDocument[]> {
    const product = await this.productModel.findOne({ slug }).lean().exec();
    if (!product) return [];
    return this.productModel
      .find({
        _id: { $ne: product._id },
        isPublished: true,
        $or: [
          { category: product.category },
          { gender: product.gender },
        ],
      })
      .limit(limit)
      .exec();
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    await this.findById(id);
    const category = dto.category ? new Types.ObjectId(dto.category) : undefined;
    const collections = dto.collections?.map((cid) => new Types.ObjectId(cid));
    const payload = {
      ...dto,
      ...(category ? { category } : {}),
      ...(collections ? { collections } : {}),
    };
    const updated = await this.productModel
      .findByIdAndUpdate(id, payload, { new: true })
      .exec();
    return updated!;
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.productModel.findByIdAndUpdate(id, { isPublished: false, isActive: false });
  }

  async updateRating(productId: string): Promise<void> {
    // Called by ReviewsService after a review is saved
    const pipeline: PipelineStage[] = [
      { $match: { product: new Types.ObjectId(productId), isApproved: true } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ];
    // Dynamic import to avoid circular dep
    const mongoose = (await import('mongoose')).default;
    const ReviewModel = mongoose.model('Review');
    const [result] = await ReviewModel.aggregate(pipeline).exec();
    await this.productModel.updateOne(
      { _id: productId },
      {
        'rating.average': result?.average ?? 0,
        'rating.count': result?.count ?? 0,
      },
    );
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = base;
    let counter = 0;
    while (await this.productModel.exists({ slug })) {
      counter += 1;
      slug = `${base}-${counter}`;
    }
    return slug;
  }
}
