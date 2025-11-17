import { OnModuleInit } from '@nestjs/common';
import type { DataSource } from 'typeorm';
export declare class SchemaInitService implements OnModuleInit {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    onModuleInit(): Promise<void>;
    private ensureAreaDefaults;
    private syncExistingAreas;
    private ensureInsertTrigger;
    private dropLegacyTables;
}
