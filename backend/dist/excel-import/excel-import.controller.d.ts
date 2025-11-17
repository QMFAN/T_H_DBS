import { ExcelImportService } from './excel-import.service';
import type { ImportDashboardSummaryDto, ImportHistoryItemDto, ImportAnomalyOverviewDto, UploadResponseDto, ResolveAnomalyDto, BulkResolveAnomaliesDto, PaginatedImportHistoryDto } from './dto/import.dto';
export declare class ExcelImportController {
    private readonly excelImportService;
    private readonly logger;
    constructor(excelImportService: ExcelImportService);
    private decodeOriginalName;
    getDashboardSummary(): Promise<ImportDashboardSummaryDto>;
    getHistory(limit?: string): Promise<ImportHistoryItemDto[]>;
    getHistoryPaged(page?: string, pageSize?: string): Promise<PaginatedImportHistoryDto>;
    deleteHistory(taskId: string, deleteFile?: string): Promise<void>;
    getAnomalies(): Promise<ImportAnomalyOverviewDto>;
    bulkResolveLegacy(body: BulkResolveAnomaliesDto): Promise<void>;
    resolveAnomaly(anomalyId: string, body: ResolveAnomalyDto): Promise<void>;
    resetData(): Promise<void>;
    uploadFiles(files: unknown[]): Promise<UploadResponseDto>;
}
