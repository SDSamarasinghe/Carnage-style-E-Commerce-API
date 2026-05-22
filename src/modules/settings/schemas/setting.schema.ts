import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => { ret.id = ret._id; delete ret._id; return ret; },
  },
})
export class Setting {
  @Prop({ default: 'Carnage' })
  siteName!: string;

  @Prop()
  logo?: string;

  @Prop({ lowercase: true, trim: true })
  contactEmail?: string;

  @Prop()
  supportPhone?: string;

  @Prop({ default: 'LKR' })
  currency!: string;

  @Prop({ default: 0 })
  taxRate!: number;

  @Prop({ default: 5000 })
  freeShippingThreshold!: number;

  @Prop({ type: Object })
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
  };

  @Prop({ type: [{ url: String, alt: String, link: String }], default: [] })
  bannerImages!: { url: string; alt?: string; link?: string }[];

  @Prop({ type: Object })
  announcementBar?: {
    text: string;
    link?: string;
    isActive: boolean;
  };
}

export type SettingDocument = HydratedDocument<Setting>;
export const SettingSchema = SchemaFactory.createForClass(Setting);
