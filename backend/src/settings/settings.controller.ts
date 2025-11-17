import { Controller, Get, Query, Put, Body } from '@nestjs/common'
import { SettingsService } from './settings.service'

@Controller('settings')
export class SettingsController {
  constructor(private readonly svc: SettingsService) {}

  @Get('areas')
  async areas() { return { areas: await this.svc.listAreas() } }

  @Get('defaults')
  async getDefaults(@Query('area') area: string) { return { area, defaults: area ? await this.svc.getDefaults(area) : null } }

  @Put('defaults')
  async upsert(@Body() body: any) { return { success: true, defaults: await this.svc.upsertDefaults(body) } }
}