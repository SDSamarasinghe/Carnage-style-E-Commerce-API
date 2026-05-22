import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER20' }) @IsString() @MinLength(1) code!: string;
  @ApiProperty({ enum: ['percentage', 'fixed'] }) @IsEnum(['percentage', 'fixed']) type!: 'percentage' | 'fixed';
  @ApiProperty({ minimum: 0 }) @IsNumber() @Min(0) value!: number;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0) minOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxDiscountAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) usageLimit?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) perUserLimit?: number;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsMongoId({ each: true }) applicableCategories?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsMongoId({ each: true }) applicableProducts?: string[];
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() endsAt?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() isActive?: boolean;
}
