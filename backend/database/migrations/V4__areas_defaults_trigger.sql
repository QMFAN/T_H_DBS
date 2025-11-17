DROP TRIGGER IF EXISTS areas_defaults_sync;
CREATE TRIGGER areas_defaults_sync AFTER INSERT ON areas
FOR EACH ROW
INSERT IGNORE INTO area_defaults (
  area_code, temp_min, temp_max, humidity_min, humidity_max,
  temp_duration_min, humidity_duration_min, gap_tolerance_minutes, tolerance_normal_budget, updated_by
) VALUES (NEW.code, 20, 26, 40, 70, 30, 30, 30, 0, NULL);