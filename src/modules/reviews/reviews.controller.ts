import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';
import type { AuthenticatedUser } from '@/common/types/auth.types';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('products/:slug/reviews')
  @ApiOperation({ summary: 'Get approved reviews for a product' })
  findByProduct(
    @Param('slug') slug: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.reviewsService.findByProduct(slug, +page, +limit);
  }

  @Post('reviews')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a review (must be authenticated)' })
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reviewsService.create(dto, user.id);
  }

  @Roles('super_admin')
  @Get('admin/reviews')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get pending reviews (super_admin)' })
  pending() { return this.reviewsService.findPending(); }

  @Roles('super_admin')
  @Patch('admin/reviews/:id/approve')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Approve a review (super_admin)' })
  approve(@Param('id', ParseObjectIdPipe) id: string) { return this.reviewsService.approve(id); }

  @Roles('super_admin')
  @Delete('admin/reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a review (super_admin)' })
  remove(@Param('id', ParseObjectIdPipe) id: string) { return this.reviewsService.remove(id); }
}
