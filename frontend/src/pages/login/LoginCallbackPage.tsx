import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authService } from '../../services/authService'
import { Card, Typography, message } from 'antd'

function useQuery() { return new URLSearchParams(useLocation().search) }

const LoginCallbackPage = () => {
  const q = useQuery()
  const nav = useNavigate()
  const [msgApi, contextHolder] = message.useMessage()
  const [debug, setDebug] = useState<{ code: string; state: string; raw: any } | null>(null)
  useEffect(() => {
    const code = q.get('code') || ''
    const state = q.get('state') || ''
    const run = async () => {
      try {
        const res = await authService.callback({ code, state })
        // 调试输出后端回调原始数据
        // eslint-disable-next-line no-console
        console.log('WeCom callback response', res)
        if (!res?.access_token || !res?.refresh_token) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('refresh_token')
          const msgKey = (res as any)?.message as string | undefined
          let human = '状态过期或回调无效'
          const wecomError = (res as any)?.wecom_error as any | undefined
          if (msgKey === 'invalid_or_expired_state') human = 'state 无效或已过期（可能是回调被多次使用或服务重启）'
          else if (msgKey === 'wecom_config_missing') human = '后端企业微信配置缺失，请检查 CORP_ID / SECRET'
          else if (msgKey === 'wecom_user_resolve_failed') {
            human = '未能从企业微信获取用户 ID，请检查应用权限与回调参数'
            if (wecomError?.errcode === 60020) {
              human = '企业微信错误 60020：服务器 IP 未加入企业微信可信 IP 白名单'
            }
          }
          msgApi.error(`登录失败：${human}${msgKey ? `（${msgKey}）` : ''}`)
          setDebug({ code, state, raw: res })
          // 留在当前页面，方便查看调试信息
          return
        }
        localStorage.setItem('auth_token', res.access_token)
        localStorage.setItem('refresh_token', res.refresh_token)
        try { await authService.me() } catch {}
        try { window.dispatchEvent(new Event('auth-changed')) } catch {}
        msgApi.success('登录成功')
        nav('/analysis', { replace: true })
      } catch (e: any) {
        msgApi.error(e?.message ?? '登录失败')
      }
    }
    void run()
  }, [])
  return (
    <Card>
      <Typography.Text>登录处理中...</Typography.Text>
      {contextHolder}
      {debug && (
        <div style={{ marginTop: 16 }}>
          <Typography.Title level={5}>企业微信登录调试信息（仅临时排查用）</Typography.Title>
          <Typography.Paragraph type="secondary">
            code: {debug.code}
            <br />
            state: {debug.state}
          </Typography.Paragraph>
          <pre style={{ maxHeight: 260, overflow: 'auto', background: '#f5f5f5', padding: 8, borderRadius: 4 }}>
            {JSON.stringify(debug.raw, null, 2)}
          </pre>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
            如需重新尝试登录，可返回登录页后再扫码。
          </Typography.Paragraph>
        </div>
      )}
    </Card>
  )
}

export default LoginCallbackPage
