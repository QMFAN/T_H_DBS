import { Injectable } from '@nestjs/common';
import type {
  ImportAnomalyOverviewDto,
  DuplicateSummaryDto,
  DuplicateAreaSummaryDto,
} from './dto/import.dto';
import type {
  AnomalyStore,
  AnomalyStoreItemResult,
  ImportAnomalyType,
} from './anomaly-store.interface';
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

@Injectable()
export class MemoryAnomalyStoreService implements AnomalyStore {
  private readonly anomalies = new Map<string, StoredAnomaly>();
  private readonly batchIndex = new Map<string, Set<string>>();
  private readonly duplicateTtlMs: number;
  private readonly conflictTtlMs: number;

  constructor(duplicateTtlMs?: number, conflictTtlMs?: number) {
    this.duplicateTtlMs =
      typeof duplicateTtlMs === 'number' && duplicateTtlMs > 0
        ? duplicateTtlMs
        : 24 * 60 * 60 * 1000;
    this.conflictTtlMs =
      typeof conflictTtlMs === 'number' && conflictTtlMs > 0
        ? conflictTtlMs
        : Number.POSITIVE_INFINITY;
  }

  register(
    batchId: string,
    taskNumericId: number,
    records: Array<{
      anomalyId: string;
      areaName: string;
      timestamp: Date;
      type: ImportAnomalyType;
      variants: AnomalyVariantRecord[];
    }>,
  ): void {
    if (!records.length) return;
    let set = this.batchIndex.get(batchId);
    if (!set) {
      set = new Set<string>();
      this.batchIndex.set(batchId, set);
    }
    const now = Date.now();
    for (const r of records) {
      const item: StoredAnomaly = {
        anomalyId: r.anomalyId,
        taskNumericId,
        batchId,
        areaName: r.areaName,
        timestamp: r.timestamp,
        type: r.type,
        variants: r.variants,
        createdAt: now,
      };
      this.anomalies.set(item.anomalyId, item);
      set.add(item.anomalyId);
    }
  }

  async getOverview(): Promise<ImportAnomalyOverviewDto> {
    const now = Date.now();
    const duplicates: StoredAnomaly[] = [];
    const conflicts: StoredAnomaly[] = [];
    for (const anomaly of this.anomalies.values()) {
      const ttl =
        anomaly.type === 'duplicate' ? this.duplicateTtlMs : this.conflictTtlMs;
      if (now - anomaly.createdAt >= ttl) continue;
      if (anomaly.type === 'duplicate') duplicates.push(anomaly);
      else conflicts.push(anomaly);
    }
    const duplicateSummary = this.buildDuplicateSummary(duplicates);
    const groups = this.buildConflictGroups(conflicts);
    return { duplicates: duplicateSummary, conflicts: groups };
  }

  private buildDuplicateSummary(items: StoredAnomaly[]): DuplicateSummaryDto {
    const areaMap = new Map<
      string,
      { anomalyCount: number; recordCount: number }
    >();
    let totalRecords = 0;
    for (const anomaly of items) {
      const recordCount = anomaly.variants.reduce(
        (sum, v) => sum + (v.newCount ?? 0),
        0,
      );
      totalRecords += recordCount;
      const existing = areaMap.get(anomaly.areaName);
      if (existing) {
        existing.anomalyCount += 1;
        existing.recordCount += recordCount;
      } else {
        areaMap.set(anomaly.areaName, { anomalyCount: 1, recordCount });
      }
    }
    const areaSummaries: DuplicateAreaSummaryDto[] = Array.from(
      areaMap.entries(),
    ).map(([areaName, stats]) => ({
      areaName,
      anomalyCount: stats.anomalyCount,
      recordCount: stats.recordCount,
    }));
    return {
      pendingCount: items.length,
      recordCount: totalRecords,
      anomalyIds: items.map((a) => a.anomalyId),
      areaSummaries,
    };
  }

  private buildConflictGroups(items: StoredAnomaly[]): Array<{
    areaName: string;
    anomalies: Array<{
      anomalyId: string;
      timestamp: string;
      status: 'pending' | 'resolved';
      variants: AnomalyVariantRecord[];
    }>;
  }> {
    const byArea = new Map<string, StoredAnomaly[]>();
    for (const item of items) {
      const arr = byArea.get(item.areaName);
      if (arr) arr.push(item);
      else byArea.set(item.areaName, [item]);
    }
    return Array.from(byArea.entries()).map(([areaName, arr]) => ({
      areaName,
      anomalies: arr.map((a) => ({
        anomalyId: a.anomalyId,
        timestamp: a.timestamp.toISOString(),
        status: 'pending',
        variants: a.variants,
      })),
    }));
  }

