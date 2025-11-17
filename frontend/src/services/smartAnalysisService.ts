import http from './http';
import type { AnalyzeResult, QueryResult, SegmentsResult } from '../types/smart-analysis';

export const smartAnalysisService = {
  async getAreas() {
    const res = await http.get('/smart/areas');
    return res.data;
  },
  async query(params: { area: string; start: string; end: string; limit?: number; gapToleranceMinutes?: number }) {
    const res = await http.get<QueryResult>('/smart/query', { params });
    return res.data;
  },
  async segments(params: { area: string; start: string; end: string; granularity?: 'record' | 'day'; gapToleranceMinutes?: number }) {
    const res = await http.get<SegmentsResult>('/smart/segments', { params });
    return res.data;
  },
  async analyze(body: { area: string; start: string; end: string; tempMin?: number; tempMax?: number; humidityMin?: number; humidityMax?: number; tempDurationMin?: number; humidityDurationMin?: number; toleranceNormalBudget?: number; gapToleranceMinutes?: number }) {
    const res = await http.post<AnalyzeResult>('/smart/analyze', body);
    return res.data;
  },
};