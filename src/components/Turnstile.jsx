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
  const token = useRef('')
  const failed = useRef(false) // script blocked or widget error: stop waiting, let the server decide
  const waiters = useRef([])
  const cb = useRef(onToken)
  cb.current = onToken

  const setToken = (t) => {
    token.current = t
    cb.current(t)
    if (t) {
      failed.current = false
      waiters.current.splice(0).forEach((resolve) => resolve(t))
    }
  }
  const fail = () => {
    failed.current = true
    token.current = ''
    cb.current('')
    waiters.current.splice(0).forEach((resolve) => resolve(''))
  }

  useImperativeHandle(ref, () => ({
    /** Fresh token for the next submit (tokens are single-use) */
    reset() {
      token.current = ''
      cb.current('')
      if (widget.current != null && window.turnstile) window.turnstile.reset(widget.current)
    },
    /** Resolves with a token as soon as the check finishes, or '' on failure / timeout */
    waitForToken(timeoutMs = 12000) {
      if (!TURNSTILE_SITE_KEY) return Promise.resolve('')
      if (token.current) return Promise.resolve(token.current)
      try {
        const t = widget.current != null && window.turnstile?.getResponse(widget.current)
        if (t) return Promise.resolve(t)
      } catch { /* ignore */ }
      if (failed.current) return Promise.resolve('')
      return new Promise((resolve) => {
        waiters.current.push(resolve)
        setTimeout(() => {
          waiters.current = waiters.current.filter((w) => w !== resolve)
          resolve(token.current || '')
        }, timeoutMs)
      })
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
          'refresh-expired': 'auto', // tokens expire after 5 minutes: renew silently
          callback: (t) => setToken(t),
          'expired-callback': () => {
            token.current = ''
            cb.current('')
          },
          'error-callback': () => {
            fail()
            return true // handled: Cloudflare keeps retrying in the background
          },
        })
      })
      .catch(() => fail())
    return () => {
      cancelled = true
      if (widget.current != null && window.turnstile) window.turnstile.remove(widget.current)
      widget.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  if (!TURNSTILE_SITE_KEY) return null
  return <div ref={box} className="turnstile-box" />
})

export default Turnstile
