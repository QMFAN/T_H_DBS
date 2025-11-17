import { Controller, Get, Req, Post, Body } from '@nestjs/common'
import { AuthService } from './auth.service'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

@Controller('auth')
export class AuthCommonController {
  constructor(private readonly authService: AuthService, private readonly jwt: JwtService) {}
  @Get('me')
  me(@Req() req: Request) {
    const auth = req.headers['authorization'] || ''
    const token = (Array.isArray(auth) ? auth[0] : auth).replace(/^Bearer\s+/i, '')
    try {
      const payload: any = this.jwt.verify(token)
      return { user: { id: payload.sub, username: payload.username, role: payload.role } }
    } catch { return { user: null } }
  }
  @Post('set-password')
  async setPassword(@Body() body: { userId: number; newPassword: string }) {
    await this.authService.setPassword(body.userId, body.newPassword)
    return { success: true }
  }

  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refresh(body.refresh_token)
  }
}