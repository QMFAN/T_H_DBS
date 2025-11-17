"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisAnomalyStoreService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisAnomalyStoreService = class RedisAnomalyStoreService {
    redis;
    ttlMs;
    constructor(url, ttlMs) {
        this.redis = new ioredis_1.default(url);
        this.ttlMs = ttlMs;
    }
    register(batchId, taskNumericId, records) {
        if (!records.length)
            return;
        const now = Date.now();
        const pipeline = this.redis.pipeline();
        for (const r of records) {
            const payload = { anomalyId: r.anomalyId, taskNumericId, batchId, areaName: r.areaName, timestamp: r.timestamp.toISOString(), type: r.type, variants: r.variants, createdAt: now };
            pipeline.set(this.keyAnomaly(r.anomalyId), JSON.stringify(payload), 'PX', this.ttlMs);
            pipeline.sadd(this.keyBatchSet(batchId), r.anomalyId);
            pipeline.pexpire(this.keyBatchSet(batchId), this.ttlMs);
            pipeline.sadd(this.keyTaskSet(taskNumericId), r.anomalyId);
            pipeline.pexpire(this.keyTaskSet(taskNumericId), this.ttlMs);
        }
        pipeline.exec();
    }
    async getOverview() {
        const allKeys = await this.redis.keys(this.keyAnomaly('*'));
        if (!allKeys.length)
            return { duplicates: { pendingCount: 0, recordCount: 0, anomalyIds: [], areaSummaries: [] }, conflicts: [] };
        const res = await this.redis.mget(...allKeys);
        const now = Date.now();
        const duplicates = [];
        const conflicts = [];
        for (const raw of res) {
            if (!raw)
                continue;
            const item = JSON.parse(raw);
            if (now - item.createdAt >= this.ttlMs)
                continue;
            if (item.type === 'duplicate')
                duplicates.push(item);
            else
                conflicts.push(item);
        }
        const duplicateSummary = this.buildDuplicateSummary(duplicates);
        const groups = this.buildConflictGroups(conflicts);
        return { duplicates: duplicateSummary, conflicts: groups };
    }
    async findById(anomalyId) {
        const raw = await this.redis.get(this.keyAnomaly(anomalyId));
        if (!raw)
            return null;
        const item = JSON.parse(raw);
        if (Date.now() - item.createdAt >= this.ttlMs)
            return null;
        return { anomalyId: item.anomalyId, taskNumericId: item.taskNumericId, batchId: item.batchId, areaName: item.areaName, timestamp: new Date(item.timestamp), type: item.type, variants: item.variants };
    }
    async resolveOne(anomalyId, action, chooseVariantId) {
        const raw = await this.redis.get(this.keyAnomaly(anomalyId));
        if (!raw)
            return null;
        const a = JSON.parse(raw);
        const now = Date.now();
        if (now - a.createdAt >= this.ttlMs)
            return null;
        let v = null;
        if (action === 'overwrite') {
            const target = chooseVariantId ? a.variants.find((x) => x.variantId === chooseVariantId) : a.variants.find((x) => (x.newCount ?? 0) > 0) ?? a.variants[0];
            if (!target)
                return null;
            v = target;
        }
        else if (action === 'skip') {
            v = a.variants.find((x) => (x.existingCount ?? 0) > 0) ?? a.variants[0] ?? null;
        }
        const pipe = this.redis.pipeline();
        pipe.del(this.keyAnomaly(anomalyId));
        pipe.srem(this.keyBatchSet(a.batchId), anomalyId);
        pipe.srem(this.keyTaskSet(a.taskNumericId), anomalyId);
        await pipe.exec();
        return { batchId: a.batchId, taskNumericId: a.taskNumericId, areaName: a.areaName, timestamp: new Date(a.timestamp), resolvedVariant: v };
    }
    async bulkResolve(type, action, anomalyIds) {
        const keys = anomalyIds.map((id) => this.keyAnomaly(id));
        const raws = await this.redis.mget(...keys);
        const now = Date.now();
        const toDelete = [];
        const results = [];
        for (let i = 0; i < anomalyIds.length; i++) {
            const raw = raws[i];
            if (!raw)
                continue;
            const a = JSON.parse(raw);
            if (now - a.createdAt >= this.ttlMs)
                continue;
            if (a.type !== type)
                continue;
            let v = null;
            if (action === 'overwrite') {
                v = a.variants.find((x) => (x.newCount ?? 0) > 0) ?? a.variants[0] ?? null;
            }
            else {
                v = a.variants.find((x) => (x.existingCount ?? 0) > 0) ?? a.variants[0] ?? null;
            }
            toDelete.push({ batchId: a.batchId, anomalyId: a.anomalyId });
            results.push({ anomalyId: anomalyIds[i], batchId: a.batchId, taskNumericId: a.taskNumericId, areaName: a.areaName, timestamp: new Date(a.timestamp), resolvedVariant: v });
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
    async pendingCountForTask(taskNumericId) {
        return this.redis.scard(this.keyTaskSet(taskNumericId));
    }
    async deleteBatch(batchId) {
        const members = await this.redis.smembers(this.keyBatchSet(batchId));
        if (members.length) {
            const pipeline = this.redis.pipeline();
            for (const id of members)
                pipeline.del(this.keyAnomaly(id));
            pipeline.del(this.keyBatchSet(batchId));
            await pipeline.exec();
        }
        else {
            await this.redis.del(this.keyBatchSet(batchId));
        }
    }
    async totalPending() {
        const allKeys = await this.redis.keys(this.keyAnomaly('*'));
        if (!allKeys.length)
            return 0;
        const res = await this.redis.mget(...allKeys);
        const now = Date.now();
        let count = 0;
        for (const raw of res) {
            if (!raw)
                continue;
            const a = JSON.parse(raw);
            if (now - a.createdAt >= this.ttlMs)
                continue;
            count += 1;
        }
        return count;
    }
    buildDuplicateSummary(items) {
        const areaMap = new Map();
        let totalRecords = 0;
        for (const anomaly of items) {
            const recordCount = anomaly.variants.reduce((sum, v) => sum + (v.newCount ?? 0), 0);
            totalRecords += recordCount;
            const existing = areaMap.get(anomaly.areaName);
            if (existing) {
                existing.anomalyCount += 1;
                existing.recordCount += recordCount;
            }
            else {
                areaMap.set(anomaly.areaName, { anomalyCount: 1, recordCount });
            }
        }
        const areaSummaries = Array.from(areaMap.entries()).map(([areaName, stats]) => ({ areaName, anomalyCount: stats.anomalyCount, recordCount: stats.recordCount }));
        return { pendingCount: items.length, recordCount: totalRecords, anomalyIds: items.map((a) => a.anomalyId), areaSummaries };
    }
    buildConflictGroups(items) {
        const byArea = new Map();
        for (const item of items) {
            const arr = byArea.get(item.areaName);
            if (arr)
                arr.push(item);
            else
                byArea.set(item.areaName, [item]);
        }
        return Array.from(byArea.entries()).map(([areaName, arr]) => ({ areaName, anomalies: arr.map((a) => ({ anomalyId: a.anomalyId, timestamp: a.timestamp, status: 'pending', variants: a.variants })) }));
    }
    keyAnomaly(id) {
        return `import:anomaly:${id}`;
    }
    keyBatchSet(batchId) {
        return `import:batch:${batchId}:ids`;
    }
    keyTaskSet(taskId) {
        return `import:task:${taskId}:ids`;
    }
};
exports.RedisAnomalyStoreService = RedisAnomalyStoreService;
exports.RedisAnomalyStoreService = RedisAnomalyStoreService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String, Number])
], RedisAnomalyStoreService);
//# sourceMappingURL=anomaly-store.redis.js.map