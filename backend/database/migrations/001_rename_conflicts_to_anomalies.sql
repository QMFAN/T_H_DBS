-- 迁移脚本：将 import_conflicts 重构为 import_anomalies
-- 执行时间：2025-11-13

-- 1. 重命名表
RENAME TABLE `import_conflicts` TO `import_anomalies`;

-- 2. 重命名主键列
ALTER TABLE `import_anomalies` 
  CHANGE COLUMN `conflict_id` `anomaly_id` CHAR(36) NOT NULL;

-- 3. 重命名类型列
ALTER TABLE `import_anomalies` 
  CHANGE COLUMN `conflict_type` `anomaly_type` VARCHAR(20) NOT NULL COMMENT '异常类型: duplicate=重复数据, conflict=数值冲突';

-- 4. 更新索引名称
ALTER TABLE `import_anomalies` 
  DROP INDEX `uk_import_conflicts_conflict_id`,
  ADD UNIQUE KEY `uk_import_anomalies_anomaly_id` (`anomaly_id`);

ALTER TABLE `import_anomalies` 
  DROP INDEX `idx_import_conflicts_task_id`,
  ADD KEY `idx_import_anomalies_task_id` (`task_id`);

ALTER TABLE `import_anomalies` 
  DROP INDEX `idx_import_conflicts_status`,
  ADD KEY `idx_import_anomalies_status` (`status`);

ALTER TABLE `import_anomalies` 
  DROP INDEX `idx_import_conflicts_timestamp`,
  ADD KEY `idx_import_anomalies_timestamp` (`timestamp`);

-- 5. 更新外键约束
ALTER TABLE `import_anomalies` 
  DROP FOREIGN KEY `fk_import_conflicts_task`;

ALTER TABLE `import_anomalies` 
  ADD CONSTRAINT `fk_import_anomalies_task` 
  FOREIGN KEY (`task_id`) REFERENCES `import_tasks` (`id`) 
  ON DELETE CASCADE ON UPDATE CASCADE;
