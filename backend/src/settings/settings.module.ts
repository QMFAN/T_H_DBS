import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AreaDefaultsEntity } from '../entities/area-defaults.entity'
import { SettingsService, SettingsController } from './index'
import { SchemaInitService } from './schema-init.service'
import { Area } from '../entities/area.entity'

@Module({
  imports: [TypeOrmModule.forFeature([AreaDefaultsEntity, Area])],
  providers: [SettingsService, SchemaInitService],
  controllers: [SettingsController],
})
export class SettingsModule {}