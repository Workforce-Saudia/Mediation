// Server-side user management (Admin only).
// Runs on Netlify Functions with the Supabase service-role key, which must NEVER reach the browser.
import { createClient } from '@supabase/supabase-js'

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const USERNAME_RE = /^[a-z0-9._-]{3,32}$/

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' })

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const domain = process.env.VITE_USERNAME_DOMAIN || 'staff.wfs.local'
  if (!url || !serviceKey) return json(500, { error: 'server_not_configured' })

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // 1) who is calling?
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json(401, { error: 'unauthorized' })
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) return json(401, { error: 'unauthorized' })
  const { data: me } = await admin.from('profiles').select('*').eq('id', userData.user.id).maybeSingle()
  if (!me || !me.active || me.role !== 'admin') return json(403, { error: 'forbidden' })
  // admin actions require two-step login (token must be "aal2"; the token was verified by getUser above)
  let aal = 'aal1'
  try {
    aal = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')).aal || 'aal1'
  } catch { /* malformed */ }
  if (aal !== 'aal2') return json(403, { error: 'mfa_required' })

  let body
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'bad_request' })
  }
  const { action } = body

  try {
    switch (action) {
      case 'list': {
        const { data: profiles, error } = await admin.from('profiles').select('*').order('created_at')
        if (error) throw error
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
        const byId = Object.fromEntries((list?.users || []).map((u) => [u.id, u]))
        return json(200, {
          users: profiles.map((p) => ({
            ...p,
            last_sign_in_at: byId[p.id]?.last_sign_in_at || null,
            mfa: (byId[p.id]?.factors || []).some((f) => f.status === 'verified'),
          })),
        })
      }

      case 'create': {
        const username = String(body.username || '').trim().toLowerCase()
        const password = String(body.password || '')
        const role = body.role === 'admin' ? 'admin' : 'agent'
        const fullName = String(body.full_name || '').trim().slice(0, 100)
        const employeeId = String(body.employee_id || '').trim().slice(0, 40) || null
        if (!USERNAME_RE.test(username)) return json(400, { error: 'invalid_username' })
        if (password.length < 8) return json(400, { error: 'weak_password' })
        const { data: exists } = await admin.from('profiles').select('id').eq('username', username).maybeSingle()
        if (exists) return json(409, { error: 'username_taken' })
        if (employeeId) {
          const { data: idTaken } = await admin.from('profiles').select('id').eq('employee_id', employeeId).maybeSingle()
          if (idTaken) return json(409, { error: 'employee_id_taken' })
        }
        const { data, error } = await admin.auth.admin.createUser({
          email: `${username}@${domain}`,
          password,
          email_confirm: true,
          app_metadata: { created_by_admin: true, role, username, full_name: fullName, employee_id: employeeId },
        })
        if (error) throw error
        // make sure the profile matches (trigger creates it)
        await admin
          .from('profiles')
          .update({ role, full_name: fullName || null, employee_id: employeeId, active: true, username })
          .eq('id', data.user.id)
        return json(200, { ok: true, id: data.user.id })
      }

      case 'update_profile': {
        const fullName = String(body.full_name || '').trim().slice(0, 100) || null
        const employeeId = String(body.employee_id || '').trim().slice(0, 40) || null
        if (employeeId) {
          const { data: idTaken } = await admin.from('profiles').select('id').eq('employee_id', employeeId).neq('id', body.id).maybeSingle()
          if (idTaken) return json(409, { error: 'employee_id_taken' })
        }
        const { error } = await admin.from('profiles').update({ full_name: fullName, employee_id: employeeId }).eq('id', body.id)
        if (error) throw error
        return json(200, { ok: true })
      }

      case 'set_password': {
        const password = String(body.password || '')
        if (password.length < 8) return json(400, { error: 'weak_password' })
        const { error } = await admin.auth.admin.updateUserById(body.id, { password })
        if (error) throw error
        return json(200, { ok: true })
      }

      case 'set_active': {
        const active = Boolean(body.active)
        if (body.id === me.id && !active) return json(400, { error: 'cannot_deactivate_self' })
        // banning blocks login and token refresh immediately; profile.active blocks database access
        const { error } = await admin.auth.admin.updateUserById(body.id, { ban_duration: active ? 'none' : '876000h' })
        if (error) throw error
        const { error: pErr } = await admin.from('profiles').update({ active }).eq('id', body.id)
        if (pErr) throw pErr
        return json(200, { ok: true })
      }

      case 'reset_mfa': {
        // e.g. the user lost their phone: remove their authenticator so they can set up a new one at next login
        if (body.id === me.id) return json(400, { error: 'cannot_reset_own_mfa' })
        const { data: list, error } = await admin.auth.admin.mfa.listFactors({ userId: body.id })
        if (error) throw error
        for (const f of list?.factors || []) {
          const { error: dErr } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: body.id })
          if (dErr) throw dErr
        }
        return json(200, { ok: true })
      }

      case 'set_role': {
        if (body.id === me.id) return json(400, { error: 'cannot_change_own_role' })
        const role = body.role === 'admin' ? 'admin' : 'agent'
        const { error } = await admin.from('profiles').update({ role }).eq('id', body.id)
        if (error) throw error
        return json(200, { ok: true })
      }

      default:
        return json(400, { error: 'unknown_action' })
    }
  } catch (e) {
    return json(400, { error: e.message || 'error' })
  }
}
