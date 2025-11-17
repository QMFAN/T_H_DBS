import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController, AnalyticsService } from './index';
import { Area } from '../entities/area.entity';
import { SensorData } from '../entities/sensor-data.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Area, SensorData])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}