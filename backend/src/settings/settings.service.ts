import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AreaDefaultsEntity } from '../entities/area-defaults.entity'
import { Area } from '../entities/area.entity'
import { SensorData } from '../entities/sensor-data.entity'
import { ImportTask } from '../entities/import-task.entity'
import { Inject } from '@nestjs/common'
import { ANOMALY_STORE, AnomalyStore } from '../excel-import/anomaly-store.interface'
import { AnalyticsCacheService } from '../analytics/analytics-cache.service'

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AreaDefaultsEntity) private readonly repo: Repository<AreaDefaultsEntity>,
    @InjectRepository(Area) private readonly areaRepo: Repository<Area>,
    @InjectRepository(SensorData) private readonly sensorRepo: Repository<SensorData>,
    @InjectRepository(ImportTask) private readonly taskRepo: Repository<ImportTask>,
    @Inject(ANOMALY_STORE) private readonly anomalyStore: AnomalyStore,
    private readonly analyticsCache: AnalyticsCacheService,
  ) {}

  async listAreas(): Promise<Array<{ code: string; name: string }>> {
    const as = await this.areaRepo.find({ order: { id: 'ASC' } })
    return as.map((a) => ({ code: a.code, name: a.name }))
  }

  async getDefaults(area_code: string): Promise<AreaDefaultsEntity | null> {
    return this.repo.findOne({ where: { area_code } })
  }

  async upsertDefaults(payload: Partial<AreaDefaultsEntity>): Promise<AreaDefaultsEntity> {
    const ex = await this.repo.findOne({ where: { area_code: payload.area_code! } })
    if (ex) { Object.assign(ex, payload); return this.repo.save(ex) }
    const base = {
      temp_min: 20,
      temp_max: 26,
      humidity_min: 40,
      humidity_max: 70,
      temp_duration_min: 30,
      humidity_duration_min: 30,
      gap_tolerance_minutes: 30,
      tolerance_normal_budget: 0,
    }
    const toSave: Partial<AreaDefaultsEntity> = { ...base, ...payload }
    const entity = this.repo.create(toSave as AreaDefaultsEntity)
    return this.repo.save(entity)
  }

  async deleteArea(code: string): Promise<void> {
    const area = await this.areaRepo.findOne({ where: { code } })
    if (!area) return
    const count = await this.sensorRepo.count({ where: { areaId: area.id } })
    if (count > 0) throw new BadRequestException('该区域存在传感数据，无法删除')
    await this.repo.delete({ area_code: code })
    await this.areaRepo.delete({ id: area.id })
    const overview = await this.anomalyStore.getOverview()
    const parseCode = (name: string) => {
      const trimmed = name?.trim() ?? ''
      const normalized = trimmed.replace(/\s+/g, '')
      const baseMatch = normalized.match(/(动物室\d+[A-Za-z]*|检疫隔离室\d+[A-Za-z]*|检疫室\d+[A-Za-z]*|检隔室\d+[A-Za-z]*|隔离室\d+[A-Za-z]*)/)
      let display = baseMatch ? baseMatch[0] : trimmed
      const reorder = display.match(/^(\d+[A-Za-z]*)(检疫隔离室|检疫室|检隔室|隔离室|动物室)$/)
      if (reorder) display = `${reorder[2]}${reorder[1]}`
      const codeMatch = display.match(/(\d+[A-Za-z]*)/)
      return (codeMatch ? codeMatch[1] : 'UNKNOWN').toUpperCase()
    }
    const dupIds: string[] = []
    for (const id of overview.duplicates.anomalyIds || []) {
      const item = await this.anomalyStore.findById(id)
      if (item && parseCode(item.areaName) === code.toUpperCase()) dupIds.push(id)
    }
    const conflictIds = [] as string[]
    for (const g of overview.conflicts) {
      if (parseCode(g.areaName) === code.toUpperCase()) {
        for (const a of g.anomalies) conflictIds.push(a.anomalyId)
      }
    }
    if (dupIds.length) await this.updateTasksAfterBulk(await this.anomalyStore.bulkResolve('duplicate', 'skip', dupIds))
    if (conflictIds.length) await this.updateTasksAfterBulk(await this.anomalyStore.bulkResolve('conflict', 'skip', conflictIds))
    this.analyticsCache.del('analytics:overview')
    this.analyticsCache.del('analytics:areas')
    this.analyticsCache.del('analytics:segments:')
  }

  private async updateTasksAfterBulk(resolved: Array<{ taskNumericId: number }>): Promise<void> {
    if (!resolved.length) return
    const byTask = new Map<number, number>()
    for (const r of resolved) byTask.set(r.taskNumericId, (byTask.get(r.taskNumericId) ?? 0) + 1)
    for (const [taskId, inc] of byTask.entries()) {
      const task = await this.taskRepo.findOne({ where: { id: taskId } })
      if (!task) continue
      task.anomaliesProcessed = (task.anomaliesProcessed ?? 0) + inc
      task.skipCount = (task.skipCount ?? 0) + inc
      const pendingForTask = await this.anomalyStore.pendingCountForTask(taskId)
      task.status = pendingForTask === 0 ? 'completed' : 'processing'
      task.progressLastAt = new Date()
      await this.taskRepo.save(task)
    }
  }
}