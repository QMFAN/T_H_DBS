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
import { ExcelImportController } from './excel-import.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Area, SensorData, ImportTask]),
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
        const storeType = (config.get<string>('IMPORT_ANOMALY_STORE', 'memory') || 'memory').toLowerCase()
        const ttlSeconds = parseInt(config.get<string>('IMPORT_ANOMALY_TTL', '86400'), 10)
        const ttlMs = Number.isFinite(ttlSeconds) ? ttlSeconds * 1000 : 24 * 60 * 60 * 1000
        if (storeType === 'redis') {
          const url = config.get<string>('REDIS_URL', 'redis://127.0.0.1:6379')
          return new RedisAnomalyStoreService(url, ttlMs)
        }
        return new MemoryAnomalyStoreService(ttlMs)
      },
    },
  ],
  exports: [ExcelImportService, ANOMALY_STORE],
})
export class ExcelImportModule {}

