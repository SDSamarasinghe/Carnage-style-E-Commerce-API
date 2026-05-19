import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

import type { Role } from '@/common/types/auth.types';

import { Address, AddressSchema } from './address.schema';

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.passwordHash;
      delete ret.refreshTokenHash;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpiresAt;
      delete ret.emailVerifyToken;
      return ret;
    },
  },
})
export class User {
  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({
    type: String,
    enum: ['customer', 'branch_admin', 'super_admin'],
    default: 'customer',
    index: true,
  })
  role!: Role;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch' })
  assignedBranch?: Types.ObjectId;

  @Prop({ type: [AddressSchema], default: [] })
  addresses!: Address[];

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  emailVerified!: boolean;

  @Prop()
  lastLoginAt?: Date;

  @Prop({ select: false })
  refreshTokenHash?: string;

  @Prop({ select: false })
  emailVerifyToken?: string;

  @Prop({ select: false })
  passwordResetToken?: string;

  @Prop({ select: false })
  passwordResetExpiresAt?: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1, isActive: 1 });
