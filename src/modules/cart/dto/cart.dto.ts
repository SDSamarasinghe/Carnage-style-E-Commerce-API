import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class AddToCartDto {
  @ApiProperty() @IsMongoId() productId!: string;
  @ApiProperty() @IsString() @MinLength(1) variantSku!: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsNumber() @Min(1) quantity?: number;
}

export class UpdateCartItemDto {
  @ApiProperty() @IsMongoId() productId!: string;
  @ApiProperty() @IsString() variantSku!: string;
  @ApiProperty({ minimum: 0, description: '0 to remove' }) @IsNumber() @Min(0) quantity!: number;
}

export class ApplyCouponDto {
  @ApiProperty() @IsString() @MinLength(1) code!: string;
}

export class MergeCartDto {
  @ApiPropertyOptional() @IsOptional() @IsString() guestId?: string;
}
