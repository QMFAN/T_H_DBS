export declare class AreaDefaultsEntity {
    id: number;
    area_code: string;
    temp_min: number;
    temp_max: number;
    humidity_min: number;
    humidity_max: number;
    temp_duration_min: number;
    humidity_duration_min: number;
    gap_tolerance_minutes: number;
    tolerance_normal_budget: number;
    updated_by?: string | null;
    created_at: Date;
    updated_at: Date;
}
