import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase, usernameToEmail } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [profileLoading, setProfileLoading] = useState(false)

  const profileUserId = useRef(null)

  /**
   * quiet = refresh in the background without showing a loading screen.
   * Supabase fires SIGNED_IN again whenever the browser tab regains focus; showing a
   * spinner then would unmount the page and wipe any half-filled form.
   */
  const loadProfile = useCallback(async (user, { quiet = false } = {}) => {
    if (!user) {
      profileUserId.current = null
      setProfile(null)
      return
    }
    if (!quiet) setProfileLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    // a network hiccup during a background refresh must not log the user out of the UI
    if (!error || !quiet) {
      profileUserId.current = data ? user.id : null
      setProfile((prev) => (prev && data && JSON.stringify(prev) === JSON.stringify(data) ? prev : data || null))
    }
    if (!quiet) setProfileLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return undefined
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      await loadProfile(data.session?.user)
      if (mounted) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'SIGNED_OUT') {
        setTimeout(() => loadProfile(null), 0)
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const sameUser = s?.user?.id && s.user.id === profileUserId.current
        // defer: calling supabase inside this callback can dead-lock
        setTimeout(() => loadProfile(s?.user, { quiet: sameUser }), 0)
      }
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (username, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password })
    if (error) throw error
    setProfileLoading(true)
    await loadProfile(data.user)
    return data
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  /** Call the server-side admin function (users management) */
  const callAdmin = useCallback(async (body) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const res = await fetch('/.netlify/functions/admin-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
    let json = {}
    try { json = await res.json() } catch { /* not json */ }
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
    return json
  }, [])

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, profileLoading, signIn, signOut, callAdmin, isAdmin: profile?.role === 'admin' }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
