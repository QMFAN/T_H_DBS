## 目标
- 为“批量跳过/批量覆盖”建立统一的确认模态和统一的进度模态，重复与冲突两类数据体验一致。
- 优化 import_tasks 的数据结构与后端处理逻辑，保证准确、可观测并高性能；前端展示统一且信息充足。

## 前端改造
- 统一确认模态组件：
  - 参数：`scope (duplicate|conflict)`、`action (skip|overwrite)`、`count`、`policyHint`（覆盖策略说明）
  - 文案与样式统一，支持二次确认；冲突覆盖提供策略标签（如“优先新增值”）
- 统一进度模态组件：
  - 模式：`indeterminate`（仅显示总条数）→ 可选切换为 `determinate`（显示已处理数）
  - 显示：`batchId`、`TTL 倒计时`、`action`、`total`、`processed`；可最小化、关闭但后台继续
- 交互与API：
  - 两类批量操作均调用统一的批量接口（后端详见下方），提交后轮询进度端点或接收 WebSocket 推送更新进度
- 历史与摘要展示：
  - import_tasks 卡片显示：`status (pending|processing|completed|failed)`、已处理条数、动作计数（skip/overwrite）、冲突/重复总数、文件链接

## 后端API与处理
- 统一批量接口：`POST /api/imports/anomalies/bulk`
  - 请求：`{ scope: 'duplicate'|'conflict', action: 'skip'|'overwrite', anomalyIds: string[], batchId?: string, overwritePolicy?: 'preferNew'|'first' }`
  - 响应：`{ accepted: true, taskId: string, batchId: string }`
- 进度查询：`GET /api/imports/batches/:batchId/progress`
  - 返回：`{ totalTarget, processedCount, skipCount, overwriteCount, pendingCount, status }`
- 批量处理逻辑（服务层）：
  - 统一将返回结果按 `taskNumericId` 分组；
  - 跳过：不写库；每任务一次更新 `manualResolved += count` 与 `status`；
  - 覆盖：聚合写库记录，分批 `upsert`（如 1000/批）；随后每任务一次更新 `manualResolved` 与 `status`；
  - 仅每任务一次统计剩余（Redis `SCARD`），不在循环中统计
- Redis 临时存储与进度：
  - 批次集合：`import:batch:{batchId}:ids`（已存在）
  - 任务集合：`import:task:{taskId}:ids`（用于 O(1) 剩余计数）
  - 进度哈希：`import:batch:{batchId}:progress`（字段：`totalTarget|processed|skip|overwrite|status`），批量操作更新一次或少量批次更新；进度端点直接读取该哈希

## import_tasks 数据结构优化
- 字段建议：
  - `status`：扩展为 `pending|processing|completed|failed`
  - `records|skipped|imported` 保留；移除或重定义 `autoResolved|manualResolved`
  - 新增：`anomalies_total`（本次导入产生的异常总数）、`anomalies_processed`、`skip_count`、`overwrite_count`
  - 可选：`batch_id` 与 `progress_last_at`
- 后端逻辑：
  - 创建任务时填充 `anomalies_total`，批量操作阶段只增量更新 `anomalies_processed/skip_count/overwrite_count` 与 `status`
  - 不在任务表写异常明细（由 Redis 临时存储承担）
- 迁移脚本：提供 SQL `ALTER TABLE import_tasks ADD COLUMN ...` 并将旧字段迁移映射；保持向后兼容（历史记录仍能展示）

## 展示与体验细节
- 统一确认模态文案：
  - 跳过：提示“不写库、仅清理临时异常，操作不可撤销”
  - 覆盖：提示“使用新导入值覆盖已有记录，操作不可撤销”，并显示覆盖策略
- 统一进度模态：
  - 大量数据时显示“在后台进行”，完成后自动刷新；提供最小化悬浮卡可点击还原
- 历史卡片与摘要：
  - 显示“需处理总数/已处理数（百分比）”，并标注动作计数（跳过/覆盖）与最后更新时间

## 性能与可观测性
- 指标：
  - 导入：`import_records_total`、`import_duration_seconds`
  - 批量处置：`bulk_resolve_total`、`bulk_resolve_duration_seconds`、`bulk_resolve_errors_total`
- 日志：
  - 每批次开始/结束一条摘要日志（包含 batchId、scope、action、count、耗时）

## 风险与回滚
- 任务字段迁移：需在低流量时执行，提供回滚脚本
- 单次 `upsert` 批量大小需与 MySQL 配置匹配（`max_allowed_packet`），如异常则调小批量
- Redis 进度哈希与集合需保持一致性；如出错可回退到仅集合统计

## 验证
1. 上传形成 6000+ 异常；
2. 执行“批量跳过”：确认统一模态与进度；接口耗时与进度端点返回一致；`sensor_data` 不变；
3. 执行“批量覆盖”：确认统一模态与进度；MySQL 落库记录正确；
4. import_tasks 历史卡片显示统一进度、动作计数与状态；
5. Prometheus 指标与日志均有记录。