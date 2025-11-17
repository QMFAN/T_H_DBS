import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('area_defaults')
export class AreaDefaultsEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  area_code!: string

  @Column({ type: 'float' })
  temp_min!: number

  @Column({ type: 'float' })
  temp_max!: number

  @Column({ type: 'float' })
  humidity_min!: number

  @Column({ type: 'float' })
  humidity_max!: number

  @Column({ type: 'int' })
  temp_duration_min!: number

  @Column({ type: 'int' })
  humidity_duration_min!: number

  @Column({ type: 'int', default: 30 })
  gap_tolerance_minutes!: number

  @Column({ type: 'int', default: 0 })
  tolerance_normal_budget!: number

  @Column({ type: 'varchar', length: 100, nullable: true })
  updated_by?: string | null

  @CreateDateColumn()
  created_at!: Date

  @UpdateDateColumn()
  updated_at!: Date
}