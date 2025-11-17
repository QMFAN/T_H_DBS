"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExcelImportController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelImportController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const excel_import_service_1 = require("./excel-import.service");
let ExcelImportController = ExcelImportController_1 = class ExcelImportController {
    excelImportService;
    logger = new common_1.Logger(ExcelImportController_1.name);
    constructor(excelImportService) {
        this.excelImportService = excelImportService;
    }
    decodeOriginalName(rawName) {
        if (!rawName) {
            return rawName;
        }
        try {
            const buffer = Buffer.from(rawName, 'latin1');
            const decoded = buffer.toString('utf8');
            return decoded.includes('\uFFFD') ? rawName : decoded;
        }
        catch (error) {
            this.logger.warn(`Failed to decode filename ${rawName}: ${error.message}`);
            return rawName;
        }
    }
    async getDashboardSummary() {
        return this.excelImportService.getDashboardSummary();
    }
    async getHistory(limit) {
        const parsedLimit = limit ? Number(limit) : undefined;
        if (parsedLimit !== undefined && (Number.isNaN(parsedLimit) || parsedLimit <= 0)) {
            throw new common_1.BadRequestException('limit must be a positive number');
        }
        return this.excelImportService.getImportHistory(parsedLimit);
    }
    async getHistoryPaged(page, pageSize) {
        const p = page ? Number(page) : 1;
        const ps = pageSize ? Number(pageSize) : 10;
        if (!Number.isFinite(p) || p < 1) {
            throw new common_1.BadRequestException('page must be >= 1');
        }
        if (!Number.isFinite(ps) || ps < 1 || ps > 100) {
            throw new common_1.BadRequestException('pageSize must be in 1..100');
        }
        return this.excelImportService.getImportHistoryPaged(p, ps);
    }
    async deleteHistory(taskId, deleteFile) {
        if (!taskId) {
            throw new common_1.BadRequestException('taskId is required');
        }
        const shouldDeleteFile = String(deleteFile).toLowerCase() === 'true';
        await this.excelImportService.deleteImportTask(taskId, shouldDeleteFile);
    }
    async getAnomalies() {
        return this.excelImportService.getAnomalyOverview();
    }
    async bulkResolveLegacy(body) {
        await this.excelImportService.bulkResolveAnomalies(body);
    }
    async resolveAnomaly(anomalyId, body) {
        if (!anomalyId) {
            throw new common_1.BadRequestException('anomalyId is required');
        }
        await this.excelImportService.resolveAnomaly(anomalyId, body);
    }
    async resetData() {
        await this.excelImportService.clearAllData();
    }
    async uploadFiles(files) {
        const normalized = (Array.isArray(files) ? files : []).map((file) => {
            const typed = file;
            if (!typed?.path || !typed?.originalname) {
                return null;
            }
            return {
                path: typed.path,
                originalname: this.decodeOriginalName(typed.originalname) ?? typed.originalname,
            };
        }).filter((item) => item !== null);
        if (!normalized.length) {
            throw new common_1.BadRequestException('未收到有效的上传文件');
        }
        return this.excelImportService.upload(normalized);
    }
};
exports.ExcelImportController = ExcelImportController;
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExcelImportController.prototype, "getDashboardSummary", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ExcelImportController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('history/page'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('pageSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExcelImportController.prototype, "getHistoryPaged", null);
__decorate([
    (0, common_1.Delete)('history/:taskId'),
    __param(0, (0, common_1.Param)('taskId')),
    __param(1, (0, common_1.Query)('deleteFile')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExcelImportController.prototype, "deleteHistory", null);
__decorate([
    (0, common_1.Get)('conflicts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExcelImportController.prototype, "getAnomalies", null);
__decorate([
    (0, common_1.Post)('conflicts/bulk-resolve'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ExcelImportController.prototype, "bulkResolveLegacy", null);
__decorate([
    (0, common_1.Post)('conflicts/:anomalyId/resolve'),
    __param(0, (0, common_1.Param)('anomalyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ExcelImportController.prototype, "resolveAnomaly", null);
__decorate([
    (0, common_1.Delete)('reset'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ExcelImportController.prototype, "resetData", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files')),
    __param(0, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], ExcelImportController.prototype, "uploadFiles", null);
exports.ExcelImportController = ExcelImportController = ExcelImportController_1 = __decorate([
    (0, common_1.Controller)('imports'),
    __metadata("design:paramtypes", [excel_import_service_1.ExcelImportService])
], ExcelImportController);
//# sourceMappingURL=excel-import.controller.js.map