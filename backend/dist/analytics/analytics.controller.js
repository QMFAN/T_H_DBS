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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
let AnalyticsController = class AnalyticsController {
    analytics;
    constructor(analytics) {
        this.analytics = analytics;
    }
    async overview() {
        return this.analytics.getOverview();
    }
    async areas(areaIds, start, end, page, pageSize, sort, order) {
        const ids = areaIds ? areaIds.split(',').map((v) => parseInt(v, 10)).filter((v) => !Number.isNaN(v)) : undefined;
        const startDate = start ? new Date(parseInt(start, 10)) : undefined;
        const endDate = end ? new Date(parseInt(end, 10)) : undefined;
        return this.analytics.getAreas({ areaIds: ids, start: startDate, end: endDate, page: page ? parseInt(page, 10) : 1, pageSize: pageSize ? parseInt(pageSize, 10) : 20, sort, order });
    }
    async areaSegments(areaId, start, end, granularity, limit, gapToleranceMinutes) {
        const id = parseInt(areaId, 10);
        const startDate = start ? new Date(parseInt(start, 10)) : undefined;
        const endDate = end ? new Date(parseInt(end, 10)) : undefined;
        const lim = limit ? parseInt(limit, 10) : undefined;
        const gap = gapToleranceMinutes ? parseInt(gapToleranceMinutes, 10) : undefined;
        return this.analytics.getAreaSegments({ areaId: id, start: startDate, end: endDate, granularity, limit: lim, gapToleranceMinutes: gap });
    }
    async export(res, body) {
        const areaIds = body.areaIds ?? [];
        const ranges = (body.ranges ?? []).map((r) => ({ start: new Date(r.start), end: new Date(r.end) }));
        await this.analytics.streamExport(res, { areaIds, ranges, granularity: body.granularity });
    }
    async deleteData(body) {
        const areaIds = (body.areaIds ?? []).map((v) => Number(v)).filter((v) => !Number.isNaN(v));
        const ranges = (body.ranges ?? []).map((r) => ({ start: new Date(r.start), end: new Date(r.end) }));
        const dryRun = body.dryRun ?? true;
        const batchSize = Math.min(10000, Math.max(100, body.batchSize ?? 2000));
        if (dryRun) {
            return this.analytics.previewDelete({ areaIds, ranges });
        }
        return this.analytics.deleteData({ areaIds, ranges, batchSize });
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('areas'),
    __param(0, (0, common_1.Query)('areaIds')),
    __param(1, (0, common_1.Query)('start')),
    __param(2, (0, common_1.Query)('end')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('pageSize')),
    __param(5, (0, common_1.Query)('sort')),
    __param(6, (0, common_1.Query)('order')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "areas", null);
__decorate([
    (0, common_1.Get)('area/segments'),
    __param(0, (0, common_1.Query)('areaId')),
    __param(1, (0, common_1.Query)('start')),
    __param(2, (0, common_1.Query)('end')),
    __param(3, (0, common_1.Query)('granularity')),
    __param(4, (0, common_1.Query)('limit')),
    __param(5, (0, common_1.Query)('gapToleranceMinutes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "areaSegments", null);
__decorate([
    (0, common_1.Post)('export'),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "export", null);
__decorate([
    (0, common_1.Post)('data/delete'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "deleteData", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('analytics'),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map