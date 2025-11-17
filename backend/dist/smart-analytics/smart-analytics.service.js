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
exports.SmartAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const area_entity_1 = require("../entities/area.entity");
const sensor_data_entity_1 = require("../entities/sensor-data.entity");
const area_defaults_entity_1 = require("../entities/area-defaults.entity");
let SmartAnalyticsService = class SmartAnalyticsService {
    areaRepo;
    dataRepo;
    defaultsRepo;
    constructor(areaRepo, dataRepo, defaultsRepo) {
        this.areaRepo = areaRepo;
        this.dataRepo = dataRepo;
        this.defaultsRepo = defaultsRepo;
    }
    async getAreas() {
        const areas = await this.areaRepo.find({ select: ['id', 'code', 'name'] });
        return { success: true, areas };
    }
    toDate(s) {
        return new Date(s.replace(' ', 'T'));
    }
    fmt(d) {
        const pad = (n) => (n < 10 ? `0${n}` : String(n));
        const Y = d.getFullYear();
        const M = pad(d.getMonth() + 1);
        const D = pad(d.getDate());
        const h = pad(d.getHours());
        const m = pad(d.getMinutes());
        const s = pad(d.getSeconds());
        return `${Y}-${M}-${D} ${h}:${m}:${s}`;
    }
    async getAreaByNameOrCode(area) {
        const byCode = await this.areaRepo.findOne({ where: { code: area } });
        if (byCode)
            return byCode;
        const byName = await this.areaRepo.findOne({ where: { name: area } });
        return byName ?? null;
    }
    async getDbRange(areaId) {
        const qb = this.dataRepo
            .createQueryBuilder('d')
            .select('MIN(d.timestamp)', 'min')
            .addSelect('MAX(d.timestamp)', 'max')
            .where('d.areaId = :areaId', { areaId });
        const row = await qb.getRawOne();
        if (!row || !row.min || !row.max)
            return null;
        return { start: this.fmt(new Date(row.min)), end: this.fmt(new Date(row.max)) };
    }
    async fetchData(areaId, start, end, limit) {
        const qb = this.dataRepo
            .createQueryBuilder('d')
            .where('d.areaId = :areaId', { areaId })
            .andWhere('d.timestamp BETWEEN :start AND :end', { start, end })
            .orderBy('d.timestamp', 'ASC');
        if (limit)
            qb.limit(limit);
        const rows = await qb.getMany();
        return rows.map((r) => ({
            timestamp: this.fmt(new Date(r.timestamp)),
            temperature: r.temperature != null ? Number(r.temperature) : null,
            humidity: r.humidity != null ? Number(r.humidity) : null,
        }));
    }
    computeMedianGap(timestamps) {
        if (timestamps.length < 2)
            return 5 * 60 * 1000;
        const diffs = [];
        for (let i = 1; i < timestamps.length; i++) {
            const a = this.toDate(timestamps[i - 1]).getTime();
            const b = this.toDate(timestamps[i]).getTime();
            const d = Math.max(0, b - a);
            if (d > 0)
                diffs.push(d);
        }
        diffs.sort((x, y) => x - y);
        const mid = Math.floor(diffs.length / 2);
        return diffs.length ? (diffs.length % 2 ? diffs[mid] : (diffs[mid - 1] + diffs[mid]) / 2) : 5 * 60 * 1000;
    }
    buildSegments(ts, toleranceMs) {
        if (!ts.length)
            return [];
        const segments = [];
        let segStart = ts[0];
        let prev = ts[0];
        for (let i = 1; i < ts.length; i++) {
            const cur = ts[i];
            const gap = this.toDate(cur).getTime() - this.toDate(prev).getTime();
            if (gap > toleranceMs) {
                segments.push({ start: segStart, end: prev });
                segStart = cur;
            }
            prev = cur;
        }
        segments.push({ start: segStart, end: prev });
        return segments;
    }
    mergeSegments(segs, toleranceMs) {
        if (segs.length <= 1)
            return segs;
        const sorted = [...segs].sort((a, b) => (a.start < b.start ? -1 : 1));
        const merged = [sorted[0]];
        for (let i = 1; i < sorted.length; i++) {
            const last = merged[merged.length - 1];
            const cur = sorted[i];
            const lastEnd = this.toDate(last.end).getTime();
            const curStart = this.toDate(cur.start).getTime();
            if (curStart <= lastEnd + toleranceMs) {
                const newEnd = this.toDate(cur.end).getTime() > lastEnd ? cur.end : last.end;
                last.end = newEnd;
            }
            else {
                merged.push(cur);
            }
        }
        return merged;
    }
    complementMissing(req, available, toleranceMs) {
        if (!available.length)
            return [req];
        const miss = [];
        const reqStart = this.toDate(req.start).getTime();
        const reqEnd = this.toDate(req.end).getTime();
        const segs = this.mergeSegments(available, toleranceMs);
        const firstStart = this.toDate(segs[0].start).getTime();
        if (reqStart < firstStart)
            miss.push({ start: req.start, end: segs[0].start });
        for (let i = 1; i < segs.length; i++) {
            const prevEnd = this.toDate(segs[i - 1].end).getTime();
            const curStart = this.toDate(segs[i].start).getTime();
            if (prevEnd + toleranceMs < curStart)
                miss.push({ start: segs[i - 1].end, end: segs[i].start });
        }
        const lastEnd = this.toDate(segs[segs.length - 1].end).getTime();
        if (lastEnd < reqEnd)
            miss.push({ start: segs[segs.length - 1].end, end: req.end });
        return miss;
    }
    async query(dto) {
        const area = await this.getAreaByNameOrCode(dto.area);
        if (!area)
            return { success: false, message: `未找到区域 ${dto.area}` };
        const dbRange = await this.getDbRange(area.id);
        if (!dbRange)
            return { success: false, message: '该区域暂无数据', data: [] };
        const req = { start: dto.start, end: dto.end };
        const reqStart = this.toDate(req.start);
        const reqEnd = this.toDate(req.end);
        const dbStart = this.toDate(dbRange.start);
        const dbEnd = this.toDate(dbRange.end);
        if (reqEnd < dbStart || reqStart > dbEnd) {
            return { success: false, message: `请求时间超出数据库范围 (${dbRange.start} 至 ${dbRange.end})`, available_range: { min_time: dbRange.start, max_time: dbRange.end }, data: [] };
        }
        const adjusted = { start: this.fmt(reqStart < dbStart ? dbStart : reqStart), end: this.fmt(reqEnd > dbEnd ? dbEnd : reqEnd) };
        const data = await this.fetchData(area.id, adjusted.start, adjusted.end, dto.limit);
        const timestamps = data.map((d) => d.timestamp);
        const medianGap = this.computeMedianGap(timestamps);
        const toleranceMs = (dto.gapToleranceMinutes ?? Math.max(30, Math.round((medianGap / 60000) * 6))) * 60 * 1000;
        const baseSegs = this.buildSegments(timestamps, toleranceMs);
        const availableRanges = this.mergeSegments(baseSegs, toleranceMs);
        const missingRanges = this.complementMissing(req, availableRanges, toleranceMs);
        return { success: true, data, adjustedRange: adjusted, availableRanges, missingRanges };
    }
    async segments(dto) {
        const area = await this.getAreaByNameOrCode(dto.area);
        if (!area)
            return { success: false, message: `未找到区域 ${dto.area}` };
        const data = await this.fetchData(area.id, dto.start, dto.end);
        const timestamps = data.map((d) => d.timestamp);
        const medianGap = this.computeMedianGap(timestamps);
        const toleranceMs = (dto.gapToleranceMinutes ?? Math.max(30, Math.round((medianGap / 60000) * 6))) * 60 * 1000;
        const segs = this.mergeSegments(this.buildSegments(timestamps, toleranceMs), toleranceMs);
        return { success: true, segments: segs };
    }
    async analyze(dto) {
        const area = await this.getAreaByNameOrCode(dto.area);
        if (!area)
            return { success: false, message: `未找到区域 ${dto.area}` };
        const dbRange = await this.getDbRange(area.id);
        if (!dbRange)
            return { success: false, message: '该区域暂无数据' };
        const req = { start: dto.start, end: dto.end };
        const reqStart = this.toDate(req.start);
        const reqEnd = this.toDate(req.end);
        const dbStart = this.toDate(dbRange.start);
        const dbEnd = this.toDate(dbRange.end);
        if (reqEnd < dbStart || reqStart > dbEnd) {
            return { success: false, message: `请求时间超出数据库范围 (${dbRange.start} 至 ${dbRange.end})`, available_range: { min_time: dbRange.start, max_time: dbRange.end } };
        }
        const adjusted = { start: this.fmt(reqStart < dbStart ? dbStart : reqStart), end: this.fmt(reqEnd > dbEnd ? dbEnd : reqEnd) };
        const data = await this.fetchData(area.id, adjusted.start, adjusted.end);
        const timestamps = data.map((d) => d.timestamp);
        const medianGap = this.computeMedianGap(timestamps);
        const toleranceMs = (dto.gapToleranceMinutes ?? Math.max(30, Math.round((medianGap / 60000) * 6))) * 60 * 1000;
        const availableRanges = this.mergeSegments(this.buildSegments(timestamps, toleranceMs), toleranceMs);
        const missingRanges = this.complementMissing(adjusted, availableRanges, toleranceMs);
        const threshold = await (async () => {
            if (dto.tempMin != null && dto.tempMax != null && dto.humidityMin != null && dto.humidityMax != null) {
                return { tempMin: dto.tempMin, tempMax: dto.tempMax, humidityMin: dto.humidityMin, humidityMax: dto.humidityMax, source: 'user' };
            }
            const def = await this.defaultsRepo.findOne({ where: { area_code: area.code } });
            if (!def)
                return null;
            return { tempMin: Number(def.temp_min), tempMax: Number(def.temp_max), humidityMin: Number(def.humidity_min), humidityMax: Number(def.humidity_max), source: 'defaults' };
        })();
        if (!threshold)
            return { success: false, message: `未找到区域 ${area.name} 的阈值设置` };
        const tempAnomalies = data
            .filter((r) => r.temperature != null && (r.temperature < threshold.tempMin || r.temperature > threshold.tempMax))
            .map((r) => ({ timestamp: r.timestamp, temperature: r.temperature, type: r.temperature < threshold.tempMin ? 'low' : 'high' }));
        const humidityAnomalies = data
            .filter((r) => r.humidity != null && (r.humidity < threshold.humidityMin || r.humidity > threshold.humidityMax))
            .map((r) => ({ timestamp: r.timestamp, humidity: r.humidity, type: r.humidity < threshold.humidityMin ? 'low' : 'high' }));
        const buildContinuous = (pick, min, max, durationMin, typeLow = 'low', typeHigh = 'high', normalBudget) => {
            const res = [];
            let startIdx = -1;
            let endIdx = -1;
            let normalUsed = 0;
            let curType = null;
            let minVal = Number.POSITIVE_INFINITY;
            let maxVal = Number.NEGATIVE_INFINITY;
            const N = data.length;
            const getType = (v) => (v < min ? typeLow : v > max ? typeHigh : 'normal');
            for (let i = 0; i < N; i++) {
                const v = pick(data[i]);
                if (v == null)
                    continue;
                const tp = getType(v);
                if (tp === 'normal') {
                    if (startIdx >= 0) {
                        if (normalUsed < normalBudget) {
                            normalUsed += 1;
                            endIdx = i;
                            minVal = Math.min(minVal, v);
                            maxVal = Math.max(maxVal, v);
                            continue;
                        }
                        else {
                            const dur = (this.toDate(data[endIdx].timestamp).getTime() - this.toDate(data[startIdx].timestamp).getTime()) / 60000;
                            if (dur >= durationMin) {
                                res.push({
                                    start_time: data[startIdx].timestamp,
                                    end_time: data[endIdx].timestamp,
                                    duration_minutes: dur,
                                    type: curType,
                                    data_points: endIdx - startIdx + 1,
                                    min_value: Number(minVal.toFixed(1)),
                                    max_value: Number(maxVal.toFixed(1)),
                                    range: `${Number(minVal.toFixed(1))}~${Number(maxVal.toFixed(1))}`,
                                });
                            }
                            startIdx = -1;
                            endIdx = -1;
                            normalUsed = 0;
                            curType = null;
                            minVal = Number.POSITIVE_INFINITY;
                            maxVal = Number.NEGATIVE_INFINITY;
                        }
                    }
                }
                else {
                    if (startIdx < 0) {
                        startIdx = i;
                        endIdx = i;
                        normalUsed = 0;
                        curType = tp;
                        minVal = v;
                        maxVal = v;
                    }
                    else {
                        if (curType !== tp) {
                            const dur = (this.toDate(data[endIdx].timestamp).getTime() - this.toDate(data[startIdx].timestamp).getTime()) / 60000;
                            if (dur >= durationMin) {
                                res.push({
                                    start_time: data[startIdx].timestamp,
                                    end_time: data[endIdx].timestamp,
                                    duration_minutes: dur,
                                    type: curType,
                                    data_points: endIdx - startIdx + 1,
                                    min_value: Number(minVal.toFixed(1)),
                                    max_value: Number(maxVal.toFixed(1)),
                                    range: `${Number(minVal.toFixed(1))}~${Number(maxVal.toFixed(1))}`,
                                });
                            }
                            startIdx = i;
                            endIdx = i;
                            normalUsed = 0;
                            curType = tp;
                            minVal = v;
                            maxVal = v;
                        }
                        else {
                            endIdx = i;
                            minVal = Math.min(minVal, v);
                            maxVal = Math.max(maxVal, v);
                        }
                    }
                }
            }
            if (startIdx >= 0) {
                const dur = (this.toDate(data[endIdx].timestamp).getTime() - this.toDate(data[startIdx].timestamp).getTime()) / 60000;
                if (dur >= durationMin) {
                    res.push({
                        start_time: data[startIdx].timestamp,
                        end_time: data[endIdx].timestamp,
                        duration_minutes: dur,
                        type: curType,
                        data_points: endIdx - startIdx + 1,
                        min_value: Number(minVal.toFixed(1)),
                        max_value: Number(maxVal.toFixed(1)),
                        range: `${Number(minVal.toFixed(1))}~${Number(maxVal.toFixed(1))}`,
                    });
                }
            }
            return res;
        };
        const tempDurationMin = dto.tempDurationMin ?? 60;
        const humidityDurationMin = dto.humidityDurationMin ?? 120;
        const normalBudget = dto.toleranceNormalBudget ?? 0;
        const temperatureContinuous = buildContinuous((r) => r.temperature, threshold.tempMin, threshold.tempMax, tempDurationMin, 'low', 'high', normalBudget);
        const humidityContinuous = buildContinuous((r) => r.humidity, threshold.humidityMin, threshold.humidityMax, humidityDurationMin, 'low', 'high', normalBudget);
        const stats = (() => {
            const temps = data.map((r) => r.temperature).filter((v) => v != null);
            const hums = data.map((r) => r.humidity).filter((v) => v != null);
            const avg = (arr) => (arr.length ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null);
            return {
                temperature: { min: temps.length ? Math.min(...temps) : null, max: temps.length ? Math.max(...temps) : null, avg: avg(temps) },
                humidity: { min: hums.length ? Math.min(...hums) : null, max: hums.length ? Math.max(...hums) : null, avg: avg(hums) },
                data_points: data.length,
                start_time: adjusted.start,
                end_time: adjusted.end,
            };
        })();
        return {
            success: true,
            area: area.name,
            start_time: req.start,
            end_time: req.end,
            stats,
            threshold: { temp_min: threshold.tempMin, temp_max: threshold.tempMax, humidity_min: threshold.humidityMin, humidity_max: threshold.humidityMax, source: threshold.source },
            temperature_anomalies: tempAnomalies,
            temperature_continuous_anomalies: temperatureContinuous,
            humidity_anomalies: humidityAnomalies,
            humidity_continuous_anomalies: humidityContinuous,
            adjusted_range: adjusted,
            missing_ranges: missingRanges,
        };
    }
};
exports.SmartAnalyticsService = SmartAnalyticsService;
exports.SmartAnalyticsService = SmartAnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(area_entity_1.Area)),
    __param(1, (0, typeorm_1.InjectRepository)(sensor_data_entity_1.SensorData)),
    __param(2, (0, typeorm_1.InjectRepository)(area_defaults_entity_1.AreaDefaultsEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], SmartAnalyticsService);
//# sourceMappingURL=smart-analytics.service.js.map