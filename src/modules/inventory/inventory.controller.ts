import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';
import type { AuthenticatedUser } from '@/common/types/auth.types';
import { BranchesService } from '@/modules/branches/branches.service';

import { InventoryService } from './inventory.service';
import { AdjustStockDto, CreateInventoryDto } from './dto/adjust-stock.dto';

@ApiTags('inventory')
@ApiBearerAuth('access-token')
@Controller()
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly branchesService: BranchesService,
  ) {}

  // ---- Branch admin: own branch ----

  @Roles('branch_admin', 'super_admin')
  @Get('admin/branch/inventory')
  @ApiOperation({ summary: 'Get inventory for own branch (branch_admin)' })
  async getBranchInventory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    const branchId = await this.getAdminBranchId(user);
    return this.inventoryService.findByBranch(branchId, +page, +limit);
  }

  @Roles('branch_admin', 'super_admin')
  @Patch('admin/branch/inventory/:id')
  @ApiOperation({ summary: 'Adjust stock for own branch (branch_admin)' })
  async adjustBranchStock(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjust(id, dto);
  }

  // ---- Super admin ----

  @Roles('super_admin')
  @Post('admin/inventory')
  @ApiOperation({ summary: 'Create/upsert inventory record (super_admin)' })
  upsert(@Body() dto: CreateInventoryDto) {
    return this.inventoryService.upsert(dto);
  }

  @Roles('super_admin')
  @Get('admin/inventory/branch/:branchId')
  @ApiOperation({ summary: 'Get inventory for a specific branch (super_admin)' })
  getForBranch(
    @Param('branchId', ParseObjectIdPipe) branchId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.inventoryService.findByBranch(branchId, +page, +limit);
  }

  @Roles('super_admin')
  @Patch('admin/inventory/:id')
  @ApiOperation({ summary: 'Adjust stock for any inventory record (super_admin)' })
  adjust(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjust(id, dto);
  }

  private async getAdminBranchId(user: AuthenticatedUser): Promise<string> {
    if (user.assignedBranch) return user.assignedBranch;
    const branch = await this.branchesService.findByAdmin(user.id);
    if (!branch) throw new Error('No branch assigned to this admin');
    return String(branch._id);
  }
}
