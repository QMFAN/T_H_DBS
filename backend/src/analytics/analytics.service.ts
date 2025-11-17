import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository, Brackets } from 'typeorm';
import { Area } from '../entities/area.entity';
import { SensorData } from '../entities/sensor-data.entity';

export interface OverviewStats {
  areasTotal: number;
  recordsTotal: number;
  timeRange: { min: Date | null; max: Date | null };
}

export interface AreasQuery {
  areaIds?: number[];
  start?: Date;
  end?: Date;
  page?: number;
  pageSize?: number;
  sort?: 'count' | 'name' | 'min' | 'max';
  order?: 'asc' | 'desc';
}

export interface AreaItem {
  areaId: number;
  areaName: string;
  count: number;
  timeMin: Date | null;
  timeMax: Date | null;
  lastUpdated: Date | null;
  segmentsCount?: number;
}

export interface AreaSegmentsQuery {
  areaId: number;
  start?: Date;
  end?: Date;
  granularity?: 'record' | 'day';
  limit?: number;
  gapToleranceMinutes?: number;
}

export interface SegmentItem {
  start: Date;
  end: Date;
  count: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Area) private readonly areaRepo: Repository<Area>,
    @InjectRepository(SensorData) private readonly dataRepo: Repository<SensorData>,
  ) {}

  async getOverview(): Promise<OverviewStats> {
    const areasTotal = await this.areaRepo.count();
    const recordsTotal = await this.dataRepo.count();
    const qb = this.dataRepo.createQueryBuilder('s');
    const raw = await qb
      .select('MIN(s.timestamp)', 'min')
      .addSelect('MAX(s.timestamp)', 'max')
      .getRawOne<{ min: Date | null; max: Date | null } | undefined>();

    const min = raw?.min ?? null;
    const max = raw?.max ?? null;

    return {
      areasTotal,
      recordsTotal,
      timeRange: { min, max },
    };
  }

  async getAreas(query: AreasQuery): Promise<{ list: AreaItem[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const order = (query.order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    const sortMap: Record<string, string> = {
      count: 'count',
      name: 'a.name',
      min: 'timeMin',
      max: 'timeMax',
    };
    const sortExpr = sortMap[query.sort ?? 'count'] ?? 'count';

    const qb = this.areaRepo
      .createQueryBuilder('a')
      .leftJoin(SensorData, 's', 's.area_id = a.id')
      .where(query.areaIds?.length ? 'a.id IN (:...areaIds)' : '1=1', { areaIds: query.areaIds ?? [] })
      .andWhere(
        query.start && query.end ? 's.timestamp BETWEEN :start AND :end' : '1=1',
        query.start && query.end ? { start: query.start, end: query.end } : {},
      )
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

    const list = await qb.getRawMany<AreaItem>();

    const totalQb = this.areaRepo
      .createQueryBuilder('a')
      .leftJoin(SensorData, 's', 's.area_id = a.id')
      .where(query.areaIds?.length ? 'a.id IN (:...areaIds)' : '1=1', { areaIds: query.areaIds ?? [] })
      .andWhere(
        query.start && query.end ? 's.timestamp BETWEEN :start AND :end' : '1=1',
        query.start && query.end ? { start: query.start, end: query.end } : {},
      )
      .select('a.id', 'areaId')
      .groupBy('a.id');
    const totalRows = await totalQb.getRawMany();
    const total = totalRows.length;

    // 计算 segmentsCount（天粒度），避免一次性加载所有段
    const segmentsCounts = await Promise.all(
      list.map(async (it) => {
        if (!it.timeMin || !it.timeMax || it.count === 0) return 0;
        const qb = this.dataRepo
          .createQueryBuilder('s')
          .select(['s.timestamp'])
          .where('s.area_id = :areaId', { areaId: it.areaId })
          .andWhere('s.timestamp BETWEEN :start AND :end', { start: it.timeMin, end: it.timeMax })
          .orderBy('s.timestamp', 'ASC');
        const rows = await qb.getRawMany<{ s_timestamp: Date }>();
        const gapMs = 20 * 60 * 1000; // 20分钟容忍间隔
        let segments = 0;
        let prev: number | null = null;
        for (const row of rows) {
          const curDate = row.s_timestamp instanceof Date ? row.s_timestamp : new Date(row.s_timestamp);
          const cur = curDate.getTime();
          if (prev === null || cur - prev > gapMs) segments += 1;
          prev = cur;
        }
        return segments;
      }),
    );

    const withSegments = list.map((it, idx) => ({ ...it, segmentsCount: segmentsCounts[idx] ?? 0 }));
    return { list: withSegments, total, page, pageSize };
  }

  async getAreaSegments(query: AreaSegmentsQuery): Promise<{ segments: SegmentItem[]; segmentsCount: number }> {
    const granularity = query.granularity ?? 'record';
    let start = query.start;
    let end = query.end;
    if (!start || !end) {
      const mm = await this.dataRepo
        .createQueryBuilder('s')
        .select('MIN(s.timestamp)', 'min')
        .addSelect('MAX(s.timestamp)', 'max')
        .where('s.area_id = :areaId', { areaId: query.areaId })
        .getRawOne<{ min: Date | null; max: Date | null }>();
      start = start ?? mm?.min ?? new Date(0);
      end = end ?? mm?.max ?? new Date();
    }
    const limit = Math.min(200, Math.max(1, query.limit ?? 50));

    if (granularity === 'day') {
      const dates = await this.dataRepo.query(
        'SELECT DATE(timestamp) AS d FROM sensor_data WHERE area_id = ? GROUP BY d ORDER BY d ASC',
        [query.areaId],
      );
      const segments: SegmentItem[] = [];
      let segStart: Date | null = null;
      let prev: number | null = null;
      const day = 24 * 60 * 60 * 1000;
      let count = 0;
      for (const row of dates) {
        const curDate = new Date(row.d);
        const cur = curDate.getTime();
        if (prev === null || cur - prev > day) {
          if (segStart) {
            segments.push({ start: segStart, end: new Date(prev!), count });
            if (segments.length >= limit) break;
          }
          segStart = curDate;
          count = 1;
        } else {
          count += 1;
        }
        prev = cur;
      }
      if (segStart && prev) {
        segments.push({ start: segStart, end: new Date(prev), count });
      }
      return { segments, segmentsCount: segments.length };
    }

    // record 粒度（精确到分钟，默认容忍 20 分钟）
    const gapMs = Math.max(1, (query.gapToleranceMinutes ?? 20)) * 60 * 1000;
    const rows = await this.dataRepo
      .createQueryBuilder('s')
      .select(['s.timestamp'])
      .where('s.area_id = :areaId', { areaId: query.areaId })
      .andWhere('s.timestamp BETWEEN :start AND :end', { start, end })
      .orderBy('s.timestamp', 'ASC')
      .getRawMany<{ s_timestamp: Date }>();
    const segments: SegmentItem[] = [];
    let segStart: Date | null = null;
    let prev: number | null = null;
    let count = 0;
    for (const row of rows) {
      const curDate = row.s_timestamp instanceof Date ? row.s_timestamp : new Date(row.s_timestamp);
      const cur = curDate.getTime();
      if (prev === null || cur - prev > gapMs) {
        if (segStart) {
          segments.push({ start: segStart, end: new Date(prev!), count });
          if (segments.length >= limit) break;
        }
        segStart = curDate;
        count = 1;
      } else {
        count += 1;
      }
      prev = cur;
    }
    if (segStart && prev) {
      segments.push({ start: segStart, end: new Date(prev), count });
    }
    return { segments, segmentsCount: segments.length };
  }

  async streamExport(res: any, payload: { areaIds?: number[]; ranges?: { start: Date; end: Date }[]; granularity?: 'record' | 'day' }) {
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
      // 合并条件为多个区间 OR
      const conditions: string[] = [];
      const params: Record<string, any> = {};
      ranges.forEach((r, idx) => {
        conditions.push(`(s.timestamp BETWEEN :start${idx} AND :end${idx})`);
        params[`start${idx}`] = r.start;
        params[`end${idx}`] = r.end;
      });
      qb.andWhere(conditions.join(' OR '), params);
    }

    if (!hasFilter) {
      // 默认限制，避免全库导出
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

  async previewDelete(payload: { areaIds?: number[]; ranges?: { start: Date; end: Date }[] }) {
    const areaIds = payload.areaIds ?? [];
    const ranges = payload.ranges ?? [];
    const byArea: Array<{ areaId: number; count: number }> = [];
    const byRange: Array<{ start: Date; end: Date; count: number }> = [];

    if (areaIds.length === 0 && ranges.length === 0) {
      const count = await this.dataRepo.count();
      return { affected: count, byArea: [], byRange: [] };
    }

    // total affected using one query with OR-bracketed ranges
    const totalQb = this.dataRepo.createQueryBuilder('s');
    if (areaIds.length) totalQb.where('s.area_id IN (:...areaIds)', { areaIds });
    if (ranges.length) {
      totalQb.andWhere(new Brackets((qb) => {
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
        const c = await this.dataRepo.count({ where: ranges.map((r) => ({ areaId: id, timestamp: Between(r.start, r.end) })) });
        sum += c;
      }
      affected = sum;
    }

    // byArea breakdown
    if (areaIds.length) {
      for (const id of areaIds) {
        const qb = this.dataRepo.createQueryBuilder('s').where('s.area_id = :areaId', { areaId: id });
        if (ranges.length) {
          qb.andWhere(new Brackets((sub) => {
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

    // byRange breakdown
    if (ranges.length) {
      for (const r of ranges) {
        const qb = this.dataRepo.createQueryBuilder('s');
        if (areaIds.length) qb.where('s.area_id IN (:...areaIds)', { areaIds });
        qb.andWhere('s.timestamp BETWEEN :start AND :end', { start: r.start, end: r.end });
        const count = await qb.getCount();
        byRange.push({ start: r.start, end: r.end, count });
      }
    }
    return { affected, byArea, byRange };
  }

  async deleteData(payload: { areaIds?: number[]; ranges?: { start: Date; end: Date }[]; batchSize?: number }) {
    const areaIds = payload.areaIds ?? [];
    const ranges = payload.ranges ?? [];
    const batchSize = Math.min(10000, Math.max(100, payload.batchSize ?? 2000));

    let affected = 0;
    // 无条件：全库删除
    if (areaIds.length === 0 && ranges.length === 0) {
      const res = await this.dataRepo.createQueryBuilder().delete().from(SensorData).execute();
      affected += res.affected ?? 0;
      return { affected };
    }

    // 仅区域：删除所选区域全部数据
    if (ranges.length === 0 && areaIds.length > 0) {
      const res = await this.dataRepo
        .createQueryBuilder()
        .delete()
        .from(SensorData)
        .where('area_id IN (:...areaIds)', { areaIds })
        .execute();
      affected += res.affected ?? 0;
      if ((res.affected ?? 0) === 0) {
        // fallback: chunked by ids
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const rows = await this.dataRepo
            .createQueryBuilder('s')
            .select('s.id', 'id')
            .where('s.area_id IN (:...areaIds)', { areaIds })
            .orderBy('s.id', 'ASC')
            .limit(batchSize)
            .getRawMany<{ id: number }>();
          const ids = rows.map((r) => r.id).filter((v) => typeof v === 'number');
          if (ids.length === 0) break;
          const r2 = await this.dataRepo.createQueryBuilder().delete().from(SensorData).where('id IN (:...ids)', { ids }).execute();
          affected += r2.affected ?? ids.length;
        }
      }
      return { affected };
    }

    // 仅时间范围：删除范围内全部数据
    if (areaIds.length === 0 && ranges.length > 0) {
      for (const r of ranges) {
        const res = await this.dataRepo
          .createQueryBuilder()
          .delete()
          .from(SensorData)
          .where('timestamp BETWEEN :start AND :end', { start: r.start, end: r.end })
          .execute();
        affected += res.affected ?? 0;
        if ((res.affected ?? 0) === 0) {
          // fallback: chunked by ids
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const rows = await this.dataRepo
              .createQueryBuilder('s')
              .select('s.id', 'id')
              .where('s.timestamp BETWEEN :start AND :end', { start: r.start, end: r.end })
              .orderBy('s.id', 'ASC')
              .limit(batchSize)
              .getRawMany<{ id: number }>();
            const ids = rows.map((rw) => rw.id).filter((v) => typeof v === 'number');
            if (ids.length === 0) break;
            const r2 = await this.dataRepo.createQueryBuilder().delete().from(SensorData).where('id IN (:...ids)', { ids }).execute();
            affected += r2.affected ?? ids.length;
          }
        }
      }
      return { affected };
    }

    // 区域 + 时间范围：删除区域在各范围内的数据
    for (const r of ranges) {
      const res = await this.dataRepo
        .createQueryBuilder()
        .delete()
        .from(SensorData)
        .where('area_id IN (:...areaIds)', { areaIds })
        .andWhere('timestamp BETWEEN :start AND :end', { start: r.start, end: r.end })
        .execute();
      affected += res.affected ?? 0;
      if ((res.affected ?? 0) === 0) {
        // fallback: chunked by ids
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const rows = await this.dataRepo
            .createQueryBuilder('s')
            .select('s.id', 'id')
            .where('s.area_id IN (:...areaIds)', { areaIds })
            .andWhere('s.timestamp BETWEEN :start AND :end', { start: r.start, end: r.end })
            .orderBy('s.id', 'ASC')
            .limit(batchSize)
            .getRawMany<{ id: number }>();
          const ids = rows.map((rw) => rw.id).filter((v) => typeof v === 'number');
          if (ids.length === 0) break;
          const r2 = await this.dataRepo.createQueryBuilder().delete().from(SensorData).where('id IN (:...ids)', { ids }).execute();
          affected += r2.affected ?? ids.length;
        }
      }
    }
    return { affected };
  }
}