import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { Card, Typography, message } from 'antd'

function useQuery() { return new URLSearchParams(useLocation().search) }

const LoginCallbackPage = () => {
  const q = useQuery()
  const nav = useNavigate()
  const [msgApi, contextHolder] = message.useMessage()
  useEffect(() => {
    const code = q.get('code') || ''
    const state = q.get('state') || ''
    const run = async () => {
      try {
        const res = await authService.callback({ code, state })
        localStorage.setItem('auth_token', res.access_token)
        localStorage.setItem('refresh_token', res.refresh_token)
        msgApi.success('登录成功')
        nav('/analysis', { replace: true })
      } catch (e: any) {
        msgApi.error(e?.message ?? '登录失败')
      }
    }
    void run()
  }, [])
  return (
    <Card><Typography.Text>登录处理中...</Typography.Text>{contextHolder}</Card>
  )
}

export default LoginCallbackPage