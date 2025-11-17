## 前置准备
- 启动 MySQL（开发库：`th_system`），确认账号与端口与后端配置一致（backend/src/app.module.ts:18）。
- 启动 Redis（本地或 Docker），推荐命令：
  - Windows 服务版：安装并启动后默认端口 `6379`
  - Docker：`docker run -d --name th-redis -p 6379:6379 redis:7`
- 后端环境变量设置（PowerShell）：
  - `setx IMPORT_ANOMALY_STORE redis`
  - `setx REDIS_URL redis://127.0.0.1:6379`
  - `setx IMPORT_ANOMALY_TTL 86400`
  - 可选：`setx IMPORT_SNAP_MINUTES 0`（禁用时间对齐以避免合并误差）

## 服务启动
- 后端（backend 目录）：
  - 安装依赖：`npm install`
  - 启动：`npm run start:dev`
  - 关键接口：
    - `POST /api/imports/upload`（Excel 文件上传）(backend/src/excel-import/excel-import.controller.ts:87)
    - `GET /api/imports/summary`（导入摘要）(backend/src/excel-import/excel-import.controller.ts:45)
    - `GET /api/imports/conflicts`（重复/冲突概览）(backend/src/excel-import/excel-import.controller.ts:61)
    - `POST /api/imports/conflicts/:anomalyId/resolve`（单条处置）(backend/src/excel-import/excel-import.controller.ts:71)
    - `POST /api/imports/conflicts/bulk-resolve`（批量处置）(backend/src/excel-import/excel-import.controller.ts:66)
- 前端（frontend 目录，可选）：
  - 安装依赖：`npm install`
  - 开发启动：`npm run dev`
  - 直接使用页面完成上传与处置（ImportPage 已对接上述 API）(frontend/src/pages/import/ImportPage.tsx:70, 75, 80)

## 演练流程
### 1. 准备待导入文件
- 使用仓库中的样例文件：`d:\code\T_H_DBS\20250331 314检隔室_+.xlsx`、`d:\code\T_H_DBS\20240831 动物室301_+.xlsx`

### 2. 上传文件
- 使用 PowerShell 原生 curl 进行多文件上传（确保后端服务地址为 `http://localhost:3000`）：
  - `curl.exe -X POST http://localhost:3000/api/imports/upload -F "files=@d:\code\T_H_DBS\20250331 314检隔室_+.xlsx" -F "files=@d:\code\T_H_DBS\20240831 动物室301_+.xlsx"`
- 期望响应（UploadResponse）：包含 `taskId`、`imported`、`duplicates`、`conflicts`。

### 3. 查看导入摘要与临时异常
- 摘要：`curl.exe http://localhost:3000/api/imports/summary`
  - 字段：`pendingFiles`、`importedRecords`、`pendingConflicts`（从临时存储统计）(backend/src/excel-import/excel-import.service.ts:200)
- 概览：`curl.exe http://localhost:3000/api/imports/conflicts`
  - `duplicates.pendingCount`、`duplicates.anomalyIds[]`、`conflicts[{ areaName, anomalies[] }]`（来自临时存储）(backend/src/excel-import/excel-import.service.ts:204)

### 4. 批量处置重复数据
- 覆盖重复：
  - `curl.exe -X POST http://localhost:3000/api/imports/conflicts/bulk-resolve -H "Content-Type: application/json" -d "{\"type\":\"duplicate\",\"action\":\"overwrite\",\"anomalyIds\":[\"<ID1>\",\"<ID2>\"]}"`
- 跳过重复：
  - `curl.exe -X POST http://localhost:3000/api/imports/conflicts/bulk-resolve -H "Content-Type: application/json" -d "{\"type\":\"duplicate\",\"action\":\"skip\",\"anomalyIds\":[\"<ID1>\",\"<ID2>\"]}"`
- 验证：再次请求 `GET /api/imports/conflicts`，`duplicates.pendingCount` 归零。

### 5. 逐条处置冲突数据
- 获取一个冲突的 `anomalyId` 与 `variantId`（概览接口返回的 `variants[]`）
- 覆盖：
  - `curl.exe -X POST http://localhost:3000/api/imports/conflicts/<anomalyId>/resolve -H "Content-Type: application/json" -d "{\"action\":\"overwrite\",\"variantId\":\"<variantId>\"}"`
- 跳过：
  - `curl.exe -X POST http://localhost:3000/api/imports/conflicts/<anomalyId>/resolve -H "Content-Type: application/json" -d "{\"action\":\"skip\"}"`
- 验证：`GET /api/imports/conflicts` 对应区域的 `anomalies` 数量减少；当全部处置后，冲突组清空。

### 6. 数据库核验
- 使用 MySQL 命令行或客户端执行：
  - 查询导入记录数：
    - `SELECT COUNT(*) FROM sensor_data;`
  - 唯一约束生效：
    - `SHOW INDEX FROM sensor_data WHERE Key_name='uk_sensor_data_area_timestamp';` (backend/src/entities/sensor-data.entity.ts:15)
  - 采样校验某区域：
    - `SELECT * FROM sensor_data WHERE area_id=(SELECT id FROM areas WHERE code='301') ORDER BY timestamp DESC LIMIT 10;`

### 7. 临时数据清理与状态验证
- 当 `pendingConflicts=0` 时，`import_tasks.status` 置为 `completed`（backend/src/excel-import/excel-import.service.ts:418）。
- 临时数据 TTL 到期或批次完成后自动清理；如需手动清理：删除批次键 `import:batch:{batchId}:ids` 与各异常键。

## 预期结果
- 上传后：概览接口显示重复/冲突条目，任务摘要中 `pendingConflicts` 增加。
- 批量/单条处置后：概览与摘要统计同步减少至 0；`sensor_data` 中相应时间点的数据被覆盖或保留旧值（依动作）。
- 无任何异常落库记录；重复/冲突数据仅存在于临时存储并按 TTL 清理。

## 风险与回滚
- Redis 未启动或连接失败：后端应记录错误并返回上传失败提示；可切回 `IMPORT_ANOMALY_STORE=memory` 验证。
- MySQL 唯一键冲突：覆盖动作使用 `upsert` 幂等（backend/src/excel-import/excel-import.service.ts:794）。

## 验证完成标准
- 三个接口流程（上传→概览→处置）均返回成功；`pendingConflicts=0`；数据库采样符合预期。