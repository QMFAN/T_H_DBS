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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExcelImportModule = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const typeorm_1 = require("@nestjs/typeorm");
const os = __importStar(require("node:os"));
const area_entity_1 = require("../entities/area.entity");
const sensor_data_entity_1 = require("../entities/sensor-data.entity");
const import_task_entity_1 = require("../entities/import-task.entity");
const anomaly_store_memory_1 = require("./anomaly-store.memory");
const anomaly_store_redis_1 = require("./anomaly-store.redis");
const anomaly_store_interface_1 = require("./anomaly-store.interface");
const config_1 = require("@nestjs/config");
const excel_import_service_1 = require("./excel-import.service");
const excel_import_controller_1 = require("./excel-import.controller");
let ExcelImportModule = class ExcelImportModule {
};
exports.ExcelImportModule = ExcelImportModule;
exports.ExcelImportModule = ExcelImportModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([area_entity_1.Area, sensor_data_entity_1.SensorData, import_task_entity_1.ImportTask]),
            platform_express_1.MulterModule.register({
                dest: os.tmpdir(),
            }),
        ],
        controllers: [excel_import_controller_1.ExcelImportController],
        providers: [
            excel_import_service_1.ExcelImportService,
            {
                provide: anomaly_store_interface_1.ANOMALY_STORE,
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const storeType = (config.get('IMPORT_ANOMALY_STORE', 'memory') || 'memory').toLowerCase();
                    const ttlSeconds = parseInt(config.get('IMPORT_ANOMALY_TTL', '86400'), 10);
                    const ttlMs = Number.isFinite(ttlSeconds) ? ttlSeconds * 1000 : 24 * 60 * 60 * 1000;
                    if (storeType === 'redis') {
                        const url = config.get('REDIS_URL', 'redis://127.0.0.1:6379');
                        return new anomaly_store_redis_1.RedisAnomalyStoreService(url, ttlMs);
                    }
                    return new anomaly_store_memory_1.MemoryAnomalyStoreService(ttlMs);
                },
            },
        ],
        exports: [excel_import_service_1.ExcelImportService, anomaly_store_interface_1.ANOMALY_STORE],
    })
], ExcelImportModule);
//# sourceMappingURL=excel-import.module.js.map