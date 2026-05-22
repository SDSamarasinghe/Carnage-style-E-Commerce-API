import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@ApiTags('coupons')
@Controller()
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Public()
  @Post('coupons/validate')
  @ApiOperation({ summary: 'Validate a coupon code' })
  validate(@Body() body: { code: string; orderTotal: number }) {
    return this.couponsService.validate(body.code, body.orderTotal);
  }

  @Roles('super_admin')
  @Get('admin/coupons')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all coupons (super_admin)' })
  findAll() { return this.couponsService.findAll(); }

  @Roles('super_admin')
  @Post('admin/coupons')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create coupon (super_admin)' })
  create(@Body() dto: CreateCouponDto) { return this.couponsService.create(dto); }

  @Roles('super_admin')
  @Patch('admin/coupons/:id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update coupon (super_admin)' })
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Roles('super_admin')
  @Delete('admin/coupons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete coupon (super_admin)' })
  remove(@Param('id', ParseObjectIdPipe) id: string) { return this.couponsService.remove(id); }
}
