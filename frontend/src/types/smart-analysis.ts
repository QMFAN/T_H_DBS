export interface Range { start: string; end: string }

export interface QueryResult {
  success: boolean;
  data: Array<{ timestamp: string; temperature: number | null; humidity: number | null }>;
  adjustedRange: Range;
  availableRanges: Range[];
  missingRanges: Range[];
  message?: string;
}

export interface SegmentsResult {
  success: boolean;
  segments: Range[];
}

export interface AnalyzeResult {
  success: boolean;
  area: string;
  start_time: string;
  end_time: string;
  stats: {
    temperature: { min: number | null; max: number | null; avg: number | null };
    humidity: { min: number | null; max: number | null; avg: number | null };
    data_points: number;
    start_time: string;
    end_time: string;
  };
  threshold: { temp_min: number; temp_max: number; humidity_min: number; humidity_max: number; source: 'user' | 'db' };
  temperature_anomalies: Array<{ timestamp: string; temperature: number | null; type: 'low' | 'high' }>;
  temperature_continuous_anomalies: Array<{
    start_time: string;
    end_time: string;
    duration_minutes: number;
    type: 'low' | 'high';
    data_points: number;
    min_value: number;
    max_value: number;
    range: string;
  }>;
  humidity_anomalies: Array<{ timestamp: string; humidity: number | null; type: 'low' | 'high' }>;
  humidity_continuous_anomalies: Array<{
    start_time: string;
    end_time: string;
    duration_minutes: number;
    type: 'low' | 'high';
    data_points: number;
    min_value: number;
    max_value: number;
    range: string;
  }>;
  adjusted_range: Range;
  missing_ranges: Range[];
  message?: string;
}