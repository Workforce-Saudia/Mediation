import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { fmtDate, useLang } from '../lib/i18n'
import { toast } from '../lib/toast'
import Icon from '../components/Icon'
import { Spinner } from '../components/common'
import { PageHeader, StatusBadge, Uploader } from './ui'
import { changeWorkerStatus } from './WorkersAdmin'

const EMPTY = { worker_code: '', name: '', age: '', country_id: '', photo_url: '', cv_url: '', notes: '' }
const CV_TYPES = ['pdf', 'png', 'jpg', 'jpeg']

export default function WorkerEdit() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { session } = useAuth()
  const { t, pick, lang } = useLang()
  const [w, setW] = useState(isNew ? EMPTY : null)
  const [profs, setProfs] = useState({}) // profession_id -> { checked, cv_url }
  const [professions, setProfessions] = useState([])
  const [countries, setCountries] = useState([])
  const [log, setLog] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const original = useRef(null) // values as loaded, to log what changed on save

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      supabase.from('professions').select('*').order('sort'),
      supabase.from('countries').select('*').order('sort'),
    ])
    setProfessions(p.data || [])
    setCountries(c.data || [])
    if (!isNew) {
      const [wr, wp, lg] = await Promise.all([
        supabase.from('workers').select('*').eq('id', id).maybeSingle(),
        supabase.from('worker_professions').select('*').eq('worker_id', id),
        supabase.from('worker_status_log').select('*').eq('worker_id', id).order('at', { ascending: false }),
      ])
      if (!wr.data) {
        toast(t('not_found'), 'error')
        navigate('/admin/workers')
        return
      }
      const loaded = { ...EMPTY, ...wr.data, age: wr.data.age ?? '', notes: wr.data.notes ?? '' }
      setW(loaded)
      const map = {}
      for (const r of wp.data || []) map[r.profession_id] = { checked: true, cv_url: r.cv_url || '' }
      setProfs(map)
      original.current = { w: loaded, profs: map }
      setLog(lg.data || [])
    }
  }, [id, isNew, navigate, t])

  useEffect(() => {
    load()
  }, [load])

  if (!w) return <Spinner />

  const set = (patch) => setW((s) => ({ ...s, ...patch }))
  const setProf = (pid, patch) => setProfs((s) => ({ ...s, [pid]: { checked: false, cv_url: '', ...s[pid], ...patch } }))

  const save = async (andPublish = false) => {
    const errs = {}
    if (!w.worker_code.trim()) errs.worker_code = t('err_required')
    if (!w.name.trim()) errs.name = t('err_required')
    if (!w.country_id) errs.country_id = t('err_required')
    const selected = Object.entries(profs).filter(([, v]) => v.checked)
    if (!selected.length) errs.professions = t('err_choose_profession')
    if (w.age && (Number(w.age) < 16 || Number(w.age) > 80)) errs.age = t('err_age')
    setErrors(errs)
    if (Object.keys(errs).length) {
      toast(t('fix_errors'), 'error')
      return
    }
    setSaving(true)
    const row = {
      worker_code: w.worker_code.trim(),
      name: w.name.trim(),
      age: w.age === '' ? null : Number(w.age),
      country_id: w.country_id,
      photo_url: w.photo_url || null,
      cv_url: w.cv_url || null,
      notes: w.notes || null,
    }
    let wid = id
    if (isNew) {
      const { data, error } = await supabase.from('workers').insert({ ...row, created_by: session.user.id }).select('id').single()
      if (error) return fail(error)
      wid = data.id
    } else {
      const { error } = await supabase.from('workers').update(row).eq('id', id)
      if (error) return fail(error)
    }
    // sync professions (+ CV per profession)
    const ids = selected.map(([pid]) => pid)
    const del = await supabase.from('worker_professions').delete().eq('worker_id', wid).not('profession_id', 'in', `(${ids.join(',')})`)
    if (del.error) return fail(del.error)
    const up = await supabase
      .from('worker_professions')
      .upsert(selected.map(([pid, v]) => ({ worker_id: wid, profession_id: pid, cv_url: v.cv_url || null })), { onConflict: 'worker_id,profession_id' })
    if (up.error) return fail(up.error)

    // activity log: list what changed (English field names, used in the export)
    if (!isNew && original.current) {
      const o = original.current
      const changed = []
      const fields = { worker_code: 'Worker ID', name: 'Name', age: 'Age', country_id: 'Country', photo_url: 'Photo', cv_url: 'Default CV', notes: 'Notes' }
      for (const [k, label] of Object.entries(fields)) {
        if (String(o.w[k] ?? '') !== String(w[k] ?? '')) changed.push(label)
      }
      const profName = (pid) => professions.find((p) => p.id === pid)?.name_en || pid
      const before = Object.entries(o.profs).filter(([, v]) => v.checked)
      const added = selected.filter(([pid]) => !o.profs[pid]?.checked).map(([pid]) => profName(pid))
      const removed = before.filter(([pid]) => !profs[pid]?.checked).map(([pid]) => profName(pid))
      const cvChanged = selected.filter(([pid, v]) => o.profs[pid]?.checked && (o.profs[pid].cv_url || '') !== (v.cv_url || '')).map(([pid]) => profName(pid))
      if (added.length) changed.push(`Professions added: ${added.join(', ')}`)
      if (removed.length) changed.push(`Professions removed: ${removed.join(', ')}`)
      if (cvChanged.length) changed.push(`CV changed: ${cvChanged.join(', ')}`)
      if (changed.length) await supabase.rpc('log_worker_update', { p_worker_id: wid, p_details: changed.join(' | ') })
    }

    if (andPublish) await changeWorkerStatus(wid, 'publish', t)
    else toast(t('saved'))
    setSaving(false)
    if (isNew) navigate(`/admin/workers/${wid}`, { replace: true })
    else load()
    return undefined

    function fail(error) {
      setSaving(false)
      toast(error.code === '23505' ? t('err_duplicate_code') : error.message, 'error')
    }
  }

  const statusAction = async (action) => {
    if (action === 'retire' && !window.confirm(t('confirm_retire'))) return
    setSaving(true)
    await changeWorkerStatus(id, action, t)
    setSaving(false)
    load()
  }

  const remove = async () => {
    if (!window.confirm(t('confirm_delete_worker'))) return
    const { error } = await supabase.from('workers').delete().eq('id', id)
    if (error) return toast(error.message, 'error')
    toast(t('deleted'))
    navigate('/admin/workers')
    return undefined
  }

  return (
    <>
      <PageHeader title={isNew ? t('add_worker') : w.name} sub={isNew ? t('worker_form_sub') : <span dir="ltr">{w.worker_code}</span>}>
        <Link to="/admin/workers" className="btn btn-ghost"><Icon name="back" className="flip" size={18} />{t('back')}</Link>
      </PageHeader>

      <div className="edit-grid">
        <div className="card">
          <h2 className="card-title">{t('worker_profile')}</h2>
          <div className="form-grid">
            <div className="field">
              <label>{t('worker_id')} <span className="req">*</span></label>
              <input className={`input ${errors.worker_code ? 'invalid' : ''}`} dir="ltr" value={w.worker_code} onChange={(e) => set({ worker_code: e.target.value })} />
              {errors.worker_code && <div className="field-error">{errors.worker_code}</div>}
            </div>
            <div className="field">
              <label>{t('name')} <span className="req">*</span></label>
              <input className={`input ${errors.name ? 'invalid' : ''}`} value={w.name} onChange={(e) => set({ name: e.target.value })} />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>
            <div className="field">
              <label>{t('age')}</label>
              <input className={`input ${errors.age ? 'invalid' : ''}`} type="number" min="16" max="80" dir="ltr" value={w.age} onChange={(e) => set({ age: e.target.value })} />
              {errors.age && <div className="field-error">{errors.age}</div>}
            </div>
            <div className="field">
              <label>{t('country')} <span className="req">*</span></label>
              <select className={`input ${errors.country_id ? 'invalid' : ''}`} value={w.country_id} onChange={(e) => set({ country_id: e.target.value })}>
                <option value="">{t('select_placeholder')}</option>
                {countries.map((c) => <option key={c.id} value={c.id}>{pick(c, 'name')}{!c.active ? ` (${t('inactive')})` : ''}</option>)}
              </select>
              {errors.country_id && <div className="field-error">{errors.country_id}</div>}
            </div>
            <div className="field">
              <label>{t('photo')} (PNG / JPG)</label>
              <Uploader value={w.photo_url} onChange={(v) => set({ photo_url: v })} accept={['png', 'jpg', 'jpeg']} folder="workers/photos" />
            </div>
            <div className="field">
              <label>{t('default_cv')} (PDF / PNG / JPG)</label>
              <Uploader value={w.cv_url} onChange={(v) => set({ cv_url: v })} accept={CV_TYPES} folder="workers/cv" />
              <div className="hint">{t('default_cv_hint')}</div>
            </div>
          </div>

          <h3 className="sub-title">{t('professions')} <span className="req">*</span></h3>
          <p className="hint">{t('professions_hint')}</p>
          {errors.professions && <div className="field-error">{errors.professions}</div>}
          <div className="prof-pick">
            {professions.map((p) => {
              const v = profs[p.id] || {}
              return (
                <div key={p.id} className={`prof-row ${v.checked ? 'on' : ''}`}>
                  <label className="check">
                    <input type="checkbox" checked={!!v.checked} onChange={(e) => setProf(p.id, { checked: e.target.checked })} />
                    <span><Icon name={p.icon || 'user'} size={16} /> {pick(p, 'name')}</span>
                  </label>
                  {v.checked && (
                    <div className="prof-cv">
                      <span className="muted small">{t('cv_for_profession')}</span>
                      <Uploader compact value={v.cv_url} onChange={(url) => setProf(p.id, { cv_url: url })} accept={CV_TYPES} folder="workers/cv" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="field field-wide mt">
            <label>{t('internal_notes')}</label>
            <textarea className="input" rows={3} value={w.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-primary" disabled={saving} onClick={() => save(false)}>{saving ? t('saving') : t('save')}</button>
            {(isNew || w.status !== 'published') && (
              <button type="button" className="btn btn-success" disabled={saving} onClick={() => save(true)}>{t('save_and_publish')}</button>
            )}
          </div>
        </div>

        {!isNew && (
          <div className="side-col">
            <div className="card">
              <h2 className="card-title">{t('publishing')}</h2>
              <div className="kv">
                <span>{t('status')}</span><StatusBadge status={w.status} />
                <span>{t('published_at')}</span><b>{fmtDate(w.published_at, lang)}</b>
                <span>{t('first_published_at')}</span><b>{fmtDate(w.first_published_at, lang)}</b>
                {w.retired_at && <><span>{t('retired_at')}</span><b>{fmtDate(w.retired_at, lang)}</b></>}
                <span>{t('publish_count')}</span><b>{w.publish_count}</b>
                <span>{t('created_by')}</span><b>{w.created_by_name || '—'} · {fmtDate(w.created_at, lang)}</b>
                <span>{t('updated_by')}</span><b>{w.updated_by_name || '—'} · {fmtDate(w.updated_at, lang)}</b>
              </div>
              {w.status === 'published' ? (
                <button type="button" className="btn btn-warn btn-block" disabled={saving} onClick={() => statusAction('retire')}>{t('retire_from_site')}</button>
              ) : (
                <button type="button" className="btn btn-success btn-block" disabled={saving} onClick={() => statusAction('publish')}>{w.status === 'retired' ? t('republish') : t('publish')}</button>
              )}
            </div>
            <div className="card">
              <h2 className="card-title"><Icon name="history" size={18} /> {t('history')}</h2>
              {log.length === 0 ? (
                <p className="muted small">{t('no_history')}</p>
              ) : (
                <ul className="timeline">
                  {log.map((l) => (
                    <li key={l.id}>
                      <span className={`dot dot-${l.action}`} />
                      <div>
                        <b>{t(`log_${l.action}`)}</b>
                        <div className="muted small">{fmtDate(l.at, lang)}{l.by_username ? ` · ${l.by_username}` : ''}</div>
                        {l.details && <div className="small log-details" dir="ltr">{l.details}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" className="btn btn-ghost danger btn-block" onClick={remove}><Icon name="trash" size={16} />{t('delete_worker')}</button>
          </div>
        )}
      </div>
    </>
  )
}
