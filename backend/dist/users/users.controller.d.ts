import { UsersService } from './users.service';
import { UserEntity } from '../entities/user.entity';
export declare class UsersController {
    private readonly users;
    constructor(users: UsersService);
    list(): Promise<UserEntity[]>;
    create(dto: Partial<UserEntity>): Promise<UserEntity>;
    update(id: number, dto: Partial<UserEntity>): Promise<UserEntity | null>;
    remove(id: number): Promise<{
        success: boolean;
    }>;
}
