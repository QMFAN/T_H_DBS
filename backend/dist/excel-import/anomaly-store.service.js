"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnomalyStoreService = void 0;
const common_1 = require("@nestjs/common");
let AnomalyStoreService = class AnomalyStoreService {
    anomalies = new Map();
    batchIndex = new Map();
    ttlMs = 24 * 60 * 60 * 1000;
    register(batchId, taskNumericId, records) {
        if (!records.length)
            return;
        let set = this.batchIndex.get(batchId);
        if (!set) {
            set = new Set();
            this.batchIndex.set(batchId, set);
        }
        const now = Date.now();
        for (const r of records) {
            const item = {
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
    getOverview() {
        const now = Date.now();
        const duplicates = [];
        const conflicts = [];
        for (const anomaly of this.anomalies.values()) {
            if (now - anomaly.createdAt >= this.ttlMs)
                continue;
            if (anomaly.type === 'duplicate')
                duplicates.push(anomaly);
            else
                conflicts.push(anomaly);
        }
        const duplicateSummary = this.buildDuplicateSummary(duplicates);
        const groups = this.buildConflictGroups(conflicts);
        return { duplicates: duplicateSummary, conflicts: groups };
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
        const areaSummaries = Array.from(areaMap.entries()).map(([areaName, stats]) => ({
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
    buildConflictGroups(items) {
        const byArea = new Map();
        for (const item of items) {
            const arr = byArea.get(item.areaName);
            if (arr)
                arr.push(item);
            else
                byArea.set(item.areaName, [item]);
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
    findById(anomalyId) {
        const a = this.anomalies.get(anomalyId);
        if (!a)
            return null;
        if (Date.now() - a.createdAt >= this.ttlMs)
            return null;
        return a;
    }
    resolveOne(anomalyId, action, chooseVariantId) {
        const a = this.findById(anomalyId);
        if (!a)
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
        this.delete(anomalyId);
        return { batchId: a.batchId, taskNumericId: a.taskNumericId, resolvedVariant: v };
    }
    bulkResolve(type, action, anomalyIds) {
        const out = [];
        for (const id of anomalyIds) {
            const a = this.findById(id);
            if (!a || a.type !== type)
                continue;
            const r = this.resolveOne(id, action);
            if (r)
                out.push({ batchId: r.batchId, taskNumericId: r.taskNumericId, anomalyId: id, resolvedVariant: r.resolvedVariant });
        }
        return out;
    }
    pendingCountForTask(taskNumericId) {
        let count = 0;
        for (const a of this.anomalies.values()) {
            if (a.taskNumericId !== taskNumericId)
                continue;
            if (Date.now() - a.createdAt >= this.ttlMs)
                continue;
            count += 1;
        }
        return count;
    }
    deleteBatch(batchId) {
        const set = this.batchIndex.get(batchId);
        if (!set)
            return;
        for (const id of set.values()) {
            this.anomalies.delete(id);
        }
        this.batchIndex.delete(batchId);
    }
    delete(anomalyId) {
        const a = this.anomalies.get(anomalyId);
        if (!a)
            return;
        this.anomalies.delete(anomalyId);
        const set = this.batchIndex.get(a.batchId);
        if (set) {
            set.delete(anomalyId);
            if (set.size === 0)
                this.batchIndex.delete(a.batchId);
        }
    }
    totalPending() {
        let count = 0;
        const now = Date.now();
        for (const a of this.anomalies.values()) {
            if (now - a.createdAt >= this.ttlMs)
                continue;
            count += 1;
        }
        return count;
    }
};
exports.AnomalyStoreService = AnomalyStoreService;
exports.AnomalyStoreService = AnomalyStoreService = __decorate([
    (0, common_1.Injectable)()
], AnomalyStoreService);
//# sourceMappingURL=anomaly-store.service.js.map