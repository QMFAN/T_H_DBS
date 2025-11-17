"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExcelImportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelImportService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const fs = __importStar(require("node:fs"));
const node_fs_1 = require("node:fs");
const path = __importStar(require("node:path"));
const node_crypto_1 = require("node:crypto");
const XLSX = __importStar(require("xlsx"));
const typeorm_2 = require("typeorm");
const area_entity_1 = require("../entities/area.entity");
const sensor_data_entity_1 = require("../entities/sensor-data.entity");
const import_task_entity_1 = require("../entities/import-task.entity");
const anomaly_store_interface_1 = require("./anomaly-store.interface");
let ExcelImportService = ExcelImportService_1 = class ExcelImportService {
    configService;
    areaRepository;
    sensorDataRepository;
    importTaskRepository;
    anomalyStore;
    logger = new common_1.Logger(ExcelImportService_1.name);
    storageDir;
    publicBaseUrl;
    constructor(configService, areaRepository, sensorDataRepository, importTaskRepository, anomalyStore) {
        this.configService = configService;
        this.areaRepository = areaRepository;
        this.sensorDataRepository = sensorDataRepository;
        this.importTaskRepository = importTaskRepository;
        this.anomalyStore = anomalyStore;
    }
    onModuleInit() {
        const defaultStorage = path.join(process.cwd(), 'storage', 'imports');
        this.storageDir = this.configService.get('IMPORT_STORAGE_DIR', defaultStorage);
        this.publicBaseUrl = this.configService.get('IMPORT_STORAGE_BASE_URL', '/imports');
        try {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
        catch (error) {
            this.logger.error(`Failed to ensure storage directory: ${this.storageDir}`, error);
            throw error;
        }
    }
    async importFromPaths(paths) {
        const inputs = paths.map((rawPath) => ({
            path: rawPath,
            originalName: path.basename(rawPath),
        }));
        const { summaries } = await this.processBatch(inputs);
        return summaries;
    }
    async upload(files) {
        if (!files?.length) {
            throw new common_1.BadRequestException('至少需要上传一个 Excel 文件');
        }
        const inputs = files.map((file) => ({
            path: file.path,
            originalName: file.originalname,
            cleanup: true,
        }));
        const { batchId, summaries, totals } = await this.processBatch(inputs);
        const message = summaries
            .map((summary) => {
            const state = summary.message ? `：${summary.message}` : '';
            return `${summary.originalName}${state}`;
        })
            .join('； ');
        return {
            taskId: batchId,
            imported: totals.imported,
            duplicates: totals.duplicates,
            conflicts: totals.conflicts,
            message: message || undefined,
        };
    }
    async getDashboardSummary() {
        const pendingFiles = await this.importTaskRepository.count({ where: { status: 'pending' } });
        const importedTotalRaw = await this.importTaskRepository
            .createQueryBuilder('task')
            .select('COALESCE(SUM(task.imported), 0)', 'total')
            .getRawOne();
        const pendingConflicts = await this.anomalyStore.totalPending();
        const lastImportRaw = await this.importTaskRepository
            .createQueryBuilder('task')
            .select('task.createdAt', 'createdAt')
            .orderBy('task.createdAt', 'DESC')
            .limit(1)
            .getRawOne();
        return {
            pendingFiles,
            importedRecords: importedTotalRaw?.total ? Number(importedTotalRaw.total) : 0,
            pendingConflicts,
            lastImportAt: lastImportRaw?.createdAt ? lastImportRaw.createdAt.toISOString() : undefined,
        };
    }
    async getImportHistory(limit = 10) {
        const tasks = await this.importTaskRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
        });
        return tasks.map((task) => ({
            id: task.taskId,
            fileName: task.fileName,
            imported: task.imported,
            duplicates: task.duplicates,
            conflicts: task.conflicts,
            fileUrl: task.fileUrl ?? undefined,
            uploadedAt: task.createdAt.toISOString(),
            anomaliesTotal: task.anomaliesTotal ?? 0,
            anomaliesProcessed: task.anomaliesProcessed ?? 0,
            skipCount: task.skipCount ?? 0,
            overwriteCount: task.overwriteCount ?? 0,
        }));
    }
    async getImportHistoryPaged(page = 1, pageSize = 10) {
        const skip = (page - 1) * pageSize;
        const [tasks, total] = await this.importTaskRepository.findAndCount({
            order: { createdAt: 'DESC' },
            take: pageSize,
            skip,
        });
        const items = tasks.map((task) => ({
            id: task.taskId,
            fileName: task.fileName,
            imported: task.imported,
            duplicates: task.duplicates,
            conflicts: task.conflicts,
            fileUrl: task.fileUrl ?? undefined,
            uploadedAt: task.createdAt.toISOString(),
            anomaliesTotal: task.anomaliesTotal ?? 0,
            anomaliesProcessed: task.anomaliesProcessed ?? 0,
            skipCount: task.skipCount ?? 0,
            overwriteCount: task.overwriteCount ?? 0,
        }));
        return { items, total, page, pageSize };
    }
    async deleteImportTask(taskId, deleteFile) {
        const task = await this.importTaskRepository.findOne({ where: { taskId } });
        if (!task) {
            throw new common_1.NotFoundException(`未找到任务 ${taskId}`);
        }
        try {
            await this.importTaskRepository.delete({ id: task.id });
        }
        catch (error) {
            this.logger.error(`删除任务失败 ${taskId}`, error);
            throw error;
        }
        try {
            this.anomalyStore.deleteBatch(task.batchId);
        }
        catch (error) {
            this.logger.warn(`删除批次临时异常失败 ${task.batchId}`, error);
        }
        if (deleteFile && task.storedPath) {
            try {
                await node_fs_1.promises.unlink(task.storedPath);
            }
            catch (error) {
                this.logger.warn(`删除文件失败 ${task.storedPath}`, error);
            }
        }
    }
    async getAnomalyOverview() {
        return this.anomalyStore.getOverview();
    }
    buildDuplicateSummary(anomalies) {
        const areaMap = new Map();
        let totalRecords = 0;
        for (const anomaly of anomalies) {
            const recordCount = anomaly.variants.reduce((sum, v) => sum + v.newCount, 0);
            totalRecords += recordCount;
            const existing = areaMap.get(anomaly.areaName);
            if (existing) {
                existing.anomalyCount += 1;
                existing.recordCount += recordCount;
            }
            else {
                areaMap.set(anomaly.areaName, { anomalyCount: 1, recordCount });
            }
        }
        const areaSummaries = Array.from(areaMap.entries()).map(([areaName, stats]) => ({
            areaName,
            anomalyCount: stats.anomalyCount,
            recordCount: stats.recordCount,
        }));
        return {
            pendingCount: anomalies.length,
            recordCount: totalRecords,
            anomalyIds: anomalies.map((a) => a.anomalyId),
            areaSummaries,
        };
    }
    buildAnomalyGroups(anomalies) {
        const areaMap = new Map();
        for (const anomaly of anomalies) {
            const existing = areaMap.get(anomaly.areaName);
            if (existing) {
                existing.push(anomaly);
            }
            else {
                areaMap.set(anomaly.areaName, [anomaly]);
            }
        }
        return Array.from(areaMap.entries()).map(([areaName, items]) => ({
            areaName,
            anomalies: items.map((anomaly) => ({
                anomalyId: anomaly.anomalyId,
                timestamp: anomaly.timestamp.toISOString(),
                status: anomaly.status,
                variants: anomaly.variants.map((variant, index) => this.normalizeVariantRecord(variant, index)),
            })),
        }));
    }
    async clearAllData() {
        this.logger.warn('Clearing areas, sensor data, import tasks and conflicts tables');
        const manager = this.areaRepository.manager;
        await manager.query('SET FOREIGN_KEY_CHECKS=0');
        try {
            const tables = ['sensor_data', 'import_tasks', 'areas'];
            for (const table of tables) {
                await manager.query(`TRUNCATE TABLE ${table}`);
            }
        }
        finally {
            await manager.query('SET FOREIGN_KEY_CHECKS=1');
        }
    }
    async bulkResolveAnomalies(dto) {
        const anomalyIds = dto.anomalyIds ?? [];
        if (!anomalyIds.length) {
            throw new common_1.BadRequestException('未提供需要处理的冲突记录');
        }
        const resolved = await this.anomalyStore.bulkResolve(dto.type, dto.action, anomalyIds);
        const byTask = new Map();
        for (const item of resolved) {
            let entry = byTask.get(item.taskNumericId);
            if (!entry) {
                entry = { count: 0, upserts: [], areaCache: new Map() };
                byTask.set(item.taskNumericId, entry);
            }
            entry.count += 1;
            if (dto.action === 'overwrite' && item.resolvedVariant) {
                const areaInfo = this.deriveAreaInfoFromName(item.areaName);
                let area = entry.areaCache.get(areaInfo.code);
                if (!area) {
                    area = await this.getOrCreateArea(areaInfo.code, areaInfo.name);
                    entry.areaCache.set(areaInfo.code, area);
                }
                const fileSource = this.buildResolvedFileSource(item.resolvedVariant);
                entry.upserts.push({
                    areaId: area.id,
                    timestamp: item.timestamp,
                    temperature: item.resolvedVariant.temperature ?? null,
                    humidity: item.resolvedVariant.humidity ?? null,
                    fileSource,
                });
            }
        }
        for (const [, group] of byTask.entries()) {
            if (group.upserts.length) {
                const chunkSize = 1000;
                for (let i = 0; i < group.upserts.length; i += chunkSize) {
                    const chunk = group.upserts.slice(i, i + chunkSize);
                    await this.sensorDataRepository.upsert(chunk, ['areaId', 'timestamp']);
                }
            }
        }
        for (const [taskId, group] of byTask.entries()) {
            const task = await this.importTaskRepository.findOne({ where: { id: taskId } });
            if (!task)
                continue;
            task.manualResolved += group.count;
            task.anomaliesProcessed = (task.anomaliesProcessed ?? 0) + group.count;
            if (dto.action === 'skip') {
                task.skipCount = (task.skipCount ?? 0) + group.count;
            }
            else if (dto.action === 'overwrite') {
                task.overwriteCount = (task.overwriteCount ?? 0) + group.count;
            }
            const pendingForTask = await this.anomalyStore.pendingCountForTask(taskId);
            task.status = pendingForTask === 0 ? 'completed' : 'processing';
            task.progressLastAt = new Date();
            await this.importTaskRepository.save(task);
        }
    }
    async resolveAnomaly(anomalyId, dto) {
        const resolved = await this.anomalyStore.resolveOne(anomalyId, dto.action, dto.variantId);
        if (!resolved) {
            throw new common_1.NotFoundException(`未找到编号为 ${anomalyId} 的异常记录`);
        }
        if (dto.action === 'overwrite' && resolved.resolvedVariant) {
            const areaInfo = this.deriveAreaInfoFromName(resolved.areaName);
            const area = await this.getOrCreateArea(areaInfo.code, areaInfo.name);
            const fileSource = this.buildResolvedFileSource(resolved.resolvedVariant);
            await this.sensorDataRepository.upsert([
                {
                    areaId: area.id,
                    timestamp: resolved.timestamp,
                    temperature: resolved.resolvedVariant.temperature,
                    humidity: resolved.resolvedVariant.humidity,
                    fileSource,
                },
            ], ['areaId', 'timestamp']);
        }
        const task = await this.importTaskRepository.findOne({ where: { id: resolved.taskNumericId } });
        if (task) {
            task.manualResolved += 1;
            task.anomaliesProcessed = (task.anomaliesProcessed ?? 0) + 1;
            if (dto.action === 'skip') {
                task.skipCount = (task.skipCount ?? 0) + 1;
            }
            else if (dto.action === 'overwrite') {
                task.overwriteCount = (task.overwriteCount ?? 0) + 1;
            }
            const pendingForTask = await this.anomalyStore.pendingCountForTask(resolved.taskNumericId);
            task.status = pendingForTask === 0 ? 'completed' : 'processing';
            task.progressLastAt = new Date();
            await this.importTaskRepository.save(task);
        }
    }
    async processBatch(inputs) {
        if (!inputs.length) {
            throw new common_1.BadRequestException('未提供可处理的文件');
        }
        const batchId = (0, node_crypto_1.randomUUID)();
        const summaries = [];
        const totals = {
            records: 0,
            imported: 0,
            duplicates: 0,
            conflicts: 0,
        };
        for (const input of inputs) {
            const summary = await this.processInput(batchId, input).catch((error) => {
                this.logger.error(`处理文件失败: ${input.path}`, error);
                return this.buildFailedSummary(input, error);
            });
            summaries.push(summary);
            totals.records += summary.records;
            totals.imported += summary.imported;
            totals.duplicates += summary.duplicates ?? 0;
            totals.conflicts += summary.conflicts ?? 0;
            if (input.cleanup) {
                await this.removeTempFile(input.path);
            }
        }
        return { batchId, summaries, totals };
    }
    async processInput(batchId, input) {
        const absolutePath = path.resolve(input.path);
        const summary = {
            filePath: absolutePath,
            originalName: input.originalName ?? path.basename(absolutePath),
            records: 0,
            skipped: 0,
            imported: 0,
            duplicates: 0,
            conflicts: 0,
            anomalyGroups: [],
        };
        if (!fs.existsSync(absolutePath)) {
            summary.message = '文件不存在';
            await this.saveTaskSummary(batchId, summary, 'failed');
            return summary;
        }
        const archive = this.archiveOriginalFile(absolutePath, input.originalName);
        summary.storedPath = archive.destination;
        summary.publicUrl = archive.publicUrl;
        summary.fileUrl = archive.relativePath;
        const { records, skipped } = this.parseExcelFile(absolutePath, archive.publicUrl);
        summary.records = records.length;
        summary.skipped = skipped;
        const existingRecords = await this.loadExistingRecords(records);
        const { resolvedRecords, duplicateCount, anomalyGroups } = this.resolveDuplicateRecords(records, existingRecords);
        summary.duplicates = duplicateCount;
        summary.resolved = resolvedRecords.length;
        summary.conflicts = anomalyGroups.filter(g => g.type === 'conflict').length;
        summary.anomalyGroups = anomalyGroups;
        if (!resolvedRecords.length) {
            summary.message = anomalyGroups.length
                ? '全部记录存在冲突，请人工确认'
                : '未解析到可导入的数据';
        }
        else {
            await this.persistRecords(resolvedRecords);
            summary.imported = resolvedRecords.length;
        }
        const forcedStatus = summary.message && summary.conflicts === 0 ? 'failed' : undefined;
        const task = await this.saveTaskSummary(batchId, summary, forcedStatus);
        summary.taskId = task.taskId;
        if (anomalyGroups.length) {
            this.anomalyStore.register(batchId, task.id, anomalyGroups.map((g) => ({
                anomalyId: (0, node_crypto_1.randomUUID)(),
                areaName: g.areaName,
                timestamp: g.timestamp,
                type: g.type,
                variants: g.variants.map((v) => this.toVariantRecord(v)),
            })));
        }
        return summary;
    }
    buildFailedSummary(input, error) {
        const absolutePath = path.resolve(input.path);
        return {
            filePath: absolutePath,
            originalName: input.originalName ?? path.basename(absolutePath),
            records: 0,
            skipped: 0,
            imported: 0,
            duplicates: 0,
            conflicts: 0,
            anomalyGroups: [],
            message: error instanceof Error ? error.message : String(error),
        };
    }
    async removeTempFile(targetPath) {
        try {
            await node_fs_1.promises.unlink(targetPath);
        }
        catch (error) {
            this.logger.warn(`临时文件清理失败: ${targetPath}`, error);
        }
    }
    async saveTaskSummary(batchId, summary, forcedStatus) {
        const status = forcedStatus ?? (summary.conflicts && summary.conflicts > 0 ? 'pending' : summary.imported > 0 ? 'completed' : 'pending');
        const task = this.importTaskRepository.create({
            taskId: (0, node_crypto_1.randomUUID)(),
            batchId,
            fileName: summary.originalName,
            storedPath: summary.storedPath ?? null,
            fileUrl: summary.fileUrl ?? null,
            status,
            records: summary.records,
            skipped: summary.skipped,
            imported: summary.imported,
            duplicates: summary.duplicates ?? 0,
            conflicts: summary.conflicts ?? 0,
            anomaliesTotal: summary.anomalyGroups?.length ?? 0,
            anomaliesProcessed: 0,
            skipCount: 0,
            overwriteCount: 0,
            autoResolved: summary.resolved ?? 0,
            manualResolved: 0,
            message: summary.message ?? null,
            progressLastAt: new Date(),
        });
        return this.importTaskRepository.save(task);
    }
    async saveAnomalies(task, groups) { }
    toVariantRecord(variant) {
        return {
            variantId: variant.variantId,
            temperature: variant.temperature,
            humidity: variant.humidity,
            totalCount: variant.totalCount,
            newCount: variant.newCount,
            existingCount: variant.existingCount,
            sourceSummaries: variant.sourceSummaries.map((summary) => ({
                label: summary.label,
                count: summary.count,
                type: summary.type,
            })),
        };
    }
    normalizeVariantRecord(variant, index) {
        const fallbackId = `${variant.temperature ?? 'null'}-${variant.humidity ?? 'null'}-${index}`;
        const totalCount = this.pickVariantNumber(variant.totalCount, variant?.count);
        const newCount = this.pickVariantNumber(variant.newCount, totalCount);
        const existingCount = this.pickVariantNumber(variant.existingCount, 0);
        const sourceSummaries = this.normalizeSourceSummaries(variant);
        return {
            variantId: variant.variantId ?? fallbackId,
            temperature: variant.temperature ?? null,
            humidity: variant.humidity ?? null,
            totalCount,
            newCount,
            existingCount,
            sourceSummaries,
        };
    }
    normalizeSourceSummaries(variant) {
        if (Array.isArray(variant.sourceSummaries) && variant.sourceSummaries.length) {
            return variant.sourceSummaries.map((summary) => ({
                label: summary.label,
                count: summary.count,
                type: summary.type,
            }));
        }
        const legacy = variant.fileSources ?? [];
        if (!Array.isArray(legacy) || !legacy.length) {
            return [
                {
                    label: '未知来源',
                    count: this.pickVariantNumber(variant.totalCount, 0) || 1,
                    type: 'new',
                },
            ];
        }
        return legacy.map((source) => ({
            label: typeof source === 'string' && source.trim() ? source : '导入文件',
            count: 1,
            type: 'new',
        }));
    }
    pickVariantNumber(primary, fallback) {
        if (typeof primary === 'number' && Number.isFinite(primary)) {
            return primary;
        }
        if (typeof fallback === 'number' && Number.isFinite(fallback)) {
            return fallback;
        }
        return 0;
    }
    archiveOriginalFile(filePath, originalName) {
        const fallbackName = path.basename(filePath);
        const baseName = originalName?.trim() ? originalName.trim() : fallbackName;
        const timestamp = this.formatDateForFile(new Date());
        const sanitized = baseName
            .replace(/[\\/]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/[^0-9A-Za-z._+\-\u4e00-\u9fa5]/g, '_');
        const storedName = `${timestamp}_${sanitized}`;
        const destination = path.join(this.storageDir, storedName);
        fs.copyFileSync(filePath, destination);
        const relativePath = `/${encodeURIComponent(storedName)}`;
        const base = this.publicBaseUrl.replace(/\/+$/, '');
        const publicUrl = `${base}${relativePath}`;
        return { destination, relativePath, publicUrl };
    }
    parseExcelFile(filePath, fileUrl) {
        const workbook = XLSX.readFile(filePath, {
            cellDates: true,
            sheets: undefined,
        });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        if (!sheet) {
            throw new Error('Workbook does not contain a readable worksheet');
        }
        const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: null,
            raw: true,
        });
        if (!rows.length) {
            return { records: [], skipped: 0 };
        }
        const headerRowIndex = this.findHeaderRow(rows);
        if (headerRowIndex === -1) {
            throw new Error('Unable to locate header row');
        }
        const headers = (rows[headerRowIndex] ?? []).map((cell) => cell === null || cell === undefined ? '' : String(cell));
        const dataRows = rows.slice(headerRowIndex + 1);
        const areaInfos = this.extractAreaInfos(filePath, rows, headers);
        const columnMapping = this.identifyColumns(headers, areaInfos);
        if (columnMapping.timeIndex === -1) {
            throw new Error('Time column could not be identified');
        }
        const records = [];
        let skipped = 0;
        for (const row of dataRows) {
            const timestamp = this.parseTimestamp(row[columnMapping.timeIndex]);
            if (!timestamp) {
                skipped += 1;
                continue;
            }
            for (const area of areaInfos) {
                const areaColumns = columnMapping.areaColumns.get(area.code);
                if (!areaColumns) {
                    continue;
                }
                const temperature = this.parseNumericValue(areaColumns.temperatureIndex !== undefined
                    ? row[areaColumns.temperatureIndex]
                    : undefined);
                const humidity = this.parseNumericValue(areaColumns.humidityIndex !== undefined
                    ? row[areaColumns.humidityIndex]
                    : undefined);
                if (temperature === null && humidity === null) {
                    continue;
                }
                records.push({
                    areaCode: area.code,
                    areaName: area.name,
                    timestamp,
                    temperature,
                    humidity,
                    fileSource: fileUrl,
                });
            }
        }
        return { records, skipped };
    }
    async persistRecords(records) {
        const areaCache = new Map();
        for (const record of records) {
            if (!areaCache.has(record.areaCode)) {
                const area = await this.getOrCreateArea(record.areaCode, record.areaName);
                areaCache.set(record.areaCode, area);
            }
        }
        const prepared = records.map((record) => {
            const area = areaCache.get(record.areaCode);
            if (!area) {
                throw new Error(`Area cache missing for ${record.areaCode}`);
            }
            return {
                areaId: area.id,
                timestamp: record.timestamp,
                temperature: record.temperature,
                humidity: record.humidity,
                fileSource: record.fileSource,
            };
        });
        const chunkSize = 500;
        for (let i = 0; i < prepared.length; i += chunkSize) {
            const chunk = prepared.slice(i, i + chunkSize);
            await this.sensorDataRepository.upsert(chunk, ['areaId', 'timestamp']);
        }
    }
    normalizeAreaCode(code) {
        return code?.trim().toUpperCase() || 'UNKNOWN';
    }
    displayFileSource(source, fallback) {
        if (source && source.trim()) {
            return source;
        }
        return fallback;
    }
    async getOrCreateArea(code, name) {
        const normalizedCode = this.normalizeAreaCode(code);
        const normalizedName = name.trim() || `区域${normalizedCode}`;
        let area = await this.areaRepository.findOne({ where: { code: normalizedCode } });
        if (!area) {
            area = this.areaRepository.create({
                code: normalizedCode,
                name: normalizedName,
                location: null,
            });
        }
        else if (this.shouldUpdateAreaName(area.name, normalizedName, normalizedCode)) {
            area.name = normalizedName;
        }
        return this.areaRepository.save(area);
    }
    extractAreaInfos(filePath, rows, headers) {
        const candidates = new Map();
        const register = (raw) => {
            if (raw === null || raw === undefined) {
                return;
            }
            const trimmed = String(raw).trim();
            if (!trimmed) {
                return;
            }
            const info = this.deriveAreaInfoFromName(trimmed);
            if (info.code === 'UNKNOWN') {
                return;
            }
            const normalizedCode = this.normalizeAreaCode(info.code);
            const normalizedInfo = {
                code: normalizedCode,
                name: info.name,
            };
            const existing = candidates.get(normalizedCode);
            if (!existing) {
                candidates.set(normalizedCode, normalizedInfo);
                return;
            }
            if (this.shouldUpdateAreaName(existing.name, info.name, normalizedCode)) {
                candidates.set(normalizedCode, normalizedInfo);
            }
        };
        for (const name of this.extractAreaNames(filePath)) {
            register(name);
        }
        const rowLimit = Math.min(rows.length, 10);
        const areaPattern = /(动物室\d+[A-Za-z]*|检疫隔离室\d+[A-Za-z]*|检疫室\d+[A-Za-z]*|检隔室\d+[A-Za-z]*|隔离室\d+[A-Za-z]*|\d+[A-Za-z]*动物室|\d+[A-Za-z]*检疫隔离室|\d+[A-Za-z]*检疫室|\d+[A-Za-z]*检隔室|\d+[A-Za-z]*隔离室)/g;
        for (let i = 0; i < rowLimit; i += 1) {
            const row = rows[i] ?? [];
            for (const cell of row) {
                if (typeof cell !== 'string') {
                    continue;
                }
                const normalized = cell.replace(/\s+/g, '');
                if (!normalized) {
                    continue;
                }
                let match;
                areaPattern.lastIndex = 0;
                while ((match = areaPattern.exec(normalized)) !== null) {
                    let candidate = match[0];
                    const reorder = candidate.match(/^(\d+[A-Za-z]*)(检隔室|检疫隔离室)$/);
                    if (reorder) {
                        candidate = `${reorder[2]}${reorder[1]}`;
                    }
                    register(candidate);
                }
            }
        }
        if (headers?.length) {
            for (const header of headers) {
                if (typeof header !== 'string') {
                    continue;
                }
                for (const token of this.extractAreaTokensFromHeader(header)) {
                    register(token);
                }
            }
        }
        if (!candidates.size) {
            const fallback = this.deriveAreaInfoFromName('未知区域');
            const normalizedCode = this.normalizeAreaCode(fallback.code);
            candidates.set(normalizedCode, {
                code: normalizedCode,
                name: fallback.name,
            });
        }
        return Array.from(candidates.values());
    }
    async loadExistingRecords(records) {
        if (!records.length) {
            return [];
        }
        const byArea = new Map();
        for (const record of records) {
            const normalizedCode = this.normalizeAreaCode(record.areaCode);
            record.areaCode = normalizedCode;
            record.areaName = record.areaName?.trim() || `区域${normalizedCode}`;
            let entry = byArea.get(normalizedCode);
            if (!entry) {
                entry = {
                    timestamps: new Set(),
                    lastKnownName: record.areaName,
                };
                byArea.set(normalizedCode, entry);
            }
            entry.timestamps.add(record.timestamp.toISOString());
            entry.lastKnownName = record.areaName;
        }
        const areaCodes = Array.from(byArea.keys());
        if (!areaCodes.length) {
            return [];
        }
        const areas = await this.areaRepository.find({ where: { code: (0, typeorm_2.In)(areaCodes) } });
        if (!areas.length) {
            return [];
        }
        const areaByCode = new Map();
        const areaById = new Map();
        for (const area of areas) {
            areaByCode.set(area.code, area);
            areaById.set(area.id, area);
        }
        const conditions = [];
        for (const [code, meta] of byArea.entries()) {
            const area = areaByCode.get(code);
            if (!area) {
                continue;
            }
            for (const iso of meta.timestamps.values()) {
                conditions.push({ areaId: area.id, timestamp: new Date(iso) });
            }
        }
        if (!conditions.length) {
            return [];
        }
        const existing = await this.sensorDataRepository.find({ where: conditions });
        if (!existing.length) {
            return [];
        }
        const parsedExisting = [];
        for (const record of existing) {
            const area = areaById.get(record.areaId);
            if (!area) {
                continue;
            }
            const meta = byArea.get(area.code);
            parsedExisting.push({
                areaCode: area.code,
                areaName: area.name ?? meta?.lastKnownName ?? area.code,
                timestamp: record.timestamp,
                temperature: record.temperature ?? null,
                humidity: record.humidity ?? null,
                fileSource: this.displayFileSource(record.fileSource, '数据库已有记录'),
                isExisting: true,
            });
        }
        return parsedExisting;
    }
    extractAreaNames(filePath) {
        const fileName = path.basename(filePath, path.extname(filePath));
        const matches = new Set();
        const multiAnimal = fileName.match(/动物室(\d+[A-Za-z]*)&(\d+[A-Za-z]*)/);
        if (multiAnimal) {
            matches.add(`动物室${multiAnimal[1]}`);
            matches.add(`动物室${multiAnimal[2]}`);
        }
        const multiQuarantine = fileName.match(/检疫隔离室(\d+)&(\d+)/);
        if (multiQuarantine) {
            matches.add(`检疫隔离室${multiQuarantine[1]}`);
            matches.add(`检疫隔离室${multiQuarantine[2]}`);
        }
        const multiSimpleQuarantine = fileName.match(/检疫室(\d+)&(\d+)/);
        if (multiSimpleQuarantine) {
            matches.add(`检疫室${multiSimpleQuarantine[1]}`);
            matches.add(`检疫室${multiSimpleQuarantine[2]}`);
        }
        const animalRooms = fileName.match(/动物室(\d+[A-Za-z]?)/g) ?? [];
        for (const room of animalRooms) {
            matches.add(room);
        }
        const quarantineRooms = fileName.match(/检疫隔离室(\d+)/g) ?? [];
        for (const room of quarantineRooms) {
            matches.add(room);
        }
        const genericPattern = /(动物室\d+[A-Za-z]*|检疫隔离室\d+[A-Za-z]*|检疫室\d+[A-Za-z]*|检隔室\d+[A-Za-z]*|隔离室\d+[A-Za-z]*|\d+[A-Za-z]*检疫隔离室|\d+[A-Za-z]*检疫室|\d+[A-Za-z]*检隔室|\d+[A-Za-z]*隔离室)/g;
        const normalized = fileName.replace(/\s+/g, '');
        const genericMatches = normalized.match(genericPattern) ?? [];
        for (const value of genericMatches) {
            const reorder = value.match(/^(\d+[A-Za-z]*)(检隔室|检疫隔离室)$/);
            matches.add(reorder ? `${reorder[2]}${reorder[1]}` : value);
        }
        return Array.from(matches);
    }
    extractAreaTokensFromHeader(header) {
        const trimmed = header?.trim();
        if (!trimmed) {
            return [];
        }
        const normalized = trimmed.replace(/\s+/g, '');
        if (!normalized) {
            return [];
        }
        const delimitIndex = normalized.search(/(温度|湿度|temp|humi|rh|压差|pressure|indoor|outdoor)/i);
        const base = delimitIndex !== -1 ? normalized.slice(0, delimitIndex) : normalized;
        const cleaned = base.replace(/[-_:：；;，,\.\/\\\(\)（）%％℃°\[\]{}]/g, '');
        if (!cleaned || !/\d/.test(cleaned)) {
            return [];
        }
        return [cleaned];
    }
    deriveAreaInfoFromName(rawName) {
        const trimmed = rawName?.trim() ?? '';
        const normalized = trimmed.replace(/\s+/g, '');
        const baseMatch = normalized.match(/(动物室\d+[A-Za-z]*|检疫隔离室\d+[A-Za-z]*|检疫室\d+[A-Za-z]*|检隔室\d+[A-Za-z]*|隔离室\d+[A-Za-z]*)/);
        let display = baseMatch ? baseMatch[0] : trimmed;
        const reorder = display.match(/^(\d+[A-Za-z]*)(检疫隔离室|检疫室|检隔室|隔离室|动物室)$/);
        if (reorder) {
            display = `${reorder[2]}${reorder[1]}`;
        }
        const codeMatch = display.match(/(\d+[A-Za-z]*)/);
        const code = (codeMatch ? codeMatch[1] : 'UNKNOWN').toUpperCase();
        const name = display || trimmed || `区域${code}`;
        return { code, name };
    }
    shouldUpdateAreaName(currentName, incomingName, code) {
        const normalize = (value) => value?.trim() ?? '';
        const current = normalize(currentName);
        const incoming = normalize(incomingName);
        if (!incoming || current === incoming) {
            return false;
        }
        const isGeneric = (value) => {
            if (!value) {
                return true;
            }
            const lowered = value.toLowerCase();
            return (lowered === code.toLowerCase() ||
                lowered.includes('未知') ||
                lowered.startsWith('区域'));
        };
        if (!current) {
            return true;
        }
        if (isGeneric(current) && !isGeneric(incoming)) {
            return true;
        }
        if (incoming.length > current.length && !isGeneric(incoming)) {
            return true;
        }
        return false;
    }
    findHeaderRow(rows) {
        const scanLimit = Math.min(rows.length, 15);
        for (let i = 0; i < scanLimit; i += 1) {
            const joined = (rows[i] ?? [])
                .map((cell) => (cell === null || cell === undefined ? '' : String(cell)))
                .join('');
            const normalized = joined.replace(/\s+/g, '').toLowerCase();
            if (normalized.includes('时间') ||
                normalized.includes('date') ||
                normalized.includes('time')) {
                if (normalized.includes('温度') ||
                    normalized.includes('temp') ||
                    normalized.includes('湿度') ||
                    normalized.includes('humi')) {
                    return i;
                }
            }
        }
        return -1;
    }
    identifyColumns(headers, areaInfos) {
        const normalizedHeaders = headers.map((header) => header.replace(/\s+/g, '').toLowerCase());
        const timeIndex = normalizedHeaders.findIndex((header) => TIME_KEYWORDS.some((keyword) => header.includes(keyword)));
        const generalTempIndex = normalizedHeaders.findIndex((header) => TEMP_KEYWORDS.some((keyword) => header.includes(keyword)));
        const generalHumidityIndex = normalizedHeaders.findIndex((header) => HUMIDITY_KEYWORDS.some((keyword) => header.includes(keyword)));
        const areaColumns = new Map();
        const allowGeneralFallback = areaInfos.length === 1;
        const findSpecificIndex = (candidateKeys, keywords) => {
            for (const key of candidateKeys) {
                const index = normalizedHeaders.findIndex((header) => header.includes(key) && keywords.some((kw) => header.includes(kw)));
                if (index !== -1) {
                    return index;
                }
            }
            return -1;
        };
        for (const area of areaInfos) {
            const candidateKeys = new Set();
            if (area.name) {
                candidateKeys.add(area.name.replace(/[^0-9a-zA-Z]/g, '').toLowerCase());
            }
            if (area.code) {
                candidateKeys.add(area.code.replace(/\s+/g, '').toLowerCase());
            }
            const temperatureSpecific = findSpecificIndex(candidateKeys, TEMP_KEYWORDS);
            const humiditySpecific = findSpecificIndex(candidateKeys, HUMIDITY_KEYWORDS);
            const temperatureIndex = temperatureSpecific !== -1
                ? temperatureSpecific
                : allowGeneralFallback
                    ? generalTempIndex
                    : -1;
            const humidityIndex = humiditySpecific !== -1
                ? humiditySpecific
                : allowGeneralFallback
                    ? generalHumidityIndex
                    : -1;
            if (temperatureIndex === -1 && humidityIndex === -1) {
                continue;
            }
            areaColumns.set(area.code, {
                temperatureIndex: temperatureIndex === -1 ? undefined : temperatureIndex,
                humidityIndex: humidityIndex === -1 ? undefined : humidityIndex,
            });
        }
        return { timeIndex, areaColumns };
    }
    parseTimestamp(value) {
        let ts = null;
        if (value instanceof Date) {
            ts = value;
        }
        else if (typeof value === 'number') {
            const parsed = XLSX.SSF.parse_date_code(value, { date1904: false });
            if (parsed && parsed.y && parsed.m && parsed.d) {
                ts = new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, Math.floor(parsed.S || 0), Math.round((parsed.S % 1) * 1000));
            }
        }
        else if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed) {
                const replaced = trimmed.replace(/\s+/g, ' ');
                const normalized = replaced.replace(' ', 'T');
                const parsed = new Date(normalized);
                if (!Number.isNaN(parsed.getTime())) {
                    ts = parsed;
                }
            }
        }
        if (!ts) {
            return null;
        }
        return this.snapToInterval(ts, 15);
    }
    resolveDuplicateRecords(records, existingRecords) {
        const combined = [...records, ...existingRecords];
        if (!combined.length) {
            return { resolvedRecords: [], duplicateCount: 0, anomalyGroups: [] };
        }
        const grouped = new Map();
        for (const record of combined) {
            const key = `${record.areaCode}__${record.timestamp.toISOString()}`;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    areaCode: record.areaCode,
                    areaName: record.areaName,
                    timestamp: record.timestamp,
                    entries: [record],
                });
            }
            else {
                grouped.get(key).entries.push(record);
            }
        }
        const resolvedRecords = [];
        const anomalyGroups = [];
        let duplicateCount = 0;
        for (const group of grouped.values()) {
            const { entries, areaCode, areaName, timestamp } = group;
            const newEntries = entries.filter((entry) => !entry.isExisting);
            if (!newEntries.length) {
                continue;
            }
            const existingEntries = entries.filter((entry) => entry.isExisting);
            const variantBuckets = this.groupEntriesByVariant(entries);
            const hasExisting = existingEntries.length > 0;
            const hasMultipleVariants = variantBuckets.length > 1;
            if (!hasExisting && !hasMultipleVariants) {
                duplicateCount += Math.max(newEntries.length - 1, 0);
                const representative = newEntries[0];
                const aggregatedSource = this.buildAutoResolvedFileSource(newEntries);
                resolvedRecords.push({
                    areaCode,
                    areaName: representative.areaName,
                    timestamp,
                    temperature: representative.temperature,
                    humidity: representative.humidity,
                    fileSource: aggregatedSource,
                });
                continue;
            }
            const conflictType = hasMultipleVariants ? 'conflict' : 'duplicate';
            if (conflictType === 'duplicate') {
                duplicateCount += newEntries.length;
            }
            const variants = variantBuckets.map((bucket) => this.buildVariantAggregate(bucket));
            anomalyGroups.push({
                areaCode,
                areaName: this.pickConflictAreaName(newEntries, existingEntries, areaName),
                timestamp,
                type: conflictType,
                variants,
            });
        }
        return { resolvedRecords, duplicateCount, anomalyGroups };
    }
    groupEntriesByVariant(entries) {
        const buckets = new Map();
        for (const entry of entries) {
            const key = this.buildVariantKey(entry.temperature, entry.humidity);
            let bucket = buckets.get(key);
            if (!bucket) {
                bucket = {
                    key,
                    variantId: (0, node_crypto_1.randomUUID)(),
                    temperature: entry.temperature,
                    humidity: entry.humidity,
                    entries: [],
                };
                buckets.set(key, bucket);
            }
            bucket.entries.push(entry);
        }
        return Array.from(buckets.values());
    }
    buildVariantAggregate(bucket) {
        const totalCount = bucket.entries.length;
        const newCount = bucket.entries.filter((entry) => !entry.isExisting).length;
        const existingCount = totalCount - newCount;
        return {
            variantId: bucket.variantId,
            temperature: bucket.temperature,
            humidity: bucket.humidity,
            totalCount,
            newCount,
            existingCount,
            sourceSummaries: this.buildSourceSummaries(bucket.entries),
        };
    }
    buildSourceSummaries(entries) {
        const summaries = new Map();
        for (const entry of entries) {
            const type = entry.isExisting ? 'existing' : 'new';
            const baseLabel = entry.isExisting
                ? '数据库已有记录'
                : this.normalizeImportSourceLabel(entry.fileSource);
            const label = entry.isExisting ? baseLabel : `导入文件：${baseLabel}`;
            const key = `${type}|${label}`;
            const existing = summaries.get(key);
            if (existing) {
                existing.count += 1;
            }
            else {
                summaries.set(key, {
                    label,
                    count: 1,
                    type,
                });
            }
        }
        return Array.from(summaries.values());
    }
    buildResolvedFileSource(variant) {
        const newLabels = variant.sourceSummaries
            .filter((summary) => summary.type === 'new')
            .map((summary) => summary.label.replace(/^导入文件：/, ''));
        if (!newLabels.length) {
            return null;
        }
        return Array.from(new Set(newLabels)).join(', ');
    }
    buildAutoResolvedFileSource(entries) {
        const sources = Array.from(new Set(entries
            .map((entry) => entry.fileSource)
            .filter((source) => typeof source === 'string' && source.trim().length > 0)));
        if (!sources.length) {
            return '本次导入文件';
        }
        return sources.join(',');
    }
    pickConflictAreaName(newEntries, existingEntries, fallback) {
        return newEntries[0]?.areaName ?? existingEntries[0]?.areaName ?? fallback;
    }
    buildVariantKey(temperature, humidity) {
        return `${temperature ?? 'NULL'}|${humidity ?? 'NULL'}`;
    }
    normalizeImportSourceLabel(source) {
        if (!source) {
            return '未知来源';
        }
        const trimmed = source.trim();
        if (!trimmed) {
            return '未知来源';
        }
        if (trimmed === '数据库已有记录') {
            return trimmed;
        }
        try {
            const parsed = new URL(trimmed);
            const segments = parsed.pathname.split('/').filter((segment) => segment.length > 0);
            const lastSegment = segments.pop();
            if (lastSegment) {
                return decodeURIComponent(lastSegment);
            }
        }
        catch (error) {
        }
        const parts = trimmed.split(/[\\/]/);
        const lastPart = parts.pop();
        return lastPart?.trim() || trimmed;
    }
    snapToInterval(date, minuteInterval) {
        const interval = Math.max(1, minuteInterval);
        const minutes = date.getMinutes();
        const remainder = minutes % interval;
        let deltaMinutes = 0;
        if (remainder !== 0) {
            const half = interval / 2;
            if (remainder < half) {
                deltaMinutes = -remainder;
            }
            else {
                deltaMinutes = interval - remainder;
            }
        }
        const adjusted = new Date(date.getTime() + deltaMinutes * 60000);
        adjusted.setSeconds(0, 0);
        return adjusted;
    }
    formatDateForFile(date) {
        const yyyy = date.getFullYear();
        const mm = `${date.getMonth() + 1}`.padStart(2, '0');
        const dd = `${date.getDate()}`.padStart(2, '0');
        const hh = `${date.getHours()}`.padStart(2, '0');
        const min = `${date.getMinutes()}`.padStart(2, '0');
        const ss = `${date.getSeconds()}`.padStart(2, '0');
        return `${yyyy}${mm}${dd}_${hh}${min}${ss}`;
    }
    parseNumericValue(value) {
        if (value === null || value === undefined) {
            return null;
        }
        if (typeof value === 'number') {
            return (Math.round(value * 100) / 100).toFixed(2);
        }
        const text = String(value).trim();
        if (!text) {
            return null;
        }
        const numeric = Number(text.replace(/[^0-9+\-\.]/g, ''));
        if (Number.isNaN(numeric)) {
            return null;
        }
        return (Math.round(numeric * 100) / 100).toFixed(2);
    }
};
exports.ExcelImportService = ExcelImportService;
exports.ExcelImportService = ExcelImportService = ExcelImportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(area_entity_1.Area)),
    __param(2, (0, typeorm_1.InjectRepository)(sensor_data_entity_1.SensorData)),
    __param(3, (0, typeorm_1.InjectRepository)(import_task_entity_1.ImportTask)),
    __param(4, (0, common_1.Inject)(anomaly_store_interface_1.ANOMALY_STORE)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository, Object])
], ExcelImportService);
const TIME_KEYWORDS = ['时间', 'date', 'datetime', 'time'];
const TEMP_KEYWORDS = ['温度', 'temp'];
const HUMIDITY_KEYWORDS = ['湿度', 'humi', 'rh'];
//# sourceMappingURL=excel-import.service.js.map