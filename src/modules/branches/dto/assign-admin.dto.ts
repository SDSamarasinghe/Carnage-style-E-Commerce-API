import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class AssignAdminDto {
  @ApiProperty({ example: '6650abc...', description: 'User ID of the branch_admin to assign' })
  @IsMongoId()
  adminId!: string;
}
