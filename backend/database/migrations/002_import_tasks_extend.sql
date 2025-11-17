ALTER TABLE `import_tasks`
  MODIFY `status` VARCHAR(20) NOT NULL,
  ADD COLUMN `anomalies_total` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `conflicts`,
  ADD COLUMN `anomalies_processed` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `anomalies_total`,
  ADD COLUMN `skip_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `anomalies_processed`,
  ADD COLUMN `overwrite_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `skip_count`,
  ADD COLUMN `progress_last_at` DATETIME NULL AFTER `message`;