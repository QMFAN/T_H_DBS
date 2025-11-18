import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController, AnalyticsService } from './index';
import { AnalyticsCacheService } from './analytics-cache.service';
import { AnalyticsWarmupService } from './analytics-warmup.service';
import { Area } from '../entities/area.entity';
import { SensorData } from '../entities/sensor-data.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Area, SensorData])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsCacheService, AnalyticsWarmupService],
  exports: [AnalyticsService, AnalyticsCacheService],
})
export class AnalyticsModule {}