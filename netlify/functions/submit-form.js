// Public form submissions. Browsers cannot write to the database directly;
// every entry passes through here:
//   1. Cloudflare Turnstile bot check (when TURNSTILE_SECRET_KEY is set)
//   2. Server-side validation against the form's field definitions
//   3. Rate limits (per visitor IP and duplicate phone numbers)
//   4. Insert with the service key (the database trigger then fires webhooks)
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const MAX_BODY = 20000 // bytes
const MAX_VALUE = 2000 // characters per field
const PER_IP_PER_HOUR = 8
const EXTRA_KEYS = ['worker_name', 'worker_country', 'profession'] // added by the booking page

const latin = (s) =>
  String(s ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))

async function verifyTurnstile(secret, token, ip) {
  if (!token) return false
  const form = new URLSearchParams({ secret, response: token })
  if (ip) form.set('remoteip', ip)
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
    const out = await r.json()
    return out.success === true
  } catch {
    return false
  }
}

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return json(500, { error: 'server_not_configured' })

  const raw = await req.text()
  if (raw.length > MAX_BODY) return json(413, { error: 'too_large' })
  let body
  try {
    body = JSON.parse(raw)
  } catch {
    return json(400, { error: 'bad_request' })
  }

  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || ''

  // 1) bot check
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
  if (turnstileSecret && !(await verifyTurnstile(turnstileSecret, body.token, ip))) {
    return json(403, { error: 'captcha_failed' })
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const slug = String(body.form_slug || '')
  const { data: form } = await db.from('forms').select('*').eq('slug', slug).eq('active', true).maybeSingle()
  if (!form) return json(404, { error: 'form_unavailable' })
  const { data: fields } = await db.from('form_fields').select('*').eq('form_slug', slug).eq('active', true).order('sort')

  // 2) validation
  const input = body.data && typeof body.data === 'object' ? body.data : {}
  const data = {}
  const errors = {}
  for (const f of fields || []) {
    let v = input[f.name]
    if (f.type === 'checkbox') v = v === true
    else if (v == null) v = ''
    else v = String(v).trim().slice(0, MAX_VALUE)
    if (typeof v === 'string' && (['tel', 'number'].includes(f.type) || /id|number|phone/.test(f.name))) v = latin(v)
    const empty = v === '' || v === false
    if (f.required && empty) {
      errors[f.name] = 'required'
      continue
    }
    if (!empty && typeof v === 'string') {
      if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[f.name] = 'format'
      if (f.pattern) {
        try {
          if (!new RegExp(`^(?:${f.pattern})$`).test(v.replace(/\s+/g, ''))) errors[f.name] = 'format'
        } catch { /* bad regex in settings: skip */ }
      }
      if (['select', 'radio'].includes(f.type) && Array.isArray(f.options) && f.options.length && !f.options.some((o) => o.value === v)) {
        errors[f.name] = 'format'
      }
    }
    data[f.name] = v
  }
  if (form.require_terms && input.terms_accepted !== true) errors._terms = 'required'
  if (form.require_privacy && input.privacy_accepted !== true) errors._privacy = 'required'
  if (Object.keys(errors).length) return json(422, { error: 'invalid', fields: errors })
  if (form.require_terms) data.terms_accepted = true
  if (form.require_privacy) data.privacy_accepted = true
  for (const k of EXTRA_KEYS) if (input[k] != null) data[k] = String(input[k]).slice(0, 200)

  // 3) rate limits
  const ipHash = ip ? createHash('sha256').update(`${ip}|${serviceKey.slice(-16)}`).digest('hex').slice(0, 32) : null
  const hourAgo = new Date(Date.now() - 3600_000).toISOString()
  if (ipHash) {
    const { count } = await db.from('submissions').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', hourAgo)
    if ((count || 0) >= PER_IP_PER_HOUR) return json(429, { error: 'too_many' })
  }
  if (data.phone) {
    // same phone, same form, same worker within 10 minutes = double click → accept silently, store once
    const tenMin = new Date(Date.now() - 600_000).toISOString()
    let q = db.from('submissions').select('id', { count: 'exact', head: true }).eq('form_slug', slug).eq('data->>phone', data.phone).gte('created_at', tenMin)
    if (data.worker_code) q = q.eq('data->>worker_code', data.worker_code)
    const { count } = await q
    if (count) return json(200, { ok: true, duplicate: true })
  }

  // worker must exist and be published
  let workerId = null
  if (body.worker_id) {
    const { data: w } = await db.from('workers').select('id').eq('id', body.worker_id).eq('status', 'published').maybeSingle()
    workerId = w?.id || null
  }

  // 4) save
  const utm = body.utm && typeof body.utm === 'object' ? Object.fromEntries(Object.entries(body.utm).slice(0, 15).map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 200)])) : null
  const { error } = await db.from('submissions').insert({
    form_slug: slug,
    data,
    worker_id: workerId,
    lang: body.lang === 'en' ? 'en' : 'ar',
    page_url: String(body.page_url || '').slice(0, 500),
    utm,
    ip_hash: ipHash,
  })
  if (error) return json(500, { error: 'save_failed' })
  return json(200, { ok: true })
}
