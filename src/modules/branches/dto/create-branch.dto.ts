import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'Colombo Branch' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'CMB01' })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  code!: string;

  @ApiProperty({ example: '123 Galle Rd' })
  @IsString()
  address!: string;

  @ApiProperty({ example: 'Colombo' })
  @IsString()
  city!: string;

  @ApiPropertyOptional({ example: 'Western' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ example: '+94112345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'cmb@carnage.lk' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: { lat: 6.9271, lng: 79.8612 } })
  @IsOptional()
  geoLocation?: { lat: number; lng: number };

  @ApiPropertyOptional({ example: { monday: '09:00-21:00' } })
  @IsOptional()
  openingHours?: Record<string, string>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
