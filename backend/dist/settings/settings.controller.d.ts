import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly svc;
    constructor(svc: SettingsService);
    areas(): Promise<{
        areas: {
            code: string;
            name: string;
        }[];
    }>;
    getDefaults(area: string): Promise<{
        area: string;
        defaults: import("../entities/area-defaults.entity").AreaDefaultsEntity | null;
    }>;
    upsert(body: any): Promise<{
        success: boolean;
        defaults: import("../entities/area-defaults.entity").AreaDefaultsEntity;
    }>;
}
