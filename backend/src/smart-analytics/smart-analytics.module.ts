import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmartAnalyticsController } from './smart-analytics.controller';
import { SmartAnalyticsService } from './smart-analytics.service';
import { Area } from '../entities/area.entity';
import { SensorData } from '../entities/sensor-data.entity';
import { AreaDefaultsEntity } from '../entities/area-defaults.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Area, SensorData, AreaDefaultsEntity])],
  controllers: [SmartAnalyticsController],
  providers: [SmartAnalyticsService],
})
export class SmartAnalyticsModule {}