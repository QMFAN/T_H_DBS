## 问题
- 在 `bulkResolveAnomalies` 中对临时存储的 `findById` 调用未使用 `await`，导致类型为 `Promise<...>`，访问 `areaName/timestamp` 报 TS2339。

## 修复
- 将 `const found = this.anomalyStore.findById(item.anomalyId);` 改为 `const found = await this.anomalyStore.findById(item.anomalyId);`，并在 `null` 时跳过处理。

## 验证
- 代码保存后，NestJS watch 模式自动编译；确认无 TS 错误。
- 若仍有错误，继续检查其他未 `await` 的调用并统一修复。