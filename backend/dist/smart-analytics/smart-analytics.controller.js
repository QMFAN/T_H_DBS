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
exports.SmartAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const smart_analytics_service_1 = require("./smart-analytics.service");
const query_dto_1 = require("./dto/query.dto");
const analyze_dto_1 = require("./dto/analyze.dto");
const segments_dto_1 = require("./dto/segments.dto");
let SmartAnalyticsController = class SmartAnalyticsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async areas() {
        return this.service.getAreas();
    }
    async query(dto) {
        return this.service.query(dto);
    }
    async segments(dto) {
        return this.service.segments(dto);
    }
    async analyze(dto) {
        return this.service.analyze(dto);
    }
};
exports.SmartAnalyticsController = SmartAnalyticsController;
__decorate([
    (0, common_1.Get)('areas'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SmartAnalyticsController.prototype, "areas", null);
__decorate([
    (0, common_1.Get)('query'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_dto_1.QueryDto]),
    __metadata("design:returntype", Promise)
], SmartAnalyticsController.prototype, "query", null);
__decorate([
    (0, common_1.Get)('segments'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [segments_dto_1.SegmentsDto]),
    __metadata("design:returntype", Promise)
], SmartAnalyticsController.prototype, "segments", null);
__decorate([
    (0, common_1.Post)('analyze'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analyze_dto_1.AnalyzeDto]),
    __metadata("design:returntype", Promise)
], SmartAnalyticsController.prototype, "analyze", null);
exports.SmartAnalyticsController = SmartAnalyticsController = __decorate([
    (0, common_1.Controller)('smart'),
    __metadata("design:paramtypes", [smart_analytics_service_1.SmartAnalyticsService])
], SmartAnalyticsController);
//# sourceMappingURL=smart-analytics.controller.js.map