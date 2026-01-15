import { Injectable } from '@nestjs/common';
import type {
  ImportAnomalyOverviewDto,
  DuplicateAreaSummaryDto,
  DuplicateSummaryDto,
} from './dto/import.dto';
import type {
  AnomalyStore,
  AnomalyStoreItemResult,
  ImportAnomalyType,
} from './anomaly-store.interface';
import type { AnomalyVariantDto as AnomalyVariantRecord } from './dto/import.dto';
import Redis from 'ioredis';

type Stored = {
  anomalyId: string;
  taskNumericId: number;
  batchId: string;
  areaName: string;
  timestamp: string;
  type: ImportAnomalyType;
  variants: AnomalyVariantRecord[];
  createdAt: number;
};

@Injectable()
export class RedisAnomalyStoreService implements AnomalyStore {
  private readonly redis: Redis;
  private readonly ttlMs: number;

  constructor(url: string, ttlMs: number) {
    this.redis = new Redis(url);
    this.ttlMs = ttlMs;
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
    const now = Date.now();
    const pipeline = this.redis.pipeline();
    for (const r of records) {
      const payload: Stored = {
        anomalyId: r.anomalyId,
        taskNumericId,
        batchId,
        areaName: r.areaName,
        timestamp: r.timestamp.toISOString(),
        type: r.type,
        variants: r.variants,
        createdAt: now,
      };
      if (r.type === 'duplicate') {
        pipeline.set(
          this.keyAnomaly(r.anomalyId),
          JSON.stringify(payload),
          'PX',
          this.ttlMs,
        );
      } else {
        pipeline.set(this.keyAnomaly(r.anomalyId), JSON.stringify(payload));
      }
      pipeline.sadd(this.keyBatchSet(batchId), r.anomalyId);
      pipeline.pexpire(this.keyBatchSet(batchId), this.ttlMs);
      pipeline.sadd(this.keyTaskSet(taskNumericId), r.anomalyId);
      pipeline.pexpire(this.keyTaskSet(taskNumericId), this.ttlMs);
    }
    pipeline.exec();
  }

  async getOverview(): Promise<ImportAnomalyOverviewDto> {
    const allKeys = await this.redis.keys(this.keyAnomaly('*'));
    if (!allKeys.length)
      return {
        duplicates: {
          pendingCount: 0,
          recordCount: 0,
          anomalyIds: [],
          areaSummaries: [],
        },
        conflicts: [],
      };
    const res = await this.redis.mget(...allKeys);
    const now = Date.now();
    const duplicates: Stored[] = [];
    const conflicts: Stored[] = [];
    for (const raw of res) {
      if (!raw) continue;
      const item = JSON.parse(raw) as Stored;
      if (now - item.createdAt >= this.ttlMs) continue;
      if (item.type === 'duplicate') duplicates.push(item);
      else conflicts.push(item);
    }
    const duplicateSummary = this.buildDuplicateSummary(duplicates);
    const groups = this.buildConflictGroups(conflicts);
    return { duplicates: duplicateSummary, conflicts: groups };
  }

  async findById(anomalyId: string): Promise<{
    anomalyId: string;
    taskNumericId: number;
    batchId: string;
    areaName: string;
    timestamp: Date;
    type: ImportAnomalyType;
    variants: AnomalyVariantRecord[];
  } | null> {
    const raw = await this.redis.get(this.keyAnomaly(anomalyId));
    if (!raw) return null;
    const item = JSON.parse(raw) as Stored;
    if (Date.now() - item.createdAt >= this.ttlMs) return null;
    return {
      anomalyId: item.anomalyId,
      taskNumericId: item.taskNumericId,
      batchId: item.batchId,
      areaName: item.areaName,
      timestamp: new Date(item.timestamp),
      type: item.type,
      variants: item.variants,
    };
  }

  async resolveOne(
    anomalyId: string,
    action: 'skip' | 'overwrite',
    chooseVariantId?: string,
  ): Promise<AnomalyStoreItemResult | null> {
    const raw = await this.redis.get(this.keyAnomaly(anomalyId));
    if (!raw) return null;
    const a = JSON.parse(raw) as Stored;
    const now = Date.now();
    if (now - a.createdAt >= this.ttlMs) return null;
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
    const pipe = this.redis.pipeline();
    pipe.del(this.keyAnomaly(anomalyId));
    pipe.srem(this.keyBatchSet(a.batchId), anomalyId);
    pipe.srem(this.keyTaskSet(a.taskNumericId), anomalyId);
    await pipe.exec();
    return {
      batchId: a.batchId,
      taskNumericId: a.taskNumericId,
      areaName: a.areaName,
      timestamp: new Date(a.timestamp),
      resolvedVariant: v,
    };
  }

