import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import type { DatabaseConfig } from '@/config/configuration';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.getOrThrow<DatabaseConfig>('database');
        return {
          uri: db.uri,
          autoIndex: config.get<string>('app.env') !== 'production',
        };
      },
    }),
  ],
})
export class DatabaseModule {}
