export type ImportTaskStatus = 'completed' | 'pending' | 'processing' | 'failed';
export declare class ImportTask {
    id: number;
    taskId: string;
    batchId: string;
    fileName: string;
    storedPath?: string | null;
    fileUrl?: string | null;
    status: ImportTaskStatus;
    records: number;
    skipped: number;
    imported: number;
    duplicates: number;
    conflicts: number;
    anomaliesTotal: number;
    anomaliesProcessed: number;
    skipCount: number;
    overwriteCount: number;
    autoResolved: number;
    manualResolved: number;
    message?: string | null;
    progressLastAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
