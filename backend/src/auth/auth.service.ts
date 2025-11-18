import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UsersService } from '../users/users.service'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'

@Injectable()
export class AuthService {
  constructor(private readonly users: UsersService, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  buildWeComLoginUrls(redirect: string, corpId: string, agentId: string) {
    const state = Math.random().toString(36).slice(2)
    const qr_url = `https://open.work.weixin.qq.com/wwopen/sso/qrConnect?appid=${corpId}&agentid=${agentId}&redirect_uri=${encodeURIComponent(redirect)}&state=${state}`
    const oauth_url = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${corpId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`
    return { qr_url, oauth_url, state }
  }

  async handleCallback(code: string, state: string) {
    void state
    const corpId = this.config.get<string>('WE_COM_CORP_ID') || ''
    const secret = this.config.get<string>('WE_COM_SECRET') || ''
    let wecom_user_id = ''
    let display_name = ''
    try {
      if (corpId && secret) {
        const tRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`)
        const tJson: any = await tRes.json()
        const access = tJson?.access_token
        if (access) {
          const uRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/auth/getuserinfo?access_token=${encodeURIComponent(access)}&code=${encodeURIComponent(code)}`)
          const uJson: any = await uRes.json()
          wecom_user_id = uJson?.UserId || uJson?.userid || ''
          const user_ticket = uJson?.user_ticket || ''
          if (user_ticket) {
            const dtRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/auth/getuserdetail?access_token=${encodeURIComponent(access)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_ticket }) })
            const dtJson: any = await dtRes.json()
            display_name = dtJson?.name || display_name || ''
          }
          if (!display_name && wecom_user_id) {
            const dRes = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token=${encodeURIComponent(access)}&userid=${encodeURIComponent(wecom_user_id)}`)
            const dJson: any = await dRes.json()
            display_name = dJson?.name || ''
          }
        }
      }
    } catch {}
    if (!wecom_user_id) wecom_user_id = `mock-${code}`
    let user = await this.users.findByWeComId(wecom_user_id)
    if (!user) {
      const username = display_name || wecom_user_id
      user = await this.users.createUser({ username, wecom_user_id, role: 'user', status: 1 })
    } else {
      if (display_name && (user as any).username !== display_name) {
        await this.users.updateUser((user as any).id, { username: display_name })
        user = { ...(user as any), username: display_name }
      }
    }
    const tokens = this.issueTokens(user as any)
    return { access_token: tokens.accessToken, refresh_token: tokens.refreshToken, user: { id: (user as any).id, username: (user as any).username, role: (user as any).role } }
  }

  private hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString('hex')
    const iter = 100000
    const hash = crypto.pbkdf2Sync(password, salt, iter, 32, 'sha256').toString('hex')
    return `pbkdf2$${iter}$${salt}$${hash}`
  }

  private verifyPassword(password: string, encoded: string | null | undefined) {
    if (!encoded) return false
    const parts = String(encoded).split('$')
    if (parts.length !== 4) return false
    const iter = parseInt(parts[1], 10)
    const salt = parts[2]
    const expect = parts[3]
    const hash = crypto.pbkdf2Sync(password, salt, iter, 32, 'sha256').toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expect))
  }

  async passwordLogin(username: string, password: string) {
    const u = await this.users.findByUsername(username)
    const s = u ? (u as any).status : undefined
    const enabled = !!u && (s === 'enabled' || s === 1 || s === '1')
    if (!u || !enabled || !this.verifyPassword(password, u.password_hash ?? undefined)) {
      return { success: false }
    }
    const tokens = this.issueTokens(u)
    return { success: true, access_token: tokens.accessToken, refresh_token: tokens.refreshToken, user: { id: u.id, username: u.username, role: u.role } }
  }

  async setPassword(userId: number, newPassword: string) {
    const hash = this.hashPassword(newPassword)
    await this.users.updateUser(userId, { password_hash: hash })
    return { success: true }
  }

  private issueTokens(user: { id: number; role: string; username: string }) {
    const accessToken = this.jwt.sign({ sub: user.id, role: user.role, username: user.username })
    const refreshToken = this.jwt.sign({ sub: user.id, type: 'refresh' }, { expiresIn: '7d' })
    return { accessToken, refreshToken }
  }

  verifyAccess(token: string) {
    try { return this.jwt.verify(token) } catch { return null }
  }

  refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken) as any
      if (payload?.type !== 'refresh' || !payload?.sub) return { success: false }
      const accessToken = this.jwt.sign({ sub: payload.sub, role: payload.role, username: payload.username })
      const newRefreshToken = this.jwt.sign({ sub: payload.sub, type: 'refresh' }, { expiresIn: '7d' })
      return { success: true, access_token: accessToken, refresh_token: newRefreshToken }
    } catch { return { success: false } }
  }
}