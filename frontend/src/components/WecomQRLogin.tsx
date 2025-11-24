import { useEffect, useRef } from 'react'
import { loadWecomScript } from '../utils/loadWecomScript'

type Props = {
  appid: string
  agentid: string
  redirectUri: string
  state: string
  href?: string
  onReady?: () => void
  onError?: (err: unknown) => void
}

export default function WecomQRLogin({ appid, agentid, redirectUri, state, href = '', onReady, onError }: Props) {
  const containerId = useRef(`wecom-qr-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let cancelled = false
    loadWecomScript()
      .then(() => {
        if (cancelled) return
        const WwLogin = (window as any).WwLogin
        if (typeof WwLogin !== 'function') throw new Error('WwLogin not available')
        WwLogin({ id: containerId.current, appid, agentid, redirect_uri: redirectUri, state, href })
        onReady?.()
      })
      .catch((e) => onError?.(e))
    return () => {
      cancelled = true
    }
  }, [appid, agentid, redirectUri, state, href, onReady, onError])

  return <div id={containerId.current} style={{ width: 220, height: 220, display: 'inline-block' }} />
}

