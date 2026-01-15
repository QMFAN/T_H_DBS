import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  username!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  wecom_user_id?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password_hash?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role!: 'admin' | 'manager' | 'user';

  @Column({ type: 'int', default: 1 })
  status!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
