import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchAll, supabase } from '../lib/supabase'
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
      fetchAll(() =>
        supabase
          .from('workers')
          .select('id,worker_code,name,age,status,published_at,photo_url,cv_url,country_id,publish_count,worker_professions(profession_id,cv_url)')
          .order('created_at', { ascending: false }),
      ).catch(() => []),
      supabase.from('professions').select('*').order('sort'),
      supabase.from('countries').select('*').order('sort'),
    ])
    setRows(w)
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

  // Excel: sheet 1 = full profiles (of the workers currently shown by the filters), sheet 2 = activity log
  const [exporting, setExporting] = useState(false)
  const exportExcel = async () => {
    setExporting(true)
    try {
      const ids = filtered.map((w) => w.id)
      const idSet = new Set(ids)
      const [allWorkers, allLogs, XLSX] = await Promise.all([
        fetchAll(() => supabase.from('workers').select('*, worker_professions(profession_id,cv_url)').order('created_at')),
        fetchAll(() => supabase.from('worker_status_log').select('*').order('at', { ascending: true })),
        import('xlsx'),
      ])
      const full = { data: allWorkers.filter((w) => idSet.has(w.id)) }
      const logs = { data: allLogs.filter((l) => idSet.has(l.worker_id)) }
      const byWorker = {}
      for (const l of logs.data || []) (byWorker[l.worker_id] = byWorker[l.worker_id] || []).push(l)
      const lastBy = (wid, actions) => [...(byWorker[wid] || [])].reverse().find((l) => actions.includes(l.action))
      const d = (v) => (v ? fmtDate(v, lang) : '')
      const order = Object.fromEntries(ids.map((id, i) => [id, i]))
      const workers = (full.data || []).sort((a, b) => order[a.id] - order[b.id])

      const H = [
        t('worker_id'), t('name'), t('age'), t('country'), t('professions'), t('status'),
        t('published_at'), t('first_published_at'), t('retired_at'), t('publish_count'),
        t('last_published_by'), t('last_retired_by'),
        t('created_at'), t('created_by'), t('updated_at'), t('updated_by'),
        t('photo'), t('default_cv'), t('cv_per_profession'), t('internal_notes'), t('activity_count'),
      ]
      const rowsOut = workers.map((w) => {
        const co = countryById[w.country_id]
        const wps = w.worker_professions || []
        const pub = lastBy(w.id, ['published', 'republished'])
        const ret = lastBy(w.id, ['retired'])
        return [
          w.worker_code, w.name, w.age ?? '', co ? pick(co, 'name') : '',
          wps.map((x) => pick(profById[x.profession_id], 'name')).filter(Boolean).join(' / '),
          t(`status_${w.status}`),
          d(w.published_at), d(w.first_published_at), d(w.retired_at), w.publish_count,
          pub ? `${pub.by_username || ''} — ${d(pub.at)}` : '',
          ret ? `${ret.by_username || ''} — ${d(ret.at)}` : '',
          d(w.created_at), w.created_by_name || '', d(w.updated_at), w.updated_by_name || '',
          w.photo_url || '', w.cv_url || '',
          wps.filter((x) => x.cv_url).map((x) => `${pick(profById[x.profession_id], 'name')}: ${x.cv_url}`).join('\n'),
          w.notes || '', (byWorker[w.id] || []).length,
        ]
      })
      const codeOf = Object.fromEntries(workers.map((w) => [w.id, [w.worker_code, w.name]]))
      const H2 = [t('date'), t('worker_id'), t('name'), t('action'), t('details'), t('by_user')]
      const logRows = (logs.data || []).map((l) => [d(l.at), codeOf[l.worker_id]?.[0] || '', codeOf[l.worker_id]?.[1] || '', t(`log_${l.action}`), l.details || '', l.by_username || ''])

      const wb = XLSX.utils.book_new()
      if (lang === 'ar') wb.Workbook = { Views: [{ RTL: true }] }
      const s1 = XLSX.utils.aoa_to_sheet([H, ...rowsOut])
      s1['!cols'] = H.map(() => ({ wch: 22 }))
      const s2 = XLSX.utils.aoa_to_sheet([H2, ...logRows])
      s2['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 60 }, { wch: 22 }]
      XLSX.utils.book_append_sheet(wb, s1, lang === 'ar' ? 'العمالة' : 'Workers')
      XLSX.utils.book_append_sheet(wb, s2, lang === 'ar' ? 'سجل النشاط' : 'Activity log')
      XLSX.writeFile(wb, `workers-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setExporting(false)
    }
  }

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
        <button type="button" className="btn btn-outline" disabled={exporting || !filtered.length} onClick={exportExcel} title={t('export_workers_hint')}>
          <Icon name="download" size={18} />{exporting ? t('please_wait') : t('export_excel')}
        </button>
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
