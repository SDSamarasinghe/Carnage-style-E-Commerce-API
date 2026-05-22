import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({ description: 'Absolute stock value to set (or use delta)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'Relative delta — positive to add, negative to subtract' })
  @IsOptional()
  @IsNumber()
  delta?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;
}

export class CreateInventoryDto {
  @ApiProperty()
  @IsMongoId()
  product!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  variantSku!: string;

  @ApiProperty()
  @IsMongoId()
  branch!: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;
}
