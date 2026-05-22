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
export class Collection {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  coverImage?: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Product' }], default: [] })
  products!: Types.ObjectId[];

  @Prop({ default: false })
  isFeatured!: boolean;

  @Prop()
  startsAt?: Date;

  @Prop()
  endsAt?: Date;

  @Prop({ default: true })
  isActive!: boolean;
}

export type CollectionDocument = HydratedDocument<Collection>;
export const CollectionSchema = SchemaFactory.createForClass(Collection);
