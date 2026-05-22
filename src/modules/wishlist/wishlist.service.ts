import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, type WishlistDocument } from './schemas/wishlist.schema';

@Injectable()
export class WishlistService {
  constructor(@InjectModel(Wishlist.name) private readonly wishlistModel: Model<WishlistDocument>) {}

  async get(userId: string): Promise<WishlistDocument> {
    let wl = await this.wishlistModel.findOne({ user: new Types.ObjectId(userId) }).populate('products').exec();
    if (!wl) wl = await this.wishlistModel.create({ user: new Types.ObjectId(userId), products: [] });
    return wl;
  }

  async add(userId: string, productId: string): Promise<WishlistDocument> {
    await this.wishlistModel.updateOne(
      { user: new Types.ObjectId(userId) },
      { $addToSet: { products: new Types.ObjectId(productId) } },
      { upsert: true },
    );
    return this.get(userId);
  }

  async remove(userId: string, productId: string): Promise<WishlistDocument> {
    await this.wishlistModel.updateOne(
      { user: new Types.ObjectId(userId) },
      { $pull: { products: new Types.ObjectId(productId) } },
    );
    return this.get(userId);
  }
}
