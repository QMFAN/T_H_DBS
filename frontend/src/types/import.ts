export interface ConflictSourceSummary {
  label: string;
  count: number;
  type: 'new' | 'existing';
}

export interface ConflictVariant {
  variantId: string;
  temperature: string | null;
  humidity: string | null;
  totalCount: number;
  newCount: number;
  existingCount: number;
  sourceSummaries: ConflictSourceSummary[];
}

export interface ConflictDetail {
  anomalyId: string;
  timestamp: string;
  status: 'pending' | 'resolved';
  variants: ConflictVariant[];
}

export interface ConflictAreaGroup {
  areaName: string;
  anomalies: ConflictDetail[];
}

export interface DuplicateAreaSummary {
  areaName: string;
  anomalyCount: number;
  recordCount: number;
}

export interface DuplicateConflictSummary {
  pendingCount: number;
  recordCount: number;
  anomalyIds: string[];
  areaSummaries: DuplicateAreaSummary[];
}

export interface ImportConflictOverview {
  duplicates: DuplicateConflictSummary;
  conflicts: ConflictAreaGroup[];
}

export interface ImportHistoryItem {
  id: string;
  fileName: string;
  imported: number;
  duplicates: number;
  conflicts: number;
  fileUrl?: string;
  uploadedAt: string;
  anomaliesTotal?: number;
  anomaliesProcessed?: number;
  skipCount?: number;
  overwriteCount?: number;
}

export interface ImportDashboardSummary {
  pendingFiles: number;
  importedRecords: number;
  pendingConflicts: number;
  lastImportAt?: string;
}

export interface UploadResponse {
  taskId: string;
  imported: number;
  duplicates: number;
  conflicts: number;
}

export interface ResolveConflictPayload {
  action: 'skip' | 'overwrite';
  variantId?: string;
}

export interface BulkResolveConflictsPayload {
  type: 'duplicate' | 'conflict';
  action: 'skip' | 'overwrite';
  anomalyIds?: string[];
}
