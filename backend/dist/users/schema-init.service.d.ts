import { OnModuleInit } from '@nestjs/common';
import type { DataSource } from 'typeorm';
export declare class UsersSchemaInitService implements OnModuleInit {
    private readonly ds;
    private readonly logger;
    constructor(ds: DataSource);
    onModuleInit(): Promise<void>;
    private ensureUsersTable;
    private ensureColumns;
    private ensureAdminUser;
}
