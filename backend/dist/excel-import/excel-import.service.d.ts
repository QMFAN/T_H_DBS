import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Area } from '../entities/area.entity';
import { SensorData } from '../entities/sensor-data.entity';
import { ImportTask } from '../entities/import-task.entity';
import { AnomalyStore } from './anomaly-store.interface';
import type { AnomalySourceSummaryDto as AnomalySourceSummaryRecord } from './dto/import.dto';
import type { ImportAnomalyType } from './anomaly-store.interface';
import type { ImportDashboardSummaryDto, ImportHistoryItemDto, ImportAnomalyOverviewDto, ResolveAnomalyDto, UploadResponseDto, BulkResolveAnomaliesDto } from './dto/import.dto';
interface AnomalyVariantAggregate {
    variantId: string;
    temperature: string | null;
    humidity: string | null;
    totalCount: number;
    newCount: number;
    existingCount: number;
    sourceSummaries: AnomalySourceSummaryRecord[];
}
interface conflictGroup {
    areaCode: string;
    areaName: string;
    timestamp: Date;
    type: ImportAnomalyType;
    variants: AnomalyVariantAggregate[];
}
interface FileImportSummary {
    filePath: string;
    originalName: string;
    storedPath?: string;
    fileUrl?: string;
    publicUrl?: string;
    records: number;
    resolved?: number;
    duplicates?: number;
    conflicts?: number;
    anomalyGroups?: conflictGroup[];
    skipped: number;
    imported: number;
    message?: string;
    taskId?: string;
}
interface UploadedFileInput {
    path: string;
    originalname: string;
}
export declare class ExcelImportService implements OnModuleInit {
    private readonly configService;
    private readonly areaRepository;
    private readonly sensorDataRepository;
    private readonly importTaskRepository;
    private readonly anomalyStore;
    private readonly logger;
    private storageDir;
    private publicBaseUrl;
    constructor(configService: ConfigService, areaRepository: Repository<Area>, sensorDataRepository: Repository<SensorData>, importTaskRepository: Repository<ImportTask>, anomalyStore: AnomalyStore);
    onModuleInit(): void;
    importFromPaths(paths: string[]): Promise<FileImportSummary[]>;
    upload(files: UploadedFileInput[]): Promise<UploadResponseDto>;
    getDashboardSummary(): Promise<ImportDashboardSummaryDto>;
    getImportHistory(limit?: number): Promise<ImportHistoryItemDto[]>;
    deleteImportTask(taskId: string, deleteFile: boolean): Promise<void>;
    getAnomalyOverview(): Promise<ImportAnomalyOverviewDto>;
    private buildDuplicateSummary;
    private buildAnomalyGroups;
    clearAllData(): Promise<void>;
    bulkResolveAnomalies(dto: BulkResolveAnomaliesDto): Promise<void>;
    resolveAnomaly(anomalyId: string, dto: ResolveAnomalyDto): Promise<void>;
    private processBatch;
    private processInput;
    private buildFailedSummary;
    private removeTempFile;
    private saveTaskSummary;
    private saveAnomalies;
    private toVariantRecord;
    private normalizeVariantRecord;
    private normalizeSourceSummaries;
    private pickVariantNumber;
    private archiveOriginalFile;
    private parseExcelFile;
    private persistRecords;
    private normalizeAreaCode;
    private displayFileSource;
    private getOrCreateArea;
    private extractAreaInfos;
    private loadExistingRecords;
    private extractAreaNames;
    private extractAreaTokensFromHeader;
    private deriveAreaInfoFromName;
    private shouldUpdateAreaName;
    private findHeaderRow;
    private identifyColumns;
    private parseTimestamp;
    private resolveDuplicateRecords;
    private groupEntriesByVariant;
    private buildVariantAggregate;
    private buildSourceSummaries;
    private buildResolvedFileSource;
    private buildAutoResolvedFileSource;
    private pickConflictAreaName;
    private buildVariantKey;
    private normalizeImportSourceLabel;
    private snapToInterval;
    private formatDateForFile;
    private parseNumericValue;
}
export {};
