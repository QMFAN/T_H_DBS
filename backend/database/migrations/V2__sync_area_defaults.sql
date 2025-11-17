INSERT IGNORE INTO area_defaults (
  area_code, temp_min, temp_max, humidity_min, humidity_max,
  temp_duration_min, humidity_duration_min, gap_tolerance_minutes, tolerance_normal_budget, updated_by
)
SELECT a.code, 20, 26, 40, 70, 30, 30, 30, 0, NULL
FROM areas a
WHERE NOT EXISTS (
  SELECT 1 FROM area_defaults d WHERE d.area_code COLLATE utf8mb4_unicode_ci = a.code COLLATE utf8mb4_unicode_ci
);