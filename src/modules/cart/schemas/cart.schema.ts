import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export class CartItem {
  product!: Types.ObjectId;
  variantSku!: string;
  quantity!: number;
  priceSnapshot!: number;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
})
export class Cart {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  user?: Types.ObjectId | null;

  @Prop({ trim: true })
  guestId?: string;

  @Prop({
    type: [
      {
        product: { type: MongooseSchema.Types.ObjectId, ref: 'Product' },
        variantSku: String,
        quantity: { type: Number, min: 1 },
        priceSnapshot: { type: Number, min: 0 },
      },
    ],
    default: [],
    _id: false,
  })
  items!: CartItem[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Coupon', default: null })
  coupon?: Types.ObjectId | null;
}

export type CartDocument = HydratedDocument<Cart>;
export const CartSchema = SchemaFactory.createForClass(Cart);

// TTL: auto-expire guest carts after 30 days (only applies when no user)
CartSchema.index({ guestId: 1 });
CartSchema.index({ user: 1 });
CartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
