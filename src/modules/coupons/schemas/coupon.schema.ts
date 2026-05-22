import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

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
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  code!: string;

  @Prop({ type: String, enum: ['percentage', 'fixed'], required: true })
  type!: 'percentage' | 'fixed';

  @Prop({ required: true, min: 0 })
  value!: number;

  @Prop({ min: 0, default: 0 })
  minOrderAmount!: number;

  @Prop({ min: 0 })
  maxDiscountAmount?: number;

  @Prop({ min: 0 })
  usageLimit?: number;

  @Prop({ default: 0 })
  usageCount!: number;

  @Prop({ min: 0 })
  perUserLimit?: number;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Category' }], default: [] })
  applicableCategories!: Types.ObjectId[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Product' }], default: [] })
  applicableProducts!: Types.ObjectId[];

  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;

  @Prop({ default: true })
  isActive!: boolean;
}

export type CouponDocument = HydratedDocument<Coupon>;
export const CouponSchema = SchemaFactory.createForClass(Coupon);
