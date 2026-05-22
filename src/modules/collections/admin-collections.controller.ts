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

import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@ApiTags('admin-collections')
@ApiBearerAuth('access-token')
@Controller('admin/collections')
export class AdminCollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Roles('super_admin')
  @Get()
  @ApiOperation({ summary: 'List all collections paginated (super_admin)' })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.collectionsService.findAllPaged(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Roles('super_admin')
  @Get(':id')
  @ApiOperation({ summary: 'Get a collection by id (super_admin)' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.collectionsService.findById(id);
  }

  @Roles('super_admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a collection (super_admin)' })
  create(@Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(dto);
  }

  @Roles('super_admin')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a collection (super_admin)' })
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateCollectionDto) {
    return this.collectionsService.update(id, dto);
  }

  @Roles('super_admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a collection (super_admin)' })
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.collectionsService.remove(id);
  }
}
