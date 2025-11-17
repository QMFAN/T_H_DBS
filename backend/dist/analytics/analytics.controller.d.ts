import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analytics;
    constructor(analytics: AnalyticsService);
    overview(): Promise<import("./analytics.service").OverviewStats>;
    areas(areaIds?: string, start?: string, end?: string, page?: string, pageSize?: string, sort?: 'count' | 'name' | 'min' | 'max', order?: 'asc' | 'desc'): Promise<{
        list: import("./analytics.service").AreaItem[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    areaSegments(areaId: string, start?: string, end?: string, granularity?: 'record' | 'day', limit?: string, gapToleranceMinutes?: string): Promise<{
        segments: import("./analytics.service").SegmentItem[];
        segmentsCount: number;
    }>;
    export(res: Response, body: {
        areaIds?: number[];
        ranges?: {
            start: number;
            end: number;
        }[];
        granularity?: 'record' | 'day';
    }): Promise<void>;
    deleteData(body: {
        areaIds?: number[];
        ranges?: {
            start: number;
            end: number;
        }[];
        dryRun?: boolean;
        batchSize?: number;
    }): Promise<{
        affected: number;
    }>;
}
