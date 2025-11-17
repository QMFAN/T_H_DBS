import { Repository } from 'typeorm';
import { Area } from '../entities/area.entity';
import { SensorData } from '../entities/sensor-data.entity';
export interface OverviewStats {
    areasTotal: number;
    recordsTotal: number;
    timeRange: {
        min: Date | null;
        max: Date | null;
    };
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
export declare class AnalyticsService {
    private readonly areaRepo;
    private readonly dataRepo;
    constructor(areaRepo: Repository<Area>, dataRepo: Repository<SensorData>);
    getOverview(): Promise<OverviewStats>;
    getAreas(query: AreasQuery): Promise<{
        list: AreaItem[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getAreaSegments(query: AreaSegmentsQuery): Promise<{
        segments: SegmentItem[];
        segmentsCount: number;
    }>;
    streamExport(res: any, payload: {
        areaIds?: number[];
        ranges?: {
            start: Date;
            end: Date;
        }[];
        granularity?: 'record' | 'day';
    }): Promise<void>;
    previewDelete(payload: {
        areaIds?: number[];
        ranges?: {
            start: Date;
            end: Date;
        }[];
    }): Promise<{
        affected: number;
        byArea: {
            areaId: number;
            count: number;
        }[];
        byRange: {
            start: Date;
            end: Date;
            count: number;
        }[];
    }>;
    deleteData(payload: {
        areaIds?: number[];
        ranges?: {
            start: Date;
            end: Date;
        }[];
        batchSize?: number;
    }): Promise<{
        affected: number;
    }>;
}
