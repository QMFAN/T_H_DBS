import { MemoryAnomalyStoreService } from './anomaly-store.memory'
import { randomUUID } from 'node:crypto'

describe('MemoryAnomalyStoreService', () => {
  test('register and overview', async () => {
    const store = new MemoryAnomalyStoreService(10000)
    const batchId = randomUUID()
    store.register(batchId, 1, [
      {
        anomalyId: randomUUID(),
        areaName: '动物室301',
        timestamp: new Date(),
        type: 'duplicate',
        variants: [
          { variantId: 'v1', temperature: '22.00', humidity: '50.00', totalCount: 2, newCount: 2, existingCount: 0, sourceSummaries: [] },
        ],
      },
    ])
    const overview = await store.getOverview()
    expect(overview.duplicates.pendingCount).toBe(1)
  })

  test('resolveOne skip and overwrite', async () => {
    const store = new MemoryAnomalyStoreService(10000)
    const batchId = randomUUID()
    const id = randomUUID()
    const ts = new Date()
    store.register(batchId, 2, [
      {
        anomalyId: id,
        areaName: '动物室302',
        timestamp: ts,
        type: 'conflict',
        variants: [
          { variantId: 'a', temperature: '21.00', humidity: '45.00', totalCount: 1, newCount: 1, existingCount: 0, sourceSummaries: [] },
          { variantId: 'b', temperature: '20.50', humidity: '44.50', totalCount: 1, newCount: 0, existingCount: 1, sourceSummaries: [] },
        ],
      },
    ])
    const r1 = await store.resolveOne(id, 'skip')
    expect(r1?.resolvedVariant?.variantId).toBe('b')
    const overview = await store.getOverview()
    expect(overview.conflicts.length).toBe(0)
  })
})