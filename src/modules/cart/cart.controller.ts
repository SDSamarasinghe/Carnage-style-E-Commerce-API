import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import type { AuthenticatedUser } from '@/common/types/auth.types';
import { CouponsService } from '@/modules/coupons/coupons.service';

import { CartService } from './cart.service';
import { AddToCartDto, ApplyCouponDto, MergeCartDto, UpdateCartItemDto } from './dto/cart.dto';

function extractCart(
  user?: AuthenticatedUser,
  guestId?: string,
): { userId?: string; guestId?: string } {
  if (user?.id) return { userId: user.id };
  return { guestId };
}

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(
    private readonly cartService: CartService,
    private readonly couponsService: CouponsService,
  ) {}

  @Public()
  @Get()
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'x-guest-id', required: false })
  @ApiOperation({ summary: 'Get cart (works for guests and logged-in users)' })
  getCart(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-guest-id') guestId?: string,
  ) {
    const { userId, guestId: gid } = extractCart(user, guestId);
    return this.cartService.getCart(userId, gid);
  }

  @Public()
  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'x-guest-id', required: false })
  @ApiOperation({ summary: 'Add item to cart' })
  addItem(
    @Body() dto: AddToCartDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-guest-id') guestId?: string,
  ) {
    const { userId, guestId: gid } = extractCart(user, guestId);
    return this.cartService.addItem(dto, userId, gid);
  }

  @Public()
  @Put('items')
  @ApiHeader({ name: 'x-guest-id', required: false })
  @ApiOperation({ summary: 'Update item quantity (0 = remove)' })
  updateItem(
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-guest-id') guestId?: string,
  ) {
    const { userId, guestId: gid } = extractCart(user, guestId);
    return this.cartService.updateItem(dto, userId, gid);
  }

  @Public()
  @Delete('items/:productId/:variantSku')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'x-guest-id', required: false })
  @ApiOperation({ summary: 'Remove a specific item from cart' })
  removeItem(
    @Param('productId') productId: string,
    @Param('variantSku') variantSku: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-guest-id') guestId?: string,
  ) {
    const { userId, guestId: gid } = extractCart(user, guestId);
    return this.cartService.removeItem(productId, variantSku, userId, gid);
  }

  @Public()
  @Post('apply-coupon')
  @ApiHeader({ name: 'x-guest-id', required: false })
  @ApiOperation({ summary: 'Apply a coupon to the cart' })
  async applyCoupon(
    @Body() dto: ApplyCouponDto,
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-guest-id') guestId?: string,
  ) {
    const { userId, guestId: gid } = extractCart(user, guestId);
    const cart = await this.cartService.getCart(userId, gid);
    const subtotal = cart.items.reduce((s, i) => s + i.priceSnapshot * i.quantity, 0);
    return this.cartService.applyCoupon(dto, subtotal, userId, gid);
  }

  @Public()
  @Delete('coupon')
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'x-guest-id', required: false })
  @ApiOperation({ summary: 'Remove applied coupon' })
  removeCoupon(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Headers('x-guest-id') guestId?: string,
  ) {
    const { userId, guestId: gid } = extractCart(user, guestId);
    return this.cartService.removeCoupon(userId, gid);
  }

  @Post('merge')
  @ApiBearerAuth('access-token')
  @ApiHeader({ name: 'x-guest-id', required: false })
  @ApiOperation({ summary: 'Merge guest cart into user cart after login' })
  mergeCart(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MergeCartDto,
    @Headers('x-guest-id') guestIdHeader?: string,
  ) {
    const guestId = dto.guestId ?? guestIdHeader ?? '';
    return this.cartService.mergeGuestCart(user.id, guestId);
  }
}
