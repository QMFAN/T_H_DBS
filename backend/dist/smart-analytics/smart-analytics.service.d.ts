import { Repository } from 'typeorm';
import { Area } from '../entities/area.entity';
import { SensorData } from '../entities/sensor-data.entity';
import { AreaDefaultsEntity } from '../entities/area-defaults.entity';
import { QueryDto } from './dto/query.dto';
import { SegmentsDto } from './dto/segments.dto';
import { AnalyzeDto } from './dto/analyze.dto';
type Range = {
    start: string;
    end: string;
};
export declare class SmartAnalyticsService {
    private readonly areaRepo;
    private readonly dataRepo;
    private readonly defaultsRepo;
    constructor(areaRepo: Repository<Area>, dataRepo: Repository<SensorData>, defaultsRepo: Repository<AreaDefaultsEntity>);
    getAreas(): Promise<{
        success: boolean;
        areas: Area[];
    }>;
    private toDate;
    private fmt;
    private getAreaByNameOrCode;
    private getDbRange;
    private fetchData;
    private computeMedianGap;
    private buildSegments;
    private mergeSegments;
    private complementMissing;
    query(dto: QueryDto): Promise<{
        success: boolean;
        message: string;
        data?: undefined;
        available_range?: undefined;
        adjustedRange?: undefined;
        availableRanges?: undefined;
        missingRanges?: undefined;
    } | {
        success: boolean;
        message: string;
        data: never[];
        available_range?: undefined;
        adjustedRange?: undefined;
        availableRanges?: undefined;
        missingRanges?: undefined;
    } | {
        success: boolean;
        message: string;
        available_range: {
            min_time: string;
            max_time: string;
        };
        data: never[];
        adjustedRange?: undefined;
        availableRanges?: undefined;
        missingRanges?: undefined;
    } | {
        success: boolean;
        data: {
            timestamp: string;
            temperature: number | null;
            humidity: number | null;
        }[];
        adjustedRange: Range;
        availableRanges: Range[];
        missingRanges: Range[];
        message?: undefined;
        available_range?: undefined;
    }>;
    segments(dto: SegmentsDto): Promise<{
        success: boolean;
        message: string;
        segments?: undefined;
    } | {
        success: boolean;
        segments: Range[];
        message?: undefined;
    }>;
    analyze(dto: AnalyzeDto): Promise<{
        success: boolean;
        message: string;
        available_range?: undefined;
        area?: undefined;
        start_time?: undefined;
        end_time?: undefined;
        stats?: undefined;
        threshold?: undefined;
        temperature_anomalies?: undefined;
        temperature_continuous_anomalies?: undefined;
        humidity_anomalies?: undefined;
        humidity_continuous_anomalies?: undefined;
        adjusted_range?: undefined;
        missing_ranges?: undefined;
    } | {
        success: boolean;
        message: string;
        available_range: {
            min_time: string;
            max_time: string;
        };
        area?: undefined;
        start_time?: undefined;
        end_time?: undefined;
        stats?: undefined;
        threshold?: undefined;
        temperature_anomalies?: undefined;
        temperature_continuous_anomalies?: undefined;
        humidity_anomalies?: undefined;
        humidity_continuous_anomalies?: undefined;
        adjusted_range?: undefined;
        missing_ranges?: undefined;
    } | {
        success: boolean;
        area: string;
        start_time: string;
        end_time: string;
        stats: {
            temperature: {
                min: number | null;
                max: number | null;
                avg: number | null;
            };
            humidity: {
                min: number | null;
                max: number | null;
                avg: number | null;
            };
            data_points: number;
            start_time: string;
            end_time: string;
        };
        threshold: {
            temp_min: number;
            temp_max: number;
            humidity_min: number;
            humidity_max: number;
            source: string;
        };
        temperature_anomalies: {
            timestamp: string;
            temperature: number | null;
            type: string;
        }[];
        temperature_continuous_anomalies: any[];
        humidity_anomalies: {
            timestamp: string;
            humidity: number | null;
            type: string;
        }[];
        humidity_continuous_anomalies: any[];
        adjusted_range: Range;
        missing_ranges: Range[];
        message?: undefined;
        available_range?: undefined;
    }>;
}
export {};
