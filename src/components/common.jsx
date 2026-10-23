import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { flagUrl } from '../lib/countries'
import { supabase } from '../lib/supabase'
import { PREVIEW_FEATURES } from '../lib/defaults'

/** Link that works for internal pages (/workers), anchors (/#contact) and external URLs */
export function SmartLink({ to, className, children, onClick, ...rest }) {
  const href = to || '/'
  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    const ext = /^https?:/i.test(href)
    return (
      <a href={href} className={className} onClick={onClick} target={ext ? '_blank' : undefined} rel={ext ? 'noopener noreferrer' : undefined} {...rest}>
        {children}
      </a>
    )
  }
  const handle = (e) => {
    onClick?.(e)
    const hash = href.includes('#') ? href.split('#')[1] : ''
    const path = href.split('#')[0] || '/'
    if (hash && window.location.pathname === path) {
      // same page: Router won't re-trigger, so scroll ourselves
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 30)
    }
  }
  return (
    <Link to={href} className={className} onClick={handle} {...rest}>
      {children}
    </Link>
  )
}

export function Flag({ code, size = 'md' }) {
  if (!code) return null
  const w = size === 'lg' ? 160 : 80
  return <img className={`flag flag-${size}`} src={flagUrl(code, w)} alt="" loading="lazy" width={size === 'lg' ? 56 : 28} height={size === 'lg' ? 40 : 20} />
}

export function Spinner({ full }) {
  return (
    <div className={full ? 'spinner-wrap full' : 'spinner-wrap'}>
      <div className="spinner" />
    </div>
  )
}

export function usePageTitle(title) {
  useEffect(() => {
    if (title) document.title = title
  }, [title])
}

/** Home page lists: 'why' cards / 'service' steps */
export function useFeatures(grp) {
  const [rows, setRows] = useState(supabase ? [] : PREVIEW_FEATURES[grp] || [])
  useEffect(() => {
    if (!supabase) return
    supabase
      .from('features')
      .select('*')
      .eq('grp', grp)
      .eq('active', true)
      .order('sort')
      .then(({ data }) => setRows(data || []))
  }, [grp])
  return rows
}

/** Convert Arabic-Indic / Persian digits to Latin digits */
export function latinDigits(s) {
  return String(s ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
}
