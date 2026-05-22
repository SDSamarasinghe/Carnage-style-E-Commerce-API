import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class VariantColorDto {
  @IsString() name!: string;
  @IsString() hexCode!: string;
}

class ProductImageDto {
  @IsString() url!: string;
  @IsOptional() @IsString() alt?: string;
  @IsOptional() @IsBoolean() isPrimary?: boolean;
  @IsOptional() @IsNumber() order?: number;
}

class ProductVariantDto {
  @ApiProperty() @IsString() @MinLength(1) sku!: string;
  @ApiProperty() @IsString() size!: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() @ValidateNested() @Type(() => VariantColorDto) color?: VariantColorDto;
  @ApiPropertyOptional({ default: 0 }) @IsOptional() @IsNumber() @Min(0) additionalPrice?: number;
  @ApiPropertyOptional({ type: [ProductImageDto] }) @IsOptional() @IsArray() images?: ProductImageDto[];
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  category?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  collections?: string[];

  @ApiProperty({ enum: ['men', 'women', 'unisex', 'accessories'] })
  @IsEnum(['men', 'women', 'unisex', 'accessories'])
  gender!: string;

  @ApiPropertyOptional({ type: [ProductImageDto] })
  @IsOptional()
  @IsArray()
  images?: ProductImageDto[];

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @Min(0)
  basePrice!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ type: [ProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  materials?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  careInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sizeChart?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  seo?: { metaTitle?: string; metaDescription?: string; ogImage?: string };
}
