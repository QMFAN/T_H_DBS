import { Card, Space, Button, message, Form, Input, Typography, Tabs } from 'antd'
import { QRCodeCanvas as QRCode } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import type { FC } from 'react'
import { useState, useEffect } from 'react'
import { authService } from '../../services/authService'

const LoginPage: FC = () => {
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [urls, setUrls] = useState<{ qr_url?: string; oauth_url?: string; state?: string } | null>(null)
  const go = async (type: 'qr' | 'oauth') => {
    setLoading(true)
    try {
      const res = await authService.getLoginUrls()
      if (type === 'qr') {
        window.location.href = res.qr_url
      } else {
        window.location.href = res.oauth_url
      }
    } catch (e: any) {
      messageApi.error(e?.message ?? '获取登录地址失败')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    let timer: any
    authService.getLoginUrls().then((res) => {
      setUrls(res)
      const st = res.state
      if (st) {
        timer = setInterval(async () => {
          try {
            const r = await authService.poll(st)
            if (r && (r as any).ready) {
              const ok = r as any
              localStorage.setItem('auth_token', ok.access_token)
              localStorage.setItem('refresh_token', ok.refresh_token)
              messageApi.success('扫码登录成功')
              nav('/analysis', { replace: true })
              clearInterval(timer)
            }
          } catch {}
        }, 1500)
      }
    }).catch((e) => messageApi.error(e?.message ?? '获取登录地址失败'))
    return () => { if (timer) clearInterval(timer) }
  }, [])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f5f7ff 0%, #e6f0ff 100%)', padding: 24 }}>
      <div style={{ width: 'fit-content', maxWidth: 680 }}>
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
      {contextHolder}
      <Card title={<Typography.Title level={2} style={{ textAlign: 'center', margin: 0 }}>EnHealth 实验动物室环境数据系统</Typography.Title>} variant="outlined" style={{ borderRadius: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
        <Tabs defaultActiveKey="wecom" centered items={[
          {
            key: 'wecom',
            label: '企业微信登录',
            children: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                <div style={{ textAlign: 'center', background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
                  {urls?.qr_url ? (
                    <QRCode value={urls.qr_url} size={200} level="M" />
                  ) : (
                    <Typography.Text type="secondary">正在获取二维码...</Typography.Text>
                  )}
                  <div style={{ marginTop: 10 }}><Typography.Text>使用企业微信扫码登录</Typography.Text></div>
                  <Button type="primary" size="large" onClick={() => void go('qr')} loading={loading} style={{ marginTop: 12 }}>打开企业微信登录页</Button>
                </div>
              </div>
            ),
          },
          {
            key: 'password',
            label: '账号密码登录',
            children: (
              <Form onFinish={async (v: any) => {
          setLoading(true)
          try {
            const res = await authService.passwordLogin(v.username, v.password)
            if (!res.success || !res.access_token || !res.refresh_token) { messageApi.error('登录失败'); return }
            localStorage.setItem('auth_token', res.access_token)
            localStorage.setItem('refresh_token', res.refresh_token)
            messageApi.success('登录成功')
            nav('/analysis', { replace: true })
          } catch (e: any) { messageApi.error(e?.message ?? '登录失败') } finally { setLoading(false) }
        }} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}> 
            <Input placeholder="请输入用户名" size="large" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}> 
            <Input.Password placeholder="请输入密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large" style={{ width: '100%' }}>登录</Button>
          </Form.Item>
        </Form>
            ),
          },
        ]} />
      </Card>
        </Space>
      </div>
    </div>
  )
}

export default LoginPage