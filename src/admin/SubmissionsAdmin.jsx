import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtDate, useLang } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import { toast } from '../lib/toast'
import Icon from '../components/Icon'
import { Spinner } from '../components/common'
import { Empty, Modal, PageHeader, StatusBadge } from './ui'

const STATUSES = ['new', 'in_progress', 'done', 'spam']
const EXTRA_LABELS = {
  worker_name: ['اسم العامل', 'Worker name'],
  worker_country: ['جنسية العامل', 'Worker nationality'],
  profession: ['المهنة', 'Profession'],
  terms_accepted: ['الموافقة على الشروط', 'Terms accepted'],
  privacy_accepted: ['الموافقة على سياسة الخصوصية', 'Privacy policy accepted'],
}

export default function SubmissionsAdmin() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { t, pick, lang } = useLang()
  const { isAdmin } = useAuth()
  const [forms, setForms] = useState(null)
  const [fields, setFields] = useState([])
  const [rows, setRows] = useState(null)
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [q, setQ] = useState('')
  const [view, setView] = useState(null)

  useEffect(() => {
    supabase.from('forms').select('*').order('created_at').then(({ data }) => {
      setForms(data || [])
      if (!slug && data?.length) navigate(`/admin/submissions/${data[0].slug}`, { replace: true })
    })
  }, [slug, navigate])

  const load = useCallback(async () => {
    if (!slug) return
    setRows(null)
    let query = supabase.from('submissions').select('*').eq('form_slug', slug).order('created_at', { ascending: false }).limit(5000)
    if (status) query = query.eq('status', status)
    if (from) query = query.gte('created_at', new Date(`${from}T00:00:00+03:00`).toISOString())
    if (to) query = query.lte('created_at', new Date(`${to}T23:59:59+03:00`).toISOString())
    const [s, f] = await Promise.all([query, supabase.from('form_fields').select('*').eq('form_slug', slug).order('sort')])
    setRows(s.data || [])
    setFields(f.data || [])
  }, [slug, status, from, to])

  useEffect(() => {
    load()
  }, [load])

  // columns = form fields (in order) + any extra keys found in the data
  const columns = useMemo(() => {
    const cols = fields.map((f) => ({ key: f.name, label: pick(f, 'label'), field: f }))
    const known = new Set(cols.map((c) => c.key))
    for (const r of rows || []) {
      for (const k of Object.keys(r.data || {})) {
        if (!known.has(k)) {
          known.add(k)
          const ex = EXTRA_LABELS[k]
          cols.push({ key: k, label: ex ? ex[lang === 'ar' ? 0 : 1] : k })
        }
      }
    }
    return cols
  }, [fields, rows, pick, lang])

  const display = useCallback(
    (col, value) => {
      if (value === true) return t('yes')
      if (value === false) return t('no')
      if (value == null || value === '') return ''
      const opts = col.field?.options
      if (Array.isArray(opts) && opts.length) {
        const o = opts.find((x) => x.value === value)
        if (o) return pick(o, 'label')
      }
      return String(value)
    },
    [pick, t],
  )

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => JSON.stringify(r.data).toLowerCase().includes(needle))
  }, [rows, q])

  // the database stamps who/when (trigger), so read the row back after saving
  const patchRow = async (id, patch) => {
    const { data, error } = await supabase.from('submissions').update(patch).eq('id', id).select('*').single()
    if (error) {
      toast(error.message, 'error')
      return null
    }
    setRows((all) => all.map((x) => (x.id === id ? data : x)))
    setView((v) => (v?.id === id ? { ...data, notes: patch.notes !== undefined ? data.notes : v.notes } : v))
    return data
  }

  const setRowStatus = (r, s) => patchRow(r.id, { status: s })

  const saveNotes = async () => {
    if (await patchRow(view.id, { notes: view.notes || null })) toast(t('saved'))
  }

  const del = async (r) => {
    if (!window.confirm(t('confirm_delete_entry'))) return
    const { error } = await supabase.from('submissions').delete().eq('id', r.id)
    if (error) return toast(error.message, 'error')
    setRows((all) => all.filter((x) => x.id !== r.id))
    setView(null)
    return undefined
  }

  const exportExcel = async () => {
    const XLSX = await import('xlsx')
    const header = [t('date'), t('status'), t('status_changed_by'), t('status_changed_at'), ...columns.map((c) => c.label), t('notes'), t('notes_updated_by'), 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid / fbclid', t('page_url')]
    const data = filtered.map((r) => [
      fmtDate(r.created_at, lang),
      t(`status_${r.status}`),
      r.status_updated_by_name || '',
      r.status_updated_at ? fmtDate(r.status_updated_at, lang) : '',
      ...columns.map((c) => display(c, r.data?.[c.key])),
      r.notes || '',
      r.notes_updated_by_name ? `${r.notes_updated_by_name} — ${fmtDate(r.notes_updated_at, lang)}` : '',
      r.utm?.utm_source || '',
      r.utm?.utm_medium || '',
      r.utm?.utm_campaign || '',
      r.utm?.utm_content || '',
      r.utm?.utm_term || '',
      r.utm?.gclid || r.utm?.fbclid || r.utm?.ttclid || '',
      r.page_url || '',
    ])
    const ws = XLSX.utils.aoa_to_sheet([header, ...data])
    ws['!cols'] = header.map(() => ({ wch: 22 }))
    const wb = XLSX.utils.book_new()
    if (lang === 'ar') wb.Workbook = { Views: [{ RTL: true }] }
    XLSX.utils.book_append_sheet(wb, ws, slug.slice(0, 30))
    XLSX.writeFile(wb, `${slug}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  if (!forms) return <Spinner />
  if (!forms.length) return <Empty>{t('nothing_yet')}</Empty>
  const listCols = columns.slice(0, 4)

  return (
    <>
      <PageHeader title={t('submissions')} sub={t('submissions_sub')}>
        <button type="button" className="btn btn-primary" onClick={exportExcel} disabled={!filtered.length}>
          <Icon name="download" size={18} />{t('export_excel')}
        </button>
      </PageHeader>

      <div className="seg">
        {forms.map((f) => (
          <Link key={f.slug} to={`/admin/submissions/${f.slug}`} className={slug === f.slug ? 'on' : ''}>{pick(f, 'name')}</Link>
        ))}
      </div>

      <div className="card filters">
        <div className="search-input">
          <Icon name="search" size={18} />
          <input className="input" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('all_statuses')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
        </select>
        <label className="date-filter"><span>{t('from')}</span><input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="date-filter"><span>{t('to')}</span><input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>

      {rows === null ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <Empty>{t('no_entries')}</Empty>
      ) : (
        <div className="card">
          <div className="muted small mb">{t('showing_n', { n: filtered.length })}</div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('date')}</th>
                  {listCols.map((c) => <th key={c.key}>{c.label}</th>)}
                  <th>{t('source')}</th>
                  <th>{t('status')}</th>
                  <th>{t('notes')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className={r.status === 'new' ? 'row-new' : ''}>
                    <td className="nowrap small">{fmtDate(r.created_at, lang)}</td>
                    {listCols.map((c) => <td key={c.key} dir={/phone|id|number|code/.test(c.key) ? 'ltr' : undefined}>{display(c, r.data?.[c.key]) || '—'}</td>)}
                    <td className="small">{r.utm?.utm_source ? `${r.utm.utm_source}${r.utm.utm_campaign ? ` / ${r.utm.utm_campaign}` : ''}` : '—'}</td>
                    <td>
                      <select className={`input sm status-select s-${r.status}`} value={r.status} onChange={(e) => setRowStatus(r, e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
                      </select>
                      {r.status_updated_at && (
                        <div className="muted tiny nowrap" title={fmtDate(r.status_updated_at, lang)}>
                          {r.status_updated_by_name || '—'} · {fmtDate(r.status_updated_at, lang)}
                        </div>
                      )}
                    </td>
                    <td className="notes-cell" title={r.notes || ''}>
                      {r.notes ? <span className="clamp-2">{r.notes}</span> : <span className="muted">—</span>}
                    </td>
                    <td><button type="button" className="btn btn-sm btn-ghost" onClick={() => setView({ ...r })}><Icon name="eye" size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view && (
        <Modal
          wide
          title={t('entry_details')}
          onClose={() => setView(null)}
          footer={
            <>
              {isAdmin && <button type="button" className="btn btn-ghost danger" onClick={() => del(view)}><Icon name="trash" size={16} />{t('delete')}</button>}
              <span className="flex1" />
              <button type="button" className="btn btn-ghost" onClick={() => setView(null)}>{t('close')}</button>
            </>
          }
        >
          <div className="kv wide">
            <span>{t('date')}</span><b>{fmtDate(view.created_at, lang)}</b>
            {columns.map((c) => (
              <FragmentRow key={c.key} label={c.label} value={display(c, view.data?.[c.key]) || '—'} />
            ))}
            {view.worker_id && <><span>{t('worker')}</span><b><Link to={`/admin/workers/${view.worker_id}`}>{t('open_worker')}</Link></b></>}
            <span>{t('language')}</span><b>{view.lang || '—'}</b>
            <span>{t('page_url')}</span><b className="break" dir="ltr">{view.page_url || '—'}</b>
            {view.utm && Object.entries(view.utm).map(([k, v]) => <FragmentRow key={k} label={k} value={String(v)} ltr />)}
          </div>
          <div className="field mt">
            <label className="lbl">{t('status')}</label>
            <select className="input" value={view.status} onChange={(e) => setRowStatus(view, e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
            </select>
            {view.status_updated_at && (
              <div className="hint">{t('last_status_change')}: <b>{view.status_updated_by_name || '—'}</b> · {fmtDate(view.status_updated_at, lang)}</div>
            )}
          </div>
          <div className="field">
            <label className="lbl">{t('notes')}</label>
            <textarea className="input" rows={3} value={view.notes || ''} onChange={(e) => setView((v) => ({ ...v, notes: e.target.value }))} />
            {view.notes_updated_at && (
              <div className="hint">{t('last_notes_change')}: <b>{view.notes_updated_by_name || '—'}</b> · {fmtDate(view.notes_updated_at, lang)}</div>
            )}
            <div className="form-actions"><button type="button" className="btn btn-sm btn-primary" onClick={saveNotes}>{t('save_notes')}</button></div>
          </div>
          <StatusBadge status={view.status} />
        </Modal>
      )}
    </>
  )
}

function FragmentRow({ label, value, ltr }) {
  return (
    <>
      <span>{label}</span>
      <b dir={ltr ? 'ltr' : undefined}>{value}</b>
    </>
  )
}
