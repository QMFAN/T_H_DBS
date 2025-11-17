-- SQL schema for import_tasks and import_conflicts tables
-- Execute this script against the th_system database.

CREATE TABLE IF NOT EXISTS `import_tasks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` CHAR(36) NOT NULL,
  `batch_id` CHAR(36) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `stored_path` VARCHAR(512) NULL,
  `file_url` VARCHAR(512) NULL,
  `status` VARCHAR(20) NOT NULL,
  `records` INT UNSIGNED NOT NULL DEFAULT 0,
  `skipped` INT UNSIGNED NOT NULL DEFAULT 0,
  `imported` INT UNSIGNED NOT NULL DEFAULT 0,
  `duplicates` INT UNSIGNED NOT NULL DEFAULT 0,
  `conflicts` INT UNSIGNED NOT NULL DEFAULT 0,
  `auto_resolved` INT UNSIGNED NOT NULL DEFAULT 0,
  `manual_resolved` INT UNSIGNED NOT NULL DEFAULT 0,
  `message` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_import_tasks_task_id` (`task_id`),
  KEY `idx_import_tasks_created_at` (`created_at`),
  KEY `idx_import_tasks_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `import_anomalies` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `anomaly_id` CHAR(36) NOT NULL,
  `task_id` BIGINT UNSIGNED NOT NULL,
  `area_name` VARCHAR(128) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `anomaly_type` VARCHAR(20) NOT NULL COMMENT '异常类型: duplicate=重复数据, conflict=数值冲突',
  `variants` JSON NOT NULL,
  `status` VARCHAR(20) NOT NULL,
  `resolved_variant` JSON NULL,
  `resolved_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_import_anomalies_anomaly_id` (`anomaly_id`),
  KEY `idx_import_anomalies_task_id` (`task_id`),
  KEY `idx_import_anomalies_status` (`status`),
  KEY `idx_import_anomalies_timestamp` (`timestamp`),
  CONSTRAINT `fk_import_anomalies_task` FOREIGN KEY (`task_id`) REFERENCES `import_tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
