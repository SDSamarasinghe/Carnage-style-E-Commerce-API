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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';

import { BranchesService } from './branches.service';
import { AssignAdminDto } from './dto/assign-admin.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@ApiTags('branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  /** Public store-locator list */
  @Public()
  @Get()
  @ApiOperation({ summary: 'List all active branches (store locator)' })
  @ApiQuery({ name: 'all', required: false, type: Boolean })
  findAll(@Query('all') all?: string) {
    return this.branchesService.findAll(all !== 'true');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single branch by ID' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.branchesService.findById(id);
  }

  // ---- Super admin ----

  @Roles('super_admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new branch (super_admin)' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Roles('super_admin')
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update branch (super_admin)' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchesService.update(id, dto);
  }

  @Roles('super_admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Soft-delete a branch (super_admin)' })
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.branchesService.remove(id);
  }

  @Roles('super_admin')
  @Post(':id/assign-admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Assign a branch_admin to a branch (super_admin)' })
  assignAdmin(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AssignAdminDto,
  ) {
    return this.branchesService.assignAdmin(id, dto.adminId);
  }
}
