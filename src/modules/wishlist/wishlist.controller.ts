import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/types/auth.types';
import { WishlistService } from './wishlist.service';

class WishlistItemDto { @IsMongoId() productId!: string; }

@ApiTags('wishlist')
@ApiBearerAuth('access-token')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get() @ApiOperation({ summary: 'Get wishlist' })
  get(@CurrentUser() user: AuthenticatedUser) { return this.wishlistService.get(user.id); }

  @Post() @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Add product to wishlist' })
  add(@CurrentUser() user: AuthenticatedUser, @Body() dto: WishlistItemDto) {
    return this.wishlistService.add(user.id, dto.productId);
  }

  @Delete(':productId') @HttpCode(HttpStatus.OK) @ApiOperation({ summary: 'Remove from wishlist' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('productId') productId: string) {
    return this.wishlistService.remove(user.id, productId);
  }
}
