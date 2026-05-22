import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, type ReviewDocument } from './schemas/review.schema';
import type { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(@InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>) {}

  async create(dto: CreateReviewDto, userId: string): Promise<ReviewDocument> {
    const existing = await this.reviewModel
      .findOne({ product: new Types.ObjectId(dto.product), user: new Types.ObjectId(userId) })
      .lean().exec();
    if (existing) throw new BadRequestException('You have already reviewed this product');
    return this.reviewModel.create({
      ...dto,
      product: new Types.ObjectId(dto.product),
      user: new Types.ObjectId(userId),
      order: dto.order ? new Types.ObjectId(dto.order) : undefined,
    });
  }

  findByProduct(productId: string, page = 1, limit = 10): Promise<ReviewDocument[]> {
    const skip = (page - 1) * limit;
    return this.reviewModel
      .find({ product: new Types.ObjectId(productId), isApproved: true })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  findPending(): Promise<ReviewDocument[]> {
    return this.reviewModel
      .find({ isApproved: false })
      .populate('user', 'firstName lastName email')
      .populate('product', 'name slug')
      .sort({ createdAt: -1 })
      .exec();
  }

  async approve(id: string): Promise<ReviewDocument | null> {
    return this.reviewModel.findByIdAndUpdate(id, { isApproved: true }, { new: true }).exec();
  }

  async remove(id: string): Promise<void> {
    await this.reviewModel.findByIdAndDelete(id);
  }
}
