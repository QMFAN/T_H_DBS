import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ImportTaskStatus = 'completed' | 'pending' | 'processing' | 'failed';

@Entity({ name: 'import_tasks' })
export class ImportTask {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ name: 'task_id', type: 'varchar', length: 36, unique: true })
  taskId!: string;

  @Column({ name: 'batch_id', type: 'varchar', length: 36 })
  batchId!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'stored_path', type: 'varchar', length: 512, nullable: true })
  storedPath?: string | null;

  @Column({ name: 'file_url', type: 'varchar', length: 512, nullable: true })
  fileUrl?: string | null;

  @Column({ type: 'varchar', length: 20 })
  status!: ImportTaskStatus;

  @Column({ name: 'records', type: 'int', unsigned: true, default: 0 })
  records!: number;

  @Column({ name: 'skipped', type: 'int', unsigned: true, default: 0 })
  skipped!: number;

  @Column({ name: 'imported', type: 'int', unsigned: true, default: 0 })
  imported!: number;

  @Column({ name: 'duplicates', type: 'int', unsigned: true, default: 0 })
  duplicates!: number;

  @Column({ name: 'conflicts', type: 'int', unsigned: true, default: 0 })
  conflicts!: number;

  @Column({ name: 'anomalies_total', type: 'int', unsigned: true, default: 0 })
  anomaliesTotal!: number;

  @Column({ name: 'anomalies_processed', type: 'int', unsigned: true, default: 0 })
  anomaliesProcessed!: number;

  @Column({ name: 'skip_count', type: 'int', unsigned: true, default: 0 })
  skipCount!: number;

  @Column({ name: 'overwrite_count', type: 'int', unsigned: true, default: 0 })
  overwriteCount!: number;

  @Column({ name: 'auto_resolved', type: 'int', unsigned: true, default: 0 })
  autoResolved!: number;

  @Column({ name: 'manual_resolved', type: 'int', unsigned: true, default: 0 })
  manualResolved!: number;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({ name: 'progress_last_at', type: 'datetime', nullable: true })
  progressLastAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;

  // anomalies stored in memory/redis, no DB relation
}
