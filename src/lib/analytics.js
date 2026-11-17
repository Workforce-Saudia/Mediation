// Campaign tracking helpers: traffic source (saved with every form entry) + GTM dataLayer events.
//
// Attribution works per VISIT (like Google Analytics sessions):
//  - a link with campaign parameters (utm_*, gclid, fbclid…) starts a new record, replacing any older one
//  - a visit without them is recorded from the referrer: (direct), organic search, social or referral
//  - a visit ends when the tab is closed or after 30 minutes without activity,
//    so a campaign link opened earlier never sticks to later visits.

const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ttclid', 'sccid']
const STORE = 'wfs_visit'
const VISIT_TIMEOUT = 30 * 60 * 1000

const SEARCH = /(^|\.)(google|bing|yahoo|duckduckgo|yandex|baidu|ecosia)\./
const SOCIAL = /(^|\.)(facebook|fb|instagram|t\.co|twitter|x\.com|linkedin|lnkd|snapchat|tiktok|youtube|youtu\.be|whatsapp|wa\.me|telegram|t\.me|pinterest|reddit)/

function fromReferrer() {
  let host = ''
  try {
    const ref = document.referrer ? new URL(document.referrer) : null
    if (ref && ref.hostname !== window.location.hostname) host = ref.hostname.replace(/^www\./, '')
  } catch { /* ignore */ }
  if (!host) return { utm_source: '(direct)', utm_medium: '(none)' }
  if (SEARCH.test(host)) return { utm_source: host.split('.')[0], utm_medium: 'organic' }
  if (SOCIAL.test(host)) return { utm_source: host, utm_medium: 'social' }
  return { utm_source: host, utm_medium: 'referral' }
}

function readVisit() {
  try {
    const v = JSON.parse(sessionStorage.getItem(STORE) || 'null')
    if (v && Date.now() - (v.last_seen || 0) < VISIT_TIMEOUT) return v
  } catch { /* ignore */ }
  return null
}

function saveVisit(v) {
  try {
    sessionStorage.setItem(STORE, JSON.stringify({ ...v, last_seen: Date.now() }))
  } catch { /* ignore */ }
}

/** Run once when the site loads */
export function captureUtm() {
  try {
    localStorage.removeItem('wfs_utm') // old version kept campaign values forever — clear them
  } catch { /* ignore */ }
  const p = new URLSearchParams(window.location.search)
  const found = {}
  for (const k of KEYS) {
    const v = p.get(k)
    if (v) found[k] = v.slice(0, 200)
  }
  const stamp = { landing_page: window.location.pathname, captured_at: new Date().toISOString() }
  if (Object.keys(found).length) {
    saveVisit({ ...found, ...stamp }) // new campaign click → new record
  } else {
    const current = readVisit()
    let navType = ''
    try {
      navType = performance.getEntriesByType('navigation')[0]?.type || ''
    } catch { /* ignore */ }
    let internal = false
    try {
      internal = !!document.referrer && new URL(document.referrer).hostname === window.location.hostname
    } catch { /* ignore */ }
    // refresh, back/forward or a link from our own pages = same visit → keep its source;
    // typing/pasting the plain address or arriving from another site = new arrival → re-detect
    if (current && (navType === 'reload' || navType === 'back_forward' || internal)) saveVisit(current)
    else saveVisit({ ...fromReferrer(), ...stamp })
  }
}

/** Source of the current visit, attached to form entries */
export function getUtm() {
  const v = readVisit()
  if (!v) return { ...fromReferrer(), landing_page: window.location.pathname }
  saveVisit(v)
  const { last_seen: _ls, ...out } = v
  return out
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
