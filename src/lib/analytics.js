// Campaign tracking helpers: UTM capture (saved with every form entry) + GTM dataLayer events.

const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ttclid', 'sccid']

export function captureUtm() {
  try {
    const p = new URLSearchParams(window.location.search)
    const found = {}
    for (const k of KEYS) {
      const v = p.get(k)
      if (v) found[k] = v.slice(0, 200)
    }
    if (Object.keys(found).length) {
      found.landing_page = window.location.pathname
      found.captured_at = new Date().toISOString()
      localStorage.setItem('wfs_utm', JSON.stringify(found))
    }
  } catch { /* ignore */ }
}

export function getUtm() {
  try {
    return JSON.parse(localStorage.getItem('wfs_utm') || 'null')
  } catch {
    return null
  }
}

export function track(event, params = {}) {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...params })
}

let gtmLoaded = false
export function injectGtm(id) {
  if (gtmLoaded || !id || !/^GTM-[A-Z0-9]+$/i.test(id.trim())) return
  gtmLoaded = true
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const s = document.createElement('script')
  s.async = true
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id.trim())}`
  document.head.appendChild(s)
}
