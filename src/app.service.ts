import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AppConfig } from './config/configuration';

export interface HealthStatus {
  status: 'ok';
  service: string;
  env: string;
  uptimeSeconds: number;
  timestamp: string;
}

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  health(): HealthStatus {
    const app = this.config.getOrThrow<AppConfig>('app');
    return {
      status: 'ok',
      service: 'carnage-api',
      env: app.env,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
