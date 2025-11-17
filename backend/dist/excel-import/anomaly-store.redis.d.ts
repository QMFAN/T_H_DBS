import type { ImportAnomalyOverviewDto } from './dto/import.dto';
import type { AnomalyStore, AnomalyStoreItemResult, ImportAnomalyType } from './anomaly-store.interface';
import type { AnomalyVariantDto as AnomalyVariantRecord } from './dto/import.dto';
export declare class RedisAnomalyStoreService implements AnomalyStore {
    private readonly redis;
    private readonly ttlMs;
    constructor(url: string, ttlMs: number);
    register(batchId: string, taskNumericId: number, records: Array<{
        anomalyId: string;
        areaName: string;
        timestamp: Date;
        type: ImportAnomalyType;
        variants: AnomalyVariantRecord[];
    }>): void;
    getOverview(): Promise<ImportAnomalyOverviewDto>;
    findById(anomalyId: string): Promise<{
        anomalyId: string;
        taskNumericId: number;
        batchId: string;
        areaName: string;
        timestamp: Date;
        type: ImportAnomalyType;
        variants: AnomalyVariantRecord[];
    } | null>;
    resolveOne(anomalyId: string, action: 'skip' | 'overwrite', chooseVariantId?: string): Promise<AnomalyStoreItemResult | null>;
    bulkResolve(type: ImportAnomalyType, action: 'skip' | 'overwrite', anomalyIds: string[]): Promise<Array<AnomalyStoreItemResult & {
        anomalyId: string;
    }>>;
    pendingCountForTask(taskNumericId: number): Promise<number>;
    deleteBatch(batchId: string): Promise<void>;
    totalPending(): Promise<number>;
    private buildDuplicateSummary;
    private buildConflictGroups;
    private keyAnomaly;
    private keyBatchSet;
    private keyTaskSet;
}
