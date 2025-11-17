import http from './http';

export interface OverviewStats {
  areasTotal: number;
  recordsTotal: number;
  timeRange: { min: string | null; max: string | null };
}

export interface AreaItem {
  areaId: number;
  areaName: string;
  count: number;
  timeMin: string | null;
  timeMax: string | null;
  lastUpdated: string | null;
  segmentsCount?: number;
}

export interface AreasResponse {
  list: AreaItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SegmentItem {
  start: string;
  end: string;
  count: number;
}

export const analyticsService = {
  async getOverview() {
    const { data } = await http.get<OverviewStats>('/analytics/overview');
    return data;
  },

  async getAreas(params: { areaIds?: number[]; start?: number; end?: number; page?: number; pageSize?: number; sort?: 'count' | 'name' | 'min' | 'max'; order?: 'asc' | 'desc' }) {
    const { data } = await http.get<AreasResponse>('/analytics/areas', { params: { ...params, areaIds: params.areaIds?.join(',') } });
    return data;
  },

  async getAreaSegments(params: { areaId: number; start?: number; end?: number; granularity?: 'record' | 'day'; limit?: number; gapToleranceMinutes?: number }) {
    const { data } = await http.get<{ segments: SegmentItem[]; segmentsCount: number }>('/analytics/area/segments', { params });
    return data;
  },

  async exportCsv(body: { areaIds?: number[]; ranges?: { start: number; end: number }[]; granularity?: 'record' | 'day' }) {
    const res = await http.post('/analytics/export', body, { responseType: 'blob' });
    return res.data as Blob;
  },
  async deleteData(body: { areaIds?: number[]; ranges?: { start: number; end: number }[]; dryRun?: boolean; batchSize?: number }) {
    const { data } = await http.post('/analytics/data/delete', body);
    return data as { affected: number; byArea?: Array<{ areaId: number; count: number }>; byRange?: Array<{ start: string; end: string; count: number }> };
  },
};