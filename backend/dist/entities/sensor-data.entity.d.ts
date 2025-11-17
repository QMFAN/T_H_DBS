import { Area } from './area.entity';
export declare class SensorData {
    id: number;
    areaId: number;
    area: Area;
    timestamp: Date;
    temperature?: string | null;
    humidity?: string | null;
    fileSource?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
