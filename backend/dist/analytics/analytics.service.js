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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const area_entity_1 = require("../entities/area.entity");
const sensor_data_entity_1 = require("../entities/sensor-data.entity");
let AnalyticsService = class AnalyticsService {
    areaRepo;
    dataRepo;
    constructor(areaRepo, dataRepo) {
        this.areaRepo = areaRepo;
        this.dataRepo = dataRepo;
    }
    async getOverview() {
        const areasTotal = await this.areaRepo.count();
        const recordsTotal = await this.dataRepo.count();
        const qb = this.dataRepo.createQueryBuilder('s');
        const raw = await qb
            .select('MIN(s.timestamp)', 'min')
            .addSelect('MAX(s.timestamp)', 'max')
            .getRawOne();
        const min = raw?.min ?? null;
        const max = raw?.max ?? null;
        return {
            areasTotal,
            recordsTotal,
            timeRange: { min, max },
        };
    }
    async getAreas(query) {
        const page = Math.max(1, query.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
        const order = (query.order ?? 'desc').toUpperCase();
        const sortMap = {
            count: 'count',
            name: 'a.name',
            min: 'timeMin',
            max: 'timeMax',
        };
        const sortExpr = sortMap[query.sort ?? 'count'] ?? 'count';
        const qb = this.areaRepo
            .createQueryBuilder('a')
            .leftJoin(sensor_data_entity_1.SensorData, 's', 's.area_id = a.id')
            .where(query.areaIds?.length ? 'a.id IN (:...areaIds)' : '1=1', { areaIds: query.areaIds ?? [] })
            .andWhere(query.start && query.end ? 's.timestamp BETWEEN :start AND :end' : '1=1', query.start && query.end ? { start: query.start, end: query.end } : {})
            .select('a.id', 'areaId')
            .addSelect('a.name', 'areaName')
            .addSelect('COUNT(s.id)', 'count')
            .addSelect('MIN(s.timestamp)', 'timeMin')
            .addSelect('MAX(s.timestamp)', 'timeMax')
            .addSelect('MAX(s.updated_at)', 'lastUpdated')
            .groupBy('a.id')
            .orderBy(sortExpr, order)
            .offset((page - 1) * pageSize)
            .limit(pageSize);
        const list = await qb.getRawMany();
        const totalQb = this.areaRepo
            .createQueryBuilder('a')
            .leftJoin(sensor_data_entity_1.SensorData, 's', 's.area_id = a.id')
            .where(query.areaIds?.length ? 'a.id IN (:...areaIds)' : '1=1', { areaIds: query.areaIds ?? [] })
            .andWhere(query.start && query.end ? 's.timestamp BETWEEN :start AND :end' : '1=1', query.start && query.end ? { start: query.start, end: query.end } : {})
            .select('a.id', 'areaId')
            .groupBy('a.id');
        const totalRows = await totalQb.getRawMany();
        const total = totalRows.length;
        const segmentsCounts = await Promise.all(list.map(async (it) => {
            if (!it.timeMin || !it.timeMax || it.count === 0)
                return 0;
            const rows = await this.dataRepo.query('SELECT DATE(timestamp) AS d FROM sensor_data WHERE area_id = ? AND timestamp BETWEEN ? AND ? GROUP BY d ORDER BY d ASC', [it.areaId, it.timeMin, it.timeMax]);
            const dayMs = 24 * 60 * 60 * 1000;
            let segments = 0;
            let prev = null;
            for (const r of rows) {
                const cur = new Date(r.d).getTime();
                if (prev === null || cur - prev > dayMs)
                    segments += 1;
                prev = cur;
            }
            return segments;
        }));
        const withSegments = list.map((it, idx) => ({ ...it, segmentsCount: segmentsCounts[idx] ?? 0 }));
        return { list: withSegments, total, page, pageSize };
    }
    async getAreaSegments(query) {
        const granularity = query.granularity ?? 'record';
        let start = query.start;
        let end = query.end;
        if (!start || !end) {
            const mm = await this.dataRepo
                .createQueryBuilder('s')
                .select('MIN(s.timestamp)', 'min')
                .addSelect('MAX(s.timestamp)', 'max')
                .where('s.area_id = :areaId', { areaId: query.areaId })
                .getRawOne();
            start = start ?? mm?.min ?? new Date(0);
            end = end ?? mm?.max ?? new Date();
        }
        const limit = Math.min(200, Math.max(1, query.limit ?? 50));
        if (granularity === 'day') {
            const dates = await this.dataRepo.query('SELECT DATE(timestamp) AS d FROM sensor_data WHERE area_id = ? GROUP BY d ORDER BY d ASC', [query.areaId]);
            const segments = [];
            let segStart = null;
            let prev = null;
            const day = 24 * 60 * 60 * 1000;
            let count = 0;
            for (const row of dates) {
                const curDate = new Date(row.d);
                const cur = curDate.getTime();
                if (prev === null || cur - prev > day) {
                    if (segStart) {
                        segments.push({ start: segStart, end: new Date(prev), count });
                        if (segments.length >= limit)
                            break;
                    }
                    segStart = curDate;
                    count = 1;
                }
                else {
                    count += 1;
                }
                prev = cur;
            }
            if (segStart && prev) {
                segments.push({ start: segStart, end: new Date(prev), count });
            }
            return { segments, segmentsCount: segments.length };
        }
        const gapMs = Math.max(1, (query.gapToleranceMinutes ?? 20)) * 60 * 1000;
        const rows = await this.dataRepo
            .createQueryBuilder('s')
            .select(['s.timestamp'])
            .where('s.area_id = :areaId', { areaId: query.areaId })
            .andWhere('s.timestamp BETWEEN :start AND :end', { start, end })
            .orderBy('s.timestamp', 'ASC')
            .getRawMany();
        const segments = [];
        let segStart = null;
        let prev = null;
        let count = 0;
        for (const row of rows) {
            const curDate = row.s_timestamp instanceof Date ? row.s_timestamp : new Date(row.s_timestamp);
            const cur = curDate.getTime();
            if (prev === null || cur - prev > gapMs) {
                if (segStart) {
                    segments.push({ start: segStart, end: new Date(prev), count });
                    if (segments.length >= limit)
                        break;
                }
                segStart = curDate;
                count = 1;
            }
            else {
                count += 1;
            }
            prev = cur;
        }
        if (segStart && prev) {
            segments.push({ start: segStart, end: new Date(prev), count });
        }
        return { segments, segmentsCount: segments.length };
    }
    async streamExport(res, payload) {
        const areaIds = payload.areaIds ?? [];
        const ranges = payload.ranges ?? [];
        const hasFilter = areaIds.length > 0 || ranges.length > 0;
        const qb = this.dataRepo.createQueryBuilder('s').leftJoin('s.area', 'a').select([
            's.areaId AS areaId',
            'a.name AS areaName',
            's.timestamp AS timestamp',
            's.temperature AS temperature',
            's.humidity AS humidity',
        ]);
        if (areaIds.length) {
            qb.where('s.area_id IN (:...areaIds)', { areaIds });
        }
        if (ranges.length) {
            const conditions = [];
            const params = {};
            ranges.forEach((r, idx) => {
                conditions.push(`(s.timestamp BETWEEN :start${idx} AND :end${idx})`);
                params[`start${idx}`] = r.start;
                params[`end${idx}`] = r.end;
            });
            qb.andWhere(conditions.join(' OR '), params);
        }
        if (!hasFilter) {
            qb.limit(100000);
        }
        qb.orderBy('s.area_id', 'ASC').addOrderBy('s.timestamp', 'ASC');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="export.csv"`);
        res.write('area_id,area_name,timestamp,temperature,humidity\n');
        const stream = await qb.stream();
        for await (const row of stream) {
            const ts = new Date(row.timestamp).toISOString();
            const line = `${row.areaId},${row.areaName ?? ''},${ts},${row.temperature ?? ''},${row.humidity ?? ''}\n`;
            if (!res.write(line)) {
                await new Promise((resolve) => res.once('drain', resolve));
            }
        }
        res.end();
    }
    async previewDelete(payload) {
        const areaIds = payload.areaIds ?? [];
        const ranges = payload.ranges ?? [];
        const byArea = [];
        const byRange = [];
        if (areaIds.length === 0 && ranges.length === 0) {
            const count = await this.dataRepo.count();
            return { affected: count, byArea: [], byRange: [] };
        }
        const totalQb = this.dataRepo.createQueryBuilder('s');
        if (areaIds.length)
            totalQb.where('s.area_id IN (:...areaIds)', { areaIds });
        if (ranges.length) {
            totalQb.andWhere(new typeorm_2.Brackets((qb) => {
                ranges.forEach((r, idx) => {
                    qb[idx === 0 ? 'where' : 'orWhere']('s.timestamp BETWEEN :tStart' + idx + ' AND :tEnd' + idx, {
                        ['tStart' + idx]: r.start,
                        ['tEnd' + idx]: r.end,
                    });
                });
            }));
        }
        let affected = await totalQb.getCount();
        if (affected === 0 && ranges.length && areaIds.length) {
            let sum = 0;
            for (const id of areaIds) {
                const c = await this.dataRepo.count({ where: ranges.map((r) => ({ areaId: id, timestamp: (0, typeorm_2.Between)(r.start, r.end) })) });
                sum += c;
            }
            affected = sum;
        }
        if (areaIds.length) {
            for (const id of areaIds) {
                const qb = this.dataRepo.createQueryBuilder('s').where('s.area_id = :areaId', { areaId: id });
                if (ranges.length) {
                    qb.andWhere(new typeorm_2.Brackets((sub) => {
                        ranges.forEach((r, idx) => {
                            sub[idx === 0 ? 'where' : 'orWhere']('s.timestamp BETWEEN :aStart' + idx + ' AND :aEnd' + idx, {
                                ['aStart' + idx]: r.start,
                                ['aEnd' + idx]: r.end,
                            });
                        });
                    }));
                }
                const count = await qb.getCount();
                byArea.push({ areaId: id, count });
            }
        }
        if (ranges.length) {
            for (const r of ranges) {
                const qb = this.dataRepo.createQueryBuilder('s');
                if (areaIds.length)
                    qb.where('s.area_id IN (:...areaIds)', { areaIds });
                qb.andWhere('s.timestamp BETWEEN :start AND :end', { start: r.start, end: r.end });
                const count = await qb.getCount();
                byRange.push({ start: r.start, end: r.end, count });
            }
        }
        return { affected, byArea, byRange };
    }
    async deleteData(payload) {
        const areaIds = payload.areaIds ?? [];
        const ranges = payload.ranges ?? [];
        const batchSize = Math.min(10000, Math.max(100, payload.batchSize ?? 2000));
        let affected = 0;
        if (areaIds.length === 0 && ranges.length === 0) {
            const res = await this.dataRepo.createQueryBuilder().delete().from(sensor_data_entity_1.SensorData).execute();
            affected += res.affected ?? 0;
            return { affected };
        }
        if (ranges.length === 0 && areaIds.length > 0) {
            const res = await this.dataRepo
                .createQueryBuilder()
                .delete()
                .from(sensor_data_entity_1.SensorData)
                .where('area_id IN (:...areaIds)', { areaIds })
                .execute();
            affected += res.affected ?? 0;
            if ((res.affected ?? 0) === 0) {
                while (true) {
                    const rows = await this.dataRepo
                        .createQueryBuilder('s')
                        .select('s.id', 'id')
                        .where('s.area_id IN (:...areaIds)', { areaIds })
                        .orderBy('s.id', 'ASC')
                        .limit(batchSize)
                        .getRawMany();
                    const ids = rows.map((r) => r.id).filter((v) => typeof v === 'number');
                    if (ids.length === 0)
                        break;
                    const r2 = await this.dataRepo.createQueryBuilder().delete().from(sensor_data_entity_1.SensorData).where('id IN (:...ids)', { ids }).execute();
                    affected += r2.affected ?? ids.length;
                }
            }
            return { affected };
        }
        if (areaIds.length === 0 && ranges.length > 0) {
            for (const r of ranges) {
                const res = await this.dataRepo
                    .createQueryBuilder()
                    .delete()
                    .from(sensor_data_entity_1.SensorData)
                    .where('timestamp BETWEEN :start AND :end', { start: r.start, end: r.end })
                    .execute();
                affected += res.affected ?? 0;
                if ((res.affected ?? 0) === 0) {
                    while (true) {
                        const rows = await this.dataRepo
                            .createQueryBuilder('s')
                            .select('s.id', 'id')
                            .where('s.timestamp BETWEEN :start AND :end', { start: r.start, end: r.end })
                            .orderBy('s.id', 'ASC')
                            .limit(batchSize)
                            .getRawMany();
                        const ids = rows.map((rw) => rw.id).filter((v) => typeof v === 'number');
                        if (ids.length === 0)
                            break;
                        const r2 = await this.dataRepo.createQueryBuilder().delete().from(sensor_data_entity_1.SensorData).where('id IN (:...ids)', { ids }).execute();
                        affected += r2.affected ?? ids.length;
                    }
                }
            }
            return { affected };
        }
        for (const r of ranges) {
            const res = await this.dataRepo
                .createQueryBuilder()
                .delete()
                .from(sensor_data_entity_1.SensorData)
                .where('area_id IN (:...areaIds)', { areaIds })
                .andWhere('timestamp BETWEEN :start AND :end', { start: r.start, end: r.end })
                .execute();
            affected += res.affected ?? 0;
            if ((res.affected ?? 0) === 0) {
                while (true) {
                    const rows = await this.dataRepo
                        .createQueryBuilder('s')
                        .select('s.id', 'id')
                        .where('s.area_id IN (:...areaIds)', { areaIds })
                        .andWhere('s.timestamp BETWEEN :start AND :end', { start: r.start, end: r.end })
                        .orderBy('s.id', 'ASC')
                        .limit(batchSize)
                        .getRawMany();
                    const ids = rows.map((rw) => rw.id).filter((v) => typeof v === 'number');
                    if (ids.length === 0)
                        break;
                    const r2 = await this.dataRepo.createQueryBuilder().delete().from(sensor_data_entity_1.SensorData).where('id IN (:...ids)', { ids }).execute();
                    affected += r2.affected ?? ids.length;
                }
            }
        }
        return { affected };
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(area_entity_1.Area)),
    __param(1, (0, typeorm_1.InjectRepository)(sensor_data_entity_1.SensorData)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map