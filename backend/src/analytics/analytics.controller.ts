import {
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Body,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('overview')
  async overview() {
    return this.analytics.getOverview();
  }

  @Get('areas')
  async areas(
    @Query('areaIds') areaIds?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sort') sort?: 'count' | 'name' | 'min' | 'max',
    @Query('order') order?: 'asc' | 'desc',
  ) {
    const ids = areaIds
      ? areaIds
          .split(',')
          .map((v) => parseInt(v, 10))
          .filter((v) => !Number.isNaN(v))
      : undefined;
    const startDate = start ? new Date(parseInt(start, 10)) : undefined;
    const endDate = end ? new Date(parseInt(end, 10)) : undefined;
    return this.analytics.getAreas({
      areaIds: ids,
      start: startDate,
      end: endDate,
      page: page ? parseInt(page, 10) : 1,
      pageSize: pageSize ? parseInt(pageSize, 10) : 20,
      sort,
      order,
    });
  }

  @Get('area/segments')
  async areaSegments(
    @Query('areaId') areaId: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('granularity') granularity?: 'record' | 'day',
    @Query('limit') limit?: string,
    @Query('gapToleranceMinutes') gapToleranceMinutes?: string,
  ) {
    const id = parseInt(areaId, 10);
    const startDate = start ? new Date(parseInt(start, 10)) : undefined;
    const endDate = end ? new Date(parseInt(end, 10)) : undefined;
    const lim = limit ? parseInt(limit, 10) : undefined;
    const gap = gapToleranceMinutes
      ? parseInt(gapToleranceMinutes, 10)
      : undefined;
    return this.analytics.getAreaSegments({
      areaId: id,
      start: startDate,
      end: endDate,
      granularity,
      limit: lim,
      gapToleranceMinutes: gap,
    });
  }

  @Post('export')
  async export(
    @Res() res: Response,
    @Body()
    body: {
      areaIds?: number[];
      ranges?: { start: number; end: number }[];
      granularity?: 'record' | 'day';
    },
  ) {
    const areaIds = body.areaIds ?? [];
    const ranges = (body.ranges ?? []).map((r) => ({
      start: new Date(r.start),
      end: new Date(r.end),
    }));
    await this.analytics.streamExport(res, {
      areaIds,
      ranges,
      granularity: body.granularity,
    });
  }

  @Post('data/delete')
  async deleteData(
    @Body()
    body: {
      areaIds?: number[];
      ranges?: { start: number; end: number }[];
      dryRun?: boolean;
      batchSize?: number;
    },
  ) {
    const areaIds = (body.areaIds ?? [])
      .map((v) => Number(v))
      .filter((v) => !Number.isNaN(v));
    const ranges = (body.ranges ?? []).map((r) => ({
      start: new Date(r.start),
      end: new Date(r.end),
    }));
    const dryRun = body.dryRun ?? true;
    const batchSize = Math.min(10000, Math.max(100, body.batchSize ?? 2000));
    if (dryRun) {
      return this.analytics.previewDelete({ areaIds, ranges });
    }
    return this.analytics.deleteData({ areaIds, ranges, batchSize });
  }
}
