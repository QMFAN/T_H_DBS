import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import type { DataSource } from 'typeorm'

@Injectable()
export class UsersSchemaInitService implements OnModuleInit {
  private readonly logger = new Logger(UsersSchemaInitService.name)
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async onModuleInit() {
    await this.ensureUsersTable().catch((e) => this.logger.warn(`Create users table skipped: ${(e as Error).message}`))
    await this.ensureColumns().catch((e) => this.logger.warn(`Ensure users columns skipped: ${(e as Error).message}`))
    await this.ensureAdminUser().catch((e) => this.logger.warn(`Ensure admin skipped: ${(e as Error).message}`))
  }

  private async ensureUsersTable() {
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
    await this.ds.query(sql)
    this.logger.log('Ensured table users exists')
  }

  private async ensureColumns() {
    const required: Array<{ name: string; ddl: string }> = [
      { name: 'username', ddl: 'ADD COLUMN username VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL' },
      { name: 'wecom_user_id', ddl: 'ADD COLUMN wecom_user_id VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL' },
      { name: 'password_hash', ddl: 'ADD COLUMN password_hash VARCHAR(255) COLLATE utf8mb4_unicode_ci NULL' },
      { name: 'role', ddl: "ADD COLUMN role VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user'" },
      { name: 'status', ddl: 'ADD COLUMN status INT NOT NULL DEFAULT 1' },
      { name: 'created_at', ddl: 'ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', ddl: 'ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' },
    ]
    const cols = await this.ds.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`)
    const existing = new Set<string>(cols.map((r: any) => r.COLUMN_NAME))
    // drop legacy user_id column if exists to avoid insert errors
    if (existing.has('user_id')) {
      const pk = await this.ds.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND CONSTRAINT_NAME = 'PRIMARY'`)
      const pkCol = pk[0]?.COLUMN_NAME
      if (pkCol && pkCol !== 'id') {
        await this.ds.query('ALTER TABLE users DROP PRIMARY KEY')
      }
      await this.ds.query('ALTER TABLE users DROP COLUMN user_id')
      await this.ds.query('ALTER TABLE users ADD PRIMARY KEY (id)')
      this.logger.log('Dropped legacy column users.user_id and ensured PRIMARY KEY(id)')
      existing.delete('user_id')
    }
    const toAdd = required.filter((c) => !existing.has(c.name))
    for (const c of toAdd) {
      await this.ds.query(`ALTER TABLE users ${c.ddl}`)
      this.logger.log(`Added column users.${c.name}`)
    }
    if (existing.has('name')) {
      await this.ds.query(`ALTER TABLE users DROP COLUMN name`)
      this.logger.log('Dropped redundant column users.name')
    }
    // ensure unique indexes
    const idxs = await this.ds.query(`SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'`)
    const hasUserIdx = idxs.some((i: any) => i.INDEX_NAME === 'uniq_username')
    const hasWecomIdx = idxs.some((i: any) => i.INDEX_NAME === 'uniq_wecom')
    if (!hasUserIdx) await this.ds.query(`ALTER TABLE users ADD UNIQUE KEY uniq_username (username)`)
    if (!hasWecomIdx) await this.ds.query(`ALTER TABLE users ADD UNIQUE KEY uniq_wecom (wecom_user_id)`)
  }

  private async ensureAdminUser() {
    const crypto = await import('crypto')
    const salt = crypto.randomBytes(16).toString('hex')
    const iter = 100000
    const hash = crypto.pbkdf2Sync('admin123', salt, iter, 32, 'sha256').toString('hex')
    const encoded = `pbkdf2$${iter}$${salt}$${hash}`
    await this.ds.query(
      `INSERT INTO users (username, password_hash, role, status) VALUES ('admin', ?, 'admin', 1)
       ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role='admin', status=1`,
      [encoded],
    )
    this.logger.log('Ensured admin user exists with default password for testing')
  }
}