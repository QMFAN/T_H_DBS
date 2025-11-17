import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { SmartAnalyticsService } from './smart-analytics.service';
import { QueryDto } from './dto/query.dto';
import { AnalyzeDto } from './dto/analyze.dto';
import { SegmentsDto } from './dto/segments.dto';

@Controller('smart')
export class SmartAnalyticsController {
  constructor(private readonly service: SmartAnalyticsService) {}

  @Get('areas')
  async areas() {
    return this.service.getAreas();
  }

  @Get('query')
  async query(@Query() dto: QueryDto) {
    return this.service.query(dto);
  }

  @Get('segments')
  async segments(@Query() dto: SegmentsDto) {
    return this.service.segments(dto);
  }

  @Post('analyze')
  async analyze(@Body() dto: AnalyzeDto) {
    return this.service.analyze(dto);
  }
}