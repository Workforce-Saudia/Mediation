import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import { useContent } from '../lib/content'
import { toast } from '../lib/toast'
import { CONTENT_DEFAULTS, CONTENT_GROUPS, SINGLE_KINDS } from '../lib/defaults'
import { trimLogo } from '../lib/imageTrim'
import Icon from '../components/Icon'
import { Spinner } from '../components/common'
import { BiField, LinkPicker, PageHeader, Uploader } from './ui'

export default function ContentAdmin() {
  const { t, lang } = useLang()
  const { session } = useAuth()
  const { reload } = useContent()
  const [group, setGroup] = useState('hero')
  const [vals, setVals] = useState(null)
  const [saved, setSaved] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('site_content').select('*').then(({ data }) => {
      const rows = Object.fromEntries((data || []).map((r) => [r.key, r]))
      const v = {}
      for (const d of CONTENT_DEFAULTS) {
        const r = rows[d.key]
        v[d.key] = SINGLE_KINDS.includes(d.kind)
          ? { value_ar: r ? r.value_ar ?? '' : d.value ?? '', value_en: null }
          : { value_ar: r ? r.value_ar ?? '' : d.ar ?? '', value_en: r ? r.value_en ?? '' : d.en ?? '' }
      }
      setVals(v)
      setSaved(v)
    })
  }, [])

  const entries = useMemo(() => CONTENT_DEFAULTS.filter((d) => d.group === group), [group])
  if (!vals) return <Spinner />

  const dirtyKeys = entries.filter((d) => JSON.stringify(vals[d.key]) !== JSON.stringify(saved[d.key])).map((d) => d.key)
  const anyDirty = CONTENT_DEFAULTS.some((d) => JSON.stringify(vals[d.key]) !== JSON.stringify(saved[d.key]))
  const setKey = (key, patch) => setVals((s) => ({ ...s, [key]: { ...s[key], ...patch } }))
  const groupMeta = CONTENT_GROUPS.find((g) => g.id === group)

  const save = async () => {
    const keys = CONTENT_DEFAULTS.filter((d) => JSON.stringify(vals[d.key]) !== JSON.stringify(saved[d.key])).map((d) => d.key)
    if (!keys.length) return
    setSaving(true)
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('site_content')
      .upsert(keys.map((k) => ({ key: k, value_ar: vals[k].value_ar, value_en: vals[k].value_en, updated_at: now, updated_by: session.user.id })))
    setSaving(false)
    if (error) return toast(error.message, 'error')
    setSaved(vals)
    reload()
    toast(t('saved'))
  }

  const resetDefault = (d) => {
    if (SINGLE_KINDS.includes(d.kind)) setKey(d.key, { value_ar: d.value ?? '' })
    else setKey(d.key, { value_ar: d.ar ?? '', value_en: d.en ?? '' })
  }

  return (
    <>
      <PageHeader title={t('site_content')} sub={t('content_sub')}>
        <a href={groupMeta?.preview || '/'} target="_blank" rel="noopener" className="btn btn-ghost"><Icon name="eye" size={18} />{t('preview')}</a>
        <button type="button" className="btn btn-primary" disabled={!anyDirty || saving} onClick={save}>{saving ? t('saving') : t('save_changes')}</button>
      </PageHeader>

      <div className="content-layout">
        <nav className="group-nav card">
          {CONTENT_GROUPS.map((g) => {
            const dirty = CONTENT_DEFAULTS.some((d) => d.group === g.id && JSON.stringify(vals[d.key]) !== JSON.stringify(saved[d.key]))
            return (
              <button type="button" key={g.id} className={`group-btn ${group === g.id ? 'on' : ''}`} onClick={() => setGroup(g.id)}>
                {g[lang]}
                {dirty && <span className="dirty-dot" />}
              </button>
            )
          })}
        </nav>
        <div className="card">
          <h2 className="card-title">{groupMeta?.[lang]}</h2>
          {entries.map((d) => {
            const v = vals[d.key]
            const label = d.label[lang === 'ar' ? 0 : 1]
            const isDirty = dirtyKeys.includes(d.key)
            return (
              <div key={d.key} className={`content-entry ${isDirty ? 'dirty' : ''}`}>
                {d.kind === 'text' && <BiField label={label} obj={v} base="value" set={(p) => setKey(d.key, p)} />}
                {d.kind === 'textarea' && (
                  <BiField label={label} obj={v} base="value" set={(p) => setKey(d.key, p)} textarea rows={d.key === 'terms_body' ? 14 : 4} hint={t('formatting_hint')} />
                )}
                {d.kind === 'image' && (
                  <div className="field">
                    <label className="lbl">{label}</label>
                    <Uploader
                      value={v.value_ar}
                      onChange={(url) => setKey(d.key, { value_ar: url })}
                      accept={['png', 'jpg', 'jpeg', 'webp', 'svg']}
                      folder="site"
                      transform={d.key.startsWith('logo') ? trimLogo : undefined}
                    />
                  </div>
                )}
                {d.kind === 'link' && (
                  <div className="field">
                    <label className="lbl">{label}</label>
                    <LinkPicker value={v.value_ar} onChange={(val) => setKey(d.key, { value_ar: val })} />
                  </div>
                )}
                {d.kind === 'setting' && (
                  <div className="field">
                    <label className="lbl">{label}</label>
                    <input className="input" dir="ltr" value={v.value_ar ?? ''} onChange={(e) => setKey(d.key, { value_ar: e.target.value })} />
                  </div>
                )}
                <button type="button" className="reset-link" onClick={() => resetDefault(d)}>{t('reset_default')}</button>
              </div>
            )
          })}
          <div className="form-actions">
            <button type="button" className="btn btn-primary" disabled={!anyDirty || saving} onClick={save}>{saving ? t('saving') : t('save_changes')}</button>
          </div>
        </div>
      </div>
    </>
  )
}
