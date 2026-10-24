import { Suspense, useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/i18n'
import { useContent } from '../lib/content'
import { isConfigured } from '../lib/supabase'
import Icon from '../components/Icon'
import LogoMark from '../components/LogoMark'
import { Spinner } from '../components/common'
import { toast } from '../lib/toast'
import { MfaChallenge, MfaEnroll, useMfaStatus } from './Mfa'

export function SetupNotice() {
  return (
    <div className="center-screen">
      <div className="card narrow-card">
        <h2>Supabase is not connected</h2>
        <p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your environment variables (see README.md), then rebuild.</p>
        <Link to="/" className="btn btn-primary">Home</Link>
      </div>
    </div>
  )
}

/** Wrap admin-only pages: agents see a "no access" message instead */
export function AdminOnly({ children }) {
  const { isAdmin } = useAuth()
  const { t } = useLang()
  if (!isAdmin) return <div className="a-empty"><Icon name="lock" size={28} /><p>{t('no_access')}</p></div>
  return children
}

const IDLE_MINUTES = 30

/** Logs the user out after 30 minutes without any activity (shared across open tabs) */
function IdleLogout({ signOut }) {
  const { t } = useLang()
  useEffect(() => {
    const KEY = 'wfs_last_activity'
    const mark = () => {
      try { localStorage.setItem(KEY, String(Date.now())) } catch { /* ignore */ }
    }
    mark()
    let last = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - last > 15000) { last = now; mark() } // throttle
    }
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    const timer = setInterval(() => {
      let ts = Date.now()
      try { ts = Number(localStorage.getItem(KEY)) || Date.now() } catch { /* ignore */ }
      if (Date.now() - ts > IDLE_MINUTES * 60_000) {
        toast(t('idle_logged_out'), 'error')
        signOut()
      }
    }, 30_000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity))
      clearInterval(timer)
    }
  }, [signOut, t])
  return null
}

/** Two-step login gate: asks for the authenticator code, and forces Admins to set one up */
function MfaGate({ profile, signOut, children }) {
  const mfa = useMfaStatus()
  if (mfa.loading) return <Spinner full />
  const needChallenge = mfa.nextLevel === 'aal2' && mfa.currentLevel !== 'aal2' && mfa.factors.length > 0
  const needEnroll = profile.role === 'admin' && mfa.factors.length === 0
  if (needChallenge || needEnroll) {
    return (
      <div className="center-screen">
        <div className="card narrow-card">
          {needChallenge ? (
            <MfaChallenge factors={mfa.factors} onDone={mfa.refresh} onCancel={signOut} />
          ) : (
            <MfaEnroll mandatory onDone={mfa.refresh} onCancel={signOut} />
          )}
        </div>
      </div>
    )
  }
  return children
}

export default function AdminLayout() {
  const { session, profile, loading, profileLoading, signOut, isAdmin } = useAuth()
  const { t, lang, toggle } = useLang()
  const { c } = useContent()
  const [open, setOpen] = useState(false)
  const loc = useLocation()

  useEffect(() => setOpen(false), [loc.pathname])
  useEffect(() => {
    document.title = `${t('dashboard')} | ${c('site_name')}`
  }, [t, c])

  if (!isConfigured) return <SetupNotice />
  // only block the screen on the first load — never unmount an open page (it would wipe unsaved forms)
  if (loading || (session && profileLoading && !profile)) return <Spinner full />
  if (!session) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />
  if (!profile || !profile.active) {
    return (
      <div className="center-screen">
        <div className="card narrow-card">
          <h2>{t('account_inactive')}</h2>
          <p>{t('account_inactive_desc')}</p>
          <button type="button" className="btn btn-primary" onClick={signOut}>{t('logout')}</button>
        </div>
      </div>
    )
  }

  const items = [
    { to: '/admin', icon: 'layout', label: t('dashboard'), end: true },
    { to: '/admin/workers', icon: 'users', label: t('workers') },
    { to: '/admin/catalog', icon: 'flag', label: t('catalog') },
    { to: '/admin/submissions', icon: 'inbox', label: t('submissions') },
    // admin-only areas (agents cannot edit website content, forms, FAQ, integrations or users)
    ...(isAdmin
      ? [
          { to: '/admin/content', icon: 'edit', label: t('site_content') },
          { to: '/admin/features', icon: 'star', label: t('home_lists') },
          { to: '/admin/faq', icon: 'headset', label: t('faq_admin') },
          { to: '/admin/forms', icon: 'list', label: t('forms') },
          { to: '/admin/webhooks', icon: 'webhook', label: t('webhooks') },
          { to: '/admin/users', icon: 'lock', label: t('users') },
        ]
      : []),
    { to: '/admin/account', icon: 'settings', label: t('my_account') },
  ]

  return (
    <MfaGate profile={profile} signOut={signOut}>
    <IdleLogout signOut={signOut} />
    <div className="admin">
      <aside className={`a-side ${open ? 'open' : ''}`}>
        <div className="a-brand">
          {c('logo_light') || c('logo') ? (
            <div className="a-brand-logo">
              <img src={c('logo_light') || c('logo')} alt={c('site_name')} className={c('logo_light') ? '' : 'logo-white'} />
              <small>{t('dashboard')}</small>
            </div>
          ) : (
            <>
              <span className="a-logo"><LogoMark size={28} color="#ffffff" /></span>
              <div>
                <strong>{c('site_name')}</strong>
                <small>{t('dashboard')}</small>
              </div>
            </>
          )}
        </div>
        <nav>
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `a-link ${isActive ? 'on' : ''}`}>
              <Icon name={i.icon} size={18} />
              {i.label}
            </NavLink>
          ))}
        </nav>
        <a href="/" target="_blank" rel="noopener" className="a-link a-site-link">
          <Icon name="external" size={18} />
          {t('view_site')}
        </a>
      </aside>
      {open && <div className="a-scrim" onClick={() => setOpen(false)} />}
      <div className="a-main">
        <header className="a-top">
          <button type="button" className="icon-btn a-menu" onClick={() => setOpen(true)} aria-label={t('menu')}><Icon name="menu" /></button>
          <div className="a-top-spacer" />
          <button type="button" className="lang-btn" onClick={toggle}><Icon name="globe" size={18} />{lang === 'ar' ? 'EN' : 'عربي'}</button>
          <div className="a-user">
            <span className="a-avatar">{(profile.full_name || profile.username || '?').slice(0, 1).toUpperCase()}</span>
            <div className="a-user-txt">
              <strong>{profile.full_name || profile.username}</strong>
              <small>{t(`role_${profile.role}`)}</small>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={signOut} title={t('logout')} aria-label={t('logout')}><Icon name="logout" /></button>
        </header>
        <div className="a-content">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </div>
    </MfaGate>
  )
}
