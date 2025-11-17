import type { ImportAnomalyOverviewDto } from './dto/import.dto';
import type { AnomalyVariantDto as AnomalyVariantRecord } from './dto/import.dto';
export type ImportAnomalyType = 'duplicate' | 'conflict';
interface StoredAnomaly {
    anomalyId: string;
    taskNumericId: number;
    batchId: string;
    areaName: string;
    timestamp: Date;
    type: ImportAnomalyType;
    variants: AnomalyVariantRecord[];
    createdAt: number;
}
export declare class AnomalyStoreService {
    private readonly anomalies;
    private readonly batchIndex;
    private readonly ttlMs;
    register(batchId: string, taskNumericId: number, records: Array<{
        anomalyId: string;
        areaName: string;
        timestamp: Date;
        type: ImportAnomalyType;
        variants: AnomalyVariantRecord[];
    }>): void;
    getOverview(): ImportAnomalyOverviewDto;
    private buildDuplicateSummary;
    private buildConflictGroups;
    findById(anomalyId: string): StoredAnomaly | null;
    resolveOne(anomalyId: string, action: 'skip' | 'overwrite', chooseVariantId?: string): {
        batchId: string;
        taskNumericId: number;
        resolvedVariant: AnomalyVariantRecord | null;
    } | null;
    bulkResolve(type: ImportAnomalyType, action: 'skip' | 'overwrite', anomalyIds: string[]): Array<{
        batchId: string;
        taskNumericId: number;
        anomalyId: string;
        resolvedVariant: AnomalyVariantRecord | null;
    }>;
    pendingCountForTask(taskNumericId: number): number;
    deleteBatch(batchId: string): void;
    private delete;
    totalPending(): number;
}
export {};
