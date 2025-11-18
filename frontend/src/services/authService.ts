import http from './http'

export const authService = {
  async getLoginUrls() {
    const res = await http.get('/auth/wecom/login-url')
    return res.data as { qr_url: string; oauth_url: string; state: string }
  },
  async callback(params: { code: string; state: string }) {
    const res = await http.get('/auth/wecom/callback', { params })
    return res.data as { access_token: string; refresh_token: string; user: { id: number; username: string; role: string } }
  },
  async passwordLogin(username: string, password: string) {
    const res = await http.post('/auth/login', { username, password })
    return res.data as { success: boolean; access_token?: string; refresh_token?: string; user?: { id: number; username: string; role: string } }
  },
  async refresh(refresh_token: string) {
    const res = await http.post('/auth/refresh', { refresh_token })
    return res.data as { success: boolean; access_token?: string; refresh_token?: string }
  },
  async me() {
    const res = await http.get('/auth/me')
    return res.data
  },
}