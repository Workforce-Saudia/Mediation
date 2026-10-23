import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { toast } from '../lib/toast'
import { ICON_CHOICES } from '../lib/countries'
import Icon from '../components/Icon'
import { Spinner } from '../components/common'
import { BiField, Empty, Modal, PageHeader, Toggle, moveItem } from './ui'

const BLANK = { icon: 'check', title_ar: '', title_en: '', body_ar: '', body_en: '', active: true }

export default function FeaturesAdmin() {
  const { t, pick } = useLang()
  const [grp, setGrp] = useState('why')
  const [rows, setRows] = useState(null)
  const [edit, setEdit] = useState(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('features').select('*').eq('grp', grp).order('sort')
    setRows(data || [])
  }, [grp])

  useEffect(() => {
    setRows(null)
    load()
  }, [load])

  const reorder = async (i, dir) => {
    const next = moveItem(rows, i, dir).map((r, idx) => ({ ...r, sort: idx + 1 }))
    setRows(next)
    const { error } = await supabase.from('features').upsert(next)
    if (error) toast(error.message, 'error')
  }

  const save = async () => {
    if (!edit.title_ar.trim()) return toast(t('fill_required'), 'error')
    const payload = { ...edit, grp }
    if (!payload.id) payload.sort = (rows?.length || 0) + 1
    const { error } = payload.id
      ? await supabase.from('features').update(payload).eq('id', payload.id)
      : await supabase.from('features').insert(payload)
    if (error) return toast(error.message, 'error')
    toast(t('saved'))
    setEdit(null)
    load()
    return undefined
  }

  const toggle = async (r, active) => {
    await supabase.from('features').update({ active }).eq('id', r.id)
    load()
  }

  const del = async (r) => {
    if (!window.confirm(t('confirm_delete'))) return
    await supabase.from('features').delete().eq('id', r.id)
    toast(t('deleted'))
    load()
  }

  return (
    <>
      <PageHeader title={t('home_lists')} sub={t('home_lists_sub')}>
        <button type="button" className="btn btn-primary" onClick={() => setEdit({ ...BLANK })}><Icon name="plus" size={18} />{t('add')}</button>
      </PageHeader>
      <div className="seg">
        <button type="button" className={grp === 'why' ? 'on' : ''} onClick={() => setGrp('why')}>{t('why_cards')}</button>
        <button type="button" className={grp === 'service' ? 'on' : ''} onClick={() => setGrp('service')}>{t('service_steps')}</button>
      </div>
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
              <span className="feature-icon sm"><Icon name={r.icon} size={18} /></span>
              <div className="list-main">
                <b>{pick(r, 'title')}</b>
                <div className="muted small">{pick(r, 'body')}</div>
              </div>
              <Toggle checked={r.active} onChange={(v) => toggle(r, v)} />
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEdit({ ...r })}><Icon name="edit" size={16} /></button>
              <button type="button" className="btn btn-sm btn-ghost danger" onClick={() => del(r)}><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <Modal
          title={edit.id ? t('edit') : t('add')}
          onClose={() => setEdit(null)}
          footer={<><button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>{t('cancel')}</button><button type="button" className="btn btn-primary" onClick={save}>{t('save')}</button></>}
        >
          <div className="field">
            <label className="lbl">{t('icon')}</label>
            <div className="icon-picker">
              {ICON_CHOICES.map((i) => (
                <button type="button" key={i} className={`icon-choice ${edit.icon === i ? 'on' : ''}`} onClick={() => setEdit((s) => ({ ...s, icon: i }))} title={i}>
                  <Icon name={i} size={20} />
                </button>
              ))}
            </div>
          </div>
          <BiField label={t('title')} obj={edit} base="title" set={(p) => setEdit((s) => ({ ...s, ...p }))} />
          <BiField label={t('description')} obj={edit} base="body" set={(p) => setEdit((s) => ({ ...s, ...p }))} textarea />
        </Modal>
      )}
    </>
  )
}