  async bulkResolve(
    type: ImportAnomalyType,
    action: 'skip' | 'overwrite',
    anomalyIds: string[],
  ): Promise<Array<AnomalyStoreItemResult & { anomalyId: string }>> {
    const keys = anomalyIds.map((id) => this.keyAnomaly(id));
    const raws = await this.redis.mget(...keys);
    const now = Date.now();
    const toDelete: Array<{ batchId: string; anomalyId: string }> = [];
    const results: Array<AnomalyStoreItemResult & { anomalyId: string }> = [];
    for (let i = 0; i < anomalyIds.length; i++) {
      const raw = raws[i];
      if (!raw) continue;
      const a = JSON.parse(raw) as Stored;
      if (now - a.createdAt >= this.ttlMs) continue;
      if (a.type !== type) continue;
      let v: AnomalyVariantRecord | null = null;
      if (action === 'overwrite') {
        v =
          a.variants.find((x) => (x.newCount ?? 0) > 0) ??
          a.variants[0] ??
          null;
      } else {
        v =
          a.variants.find((x) => (x.existingCount ?? 0) > 0) ??
          a.variants[0] ??
          null;
      }
      toDelete.push({ batchId: a.batchId, anomalyId: a.anomalyId });
      results.push({
        anomalyId: anomalyIds[i],
        batchId: a.batchId,
        taskNumericId: a.taskNumericId,
        areaName: a.areaName,
        timestamp: new Date(a.timestamp),
        resolvedVariant: v,
      });
    }
    if (toDelete.length) {
      const pipe = this.redis.pipeline();
      for (const d of toDelete) {
        pipe.del(this.keyAnomaly(d.anomalyId));
        pipe.srem(this.keyBatchSet(d.batchId), d.anomalyId);
        const item = results.find((r) => r.anomalyId === d.anomalyId);
        if (item) {
          pipe.srem(this.keyTaskSet(item.taskNumericId), d.anomalyId);
        }
      }
      await pipe.exec();
    }
    return results;
  }

  async pendingCountForTask(taskNumericId: number): Promise<number> {
    return this.redis.scard(this.keyTaskSet(taskNumericId));
  }

  async deleteBatch(batchId: string): Promise<void> {
    const members = await this.redis.smembers(this.keyBatchSet(batchId));
    if (members.length) {
      const pipeline = this.redis.pipeline();
      for (const id of members) pipeline.del(this.keyAnomaly(id));
      pipeline.del(this.keyBatchSet(batchId));
      await pipeline.exec();
    } else {
      await this.redis.del(this.keyBatchSet(batchId));
    }
  }

  async totalPending(): Promise<number> {
    const allKeys = await this.redis.keys(this.keyAnomaly('*'));
    if (!allKeys.length) return 0;
    const res = await this.redis.mget(...allKeys);
    const now = Date.now();
    let count = 0;
    for (const raw of res) {
      if (!raw) continue;
      const a = JSON.parse(raw) as Stored;
      if (now - a.createdAt >= this.ttlMs) continue;
      count += 1;
    }
    return count;
  }

  async autoResolveExpired(): Promise<
    Array<AnomalyStoreItemResult & { anomalyId: string }>
  > {
    const keys = await this.redis.keys(this.keyAnomaly('*'));
    if (!keys.length) return [];
    const raws = await this.redis.mget(...keys);
    const now = Date.now();
    const toDelete: Array<{
      batchId: string;
      anomalyId: string;
      taskNumericId: number;
    }> = [];
    const results: Array<AnomalyStoreItemResult & { anomalyId: string }> = [];
    for (const raw of raws) {
      if (!raw) continue;
      const a = JSON.parse(raw) as Stored;
      if (a.type !== 'duplicate') continue;
      if (now - a.createdAt < this.ttlMs) continue;
      const v =
        a.variants.find((x) => (x.existingCount ?? 0) > 0) ??
        a.variants[0] ??
        null;
      toDelete.push({
        batchId: a.batchId,
        anomalyId: a.anomalyId,
        taskNumericId: a.taskNumericId,
      });
      results.push({
        anomalyId: a.anomalyId,
        batchId: a.batchId,
        taskNumericId: a.taskNumericId,
        areaName: a.areaName,
        timestamp: new Date(a.timestamp),
        resolvedVariant: v,
      });
    }
    if (toDelete.length) {
      const pipe = this.redis.pipeline();
      for (const d of toDelete) {
        pipe.del(this.keyAnomaly(d.anomalyId));
        pipe.srem(this.keyBatchSet(d.batchId), d.anomalyId);
        pipe.srem(this.keyTaskSet(d.taskNumericId), d.anomalyId);
      }
      await pipe.exec();
    }
    return results;
  }

  private buildDuplicateSummary(items: Stored[]): DuplicateSummaryDto {
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

  private buildConflictGroups(items: Stored[]): Array<{
    areaName: string;
    anomalies: Array<{
      anomalyId: string;
      timestamp: string;
      status: 'pending' | 'resolved';
      variants: AnomalyVariantRecord[];
    }>;
  }> {
    const byArea = new Map<string, Stored[]>();
    for (const item of items) {
      const arr = byArea.get(item.areaName);
      if (arr) arr.push(item);
      else byArea.set(item.areaName, [item]);
    }
    return Array.from(byArea.entries()).map(([areaName, arr]) => ({
      areaName,
      anomalies: arr.map((a) => ({
        anomalyId: a.anomalyId,
        timestamp: a.timestamp,
        status: 'pending',
        variants: a.variants,
      })),
    }));
  }

  private keyAnomaly(id: string): string {
    return `import:anomaly:${id}`;
  }

  private keyBatchSet(batchId: string): string {
    return `import:batch:${batchId}:ids`;
  }

  private keyTaskSet(taskId: number): string {
    return `import:task:${taskId}:ids`;
  }
}
