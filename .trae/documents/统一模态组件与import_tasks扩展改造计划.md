## 目标
- 抽取“批量跳过/批量覆盖”的统一确认模态与统一进度模态，供重复与冲突两类数据共用。
- 扩展并迁移 import_tasks 表结构，统一展示任务进度与动作计数；配套后端实体与服务更新，前端历史卡片与摘要显示一致。
- 完成端到端验证：上传→检测→批量操作→进度展示→历史展示→数据库校验。

## 代码改造
### 前端组件（统一模态）
- 新增：`frontend/src/components/common/UnifiedConfirmModal.tsx`
  - Props：`scope: 'duplicate'|'conflict'`、`action: 'skip'|'overwrite'`、`count: number`、`policyHint?: string`、`onConfirm: () => Promise<void>`、`onCancel`
  - 统一文案与样式；覆盖动作显示不可撤销提示与策略说明
- 新增：`frontend/src/components/common/UnifiedProgressModal.tsx`
  - Props：`visible`、`actionText`、`total`、`current`、`mode: 'indeterminate'|'determinate'`、`batchId?: string`、`ttlSeconds?: number`、`minimized`、`onMinimize`、`onClose`
  - 支持最小化悬浮卡、关闭但后台继续；统一样式与布局
- 页面改造：`frontend/src/pages/import/ImportPage.tsx`
  - 将 `handleBulkSkipDuplicates/Conflicts` 与 `handleBulkOverwriteConflicts` 的确认与进度改为使用上述统一组件
  - 接口调用统一走批量端点；完成后刷新摘要/历史/冲突
- 类型扩展：`frontend/src/types/import.ts`
  - 扩展 `ImportHistoryItem` 与摘要类型，支持动作计数与处理进度

### 后端迁移与实体更新
- 新增迁移脚本：`backend/database/migrations/002_import_tasks_extend.sql`
  - `ALTER TABLE import_tasks`
    - `status` 允许 `processing`（或保留 VARCHAR 20 文本即可）
    - `ADD COLUMN anomalies_total INT UNSIGNED NOT NULL DEFAULT 0`
    - `ADD COLUMN anomalies_processed INT UNSIGNED NOT NULL DEFAULT 0`
    - `ADD COLUMN skip_count INT UNSIGNED NOT NULL DEFAULT 0`
    - `ADD COLUMN overwrite_count INT UNSIGNED NOT NULL DEFAULT 0`
    - `ADD COLUMN progress_last_at DATETIME NULL`
- 实体更新：`backend/src/entities/import-task.entity.ts`
  - 扩展 `ImportTaskStatus = 'pending'|'processing'|'completed'|'failed'`
  - 映射新增字段；保留旧字段（向后兼容）
- 服务更新：`backend/src/excel-import/excel-import.service.ts`
  - `processInput/saveTaskSummary` 初始化 `anomalies_total = anomalyGroups.length`（冲突与重复异常组数），`anomalies_processed=0`，`skip_count=0`，`overwrite_count=0`
  - 批量操作入口：开始时将相关任务置为 `processing`；
  - `bulkResolveAnomalies`：
    - 结果按 `taskNumericId` 分组；
    - 跳过：不写库；每任务一次更新 `anomalies_processed += count`、`skip_count += count`；
    - 覆盖：聚合写库，分批 `upsert`；每任务一次更新 `anomalies_processed += count`、`overwrite_count += count`；
    - 每任务仅一次 O(1) 统计剩余（Redis `SCARD`），剩余为 0 且非失败则置 `completed`；同时写 `progress_last_at = NOW()`
- Redis 临时存储（已优化基础）
  - 批量删除同步维护任务集合；`pendingCountForTask` 使用 `SCARD`
  - 可选：新增批次进度哈希 `import:batch:{batchId}:progress`（后续接口进度端点可使用）

## 前端展示改造
- 历史卡片（ImportPage）
  - 展示：`status`、`anomalies_total`、`anomalies_processed`（百分比）、`skip_count/overwrite_count`、`uploadedAt`、`fileUrl`
- 摘要卡片
  - 维持既有字段；可新增“需处理总数/已处理数”二级信息（若后端摘要提供）

## 端到端验证
1. 启动后端与Redis/MySQL，执行迁移脚本
2. 上传样例形成 6000+ 异常；
3. 统一确认模态→提交批量跳过/覆盖；统一进度模态显示，操作完成自动刷新；
4. 历史卡片显示处理进度与动作计数；
5. 数据库核验：`sensor_data`（覆盖时变动）、`import_tasks` 字段正确更新；
6. 性能：批量跳过秒级；批量覆盖数秒级。

## 风险与回滚
- 迁移需在低流量时执行，提供回滚 SQL（`DROP COLUMN` 或忽略新展示）；
- MySQL 批量大小与事务需结合实例配置（如 `max_allowed_packet`），必要时将批次设为 500。

## 交付内容
- 新前端通用组件文件与页面改造
- 后端 SQL 迁移脚本
- 实体与服务逻辑更新（字段与批量计数）
- 验证脚本与操作说明（上传、批量操作、查询与校验）。