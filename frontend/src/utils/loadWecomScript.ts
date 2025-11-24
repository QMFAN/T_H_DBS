let loadingPromise: Promise<void> | null = null

export function loadWecomScript(): Promise<void> {
  if ((window as any).WwLogin) return Promise.resolve()
  if (loadingPromise) return loadingPromise
  loadingPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://open.work.weixin.qq.com/wwopen/js/js_sdk.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('WwLogin script load failed'))
    document.body.appendChild(s)
  })
  return loadingPromise
}

