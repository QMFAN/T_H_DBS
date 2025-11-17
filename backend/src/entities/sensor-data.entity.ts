import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Area } from './area.entity';

@Entity({ name: 'sensor_data' })
@Index('idx_sensor_data_timestamp', ['timestamp'])
@Index('uk_sensor_data_area_timestamp', ['areaId', 'timestamp'], {
  unique: true,
})
export class SensorData {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'area_id', type: 'bigint', unsigned: true })
  areaId!: number;

  @ManyToOne(() => Area, (area) => area.sensorData, {
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'area_id' })
  area!: Area;

  @Column({ type: 'datetime' })
  timestamp!: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperature?: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  humidity?: string | null;

  @Column({ name: 'file_source', type: 'varchar', length: 255, nullable: true })
  fileSource?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}
