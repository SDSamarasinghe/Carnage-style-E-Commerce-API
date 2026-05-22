import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export class ProductImage {
  url!: string;
  alt?: string;
  isPrimary?: boolean;
  order?: number;
}

export class ProductColor {
  name!: string;
  hexCode!: string;
}

@Schema({ _id: true })
export class ProductVariant {
  @Prop({ required: true, unique: true, trim: true })
  sku!: string;

  @Prop({ required: true, trim: true })
  size!: string;

  @Prop({ type: { name: String, hexCode: String }, _id: false })
  color?: ProductColor;

  @Prop({ default: 0 })
  additionalPrice!: number;

  @Prop({ type: [{ url: String, alt: String, isPrimary: Boolean, order: Number }], default: [] })
  images!: ProductImage[];
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

export class ProductRating {
  average!: number;
  count!: number;
}

export class ProductSeo {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete (ret as any).costPrice;
      return ret;
    },
  },
})
export class Product {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  shortDescription?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category' })
  category?: Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Collection' }], default: [] })
  collections!: Types.ObjectId[];

  @Prop({
    type: String,
    enum: ['men', 'women', 'unisex', 'accessories'],
    required: true,
  })
  gender!: string;

  @Prop({
    type: [{ url: String, alt: String, isPrimary: Boolean, order: Number }],
    default: [],
    _id: false,
  })
  images!: ProductImage[];

  @Prop({ required: true, min: 0 })
  basePrice!: number;

  @Prop({ min: 0 })
  compareAtPrice?: number;

  @Prop({ min: 0, select: false })
  costPrice?: number;

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants!: ProductVariant[];

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ trim: true })
  materials?: string;

  @Prop({ trim: true })
  careInstructions?: string;

  @Prop({ trim: true })
  sizeChart?: string;

  @Prop({
    type: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },
    default: { average: 0, count: 0 },
    _id: false,
  })
  rating!: ProductRating;

  @Prop({ default: 0 })
  salesCount!: number;

  @Prop({ default: 0 })
  viewCount!: number;

  @Prop({ default: false })
  isPublished!: boolean;

  @Prop({ default: false })
  isFeatured!: boolean;

  @Prop({ default: false })
  isNewArrival!: boolean;

  @Prop({ type: Object, _id: false })
  seo?: ProductSeo;
}

export type ProductDocument = HydratedDocument<Product>;
export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ gender: 1, isPublished: 1 });
ProductSchema.index({ category: 1, isPublished: 1 });
ProductSchema.index({ basePrice: 1 });
ProductSchema.index({ salesCount: -1 });
ProductSchema.index({ createdAt: -1 });
