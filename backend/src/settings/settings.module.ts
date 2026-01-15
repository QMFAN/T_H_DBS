import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaDefaultsEntity } from '../entities/area-defaults.entity';
import { SettingsService, SettingsController } from './index';
import { SchemaInitService } from './schema-init.service';
import { Area } from '../entities/area.entity';
import { SensorData } from '../entities/sensor-data.entity';
import { ImportTask } from '../entities/import-task.entity';
import { ExcelImportModule } from '../excel-import/excel-import.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AreaDefaultsEntity,
      Area,
      SensorData,
      ImportTask,
    ]),
    ExcelImportModule,
    AnalyticsModule,
  ],
  providers: [SettingsService, SchemaInitService],
  controllers: [SettingsController],
})
export class SettingsModule {}
