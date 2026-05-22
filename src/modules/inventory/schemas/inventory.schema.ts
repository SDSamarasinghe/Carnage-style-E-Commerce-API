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
export class Inventory {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  variantSku!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branch!: Types.ObjectId;

  @Prop({ default: 0, min: 0 })
  stock!: number;

  @Prop({ default: 5, min: 0 })
  lowStockThreshold!: number;

  @Prop({ default: 0, min: 0 })
  reservedStock!: number;
}

export type InventoryDocument = HydratedDocument<Inventory>;
export const InventorySchema = SchemaFactory.createForClass(Inventory);

// Compound unique index
InventorySchema.index({ product: 1, variantSku: 1, branch: 1 }, { unique: true });
InventorySchema.index({ branch: 1, stock: 1 });
