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
    return this.repo.save(this.repo.create(payload))
  }
}