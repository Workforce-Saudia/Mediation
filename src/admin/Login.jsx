import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/i18n'
import { useContent } from '../lib/content'
import { isConfigured } from '../lib/supabase'
import Icon from '../components/Icon'
import LogoMark from '../components/LogoMark'
import { SetupNotice } from './AdminLayout'

export default function Login() {
  const { session, profile, signIn } = useAuth()
  const { t, lang, toggle } = useLang()
  const { c } = useContent()
  const loc = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (!isConfigured) return <SetupNotice />
  if (session && profile?.active) return <Navigate to={loc.state?.from || '/admin'} replace />

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      await signIn(username, password)
    } catch (e2) {
      const m = String(e2.message || '')
      setErr(/banned/i.test(m) ? t('account_inactive') : t('login_failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="card login-card" onSubmit={submit}>
        <button type="button" className="lang-btn login-lang" onClick={toggle}><Icon name="globe" size={16} />{lang === 'ar' ? 'EN' : 'عربي'}</button>
        <div className="login-logo">
          {c('logo_vertical') || c('logo') ? <img src={c('logo_vertical') || c('logo')} alt={c('site_name')} /> : <LogoMark size={110} />}
        </div>
        <h1>{t('login_title')}</h1>
        {!c('logo_vertical') && !c('logo') && <p className="muted">{c('site_name')}</p>}
        <div className="field">
          <label htmlFor="u">{t('username')}</label>
          <input id="u" className="input" dir="ltr" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="p">{t('password')}</label>
          <input id="p" className="input" dir="ltr" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {session && profile && !profile.active && <div className="notice notice-error">{t('account_inactive')}</div>}
        {err && <div className="notice notice-error">{err}</div>}
        <button className="btn btn-primary btn-block btn-lg" disabled={busy}>{busy ? t('please_wait') : t('login')}</button>
      </form>
    </div>
  )
}
