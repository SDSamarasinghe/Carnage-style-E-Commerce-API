import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export class OrderAddress {
  line1!: string;
  line2?: string;
  city!: string;
  district?: string;
  postalCode?: string;
  country!: string;
}

export class OrderItem {
  product!: Types.ObjectId;
  name!: string;
  image?: string;
  variantSku!: string;
  variantSize?: string;
  variantColor?: string;
  quantity!: number;
  unitPrice!: number;
  lineTotal!: number;
}

export class StatusHistoryEntry {
  status!: string;
  changedBy!: string;
  changedAt!: Date;
  note?: string;
}

export class GuestInfo {
  email!: string;
  phone?: string;
  firstName!: string;
  lastName!: string;
}

export class CouponSnapshot {
  code!: string;
  type!: string;
  value!: number;
}

export class PaymentDetails {
  provider?: string;
  transactionId?: string;
  paidAt?: Date;
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
export class Order {
  @Prop({ required: true, unique: true, index: true })
  orderNumber!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  user?: Types.ObjectId | null;

  @Prop({ type: Object, _id: false })
  guestInfo?: GuestInfo;

  @Prop({
    type: [
      {
        product: { type: MongooseSchema.Types.ObjectId, ref: 'Product' },
        name: String,
        image: String,
        variantSku: String,
        variantSize: String,
        variantColor: String,
        quantity: Number,
        unitPrice: Number,
        lineTotal: Number,
      },
    ],
    default: [],
    _id: false,
  })
  items!: OrderItem[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch' })
  fulfillingBranch?: Types.ObjectId;

  @Prop({ type: Object, _id: false })
  shippingAddress!: OrderAddress;

  @Prop({ type: Object, _id: false })
  billingAddress?: OrderAddress;

  @Prop({ required: true, min: 0 })
  subtotal!: number;

  @Prop({ default: 0, min: 0 })
  discountAmount!: number;

  @Prop({ default: 0, min: 0 })
  shippingFee!: number;

  @Prop({ default: 0, min: 0 })
  taxAmount!: number;

  @Prop({ required: true, min: 0 })
  totalAmount!: number;

  @Prop({ default: 'LKR' })
  currency!: string;

  @Prop({ type: Object, _id: false })
  coupon?: CouponSnapshot;

  @Prop({ type: String, enum: ['card', 'cod'], required: true })
  paymentMethod!: 'card' | 'cod';

  @Prop({
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  })
  paymentStatus!: string;

  @Prop({ type: Object, _id: false })
  paymentDetails?: PaymentDetails;

  @Prop({
    type: String,
    enum: [
      'pending', 'confirmed', 'processing', 'shipped',
      'out_for_delivery', 'delivered', 'cancelled', 'returned',
    ],
    default: 'pending',
    index: true,
  })
  orderStatus!: string;

  @Prop({
    type: [{ status: String, changedBy: String, changedAt: Date, note: String }],
    default: [],
    _id: false,
  })
  statusHistory!: StatusHistoryEntry[];

  @Prop({ trim: true })
  trackingNumber?: string;

  @Prop({ trim: true })
  courier?: string;

  @Prop()
  estimatedDelivery?: Date;

  @Prop({ trim: true })
  customerNote?: string;

  @Prop({ trim: true })
  internalNote?: string;

  @Prop({ trim: true })
  stripePaymentIntentId?: string;
}

export type OrderDocument = HydratedDocument<Order>;
export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ fulfillingBranch: 1, orderStatus: 1 });
OrderSchema.index({ createdAt: -1 });
