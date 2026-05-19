import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from './common/decorators/public.decorator';
import { AppService, type HealthStatus } from './app.service';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        service: 'carnage-api',
        env: 'development',
        uptimeSeconds: 42,
        timestamp: '2026-05-19T10:00:00.000Z',
      },
    },
  })
  health(): HealthStatus {
    return this.appService.health();
  }
}
