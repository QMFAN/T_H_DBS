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
var SchemaInitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaInitService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
let SchemaInitService = SchemaInitService_1 = class SchemaInitService {
    dataSource;
    logger = new common_1.Logger(SchemaInitService_1.name);
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async onModuleInit() {
        await this.ensureAreaDefaults().catch((e) => this.logger.warn(`Create table skipped: ${e.message}`));
        await this.syncExistingAreas().catch((e) => this.logger.warn(`Sync areas skipped: ${e.message}`));
        await this.ensureInsertTrigger().catch((e) => this.logger.warn(`Trigger not created: ${e.message}`));
        await this.dropLegacyTables().catch((e) => this.logger.warn(`Drop legacy tables skipped: ${e.message}`));
    }
    async ensureAreaDefaults() {
        const sql = `
CREATE TABLE IF NOT EXISTS area_defaults (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  area_code VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  temp_min FLOAT NOT NULL,
  temp_max FLOAT NOT NULL,
  humidity_min FLOAT NOT NULL,
  humidity_max FLOAT NOT NULL,
  temp_duration_min INT NOT NULL,
  humidity_duration_min INT NOT NULL,
  gap_tolerance_minutes INT NOT NULL DEFAULT 30,
  tolerance_normal_budget INT NOT NULL DEFAULT 0,
  updated_by VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_area_code (area_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
        await this.dataSource.query(sql);
        this.logger.log('Ensured table area_defaults exists');
    }
    async syncExistingAreas() {
        const sql = `INSERT IGNORE INTO area_defaults (
      area_code, temp_min, temp_max, humidity_min, humidity_max,
      temp_duration_min, humidity_duration_min, gap_tolerance_minutes, tolerance_normal_budget, updated_by
    )
    SELECT a.code, 20, 26, 40, 70, 30, 30, 30, 0, NULL
    FROM areas a
    WHERE NOT EXISTS (SELECT 1 FROM area_defaults d WHERE d.area_code COLLATE utf8mb4_unicode_ci = a.code COLLATE utf8mb4_unicode_ci);`;
        await this.dataSource.query(sql);
        this.logger.log('Synced existing areas into area_defaults');
    }
    async ensureInsertTrigger() {
        try {
            const [bin] = await this.dataSource.query('SELECT @@log_bin AS val');
            const [trust] = await this.dataSource.query('SELECT @@log_bin_trust_function_creators AS val');
            if (bin?.val === 1 && trust?.val !== 1) {
                this.logger.warn('Binary logging enabled and log_bin_trust_function_creators != 1, skip trigger creation');
                return;
            }
        }
        catch {
        }
        await this.dataSource.query('DROP TRIGGER IF EXISTS areas_defaults_sync;');
        const trigger = `CREATE TRIGGER areas_defaults_sync AFTER INSERT ON areas
    FOR EACH ROW
    INSERT IGNORE INTO area_defaults (
      area_code, temp_min, temp_max, humidity_min, humidity_max,
      temp_duration_min, humidity_duration_min, gap_tolerance_minutes, tolerance_normal_budget, updated_by
    ) VALUES (NEW.code, 20, 26, 40, 70, 30, 30, 30, 0, NULL);`;
        await this.dataSource.query(trigger);
        this.logger.log('Ensured trigger areas_defaults_sync exists');
    }
    async dropLegacyTables() {
        await this.dataSource.query('DROP TABLE IF EXISTS thresholds');
        await this.dataSource.query('DROP TABLE IF EXISTS import_anomalies');
        this.logger.log('Dropped legacy tables thresholds and import_anomalies if present');
    }
};
exports.SchemaInitService = SchemaInitService;
exports.SchemaInitService = SchemaInitService = SchemaInitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [Function])
], SchemaInitService);
//# sourceMappingURL=schema-init.service.js.map