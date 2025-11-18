import { Controller, Get, Query, Post, Body } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import type { Request } from 'express'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

  @Get('wecom/login-url')
  loginUrl() {
    const corpId = this.config.get<string>('WE_COM_CORP_ID') || ''
    const agentId = this.config.get<string>('WE_COM_AGENT_ID') || ''
    const redirect = this.config.get<string>('WE_COM_REDIRECT_URI') || 'http://localhost:3006/login/callback'
    return this.auth.buildWeComLoginUrls(redirect, corpId, agentId)
  }

  @Get('wecom/callback')
  async callback(@Query('code') code: string, @Query('state') state: string) {
    return this.auth.handleCallback(code, state)
  }

  @Get('wecom/ticket')
  ticket(@Query('state') state: string) {
    const ok = this.auth.getStateTicket(state)
    if (!ok) return { ready: false }
    return { ready: true, ...ok }
  }

  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    return this.auth.passwordLogin(body.username, body.password)
  }

}