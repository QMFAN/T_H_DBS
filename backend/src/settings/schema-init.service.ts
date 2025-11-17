import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import type { DataSource } from 'typeorm'

@Injectable()
export class SchemaInitService implements OnModuleInit {
  private readonly logger = new Logger(SchemaInitService.name)
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.ensureAreaDefaults().catch((e) => this.logger.warn(`Create table skipped: ${(e as Error).message}`))
    await this.syncExistingAreas().catch((e) => this.logger.warn(`Sync areas skipped: ${(e as Error).message}`))
    await this.ensureInsertTrigger().catch((e) => this.logger.warn(`Trigger not created: ${(e as Error).message}`))
    await this.dropLegacyTables().catch((e) => this.logger.warn(`Drop legacy tables skipped: ${(e as Error).message}`))
  }

  private async ensureAreaDefaults() {
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
    `
    await this.dataSource.query(sql)
    this.logger.log('Ensured table area_defaults exists')
  }

  private async syncExistingAreas() {
    const sql = `INSERT IGNORE INTO area_defaults (
      area_code, temp_min, temp_max, humidity_min, humidity_max,
      temp_duration_min, humidity_duration_min, gap_tolerance_minutes, tolerance_normal_budget, updated_by
    )
    SELECT a.code, 20, 26, 40, 70, 30, 30, 30, 0, NULL
    FROM areas a
    WHERE NOT EXISTS (SELECT 1 FROM area_defaults d WHERE d.area_code COLLATE utf8mb4_unicode_ci = a.code COLLATE utf8mb4_unicode_ci);`
    await this.dataSource.query(sql)
    this.logger.log('Synced existing areas into area_defaults')
  }

  private async ensureInsertTrigger() {
    try {
      const [bin] = await this.dataSource.query('SELECT @@log_bin AS val')
      const [trust] = await this.dataSource.query('SELECT @@log_bin_trust_function_creators AS val')
      if (bin?.val === 1 && trust?.val !== 1) {
        this.logger.warn('Binary logging enabled and log_bin_trust_function_creators != 1, skip trigger creation')
        return
      }
    } catch {
      // ignore variable read errors
    }
    await this.dataSource.query('DROP TRIGGER IF EXISTS areas_defaults_sync;')
    const trigger = `CREATE TRIGGER areas_defaults_sync AFTER INSERT ON areas
    FOR EACH ROW
    INSERT IGNORE INTO area_defaults (
      area_code, temp_min, temp_max, humidity_min, humidity_max,
      temp_duration_min, humidity_duration_min, gap_tolerance_minutes, tolerance_normal_budget, updated_by
    ) VALUES (NEW.code, 20, 26, 40, 70, 30, 30, 30, 0, NULL);`
    await this.dataSource.query(trigger)
    this.logger.log('Ensured trigger areas_defaults_sync exists')
  }

  private async dropLegacyTables() {
    await this.dataSource.query('DROP TABLE IF EXISTS thresholds')
    await this.dataSource.query('DROP TABLE IF EXISTS import_anomalies')
    this.logger.log('Dropped legacy tables thresholds and import_anomalies if present')
  }
}