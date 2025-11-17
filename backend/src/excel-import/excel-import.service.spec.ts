import { ExcelImportService } from './excel-import.service'
import { ConfigService } from '@nestjs/config'
import { MemoryAnomalyStoreService } from './anomaly-store.memory'

function repo<T>(overrides: Partial<T>) {
  return overrides as T
}

describe('ExcelImportService anomaly flow', () => {
  test('bulk resolve integrates with store', async () => {
    const config = new ConfigService()
    const areaRepo = repo<any>({
      find: async () => [],
      findOne: async () => null,
      save: async (area: any) => ({ id: 1, ...area }),
      manager: { query: async () => undefined },
    })
    const sensorRepo = repo<any>({
      upsert: async () => undefined,
      find: async () => [],
    })
    const taskRepo = repo<any>({
      save: async (task: any) => ({ id: 1, ...task }),
      findOne: async () => ({ id: 1, status: 'pending', manualResolved: 0 }),
      count: async () => 0,
      createQueryBuilder: () => ({ select: () => ({ getRawOne: async () => ({ total: '0' }) }) }),
      find: async () => [],
      create: (obj: any) => obj,
      saveReturn: async (obj: any) => obj,
      manager: { query: async () => undefined },
    })
    const service = new ExcelImportService(config, areaRepo, sensorRepo, taskRepo, new MemoryAnomalyStoreService(10000))
    const batchId = 'b'
    const task = await service['saveTaskSummary'](batchId, {
      filePath: 'p', originalName: 'f.xlsx', records: 0, skipped: 0, imported: 0,
    } as any)
    ;(service as any).anomalyStore.register(batchId, task.id, [
      {
        anomalyId: 'x',
        areaName: '动物室303',
        timestamp: new Date(),
        type: 'duplicate',
        variants: [{ variantId: 'v', temperature: '21.00', humidity: '40.00', totalCount: 1, newCount: 1, existingCount: 0, sourceSummaries: [] }],
      },
    ])
    await service.bulkResolveAnomalies({ type: 'duplicate', action: 'skip', anomalyIds: ['x'] })
    const overview = await service.getAnomalyOverview()
    expect(overview.duplicates.pendingCount).toBe(0)
  })
})