import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { toast } from '../lib/toast'
import { COMMON_COUNTRIES, ICON_CHOICES } from '../lib/countries'
import Icon from '../components/Icon'
import { Flag, Spinner } from '../components/common'
import { PageHeader, Toggle } from './ui'

function slugify(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function ProfessionRow({ row, onSaved, onDeleted }) {
  const { t } = useLang()
  const [r, setR] = useState(row)
  const dirty = JSON.stringify(r) !== JSON.stringify(row)
  const set = (p) => setR((s) => ({ ...s, ...p }))
  const save = async () => {
    const payload = { slug: slugify(r.slug || r.name_en), name_ar: r.name_ar.trim(), name_en: r.name_en.trim(), icon: r.icon, sort: Number(r.sort) || 0, active: r.active }
    if (!payload.slug || !payload.name_ar || !payload.name_en) return toast(t('fill_required'), 'error')
    const q = r.id ? supabase.from('professions').update(payload).eq('id', r.id) : supabase.from('professions').insert(payload)
    const { error } = await q
    if (error) return toast(error.code === '23505' ? t('err_duplicate_slug') : error.message, 'error')
    toast(t('saved'))
    onSaved()
    return undefined
  }
  const del = async () => {
    if (!r.id) return onDeleted()
    if (!window.confirm(t('confirm_delete_profession'))) return undefined
    const { error } = await supabase.from('professions').delete().eq('id', r.id)
    if (error) return toast(error.message, 'error')
    toast(t('deleted'))
    onSaved()
    return undefined
  }
  return (
    <tr>
      <td><select className="input sm icon-select" value={r.icon || 'user'} onChange={(e) => set({ icon: e.target.value })}>{ICON_CHOICES.map((i) => <option key={i} value={i}>{i}</option>)}</select></td>
      <td><span className="icon-preview"><Icon name={r.icon || 'user'} size={18} /></span></td>
      <td><input className="input sm" dir="rtl" value={r.name_ar} onChange={(e) => set({ name_ar: e.target.value })} /></td>
      <td><input className="input sm" dir="ltr" value={r.name_en} onChange={(e) => set({ name_en: e.target.value })} /></td>
      <td><input className="input sm mono" dir="ltr" value={r.slug} placeholder="housemaid" onChange={(e) => set({ slug: e.target.value })} /></td>
      <td><input className="input sm num" type="number" value={r.sort} onChange={(e) => set({ sort: e.target.value })} /></td>
      <td><Toggle checked={r.active} onChange={(v) => set({ active: v })} /></td>
      <td className="nowrap actions">
        <button type="button" className="btn btn-sm btn-primary" disabled={!dirty && r.id} onClick={save}>{t('save')}</button>
        <button type="button" className="btn btn-sm btn-ghost danger" onClick={del} aria-label={t('delete')}><Icon name="trash" size={16} /></button>
      </td>
    </tr>
  )
}

function CountryRow({ row, onSaved, onDeleted }) {
  const { t } = useLang()
  const [r, setR] = useState(row)
  const dirty = JSON.stringify(r) !== JSON.stringify(row)
  const set = (p) => setR((s) => ({ ...s, ...p }))
  const save = async () => {
    const payload = { code: String(r.code || '').toLowerCase().trim(), name_ar: r.name_ar.trim(), name_en: r.name_en.trim(), sort: Number(r.sort) || 0, active: r.active }
    if (!/^[a-z]{2}$/.test(payload.code)) return toast(t('err_country_code'), 'error')
    if (!payload.name_ar || !payload.name_en) return toast(t('fill_required'), 'error')
    const q = r.id ? supabase.from('countries').update(payload).eq('id', r.id) : supabase.from('countries').insert(payload)
    const { error } = await q
    if (error) return toast(error.code === '23505' ? t('err_duplicate_country') : error.message, 'error')
    toast(t('saved'))
    onSaved()
    return undefined
  }
  const del = async () => {
    if (!r.id) return onDeleted()
    if (!window.confirm(t('confirm_delete'))) return undefined
    const { error } = await supabase.from('countries').delete().eq('id', r.id)
    if (error) return toast(error.code === '23503' ? t('err_country_in_use') : error.message, 'error')
    toast(t('deleted'))
    onSaved()
    return undefined
  }
  return (
    <tr>
      <td><Flag code={/^[a-z]{2}$/i.test(r.code || '') ? r.code : ''} /></td>
      <td><input className="input sm mono code-input" dir="ltr" maxLength={2} value={r.code} onChange={(e) => set({ code: e.target.value.toLowerCase() })} /></td>
      <td><input className="input sm" dir="rtl" value={r.name_ar} onChange={(e) => set({ name_ar: e.target.value })} /></td>
      <td><input className="input sm" dir="ltr" value={r.name_en} onChange={(e) => set({ name_en: e.target.value })} /></td>
      <td><input className="input sm num" type="number" value={r.sort} onChange={(e) => set({ sort: e.target.value })} /></td>
      <td><Toggle checked={r.active} onChange={(v) => set({ active: v })} /></td>
      <td className="nowrap actions">
        <button type="button" className="btn btn-sm btn-primary" disabled={!dirty && r.id} onClick={save}>{t('save')}</button>
        <button type="button" className="btn btn-sm btn-ghost danger" onClick={del} aria-label={t('delete')}><Icon name="trash" size={16} /></button>
      </td>
    </tr>
  )
}

export default function CatalogAdmin() {
  const { t, lang } = useLang()
  const [profs, setProfs] = useState(null)
  const [countries, setCountries] = useState(null)
  const [newProf, setNewProf] = useState(null)
  const [newCountries, setNewCountries] = useState([])
  const [version, setVersion] = useState(0)

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('professions').select('*').order('sort'),
      supabase.from('countries').select('*').order('sort'),
    ])
    setProfs(p.data || [])
    setCountries(c.data || [])
    setNewProf(null)
    setNewCountries([])
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (!profs || !countries) return <Spinner />

  const existingCodes = new Set(countries.map((c) => c.code))
  const quickAdd = (code) => {
    const found = COMMON_COUNTRIES.find((x) => x[0] === code)
    if (!found) return
    setNewCountries((s) => [...s, { _k: Math.random(), code: found[0], name_ar: found[1], name_en: found[2], sort: countries.length + s.length + 1, active: true }])
  }

  return (
    <>
      <PageHeader title={t('catalog')} sub={t('catalog_sub')} />

      <div className="card">
        <div className="card-head">
          <h2>{t('professions')}</h2>
          <button type="button" className="btn btn-sm btn-outline" onClick={() => setNewProf({ slug: '', name_ar: '', name_en: '', icon: 'user', sort: profs.length + 1, active: true })} disabled={!!newProf}>
            <Icon name="plus" size={16} />{t('add')}
          </button>
        </div>
        <p className="hint">{t('auto_order_hint')}</p>
        <div className="table-wrap">
          <table className="table compact">
            <thead><tr><th>{t('icon')}</th><th /><th>{t('name_ar')}</th><th>{t('name_en')}</th><th>{t('url_slug')}</th><th>{t('order')}</th><th>{t('active')}</th><th /></tr></thead>
            <tbody>
              {profs.map((p) => <ProfessionRow key={`${p.id}-${version}`} row={p} onSaved={load} />)}
              {newProf && <ProfessionRow key="new" row={newProf} onSaved={load} onDeleted={() => setNewProf(null)} />}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t('countries')}</h2>
          <div className="row-gap">
            <select className="input sm" value="" onChange={(e) => quickAdd(e.target.value)}>
              <option value="">{t('quick_add_country')}</option>
              {COMMON_COUNTRIES.filter((c) => !existingCodes.has(c[0])).map((c) => (
                <option key={c[0]} value={c[0]}>{lang === 'ar' ? c[1] : c[2]}</option>
              ))}
            </select>
            <button type="button" className="btn btn-sm btn-outline" onClick={() => setNewCountries((s) => [...s, { _k: Math.random(), code: '', name_ar: '', name_en: '', sort: countries.length + s.length + 1, active: true }])}>
              <Icon name="plus" size={16} />{t('add')}
            </button>
          </div>
        </div>
        <p className="hint">{t('country_code_hint')}</p>
        <div className="table-wrap">
          <table className="table compact">
            <thead><tr><th /><th>{t('code')}</th><th>{t('name_ar')}</th><th>{t('name_en')}</th><th>{t('order')}</th><th>{t('active')}</th><th /></tr></thead>
            <tbody>
              {countries.map((c) => <CountryRow key={`${c.id}-${version}`} row={c} onSaved={load} />)}
              {newCountries.map((c) => (
                <CountryRow key={c._k} row={c} onSaved={load} onDeleted={() => setNewCountries((s) => s.filter((x) => x._k !== c._k))} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
