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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
const crypto = __importStar(require("crypto"));
let AuthService = class AuthService {
    users;
    jwt;
    config;
    constructor(users, jwt, config) {
        this.users = users;
        this.jwt = jwt;
        this.config = config;
    }
    buildWeComLoginUrls(redirect, corpId, agentId) {
        const state = Math.random().toString(36).slice(2);
        const qr_url = `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=${corpId}&agentid=${agentId}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}`;
        const oauth_url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${corpId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
        return { qr_url, oauth_url, state };
    }
    async handleCallback(code, state) {
        void state;
        const corpId = this.config.get('WE_COM_CORP_ID') || '';
        const secret = this.config.get('WE_COM_SECRET') || '';
        let wecom_user_id = '';
        let display_name = '';
        try {
            if (corpId && secret) {
                const tRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`);
                const tJson = await tRes.json();
                const access = tJson?.access_token;
                if (access) {
                    const uRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${encodeURIComponent(access)}&code=${encodeURIComponent(code)}`);
                    const uJson = await uRes.json();
                    wecom_user_id = uJson?.UserId || uJson?.userid || '';
                    const user_ticket = uJson?.user_ticket || '';
                    if (user_ticket) {
                        const dtRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/auth/getuserdetail?access_token=${encodeURIComponent(access)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_ticket }) });
                        const dtJson = await dtRes.json();
                        display_name = dtJson?.name || display_name || '';
                    }
                    if (!display_name && wecom_user_id) {
                        const dRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${encodeURIComponent(access)}&userid=${encodeURIComponent(wecom_user_id)}`);
                        const dJson = await dRes.json();
                        display_name = dJson?.name || '';
                    }
                }
            }
        }
        catch { }
        if (!wecom_user_id)
            wecom_user_id = `mock-${code}`;
        let user = await this.users.findByWeComId(wecom_user_id);
        if (!user) {
            const username = display_name || wecom_user_id;
            user = await this.users.createUser({ username, wecom_user_id, role: 'user', status: 1 });
        }
        else {
            if (display_name && user.username !== display_name) {
                await this.users.updateUser(user.id, { username: display_name });
                user = { ...user, username: display_name };
            }
        }
        const tokens = this.issueTokens(user);
        return { access_token: tokens.accessToken, refresh_token: tokens.refreshToken, user: { id: user.id, username: user.username, role: user.role } };
    }
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const iter = 100000;
        const hash = crypto.pbkdf2Sync(password, salt, iter, 32, 'sha256').toString('hex');
        return `pbkdf2$${iter}$${salt}$${hash}`;
    }
    verifyPassword(password, encoded) {
        if (!encoded)
            return false;
        const parts = String(encoded).split('$');
        if (parts.length !== 4)
            return false;
        const iter = parseInt(parts[1], 10);
        const salt = parts[2];
        const expect = parts[3];
        const hash = crypto.pbkdf2Sync(password, salt, iter, 32, 'sha256').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expect));
    }
    async passwordLogin(username, password) {
        const u = await this.users.findByUsername(username);
        const s = u ? u.status : undefined;
        const enabled = !!u && (s === 'enabled' || s === 1 || s === '1');
        if (!u || !enabled || !this.verifyPassword(password, u.password_hash ?? undefined)) {
            return { success: false };
        }
        const tokens = this.issueTokens(u);
        return { success: true, access_token: tokens.accessToken, refresh_token: tokens.refreshToken, user: { id: u.id, username: u.username, role: u.role } };
    }
    async setPassword(userId, newPassword) {
        const hash = this.hashPassword(newPassword);
        await this.users.updateUser(userId, { password_hash: hash });
        return { success: true };
    }
    issueTokens(user) {
        const accessToken = this.jwt.sign({ sub: user.id, role: user.role, username: user.username });
        const refreshToken = this.jwt.sign({ sub: user.id, type: 'refresh' }, { expiresIn: '7d' });
        return { accessToken, refreshToken };
    }
    verifyAccess(token) {
        try {
            return this.jwt.verify(token);
        }
        catch {
            return null;
        }
    }
    refresh(refreshToken) {
        try {
            const payload = this.jwt.verify(refreshToken);
            if (payload?.type !== 'refresh' || !payload?.sub)
                return { success: false };
            const accessToken = this.jwt.sign({ sub: payload.sub, role: payload.role, username: payload.username });
            const newRefreshToken = this.jwt.sign({ sub: payload.sub, type: 'refresh' }, { expiresIn: '7d' });
            return { success: true, access_token: accessToken, refresh_token: newRefreshToken };
        }
        catch {
            return { success: false };
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService, jwt_1.JwtService, config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map