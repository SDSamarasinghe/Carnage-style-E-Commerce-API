import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import type { AuthenticatedUser } from '@/common/types/auth.types';
import { BranchesService } from '@/modules/branches/branches.service';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@Controller()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly branchesService: BranchesService,
  ) {}

  @Roles('branch_admin', 'super_admin')
  @Get('admin/branch/analytics')
  @ApiOperation({ summary: 'Branch analytics (branch_admin)' })
  async branchOverview(@CurrentUser() user: AuthenticatedUser) {
    const branchId = await this.getBranchId(user);
    return this.analyticsService.getOverview(branchId);
  }

  @Roles('super_admin')
  @Get('admin/analytics/overview')
  @ApiOperation({ summary: 'Global analytics overview (super_admin)' })
  overview() { return this.analyticsService.getOverview(); }

  @Roles('super_admin')
  @Get('admin/analytics/sales')
  @ApiOperation({ summary: 'Sales over time (super_admin)' })
  sales(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    return this.analyticsService.getSalesByPeriod(startDate, endDate);
  }

  @Roles('super_admin')
  @Get('admin/analytics/top-products')
  @ApiOperation({ summary: 'Top products (super_admin)' })
  topProducts(@Query('limit') limit = 10) {
    return this.analyticsService.getTopProducts(+limit);
  }

  @Roles('super_admin')
  @Get('admin/analytics/branch-performance')
  @ApiOperation({ summary: 'Branch performance (super_admin)' })
  branchPerformance() { return this.analyticsService.getBranchPerformance(); }

  private async getBranchId(user: AuthenticatedUser): Promise<string | undefined> {
    if (user.assignedBranch) return user.assignedBranch;
    const branch = await this.branchesService.findByAdmin(user.id);
    return branch ? String(branch._id) : undefined;
  }
}
