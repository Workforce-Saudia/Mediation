import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)
export const supabase = isConfigured ? createClient(url, key) : null

export const USERNAME_DOMAIN = import.meta.env.VITE_USERNAME_DOMAIN || 'staff.wfs.local'

/** Staff log in with a username; Supabase Auth needs an email, so we map it. */
export function usernameToEmail(input) {
  const v = String(input || '').trim().toLowerCase()
  return v.includes('@') ? v : `${v}@${USERNAME_DOMAIN}`
}

/** Upload a file to the public "media" bucket and return its public URL. */
export async function uploadFile(file, folder = 'misc', accept) {
  if (!supabase) throw new Error('Supabase is not configured')
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  if (accept && !accept.includes(ext)) {
    const err = new Error('invalid_type')
    err.code = 'invalid_type'
    throw err
  }
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('media').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}
