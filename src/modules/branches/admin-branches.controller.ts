import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '@/common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';

import { BranchesService } from './branches.service';
import { AssignAdminDto } from './dto/assign-admin.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@ApiTags('admin-branches')
@ApiBearerAuth('access-token')
@Controller('admin/branches')
export class AdminBranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Roles('super_admin')
  @Get()
  @ApiOperation({ summary: 'List all branches paginated (super_admin)' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.branchesService.findAllPaged(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Roles('super_admin')
  @Get(':id')
  @ApiOperation({ summary: 'Get a branch by id (super_admin)' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.branchesService.findById(id);
  }

  @Roles('super_admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a branch (super_admin)' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Roles('super_admin')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a branch (super_admin)' })
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Roles('super_admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a branch (super_admin)' })
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.branchesService.remove(id);
  }

  @Roles('super_admin')
  @Post(':id/assign-admin')
  @ApiOperation({ summary: 'Assign a branch_admin to a branch (super_admin)' })
  assignAdmin(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: AssignAdminDto) {
    return this.branchesService.assignAdmin(id, dto.adminId);
  }
}
