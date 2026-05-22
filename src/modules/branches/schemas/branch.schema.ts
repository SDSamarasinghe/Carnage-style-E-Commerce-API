import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export class GeoLocation {
  lat!: number;
  lng!: number;
}

export class OpeningHours {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
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
export class Branch {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  code!: string;

  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ trim: true })
  district?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({
    type: { lat: Number, lng: Number },
    _id: false,
  })
  geoLocation?: GeoLocation;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  manager?: Types.ObjectId;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Object })
  openingHours?: OpeningHours;
}

export type BranchDocument = HydratedDocument<Branch>;
export const BranchSchema = SchemaFactory.createForClass(Branch);

BranchSchema.index({ city: 1, isActive: 1 });
