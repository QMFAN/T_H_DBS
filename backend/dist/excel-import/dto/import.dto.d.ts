export interface AnomalySourceSummaryDto {
    label: string;
    count: number;
    type: 'new' | 'existing';
}
export interface AnomalyVariantDto {
    variantId: string;
    temperature: string | null;
    humidity: string | null;
    totalCount: number;
    newCount: number;
    existingCount: number;
    sourceSummaries: AnomalySourceSummaryDto[];
}
export interface AnomalyDetailDto {
    anomalyId: string;
    timestamp: string;
    status: 'pending' | 'resolved';
    variants: AnomalyVariantDto[];
}
export interface AnomalyAreaGroupDto {
    areaName: string;
    anomalies: AnomalyDetailDto[];
}
export interface DuplicateAreaSummaryDto {
    areaName: string;
    anomalyCount: number;
    recordCount: number;
}
export interface DuplicateSummaryDto {
    pendingCount: number;
    recordCount: number;
    anomalyIds: string[];
    areaSummaries: DuplicateAreaSummaryDto[];
}
export interface ImportAnomalyOverviewDto {
    duplicates: DuplicateSummaryDto;
    conflicts: AnomalyAreaGroupDto[];
}
export interface ImportHistoryItemDto {
    id: string;
    fileName: string;
    imported: number;
    duplicates: number;
    conflicts: number;
    fileUrl?: string;
    uploadedAt: string;
}
export interface ImportDashboardSummaryDto {
    pendingFiles: number;
    importedRecords: number;
    pendingConflicts: number;
    lastImportAt?: string;
}
export interface UploadResponseDto {
    taskId: string;
    imported: number;
    duplicates: number;
    conflicts: number;
    message?: string;
}
export interface ResolveAnomalyDto {
    action: 'skip' | 'overwrite';
    variantId?: string;
}
export interface BulkResolveAnomaliesDto {
    type: 'duplicate' | 'conflict';
    action: 'skip' | 'overwrite';
    anomalyIds?: string[];
}
