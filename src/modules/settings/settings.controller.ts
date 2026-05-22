import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get('settings')
  @ApiOperation({ summary: 'Get site settings (public)' })
  get() { return this.settingsService.get(); }

  @Roles('super_admin')
  @Patch('admin/settings')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update site settings (super_admin)' })
  update(@Body() body: Record<string, unknown>) {
    return this.settingsService.update(body as any);
  }
}
