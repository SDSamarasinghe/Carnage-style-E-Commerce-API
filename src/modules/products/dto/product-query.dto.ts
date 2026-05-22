import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ProductQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ enum: ['men', 'women', 'unisex', 'accessories'] })
  @IsOptional() @IsEnum(['men', 'women', 'unisex', 'accessories']) gender?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() category?: string;
  @ApiPropertyOptional() @IsOptional() @IsMongoId() collection?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) priceMin?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Type(() => Number) priceMax?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() size?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() onSale?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() inStock?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() featured?: boolean;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() newArrival?: boolean;

  @ApiPropertyOptional({ enum: ['featured', 'newest', 'price_asc', 'price_desc', 'bestselling'] })
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional({ default: 24 }) @IsOptional() @Type(() => Number) limit?: number = 24;
}
