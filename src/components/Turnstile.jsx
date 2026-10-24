import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

// Cloudflare Turnstile – invisible / one-click bot check for public forms.
// Enabled when VITE_TURNSTILE_SITE_KEY is set (public site key from the Cloudflare dashboard).
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

let scriptPromise = null
function loadScript() {
  if (window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        scriptPromise = null
        reject(new Error('turnstile_load_failed'))
      }
      document.head.appendChild(s)
    })
  }
  return scriptPromise
}

const Turnstile = forwardRef(function Turnstile({ lang, onToken }, ref) {
  const box = useRef(null)
  const widget = useRef(null)
  const cb = useRef(onToken)
  cb.current = onToken

  useImperativeHandle(ref, () => ({
    reset() {
      if (widget.current != null && window.turnstile) window.turnstile.reset(widget.current)
      cb.current('')
    },
  }))

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return undefined
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !box.current) return
        widget.current = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: lang === 'ar' ? 'ar' : 'en',
          theme: 'light',
          appearance: 'interaction-only', // invisible unless Cloudflare needs a click
          callback: (token) => cb.current(token),
          'expired-callback': () => cb.current(''),
          'error-callback': () => cb.current(''),
        })
      })
      .catch(() => cb.current(''))
    return () => {
      cancelled = true
      if (widget.current != null && window.turnstile) window.turnstile.remove(widget.current)
      widget.current = null
    }
  }, [lang])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={box} className="turnstile-box" />
})

export default Turnstile
