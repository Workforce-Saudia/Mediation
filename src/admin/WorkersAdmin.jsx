import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtDate, useLang } from '../lib/i18n'
import { toast } from '../lib/toast'
import Icon from '../components/Icon'
import { Flag, Spinner } from '../components/common'
import { Empty, PageHeader, StatusBadge } from './ui'

export async function changeWorkerStatus(id, action, t) {
  const { error } = await supabase.rpc('set_worker_status', { p_worker_id: id, p_action: action })
  if (error) {
    toast(error.message, 'error')
    return false
  }
  toast(action === 'publish' ? t('worker_published') : t('worker_retired'))
  return true
}

export default function WorkersAdmin() {
  const { t, pick, lang } = useLang()
  const [sp, setSp] = useSearchParams()
  const [rows, setRows] = useState(null)
  const [professions, setProfessions] = useState([])
  const [countries, setCountries] = useState([])
  const [busy, setBusy] = useState(null)

  const status = sp.get('status') || ''
  const prof = sp.get('profession') || ''
  const country = sp.get('country') || ''
  const q = sp.get('q') || ''
  const setFilter = (k, v) => {
    const next = new URLSearchParams(sp)
    if (v) next.set(k, v)
    else next.delete(k)
    setSp(next, { replace: true })
  }

  const load = useCallback(async () => {
    const [w, p, c] = await Promise.all([
      supabase
        .from('workers')
        .select('id,worker_code,name,age,status,published_at,photo_url,cv_url,country_id,publish_count,worker_professions(profession_id,cv_url)')
        .order('created_at', { ascending: false }),
      supabase.from('professions').select('*').order('sort'),
      supabase.from('countries').select('*').order('sort'),
    ])
    setRows(w.data || [])
    setProfessions(p.data || [])
    setCountries(c.data || [])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const profById = useMemo(() => Object.fromEntries(professions.map((p) => [p.id, p])), [professions])
  const countryById = useMemo(() => Object.fromEntries(countries.map((c) => [c.id, c])), [countries])

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    return rows.filter((w) => {
      if (status && w.status !== status) return false
      if (country && w.country_id !== country) return false
      if (prof && !(w.worker_professions || []).some((x) => x.profession_id === prof)) return false
      if (needle && !`${w.name} ${w.worker_code}`.toLowerCase().includes(needle)) return false
      return true
    })
  }, [rows, status, country, prof, q])

  const act = async (w, action) => {
    if (action === 'publish' && (!w.photo_url || !(w.cv_url || (w.worker_professions || []).some((x) => x.cv_url)))) {
      if (!window.confirm(t('publish_missing_files'))) return
    }
    if (action === 'retire' && !window.confirm(t('confirm_retire'))) return
    setBusy(w.id)
    if (await changeWorkerStatus(w.id, action, t)) await load()
    setBusy(null)
  }

  return (
    <>
      <PageHeader title={t('workers')} sub={t('workers_admin_sub')}>
        <Link to="/admin/workers/new" className="btn btn-primary"><Icon name="plus" size={18} />{t('add_worker')}</Link>
      </PageHeader>

      <div className="card filters">
        <div className="search-input">
          <Icon name="search" size={18} />
          <input className="input" placeholder={t('search_name_id')} value={q} onChange={(e) => setFilter('q', e.target.value)} />
        </div>
        <select className="input" value={status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">{t('all_statuses')}</option>
          <option value="published">{t('status_published')}</option>
          <option value="draft">{t('status_draft')}</option>
          <option value="retired">{t('status_retired')}</option>
        </select>
        <select className="input" value={prof} onChange={(e) => setFilter('profession', e.target.value)}>
          <option value="">{t('all_professions')}</option>
          {professions.map((p) => <option key={p.id} value={p.id}>{pick(p, 'name')}</option>)}
        </select>
        <select className="input" value={country} onChange={(e) => setFilter('country', e.target.value)}>
          <option value="">{t('all_countries')}</option>
          {countries.map((c) => <option key={c.id} value={c.id}>{pick(c, 'name')}</option>)}
        </select>
      </div>

      {rows === null ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty>{t('no_workers')}</Empty>
      ) : (
        <div className="card">
          <div className="muted small mb">{t('showing_n', { n: filtered.length })}</div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th />
                  <th>{t('worker_id')}</th>
                  <th>{t('name')}</th>
                  <th>{t('country')}</th>
                  <th>{t('professions')}</th>
                  <th>{t('status')}</th>
                  <th>{t('published_at')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((w) => {
                  const co = countryById[w.country_id]
                  return (
                    <tr key={w.id}>
                      <td>{w.photo_url ? <img className="thumb" src={w.photo_url} alt="" /> : <span className="thumb thumb-empty"><Icon name="user" size={18} /></span>}</td>
                      <td dir="ltr" className="mono">{w.worker_code}</td>
                      <td><Link to={`/admin/workers/${w.id}`}><b>{w.name}</b></Link>{w.age ? <div className="muted small">{t('age')}: {w.age}</div> : null}</td>
                      <td className="nowrap">{co && <><Flag code={co.code} /> {pick(co, 'name')}</>}</td>
                      <td>{(w.worker_professions || []).map((x) => profById[x.profession_id]).filter(Boolean).map((p) => <span key={p.id} className="tag sm">{pick(p, 'name')}</span>)}</td>
                      <td>
                        <StatusBadge status={w.status} />
                        {w.publish_count > 1 && <div className="muted small">{t('published_times', { n: w.publish_count })}</div>}
                      </td>
                      <td className="nowrap small">{w.status === 'published' ? fmtDate(w.published_at, lang) : '—'}</td>
                      <td className="nowrap actions">
                        {w.status === 'published' ? (
                          <button type="button" className="btn btn-sm btn-warn" disabled={busy === w.id} onClick={() => act(w, 'retire')}>{t('retire')}</button>
                        ) : (
                          <button type="button" className="btn btn-sm btn-success" disabled={busy === w.id} onClick={() => act(w, 'publish')}>{w.status === 'retired' ? t('republish') : t('publish')}</button>
                        )}
                        <Link to={`/admin/workers/${w.id}`} className="btn btn-sm btn-ghost"><Icon name="edit" size={16} /></Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
