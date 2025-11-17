import type { ImportAnomalyOverviewDto } from './dto/import.dto';
import type { AnomalyStore, AnomalyStoreItemResult, ImportAnomalyType } from './anomaly-store.interface';
import type { AnomalyVariantDto as AnomalyVariantRecord } from './dto/import.dto';
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
export declare class MemoryAnomalyStoreService implements AnomalyStore {
    private readonly anomalies;
    private readonly batchIndex;
    private readonly ttlMs;
    constructor(ttlMs?: number);
    register(batchId: string, taskNumericId: number, records: Array<{
        anomalyId: string;
        areaName: string;
        timestamp: Date;
        type: ImportAnomalyType;
        variants: AnomalyVariantRecord[];
    }>): void;
    getOverview(): Promise<ImportAnomalyOverviewDto>;
    private buildDuplicateSummary;
    private buildConflictGroups;
    findById(anomalyId: string): Promise<StoredAnomaly | null>;
    resolveOne(anomalyId: string, action: 'skip' | 'overwrite', chooseVariantId?: string): Promise<AnomalyStoreItemResult | null>;
    bulkResolve(type: ImportAnomalyType, action: 'skip' | 'overwrite', anomalyIds: string[]): Promise<Array<AnomalyStoreItemResult & {
        anomalyId: string;
    }>>;
    pendingCountForTask(taskNumericId: number): Promise<number>;
    deleteBatch(batchId: string): void;
    private delete;
    totalPending(): Promise<number>;
}
export {};
