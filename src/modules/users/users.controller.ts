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
import * as bcrypt from 'bcrypt';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '@/common/pipes/parse-object-id.pipe';
import type { AuthenticatedUser } from '@/common/types/auth.types';

import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ---- Own profile ----

  @Get('users/me')
  @ApiOperation({ summary: 'Get own profile' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findById(user.id);
  }

  @Patch('users/me')
  @ApiOperation({ summary: 'Update own profile' })
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.update(user.id, dto);
  }

  // ---- Addresses ----

  @Get('users/me/addresses')
  @ApiOperation({ summary: 'List own addresses' })
  async listAddresses(@CurrentUser() user: AuthenticatedUser) {
    const me = await this.usersService.findById(user.id);
    return me?.addresses ?? [];
  }

  @Post('users/me/addresses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an address' })
  async addAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    const me = await this.usersService.findById(user.id);
    if (!me) return;
    if (dto.isDefault) {
      me.addresses.forEach((a) => (a.isDefault = false));
    }
    me.addresses.push(dto as any);
    await me.save();
    return me.addresses;
  }

  @Patch('users/me/addresses/:addrId')
  @ApiOperation({ summary: 'Update an address' })
  async updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addrId') addrId: string,
    @Body() dto: Partial<CreateAddressDto>,
  ) {
    const me = await this.usersService.findById(user.id);
    if (!me) return;
    const addr = me.addresses.find((a) => (a as any)._id?.toString() === addrId);
    if (!addr) return;
    if (dto.isDefault) {
      me.addresses.forEach((a) => (a.isDefault = false));
    }
    Object.assign(addr, dto);
    await me.save();
    return me.addresses;
  }

  @Delete('users/me/addresses/:addrId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  async removeAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('addrId') addrId: string,
  ) {
    const me = await this.usersService.findById(user.id);
    if (!me) return;
    me.addresses = me.addresses.filter(
      (a) => (a as any)._id?.toString() !== addrId,
    );
    await me.save();
  }

  // ---- Super admin: user management ----

  @Roles('super_admin')
  @Get('admin/users')
  @ApiOperation({ summary: 'List all users (super_admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false })
  listAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('role') role?: string,
  ) {
    const filter = role ? { role } : {};
    return this.usersService.findAll(filter, +page, +limit);
  }

  @Roles('super_admin')
  @Post('admin/users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a branch_admin or customer (super_admin)' })
  async createAdminUser(@Body() dto: CreateAdminUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.usersService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: dto.role,
      emailVerified: true,
    });
  }

  @Roles('super_admin')
  @Delete('admin/users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a user (super_admin)' })
  deactivate(@Param('id', ParseObjectIdPipe) id: string) {
    return this.usersService.deactivate(id);
  }
}
