import { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
export declare class UsersService {
    private readonly repo;
    constructor(repo: Repository<UserEntity>);
    findAll(): Promise<UserEntity[]>;
    findById(id: number): Promise<UserEntity | null>;
    findByWeComId(wecom_user_id: string): Promise<UserEntity | null>;
    findByUsername(username: string): Promise<UserEntity | null>;
    createUser(payload: Partial<UserEntity>): Promise<UserEntity>;
    updateUser(id: number, payload: Partial<UserEntity>): Promise<UserEntity | null>;
    deleteUser(id: number): Promise<void>;
}
