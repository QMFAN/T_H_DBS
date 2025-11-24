import { useEffect, useRef } from 'react'
import { loadWecomScript } from '../utils/loadWecomScript'

type Props = {
  appid: string
  agentid: string
  redirectUri: string
  state: string
  href?: string
  qrUrl?: string
  onReady?: () => void
  onError?: (err: unknown) => void
}

export default function WecomQRLogin({ appid, agentid, redirectUri, state, href = '', onReady, onError }: Props) {
  const containerId = useRef(`wecom-qr-${Math.random().toString(36).slice(2)}`)
  const instRef = useRef<any>(null)

  useEffect(() => {
    let cancelled = false
    loadWecomScript()
      .then(() => {
        if (cancelled) return
        const Ctor = (window as any).WwLogin
        if (typeof Ctor !== 'function') throw new Error('WwLogin not available')
        const encoded = encodeURIComponent(redirectUri)
        const el = document.getElementById(containerId.current)
        if (el) { el.innerHTML = '' }
        instRef.current = new Ctor({ id: containerId.current, appid, agentid, redirect_uri: encoded, state, href, lang: 'zh', self_redirect: false })
        onReady?.()
      })
      .catch((e) => onError?.(e))
    return () => {
      cancelled = true
      try { instRef.current?.destroyed?.() } catch {}
      instRef.current = null
    }
  }, [appid, agentid, redirectUri, state, href, onReady, onError])

  return (
    <div id={containerId.current} style={{ width: 300, height: 300, display: 'inline-block' }} />
  )
}
