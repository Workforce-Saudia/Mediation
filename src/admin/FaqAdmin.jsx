import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { toast } from '../lib/toast'
import Icon from '../components/Icon'
import { Spinner } from '../components/common'
import { BiField, Empty, Modal, PageHeader, Toggle, Uploader, moveItem } from './ui'

const BLANK = { kind: 'content', title_ar: '', title_en: '', body_ar: '', body_en: '', link_url: '', attachments: [], active: true }
const ATT_TYPES = [
  { type: 'pdf', icon: 'file', accept: ['pdf'] },
  { type: 'image', icon: 'image', accept: ['png', 'jpg', 'jpeg', 'webp'] },
  { type: 'video', icon: 'video', accept: ['mp4', 'webm'] },
  { type: 'link', icon: 'link', accept: null },
]

export default function FaqAdmin() {
  const { t, pick } = useLang()
  const [rows, setRows] = useState(null)
  const [edit, setEdit] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('faq_items').select('*').order('sort')
    setRows(data || [])
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const reorder = async (i, dir) => {
    const next = moveItem(rows, i, dir).map((r, idx) => ({ ...r, sort: idx + 1 }))
    setRows(next)
    const { error } = await supabase.from('faq_items').upsert(next)
    if (error) toast(error.message, 'error')
  }

  const set = (p) => setEdit((s) => ({ ...s, ...p }))
  const setAtt = (i, p) => setEdit((s) => ({ ...s, attachments: s.attachments.map((a, j) => (j === i ? { ...a, ...p } : a)) }))

  const save = async () => {
    if (!edit.title_ar.trim()) return toast(t('fill_required'), 'error')
    if (edit.kind === 'link' && !/^https?:\/\//i.test(edit.link_url || '')) return toast(t('err_url'), 'error')
    const payload = { ...edit, attachments: (edit.attachments || []).filter((a) => a.url) }
    delete payload.created_at
    if (!payload.id) payload.sort = (rows?.length || 0) + 1
    const { error } = payload.id
      ? await supabase.from('faq_items').update(payload).eq('id', payload.id)
      : await supabase.from('faq_items').insert(payload)
    if (error) return toast(error.message, 'error')
    toast(t('saved'))
    setEdit(null)
    load()
    return undefined
  }

  const del = async (r) => {
    if (!window.confirm(t('confirm_delete'))) return
    await supabase.from('faq_items').delete().eq('id', r.id)
    toast(t('deleted'))
    load()
  }

  return (
    <>
      <PageHeader title={t('faq_admin')} sub={t('faq_admin_sub')}>
        <a href="/faq" target="_blank" rel="noopener" className="btn btn-ghost"><Icon name="eye" size={18} />{t('preview')}</a>
        <button type="button" className="btn btn-primary" onClick={() => setEdit({ ...BLANK, attachments: [] })}><Icon name="plus" size={18} />{t('add_question')}</button>
      </PageHeader>

      {rows === null ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty>{t('nothing_yet')}</Empty>
      ) : (
        <div className="card list-card">
          {rows.map((r, i) => (
            <div key={r.id} className={`list-row ${r.active ? '' : 'inactive'}`}>
              <div className="order-btns">
                <button type="button" className="icon-btn sm" disabled={i === 0} onClick={() => reorder(i, -1)} aria-label="up"><Icon name="up" size={16} /></button>
                <button type="button" className="icon-btn sm" disabled={i === rows.length - 1} onClick={() => reorder(i, 1)} aria-label="down"><Icon name="down" size={16} /></button>
              </div>
              <span className="feature-icon sm"><Icon name={r.kind === 'link' ? 'external' : 'list'} size={18} /></span>
              <div className="list-main">
                <b>{pick(r, 'title')}</b>
                <div className="muted small">
                  {r.kind === 'link' ? <span dir="ltr">{r.link_url}</span> : t('n_attachments', { n: (r.attachments || []).length })}
                </div>
              </div>
              <Toggle checked={r.active} onChange={async (v) => { await supabase.from('faq_items').update({ active: v }).eq('id', r.id); load() }} />
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEdit({ ...r, attachments: r.attachments || [] })}><Icon name="edit" size={16} /></button>
              <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => del(r)}><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <Modal
          wide
          title={edit.id ? t('edit_question') : t('add_question')}
          onClose={() => setEdit(null)}
          footer={<><button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>{t('cancel')}</button><button type="button" className="btn btn-primary" onClick={save}>{t('save')}</button></>}
        >
          <div className="seg">
            <button type="button" className={edit.kind === 'content' ? 'on' : ''} onClick={() => set({ kind: 'content' })}>{t('faq_kind_content')}</button>
            <button type="button" className={edit.kind === 'link' ? 'on' : ''} onClick={() => set({ kind: 'link' })}>{t('faq_kind_link')}</button>
          </div>
          <BiField label={t('question_title')} obj={edit} base="title" set={set} />
          {edit.kind === 'link' ? (
            <div className="field">
              <label className="lbl">{t('external_url')}</label>
              <input className="input" dir="ltr" placeholder="https://" value={edit.link_url || ''} onChange={(e) => set({ link_url: e.target.value })} />
            </div>
          ) : (
            <>
              <BiField label={t('answer_text')} obj={edit} base="body" set={set} textarea rows={5} hint={t('formatting_hint')} />
              <label className="lbl">{t('attachments')}</label>
              <div className="att-editor">
                {edit.attachments.map((a, i) => {
                  const meta = ATT_TYPES.find((x) => x.type === a.type) || ATT_TYPES[3]
                  return (
                    <div key={i} className="att-edit-row">
                      <div className="att-edit-head">
                        <span className="tag"><Icon name={meta.icon} size={14} /> {t(`att_${a.type}`)}</span>
                        <div className="order-btns h">
                          <button type="button" className="icon-btn sm" disabled={i === 0} onClick={() => set({ attachments: moveItem(edit.attachments, i, -1) })}><Icon name="up" size={14} /></button>
                          <button type="button" className="icon-btn sm" disabled={i === edit.attachments.length - 1} onClick={() => set({ attachments: moveItem(edit.attachments, i, 1) })}><Icon name="down" size={14} /></button>
                          <button type="button" className="icon-btn sm danger" onClick={() => set({ attachments: edit.attachments.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>
                        </div>
                      </div>
                      {meta.accept && <Uploader compact value={a.url} onChange={(url) => setAtt(i, { url })} accept={meta.accept} folder="faq" />}
                      {(a.type === 'link' || a.type === 'video') && (
                        <input className="input" dir="ltr" placeholder={a.type === 'video' ? t('video_url_hint') : 'https://'} value={a.url || ''} onChange={(e) => setAtt(i, { url: e.target.value })} />
                      )}
                      <BiField label={t('caption_optional')} obj={a} base="label" set={(p) => setAtt(i, p)} />
                    </div>
                  )
                })}
                <div className="row-gap">
                  {ATT_TYPES.map((x) => (
                    <button type="button" key={x.type} className="btn btn-sm btn-outline" onClick={() => set({ attachments: [...edit.attachments, { type: x.type, url: '', label_ar: '', label_en: '' }] })}>
                      <Icon name={x.icon} size={14} /> {t(`att_${x.type}`)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  )
}
