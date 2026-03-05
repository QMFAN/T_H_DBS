import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import type { UserEntity } from '../entities/user.entity';

type JwtAccessPayload = {
  sub: number;
  role: string;
  username: string;
};

type JwtRefreshPayload = {
  sub: number;
  type: 'refresh';
  role?: string;
  username?: string;
};

@Injectable()
export class AuthService {
  private readonly issuedStates = new Map<string, number>();
  private readonly STATE_TTL_MS = 5 * 60 * 1000;
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private async parseJsonObject(
    response: Response,
  ): Promise<Record<string, unknown>> {
    const data: unknown = await response.json();
    if (this.isRecord(data)) {
      return data;
    }
    return {};
  }

  private pickString(
    record: Record<string, unknown>,
    ...keys: string[]
  ): string {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }
    }
    return '';
  }

  private pickNumber(record: Record<string, unknown>, key: string): number {
    const value = record[key];
    return typeof value === 'number' ? value : 0;
  }

  buildWeComLoginUrls(redirect: string, corpId: string, agentId: string) {
    const state = Math.random().toString(36).slice(2);
    this.issuedStates.set(state, Date.now() + this.STATE_TTL_MS);
    const qr_url = `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=${corpId}&agentid=${agentId}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}`;
    const oauth_url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${corpId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
    return {
      qr_url,
      oauth_url,
      state,
      appid: corpId,
      agentid: agentId,
      redirect_uri: redirect,
    };
  }

  async handleCallback(code: string, state: string) {
    const expires = this.issuedStates.get(state);
    if (!expires || expires < Date.now()) {
      return { success: false, message: 'invalid_or_expired_state' };
    }
    this.issuedStates.delete(state);
    const corpId = this.config.get<string>('WE_COM_CORP_ID') || '';
    const secret = this.config.get<string>('WE_COM_SECRET') || '';
    if (!corpId || !secret) {
      this.logger.error(
        `WeCom config missing: corpId=${corpId ? 'set' : 'empty'}, secret=${secret ? 'set' : 'empty'}`,
      );
      return {
        success: false,
        message: 'wecom_config_missing',
      };
    }
    let wecom_user_id = '';
    let display_name = '';
    let wecom_error: Record<string, unknown> | null = null;
    try {
      const tRes = await fetch(
        `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`,
      );
      const tJson = await this.parseJsonObject(tRes);
      const access = this.pickString(tJson, 'access_token');
      if (!access) {
        this.logger.error(`WeCom gettoken failed: ${JSON.stringify(tJson)}`);
      }
      if (access) {
        const uRes = await fetch(
          `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${encodeURIComponent(access)}&code=${encodeURIComponent(code)}`,
        );
        const uJson = await this.parseJsonObject(uRes);
        const errcode = this.pickNumber(uJson, 'errcode');
        if (errcode) {
          wecom_error = uJson;
        }
        wecom_user_id = this.pickString(
          uJson,
          'UserId',
          'userid',
          'userId',
          'openid',
          'external_userid',
        );
        const user_ticket = this.pickString(uJson, 'user_ticket');
        if (user_ticket) {
          const dtRes = await fetch(
            `https://qyapi.weixin.qq.com/cgi-bin/auth/getuserdetail?access_token=${encodeURIComponent(access)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_ticket }),
            },
          );
          const dtJson = await this.parseJsonObject(dtRes);
          display_name = this.pickString(dtJson, 'name') || display_name;
        }
        if (!display_name && wecom_user_id) {
          const dRes = await fetch(
            `https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${encodeURIComponent(access)}&userid=${encodeURIComponent(wecom_user_id)}`,
          );
          const dJson = await this.parseJsonObject(dRes);
          display_name = this.pickString(dJson, 'name');
        }
        if (!wecom_user_id || errcode) {
          this.logger.error(
            `WeCom getuserinfo raw response: ${JSON.stringify(uJson)}`,
          );
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.error(`WeCom callback error: ${message}`);
    }
    if (!wecom_user_id) {
      this.logger.error(
        `WeCom callback failed to resolve user id for code=${code}`,
      );
      return {
        success: false,
        message: 'wecom_user_resolve_failed',
        wecom_error,
      };
    }
    let user: UserEntity | null = await this.users.findByWeComId(wecom_user_id);
    if (!user && display_name) {
      const byName = await this.users.findByUsername(display_name);
      if (byName && !byName.wecom_user_id) {
        await this.users.updateUser(byName.id, { wecom_user_id });
        user = { ...byName, wecom_user_id };
      }
    }
    if (!user) {
      const username = display_name || wecom_user_id;
      user = await this.users.createUser({
        username,
        wecom_user_id,
        role: 'user',
        status: 1,
      });
    } else if (display_name && user.username !== display_name) {
      const updatedUser = await this.users.updateUser(user.id, {
        username: display_name,
      });
      user = updatedUser ?? { ...user, username: display_name };
    }
    const tokens = this.issueTokens(user);
    return {
      success: true,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  private hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString('hex');
    const iter = 100000;
    const hash = crypto
      .pbkdf2Sync(password, salt, iter, 32, 'sha256')
      .toString('hex');
    return `pbkdf2$${iter}$${salt}$${hash}`;
  }

  private verifyPassword(password: string, encoded: string | null | undefined) {
    if (!encoded) return false;
    const parts = String(encoded).split('$');
    if (parts.length !== 4) return false;
    const iter = parseInt(parts[1], 10);
    const salt = parts[2];
    const expect = parts[3];
    const hash = crypto
      .pbkdf2Sync(password, salt, iter, 32, 'sha256')
      .toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expect));
  }

  async passwordLogin(username: string, password: string) {
    const u = await this.users.findByUsername(username);
    const enabled = !!u && u.status === 1;
    if (
      !u ||
      !enabled ||
      !this.verifyPassword(password, u.password_hash ?? undefined)
    ) {
      return { success: false };
    }
    const tokens = this.issueTokens(u);
    return {
      success: true,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: { id: u.id, username: u.username, role: u.role },
    };
  }

  async setPassword(userId: number, newPassword: string) {
    const hash = this.hashPassword(newPassword);
    await this.users.updateUser(userId, { password_hash: hash });
    return { success: true };
  }

  private issueTokens(user: { id: number; role: string; username: string }) {
    const accessToken = this.jwt.sign({
      sub: user.id,
      role: user.role,
      username: user.username,
    });
    const refreshToken = this.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }

  verifyAccess(token: string) {
    try {
      return this.jwt.verify<JwtAccessPayload>(token);
    } catch {
      return null;
    }
  }

  refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtRefreshPayload>(refreshToken);
      if (payload.type !== 'refresh' || !payload.sub) {
        return { success: false };
      }
      const role = typeof payload.role === 'string' ? payload.role : 'user';
      const username =
        typeof payload.username === 'string' ? payload.username : '';
      const accessToken = this.jwt.sign({
        sub: payload.sub,
        role,
        username,
      });
      const newRefreshToken = this.jwt.sign(
        { sub: payload.sub, type: 'refresh' },
        { expiresIn: '7d' },
      );
      return {
        success: true,
        access_token: accessToken,
        refresh_token: newRefreshToken,
      };
    } catch {
      return { success: false };
    }
  }
}
