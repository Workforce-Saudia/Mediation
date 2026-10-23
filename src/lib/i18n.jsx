import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { STRINGS } from './strings'

const LangContext = createContext(null)

function initialLang() {
  try {
    const p = new URLSearchParams(window.location.search).get('lang')
    if (p === 'ar' || p === 'en') {
      localStorage.setItem('wfs_lang', p)
      return p
    }
  } catch { /* ignore */ }
  try {
    const s = localStorage.getItem('wfs_lang')
    if (s === 'ar' || s === 'en') return s
  } catch { /* ignore */ }
  return 'ar' // Arabic is the main language
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  const setLang = useCallback((l) => {
    setLangState(l)
    try { localStorage.setItem('wfs_lang', l) } catch { /* ignore */ }
  }, [])

  const value = useMemo(() => {
    /** UI string: t('key', {n: 3}) */
    const t = (key, vars) => {
      const entry = STRINGS[key]
      let s = entry ? (lang === 'ar' ? entry[0] : entry[1]) : key
      if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]))
      return s
    }
    /** Pick a bilingual DB column: pick(row, 'name') → row.name_ar / row.name_en */
    const pick = (obj, base) => {
      if (!obj) return ''
      return obj[`${base}_${lang}`] || obj[`${base}_ar`] || obj[`${base}_en`] || ''
    }
    return {
      lang,
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      setLang,
      toggle: () => setLang(lang === 'ar' ? 'en' : 'ar'),
      t,
      pick,
    }
  }, [lang, setLang])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export const useLang = () => useContext(LangContext)

/** Date/time in Saudi time, Latin digits */
export function fmtDate(value, lang = 'ar', withTime = true) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric', month: 'short', day: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    })
  } catch {
    return String(value)
  }
}
