import http from './http';
import type {
  ImportConflictOverview,
  ImportDashboardSummary,
  ImportHistoryItem,
  PaginatedImportHistory,
  ResolveConflictPayload,
  BulkResolveConflictsPayload,
  UploadResponse,
} from '../types/import';
import type { RcFile } from 'antd/es/upload';

const importService = {
  async fetchDashboardSummary(): Promise<ImportDashboardSummary> {
    const { data } = await http.get<ImportDashboardSummary>('/imports/summary');
    return data;
  },
  async fetchConflicts(): Promise<ImportConflictOverview> {
    const { data } = await http.get<ImportConflictOverview>('/imports/conflicts');
    return data;
  },
  async fetchHistory(params?: { limit?: number }): Promise<ImportHistoryItem[]> {
    const { data } = await http.get<ImportHistoryItem[]>('/imports/history', { params });
    return data;
  },
  async fetchHistoryPaged(page: number, pageSize: number): Promise<PaginatedImportHistory> {
    const { data } = await http.get<PaginatedImportHistory>('/imports/history/page', { params: { page, pageSize } });
    return data;
  },
  async deleteHistoryItem(taskId: string, options?: { deleteFile?: boolean }): Promise<void> {
    const params = options?.deleteFile ? { deleteFile: String(!!options.deleteFile) } : undefined
    await http.delete(`/imports/history/${taskId}`, { params })
  },
  async resolveConflict(conflictId: string, payload: ResolveConflictPayload): Promise<void> {
    await http.post(`/imports/conflicts/${conflictId}/resolve`, payload);
  },
  async skipConflict(conflictId: string): Promise<void> {
    await importService.resolveConflict(conflictId, { action: 'skip' });
  },
  async overwriteConflict(conflictId: string, variantId: string): Promise<void> {
    await importService.resolveConflict(conflictId, { action: 'overwrite', variantId });
  },
  async bulkResolveConflicts(payload: BulkResolveConflictsPayload): Promise<void> {
    await http.post('/imports/conflicts/bulk-resolve', payload, {
      timeout: 300000, // 5分钟超时，处理大量数据
    });
  },
  async resetData(): Promise<void> {
    await http.delete('/imports/reset');
  },
  async uploadFiles(files: RcFile[]): Promise<UploadResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const { data } = await http.post<UploadResponse>('/imports/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 300000, // 5分钟超时
    });
    return data;
  },
};

export default importService;
