import { SensorData } from './sensor-data.entity';
export declare class Area {
    id: number;
    code: string;
    name: string;
    location?: string | null;
    createdAt: Date;
    updatedAt: Date;
    sensorData?: SensorData[];
}
