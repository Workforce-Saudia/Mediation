import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useLang } from '../lib/i18n'
import { useContent } from '../lib/content'
import { captureUtm, injectGtm } from '../lib/analytics'
import { isConfigured } from '../lib/supabase'
import Icon from './Icon'
import LogoMark from './LogoMark'
import { SmartLink, Spinner } from './common'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  const prev = useRef(pathname)
  useEffect(() => {
    const was = prev.current
    prev.current = pathname
    if (hash) {
      const tm = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 150)
      return () => clearTimeout(tm)
    }
    // keep scroll position while switching profession/country tabs
    if (was.startsWith('/workers') && pathname.startsWith('/workers')) return undefined
    window.scrollTo(0, 0)
    return undefined
  }, [pathname, hash])
  return null
}

function Header() {
  const { t, lang, toggle } = useLang()
  const { c } = useContent()
  const [open, setOpen] = useState(false)
  const loc = useLocation()

  useEffect(() => setOpen(false), [loc.pathname, loc.hash])

  const links = [
    ['/', t('nav_home')],
    ['/workers', t('nav_workers')],
    ['/faq', t('nav_faq')],
    ['/#contact', t('nav_contact')],
  ]
  const isActive = (to) => (to === '/' ? loc.pathname === '/' && !loc.hash : !to.includes('#') && loc.pathname.startsWith(to))
  const logo = c('logo')

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label={c('site_name')}>
          {logo ? (
            <img src={logo} alt={c('site_name')} />
          ) : (
            <>
              <LogoMark size={46} />
              <span className="brand-text">{c('site_name')}</span>
            </>
          )}
        </Link>
        <nav className={`main-nav ${open ? 'open' : ''}`}>
          {links.map(([to, label]) => (
            <SmartLink key={to} to={to} className={`nav-link ${isActive(to) ? 'active' : ''}`}>
              {label}
            </SmartLink>
          ))}
          <SmartLink to={c('header_cta_link')} className="btn btn-primary btn-sm nav-cta">
            {c('header_cta_text')}
          </SmartLink>
        </nav>
        <div className="header-tools">
          <button type="button" className="lang-btn" onClick={toggle}>
            <Icon name="globe" size={18} />
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
          <button type="button" className="menu-btn" onClick={() => setOpen((o) => !o)} aria-label={t('menu')} aria-expanded={open}>
            <Icon name={open ? 'x' : 'menu'} size={24} />
          </button>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  const { t } = useLang()
  const { c } = useContent()
  const phone = c('phone')
  const email = c('email')
  const wa = (c('whatsapp_number') || '').replace(/\D/g, '')
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">
            {c('logo_light') ? (
              <img src={c('logo_light')} alt={c('site_name')} className="footer-logo" />
            ) : c('logo') ? (
              <img src={c('logo')} alt={c('site_name')} className="footer-logo logo-white" />
            ) : (
              <>
                <LogoMark size={44} color="#ffffff" />
                <span>{c('site_name')}</span>
              </>
            )}
          </div>
          <p>{c('footer_about')}</p>
          {c('cr_number') && (
            <p className="footer-muted">
              {t('cr_label')}: <span dir="ltr">{c('cr_number')}</span>
            </p>
          )}
        </div>
        <div>
          <h4>{t('quick_links')}</h4>
          <ul>
            <li><Link to="/">{t('nav_home')}</Link></li>
            <li><Link to="/workers">{t('nav_workers')}</Link></li>
            <li><Link to="/faq">{t('nav_faq')}</Link></li>
            <li><Link to="/contact">{t('nav_contact')}</Link></li>
            <li><Link to="/terms">{c('terms_title')}</Link></li>
          </ul>
        </div>
        <div>
          <h4>{t('contact_info')}</h4>
          <ul className="footer-contact">
            {phone && (
              <li><Icon name="phone" size={16} /><a href={`tel:${phone}`} dir="ltr">{phone}</a></li>
            )}
            {email && (
              <li><Icon name="mail" size={16} /><a href={`mailto:${email}`}>{email}</a></li>
            )}
            {wa && (
              <li><Icon name="phone" size={16} /><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
            )}
          </ul>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {c('site_name')} — {t('rights')}</span>
        <Link to="/terms">{c('terms_title')}</Link>
      </div>
    </footer>
  )
}

export default function PublicLayout() {
  const { c, loaded } = useContent()
  const { lang } = useLang()

  useEffect(() => {
    captureUtm()
  }, [])

  const gtm = c('gtm_id')
  useEffect(() => {
    if (loaded && gtm) injectGtm(gtm)
  }, [loaded, gtm])

  const desc = c('seo_description')
  useEffect(() => {
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
  }, [desc, lang])

  if (!loaded) return <Spinner full />

  return (
    <div className="site">
      {!isConfigured && <div className="preview-bar">Preview mode — connect Supabase (see README) to enable workers, forms and the dashboard.</div>}
      <ScrollManager />
      <Header />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
