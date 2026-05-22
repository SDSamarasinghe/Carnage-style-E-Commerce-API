import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString() line1!: string;
  @IsOptional() @IsString() line2?: string;
  @IsString() city!: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsString() country!: string;
}

class GuestInfoDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsString() firstName!: string;
  @IsString() lastName!: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'Required for guest checkout' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestInfoDto)
  guestInfo?: GuestInfoDto;

  @ApiPropertyOptional({ description: 'Guest cart ID if not authenticated' })
  @IsOptional()
  @IsString()
  guestId?: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => AddressDto)
  shippingAddress!: AddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;

  @ApiProperty({ enum: ['card', 'cod'] })
  @IsEnum(['card', 'cod'])
  paymentMethod!: 'card' | 'cod';

  @ApiPropertyOptional({ description: 'Stripe PaymentIntent ID (required for card payments)' })
  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNote?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  couponCode?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
  })
  @IsEnum(['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'])
  status!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courier?: string;
}

export class AssignBranchDto {
  @ApiProperty() @IsMongoId() branchId!: string;
}