  async findById(anomalyId: string): Promise<StoredAnomaly | null> {
    const a = this.anomalies.get(anomalyId);
    if (!a) return null;
    const ttl =
      a.type === 'duplicate' ? this.duplicateTtlMs : this.conflictTtlMs;
    if (Date.now() - a.createdAt >= ttl) return null;
    return a;
  }

  async resolveOne(
    anomalyId: string,
    action: 'skip' | 'overwrite',
    chooseVariantId?: string,
  ): Promise<AnomalyStoreItemResult | null> {
    const a = await this.findById(anomalyId);
    if (!a) return null;
    let v: AnomalyVariantRecord | null = null;
    if (action === 'overwrite') {
      const target = chooseVariantId
        ? a.variants.find((x) => x.variantId === chooseVariantId)
        : (a.variants.find((x) => (x.newCount ?? 0) > 0) ?? a.variants[0]);
      if (!target) return null;
      v = target;
    } else if (action === 'skip') {
      v =
        a.variants.find((x) => (x.existingCount ?? 0) > 0) ??
        a.variants[0] ??
        null;
    }
    this.delete(anomalyId);
    return {
      batchId: a.batchId,
      taskNumericId: a.taskNumericId,
      areaName: a.areaName,
      timestamp: a.timestamp,
      resolvedVariant: v,
    };
  }

  async bulkResolve(
    type: ImportAnomalyType,
    action: 'skip' | 'overwrite',
    anomalyIds: string[],
  ): Promise<Array<AnomalyStoreItemResult & { anomalyId: string }>> {
    const out: Array<AnomalyStoreItemResult & { anomalyId: string }> = [];
    for (const id of anomalyIds) {
      const a = await this.findById(id);
      if (!a || a.type !== type) continue;
      const r = await this.resolveOne(id, action);
      if (r)
        out.push({
          anomalyId: id,
          batchId: r.batchId,
          taskNumericId: r.taskNumericId,
          areaName: r.areaName,
          timestamp: r.timestamp,
          resolvedVariant: r.resolvedVariant,
        });
    }
    return out;
  }

  async pendingCountForTask(taskNumericId: number): Promise<number> {
    let count = 0;
    const now = Date.now();
    for (const a of this.anomalies.values()) {
      if (a.taskNumericId !== taskNumericId) continue;
      const ttl =
        a.type === 'duplicate' ? this.duplicateTtlMs : this.conflictTtlMs;
      if (now - a.createdAt >= ttl) continue;
      count += 1;
    }
    return count;
  }

  deleteBatch(batchId: string): void {
    const set = this.batchIndex.get(batchId);
    if (!set) return;
    for (const id of set.values()) {
      this.anomalies.delete(id);
    }
    this.batchIndex.delete(batchId);
  }

  private delete(anomalyId: string): void {
    const a = this.anomalies.get(anomalyId);
    if (!a) return;
    this.anomalies.delete(anomalyId);
    const set = this.batchIndex.get(a.batchId);
    if (set) {
      set.delete(anomalyId);
      if (set.size === 0) this.batchIndex.delete(a.batchId);
    }
  }

  async totalPending(): Promise<number> {
    let count = 0;
    const now = Date.now();
    for (const a of this.anomalies.values()) {
      const ttl =
        a.type === 'duplicate' ? this.duplicateTtlMs : this.conflictTtlMs;
      if (now - a.createdAt >= ttl) continue;
      count += 1;
    }
    return count;
  }

  async autoResolveExpired(): Promise<
    Array<AnomalyStoreItemResult & { anomalyId: string }>
  > {
    const out: Array<AnomalyStoreItemResult & { anomalyId: string }> = [];
    const now = Date.now();
    for (const [id, a] of this.anomalies.entries()) {
      const ttl =
        a.type === 'duplicate' ? this.duplicateTtlMs : this.conflictTtlMs;
      if (a.type !== 'duplicate') continue;
      if (now - a.createdAt < ttl) continue;
      let v: AnomalyVariantRecord | null = null;
      v =
        a.variants.find((x) => (x.existingCount ?? 0) > 0) ??
        a.variants[0] ??
        null;
      this.delete(id);
      out.push({
        anomalyId: id,
        batchId: a.batchId,
        taskNumericId: a.taskNumericId,
        areaName: a.areaName,
        timestamp: a.timestamp,
        resolvedVariant: v,
      });
    }
    return out;
  }
}
