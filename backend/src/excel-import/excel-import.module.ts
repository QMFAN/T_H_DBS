import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as os from 'node:os';
import { Area } from '../entities/area.entity';
import { SensorData } from '../entities/sensor-data.entity';
import { ImportTask } from '../entities/import-task.entity';
import { MemoryAnomalyStoreService } from './anomaly-store.memory';
import { RedisAnomalyStoreService } from './anomaly-store.redis';
import { ANOMALY_STORE } from './anomaly-store.interface';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ExcelImportService } from './excel-import.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ExcelImportController } from './excel-import.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Area, SensorData, ImportTask]),
    AnalyticsModule,
    MulterModule.register({
      dest: os.tmpdir(),
    }),
  ],
  controllers: [ExcelImportController],
  providers: [
    ExcelImportService,
    {
      provide: ANOMALY_STORE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const storeType = (
          config.get<string>('IMPORT_ANOMALY_STORE', 'memory') || 'memory'
        ).toLowerCase();
        const dupSeconds = parseInt(
          config.get<string>('IMPORT_DUPLICATE_TTL', '86400'),
          10,
        );
        const dupMs =
          Number.isFinite(dupSeconds) && dupSeconds > 0
            ? dupSeconds * 1000
            : 24 * 60 * 60 * 1000;
        const confSeconds = parseInt(
          config.get<string>('IMPORT_CONFLICT_TTL', '0'),
          10,
        );
        const confMs =
          Number.isFinite(confSeconds) && confSeconds > 0
            ? confSeconds * 1000
            : Number.POSITIVE_INFINITY;
        if (storeType === 'redis') {
          const url = config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379');
          return new RedisAnomalyStoreService(url, dupMs);
        }
        return new MemoryAnomalyStoreService(dupMs, confMs);
      },
    },
  ],
  exports: [ExcelImportService, ANOMALY_STORE],
})
export class ExcelImportModule {}
