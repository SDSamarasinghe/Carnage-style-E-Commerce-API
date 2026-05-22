import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';
import type { AuthenticatedUser } from '@/common/types/auth.types';
import { BranchesService } from '@/modules/branches/branches.service';

import { OrdersService } from './orders.service';
import { AssignBranchDto, CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';

@ApiTags('orders')
@Controller()
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly branchesService: BranchesService,
  ) {}

  // ---- Customer ----

  @Public()
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'x-guest-id', required: false })
  @ApiOperation({ summary: 'Place an order (guest or authenticated)' })
  async placeOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-guest-id') guestId?: string,
  ) {
    if (!dto.guestId && guestId) dto.guestId = guestId;
    return this.ordersService.placeOrder(dto, user);
  }

  @Get('orders')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "List own orders (customer)" })
  async listMyOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.ordersService.findByUser(user.id, +page, +limit);
  }

  @Get('orders/:orderNumber')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get order by order number' })
  getOrder(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.findByOrderNumber(orderNumber, user.id);
  }

  @Post('orders/:orderNumber/cancel')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cancel own order' })
  cancelOrder(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.cancelOrder(orderNumber, user.id);
  }

  // ---- Branch admin ----

  @Roles('branch_admin', 'super_admin')
  @Get('admin/branch/orders')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get own branch orders (branch_admin)' })
  async getBranchOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const branchId = await this.getAdminBranchId(user);
    return this.ordersService.findByBranch(branchId, +page, +limit);
  }

  @Roles('branch_admin', 'super_admin')
  @Patch('admin/branch/orders/:id/status')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update order status (branch_admin)' })
  async updateBranchOrderStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateStatus(id, dto, user.id);
  }

  // ---- Super admin ----

  @Roles('super_admin')
  @Get('admin/orders')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all orders (super_admin)' })
  getAllOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('branch') branch?: string,
  ) {
    const filter: Record<string, unknown> = {};
    if (status) filter.orderStatus = status;
    if (branch) filter.fulfillingBranch = branch;
    return this.ordersService.findAll(filter, +page, +limit);
  }

  @Roles('super_admin')
  @Patch('admin/orders/:id/status')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update any order status (super_admin)' })
  updateOrderStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updateStatus(id, dto, user.id);
  }

  @Roles('super_admin')
  @Patch('admin/orders/:id/assign-branch')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Assign fulfilling branch to order (super_admin)' })
  assignBranch(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: AssignBranchDto,
  ) {
    return this.ordersService.assignBranch(id, dto);
  }

  private async getAdminBranchId(user: AuthenticatedUser): Promise<string> {
    if (user.assignedBranch) return user.assignedBranch;
    const branch = await this.branchesService.findByAdmin(user.id);
    if (!branch) throw new Error('No branch assigned to this admin');
    return String(branch._id);
  }
}
