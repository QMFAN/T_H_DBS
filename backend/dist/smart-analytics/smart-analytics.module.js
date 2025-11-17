"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartAnalyticsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const smart_analytics_controller_1 = require("./smart-analytics.controller");
const smart_analytics_service_1 = require("./smart-analytics.service");
const area_entity_1 = require("../entities/area.entity");
const sensor_data_entity_1 = require("../entities/sensor-data.entity");
const area_defaults_entity_1 = require("../entities/area-defaults.entity");
let SmartAnalyticsModule = class SmartAnalyticsModule {
};
exports.SmartAnalyticsModule = SmartAnalyticsModule;
exports.SmartAnalyticsModule = SmartAnalyticsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([area_entity_1.Area, sensor_data_entity_1.SensorData, area_defaults_entity_1.AreaDefaultsEntity])],
        controllers: [smart_analytics_controller_1.SmartAnalyticsController],
        providers: [smart_analytics_service_1.SmartAnalyticsService],
    })
], SmartAnalyticsModule);
//# sourceMappingURL=smart-analytics.module.js.map