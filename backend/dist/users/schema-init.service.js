"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UsersSchemaInitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersSchemaInitService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
let UsersSchemaInitService = UsersSchemaInitService_1 = class UsersSchemaInitService {
    ds;
    logger = new common_1.Logger(UsersSchemaInitService_1.name);
    constructor(ds) {
        this.ds = ds;
    }
    async onModuleInit() {
        await this.ensureUsersTable().catch((e) => this.logger.warn(`Create users table skipped: ${e.message}`));
        await this.ensureColumns().catch((e) => this.logger.warn(`Ensure users columns skipped: ${e.message}`));
        await this.ensureAdminUser().catch((e) => this.logger.warn(`Ensure admin skipped: ${e.message}`));
    }
    async ensureUsersTable() {
        const sql = `
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  wecom_user_id VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL,
  password_hash VARCHAR(255) COLLATE utf8mb4_unicode_ci NULL,
  role VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  status INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uniq_username (username),
  UNIQUE KEY uniq_wecom (wecom_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
        await this.ds.query(sql);
        this.logger.log('Ensured table users exists');
    }
    async ensureColumns() {
        const required = [
            { name: 'username', ddl: 'ADD COLUMN username VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL' },
            { name: 'wecom_user_id', ddl: 'ADD COLUMN wecom_user_id VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL' },
            { name: 'password_hash', ddl: 'ADD COLUMN password_hash VARCHAR(255) COLLATE utf8mb4_unicode_ci NULL' },
            { name: 'role', ddl: "ADD COLUMN role VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user'" },
            { name: 'status', ddl: 'ADD COLUMN status INT NOT NULL DEFAULT 1' },
            { name: 'created_at', ddl: 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP' },
            { name: 'updated_at', ddl: 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
        ];
        const cols = await this.ds.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`);
        const existing = new Set(cols.map((r) => r.COLUMN_NAME));
        if (existing.has('user_id')) {
            const pk = await this.ds.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND CONSTRAINT_NAME = 'PRIMARY'`);
            const pkCol = pk[0]?.COLUMN_NAME;
            if (pkCol && pkCol !== 'id') {
                await this.ds.query('ALTER TABLE users DROP PRIMARY KEY');
            }
            await this.ds.query('ALTER TABLE users DROP COLUMN user_id');
            await this.ds.query('ALTER TABLE users ADD PRIMARY KEY (id)');
            this.logger.log('Dropped legacy column users.user_id and ensured PRIMARY KEY(id)');
            existing.delete('user_id');
        }
        const toAdd = required.filter((c) => !existing.has(c.name));
        for (const c of toAdd) {
            await this.ds.query(`ALTER TABLE users ${c.ddl}`);
            this.logger.log(`Added column users.${c.name}`);
        }
        if (existing.has('name')) {
            await this.ds.query(`ALTER TABLE users DROP COLUMN name`);
            this.logger.log('Dropped redundant column users.name');
        }
        const idxs = await this.ds.query(`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`);
        const hasUserIdx = idxs.some((i) => i.INDEX_NAME === 'uniq_username');
        const hasWecomIdx = idxs.some((i) => i.INDEX_NAME === 'uniq_wecom');
        if (!hasUserIdx)
            await this.ds.query(`ALTER TABLE users ADD UNIQUE KEY uniq_username (username)`);
        if (!hasWecomIdx)
            await this.ds.query(`ALTER TABLE users ADD UNIQUE KEY uniq_wecom (wecom_user_id)`);
    }
    async ensureAdminUser() {
        const crypto = await Promise.resolve().then(() => __importStar(require('crypto')));
        const salt = crypto.randomBytes(16).toString('hex');
        const iter = 100000;
        const hash = crypto.pbkdf2Sync('admin123', salt, iter, 32, 'sha256').toString('hex');
        const encoded = `pbkdf2$${iter}$${salt}$${hash}`;
        await this.ds.query(`INSERT INTO users (username, password_hash, role, status) VALUES ('admin', ?, 'admin', 1)
       ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role='admin', status=1`, [encoded]);
        this.logger.log('Ensured admin user exists with default password for testing');
    }
};
exports.UsersSchemaInitService = UsersSchemaInitService;
exports.UsersSchemaInitService = UsersSchemaInitService = UsersSchemaInitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [Function])
], UsersSchemaInitService);
//# sourceMappingURL=schema-init.service.js.map