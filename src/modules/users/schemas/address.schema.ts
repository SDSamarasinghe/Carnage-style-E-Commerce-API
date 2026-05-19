import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: true })
export class Address {
  @Prop({ required: true, trim: true })
  line1!: string;

  @Prop({ trim: true })
  line2?: string;

  @Prop({ required: true, trim: true })
  city!: string;

  @Prop({ required: true, trim: true })
  district!: string;

  @Prop({ trim: true })
  postalCode?: string;

  @Prop({ required: true, default: 'LK', trim: true })
  country!: string;

  @Prop({ default: false })
  isDefault!: boolean;
}

export type AddressDocument = HydratedDocument<Address>;
export const AddressSchema = SchemaFactory.createForClass(Address);
