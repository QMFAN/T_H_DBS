import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ExcelImportService } from './excel-import.service';
import type {
  ImportDashboardSummaryDto,
  ImportHistoryItemDto,
  ImportAnomalyOverviewDto,
  UploadResponseDto,
  ResolveAnomalyDto,
  BulkResolveAnomaliesDto,
  PaginatedImportHistoryDto,
} from './dto/import.dto';

@Controller('imports')
export class ExcelImportController {
  private readonly logger = new Logger(ExcelImportController.name);

  constructor(private readonly excelImportService: ExcelImportService) {}

  private decodeOriginalName(rawName: string | undefined): string | undefined {
    if (!rawName) {
      return rawName;
    }
    try {
      const buffer = Buffer.from(rawName, 'latin1');
      const decoded = buffer.toString('utf8');
      return decoded.includes('\uFFFD') ? rawName : decoded;
    } catch (error) {
      this.logger.warn(`Failed to decode filename ${rawName}: ${(error as Error).message}`);
      return rawName;
    }
  }

  @Get('summary')
  async getDashboardSummary(): Promise<ImportDashboardSummaryDto> {
    return this.excelImportService.getDashboardSummary();
  }

  @Get('history')
  async getHistory(
    @Query('limit') limit?: string,
  ): Promise<ImportHistoryItemDto[]> {
    const parsedLimit = limit ? Number(limit) : undefined;
    if (parsedLimit !== undefined && (Number.isNaN(parsedLimit) || parsedLimit <= 0)) {
      throw new BadRequestException('limit must be a positive number');
    }
    return this.excelImportService.getImportHistory(parsedLimit);
  }

  @Get('history/page')
  async getHistoryPaged(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<PaginatedImportHistoryDto> {
    const p = page ? Number(page) : 1;
    const ps = pageSize ? Number(pageSize) : 10;
    if (!Number.isFinite(p) || p < 1) {
      throw new BadRequestException('page must be >= 1');
    }
    if (!Number.isFinite(ps) || ps < 1 || ps > 100) {
      throw new BadRequestException('pageSize must be in 1..100');
    }
    return this.excelImportService.getImportHistoryPaged(p, ps);
  }

  @Delete('history/:taskId')
  async deleteHistory(
    @Param('taskId') taskId: string,
    @Query('deleteFile') deleteFile?: string,
  ): Promise<void> {
    if (!taskId) {
      throw new BadRequestException('taskId is required');
    }
    const shouldDeleteFile = String(deleteFile).toLowerCase() === 'true';
    await this.excelImportService.deleteImportTask(taskId, shouldDeleteFile);
  }

  @Post('history/bulk-delete')
  async bulkDeleteHistory(@Body() body: { taskIds: string[]; deleteFile?: boolean }): Promise<{ deleted: number }> {
    const ids = Array.isArray(body?.taskIds) ? body.taskIds.filter((x) => typeof x === 'string' && x.trim()) : []
    if (!ids.length) {
      throw new BadRequestException('taskIds is required')
    }
    const deleted = await this.excelImportService.bulkDeleteImportTasks(ids, !!body?.deleteFile)
    return { deleted }
  }

  @Get('conflicts')
  async getAnomalies(): Promise<ImportAnomalyOverviewDto> {
    return this.excelImportService.getAnomalyOverview();
  }

  @Post('conflicts/bulk-resolve')
  async bulkResolveLegacy(@Body() body: BulkResolveAnomaliesDto): Promise<void> {
    await this.excelImportService.bulkResolveAnomalies(body);
  }

  @Post('conflicts/:anomalyId/resolve')
  async resolveAnomaly(
    @Param('anomalyId') anomalyId: string,
    @Body() body: ResolveAnomalyDto,
  ): Promise<void> {
    if (!anomalyId) {
      throw new BadRequestException('anomalyId is required');
    }
    await this.excelImportService.resolveAnomaly(anomalyId, body);
  }

  @Delete('reset')
  async resetData(): Promise<void> {
    await this.excelImportService.clearAllData();
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFiles(@UploadedFiles() files: unknown[]): Promise<UploadResponseDto> {
    const normalized = (Array.isArray(files) ? files : []).map((file) => {
      const typed = file as { path?: string; originalname?: string };
      if (!typed?.path || !typed?.originalname) {
        return null;
      }
      return {
        path: typed.path,
        originalname: this.decodeOriginalName(typed.originalname) ?? typed.originalname,
      };
    }).filter((item): item is { path: string; originalname: string } => item !== null);

    if (!normalized.length) {
      throw new BadRequestException('未收到有效的上传文件');
    }

    return this.excelImportService.upload(normalized);
  }
}

