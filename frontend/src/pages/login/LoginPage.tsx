import { Card, Space, Button, message, Form, Input, Typography, Tabs } from 'antd'
import { useNavigate } from 'react-router-dom'
import type { FC } from 'react'
import { useState, useEffect } from 'react'
import { authService } from '../../services/authService'

const LoginPage: FC = () => {
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const [messageApi, contextHolder] = message.useMessage()
  const [urls, setUrls] = useState<{ qr_url?: string; oauth_url?: string; state?: string; appid?: string; agentid?: string; redirect_uri?: string } | null>(null)
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
    authService.getLoginUrls().then((res) => setUrls(res)).catch((e) => messageApi.error(e?.message ?? '获取登录地址失败'))
  }, [])

  useEffect(() => {
    if (urls?.appid && urls?.agentid && urls?.redirect_uri) {
      const id = 'wecom-qr'
      const ensureScript = () => new Promise<void>((resolve) => {
        if ((window as any).WwLogin) { resolve(); return }
        const s = document.createElement('script')
        s.src = 'https://open.work.weixin.qq.com/wwopen/js/js_sdk.js'
        s.onload = () => resolve()
        document.body.appendChild(s)
      })
      void ensureScript().then(() => {
        const WwLogin = (window as any).WwLogin
        if (typeof WwLogin === 'function') {
          WwLogin({
            id,
            appid: urls.appid,
            agentid: urls.agentid,
            redirect_uri: urls.redirect_uri,
            state: urls.state,
            href: ''
          })
        }
      })
    }
  }, [urls])
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
                  <div id="wecom-qr" style={{ width: 220, height: 220, display: 'inline-block' }} />
                  <div style={{ marginTop: 10 }}><Typography.Text>使用企业微信扫码登录</Typography.Text></div>
                  <Button type="primary" size="large" onClick={() => void go('oauth')} loading={loading} style={{ marginTop: 12 }}>授权登录</Button>
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