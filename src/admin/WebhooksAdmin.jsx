import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { toast } from '../lib/toast'
import Icon from '../components/Icon'
import { Spinner } from '../components/common'
import { Empty, Modal, PageHeader, Toggle } from './ui'

const EVENTS = ['submission.created', 'worker.published', 'worker.retired']

const SAMPLE = `{
  "event": "submission.created",
  "id": "6f1c…",
  "form": "booking",
  "created_at": "2026-10-23T10:15:00Z",
  "lang": "ar",
  "page_url": "https://…/book/A123",
  "utm": { "utm_source": "google", "utm_campaign": "maids-oct" },
  "worker": { "worker_code": "A123", "name": "…", "country": "Philippines" },
  "data": {
    "full_name": "…", "phone": "05…", "national_id": "1…",
    "visa_number": "…", "worker_code": "A123"
  }
}`

export default function WebhooksAdmin() {
  const { t, pick } = useLang()
  const [rows, setRows] = useState(null)
  const [forms, setForms] = useState([])
  const [edit, setEdit] = useState(null)

  const load = useCallback(async () => {
    const [w, f] = await Promise.all([
      supabase.from('webhooks').select('*').order('created_at'),
      supabase.from('forms').select('slug,name_ar,name_en').order('created_at'),
    ])
    setRows(w.data || [])
    setForms(f.data || [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!/^https?:\/\//i.test(edit.url || '')) return toast(t('err_url'), 'error')
    const payload = { name: edit.name || null, url: edit.url.trim(), event: edit.event, form_slug: edit.event === 'submission.created' ? edit.form_slug || null : null, active: edit.active }
    const { error } = edit.id ? await supabase.from('webhooks').update(payload).eq('id', edit.id) : await supabase.from('webhooks').insert(payload)
    if (error) return toast(error.message, 'error')
    toast(t('saved'))
    setEdit(null)
    load()
    return undefined
  }

  const test = async (w) => {
    const { error } = await supabase.rpc('test_webhook', { p_id: w.id })
    if (error) return toast(error.message, 'error')
    toast(t('test_sent'))
    return undefined
  }

  const del = async (w) => {
    if (!window.confirm(t('confirm_delete'))) return
    await supabase.from('webhooks').delete().eq('id', w.id)
    load()
  }

  const formName = (slug) => (slug ? pick(forms.find((f) => f.slug === slug), 'name') || slug : t('all_forms'))

  return (
    <>
      <PageHeader title={t('webhooks')} sub={t('webhooks_sub')}>
        <button type="button" className="btn btn-primary" onClick={() => setEdit({ name: '', url: '', event: 'submission.created', form_slug: '', active: true })}><Icon name="plus" size={18} />{t('add_webhook')}</button>
      </PageHeader>

      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty>{t('no_webhooks')}</Empty>
      ) : (
        <div className="card list-card">
          {rows.map((w) => (
            <div key={w.id} className={`list-row ${w.active ? '' : 'inactive'}`}>
              <span className="feature-icon sm"><Icon name="webhook" size={18} /></span>
              <div className="list-main">
                <b>{w.name || w.event}</b>
                <div className="muted small"><span className="tag sm">{w.event}</span> {w.event === 'submission.created' && formName(w.form_slug)}</div>
                <div className="muted small break" dir="ltr">{w.url}</div>
              </div>
              <Toggle checked={w.active} onChange={async (v) => { await supabase.from('webhooks').update({ active: v }).eq('id', w.id); load() }} />
              <button type="button" className="btn btn-sm btn-outline" onClick={() => test(w)}>{t('send_test')}</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEdit({ ...w, form_slug: w.form_slug || '' })}><Icon name="edit" size={16} /></button>
              <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => del(w)}><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 className="card-title">{t('how_zapier')}</h2>
        <ol className="steps-list">
          <li>{t('zapier_step1')}</li>
          <li>{t('zapier_step2')}</li>
          <li>{t('zapier_step3')}</li>
          <li>{t('zapier_step4')}</li>
        </ol>
        <p className="muted small">{t('payload_example')}</p>
        <pre className="code" dir="ltr">{SAMPLE}</pre>
      </div>

      {edit && (
        <Modal
          title={edit.id ? t('edit') : t('add_webhook')}
          onClose={() => setEdit(null)}
          footer={<><button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>{t('cancel')}</button><button type="button" className="btn btn-primary" onClick={save}>{t('save')}</button></>}
        >
          <div className="field">
            <label className="lbl">{t('name')}</label>
            <input className="input" value={edit.name || ''} placeholder="Zapier → Google Sheets" onChange={(e) => setEdit((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="field">
            <label className="lbl">{t('webhook_url')}</label>
            <input className="input" dir="ltr" value={edit.url} placeholder="https://hooks.zapier.com/hooks/catch/…" onChange={(e) => setEdit((s) => ({ ...s, url: e.target.value }))} />
          </div>
          <div className="field">
            <label className="lbl">{t('event')}</label>
            <select className="input" value={edit.event} onChange={(e) => setEdit((s) => ({ ...s, event: e.target.value }))}>
              {EVENTS.map((ev) => <option key={ev} value={ev}>{t(`ev_${ev.replace('.', '_')}`)}</option>)}
            </select>
          </div>
          {edit.event === 'submission.created' && (
            <div className="field">
              <label className="lbl">{t('form')}</label>
              <select className="input" value={edit.form_slug} onChange={(e) => setEdit((s) => ({ ...s, form_slug: e.target.value }))}>
                <option value="">{t('all_forms')}</option>
                {forms.map((f) => <option key={f.slug} value={f.slug}>{pick(f, 'name')}</option>)}
              </select>
            </div>
          )}
          <Toggle checked={edit.active} onChange={(v) => setEdit((s) => ({ ...s, active: v }))} label={t('active')} />
        </Modal>
      )}
    </>
  )
}
