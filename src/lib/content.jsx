import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { DEFAULTS_BY_KEY, SINGLE_KINDS } from './defaults'
import { useLang } from './i18n'

const ContentContext = createContext(null)

export function ContentProvider({ children }) {
  const [rows, setRows] = useState({})
  const [loaded, setLoaded] = useState(!supabase)

  const reload = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.from('site_content').select('key,value_ar,value_en')
    const map = {}
    for (const r of data || []) map[r.key] = r
    setRows(map)
    setLoaded(true)
  }, [])

  useEffect(() => {
    reload()
    // never block the page for long if the network is slow
    const timer = setTimeout(() => setLoaded(true), 4000)
    return () => clearTimeout(timer)
  }, [reload])

  return <ContentContext.Provider value={{ rows, loaded, reload }}>{children}</ContentContext.Provider>
}

export function useContent() {
  const { rows, loaded, reload } = useContext(ContentContext)
  const { lang } = useLang()

  const c = useCallback(
    (key) => {
      const def = DEFAULTS_BY_KEY[key]
      const row = rows[key]
      if (def && SINGLE_KINDS.includes(def.kind)) {
        return row && row.value_ar != null ? row.value_ar : def.value ?? ''
      }
      const v = row?.[`value_${lang}`]
      if (v != null && v !== '') return v
      if (row && lang === 'en' && row.value_ar) {
        // English not filled in yet → fall back to the English default, then Arabic
        return def?.en || row.value_ar
      }
      if (row && row.value_ar === '' && row.value_en === '') return '' // intentionally emptied
      return def ? def[lang] ?? def.ar ?? '' : ''
    },
    [rows, lang],
  )

  return { c, loaded, reload, rows }
}
