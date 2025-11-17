import { Repository } from 'typeorm';
import { AreaDefaultsEntity } from '../entities/area-defaults.entity';
import { Area } from '../entities/area.entity';
export declare class SettingsService {
    private readonly repo;
    private readonly areaRepo;
    constructor(repo: Repository<AreaDefaultsEntity>, areaRepo: Repository<Area>);
    listAreas(): Promise<Array<{
        code: string;
        name: string;
    }>>;
    getDefaults(area_code: string): Promise<AreaDefaultsEntity | null>;
    upsertDefaults(payload: Partial<AreaDefaultsEntity>): Promise<AreaDefaultsEntity>;
}
