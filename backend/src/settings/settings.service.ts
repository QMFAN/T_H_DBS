import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AreaDefaultsEntity } from '../entities/area-defaults.entity'
import { Area } from '../entities/area.entity'

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(AreaDefaultsEntity) private readonly repo: Repository<AreaDefaultsEntity>,
    @InjectRepository(Area) private readonly areaRepo: Repository<Area>,
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
}