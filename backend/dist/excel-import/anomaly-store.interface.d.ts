import type { ImportAnomalyOverviewDto } from './dto/import.dto';
import type { AnomalyVariantDto } from './dto/import.dto';
import { InjectionToken } from '@nestjs/common';
export interface AnomalyStoreItemResult {
    batchId: string;
    taskNumericId: number;
    areaName: string;
    timestamp: Date;
    resolvedVariant: AnomalyVariantDto | null;
}
export interface AnomalyStore {
    register(batchId: string, taskNumericId: number, records: Array<{
        anomalyId: string;
        areaName: string;
        timestamp: Date;
        type: ImportAnomalyType;
        variants: AnomalyVariantDto[];
    }>): void;
    getOverview(): Promise<ImportAnomalyOverviewDto>;
    findById(anomalyId: string): Promise<{
        anomalyId: string;
        taskNumericId: number;
        batchId: string;
        areaName: string;
        timestamp: Date;
        type: ImportAnomalyType;
        variants: AnomalyVariantDto[];
    } | null>;
    resolveOne(anomalyId: string, action: 'skip' | 'overwrite', chooseVariantId?: string): Promise<AnomalyStoreItemResult | null>;
    bulkResolve(type: ImportAnomalyType, action: 'skip' | 'overwrite', anomalyIds: string[]): Promise<Array<AnomalyStoreItemResult & {
        anomalyId: string;
    }>>;
    pendingCountForTask(taskNumericId: number): Promise<number>;
    deleteBatch(batchId: string): void;
    totalPending(): Promise<number>;
}
export declare const ANOMALY_STORE: InjectionToken;
export type ImportAnomalyType = 'duplicate' | 'conflict';
export type AnomalyVariantRecord = AnomalyVariantDto;
