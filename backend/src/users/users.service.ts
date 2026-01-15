import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private readonly repo: Repository<UserEntity>,
  ) {}

  async findAll(): Promise<UserEntity[]> {
    return this.repo.find({ order: { id: 'ASC' } });
  }
  async findById(id: number): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }
  async findByWeComId(wecom_user_id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { wecom_user_id } });
  }
  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { username } });
  }
  async createUser(payload: Partial<UserEntity>): Promise<UserEntity> {
    return this.repo.save(this.repo.create(payload));
  }
  async updateUser(
    id: number,
    payload: Partial<UserEntity>,
  ): Promise<UserEntity | null> {
    const u = await this.findById(id);
    if (!u) return null;
    Object.assign(u, payload);
    return this.repo.save(u);
  }
  async deleteUser(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
