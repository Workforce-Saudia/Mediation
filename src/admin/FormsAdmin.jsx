import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { toast } from '../lib/toast'
import Icon from '../components/Icon'
import { Spinner } from '../components/common'
import { BiField, Modal, PageHeader, Toggle, moveItem } from './ui'

const TYPES = ['text', 'textarea', 'tel', 'email', 'number', 'date', 'select', 'radio', 'checkbox']
const BLANK_FIELD = { name: '', type: 'text', label_ar: '', label_en: '', placeholder_ar: '', placeholder_en: '', options: [], required: false, pattern: '', error_ar: '', error_en: '', active: true, system: false }

export const HOME_POSITIONS = ['none', 'after_hero', 'after_about', 'after_why', 'after_service', 'after_faq', 'after_contact']

/** Where a form appears on the website (header link / footer link / home page section) */
function PlacementFields({ value, set }) {
  const { t } = useLang()
  return (
    <div className="placement">
      <label className="lbl">{t('placement')}</label>
      <p className="hint">{t('placement_hint')}</p>
      <div className="row-gap">
        <Toggle checked={value.show_in_header} onChange={(v) => set({ show_in_header: v })} label={t('place_header')} />
        <Toggle checked={value.show_in_footer} onChange={(v) => set({ show_in_footer: v })} label={t('place_footer')} />
      </div>
      <div className="field mt">
        <label className="lbl">{t('place_home')}</label>
        <select className="input" value={value.home_position || 'none'} onChange={(e) => set({ home_position: e.target.value })}>
          {HOME_POSITIONS.map((p) => <option key={p} value={p}>{t(`pos_${p}`)}</option>)}
        </select>
      </div>
    </div>
  )
}

export function formPublicUrl(slug) {
  if (slug === 'contact') return '/contact'
  if (slug === 'booking') return '/workers → /book/<worker-id>'
  return `/form/${slug}`
}

export default function FormsAdmin() {
  const { t, pick } = useLang()
  const [forms, setForms] = useState(null)
  const [slug, setSlug] = useState('')
  const [form, setForm] = useState(null)
  const [fields, setFields] = useState([])
  const [edit, setEdit] = useState(null)
  const [newForm, setNewForm] = useState(null)

  const loadForms = useCallback(async () => {
    const { data } = await supabase.from('forms').select('*').order('created_at')
    setForms(data || [])
    setSlug((s) => s || data?.[0]?.slug || '')
  }, [])

  const loadFields = useCallback(async () => {
    if (!slug) return
    const [f, ff] = await Promise.all([
      supabase.from('forms').select('*').eq('slug', slug).maybeSingle(),
      supabase.from('form_fields').select('*').eq('form_slug', slug).order('sort'),
    ])
    setForm(f.data)
    setFields(ff.data || [])
  }, [slug])

  useEffect(() => {
    loadForms()
  }, [loadForms])
  useEffect(() => {
    loadFields()
  }, [loadFields])

  if (!forms) return <Spinner />

  const saveForm = async () => {
    const { slug: s, created_at: _c, ...rest } = form
    const { error } = await supabase.from('forms').update(rest).eq('slug', s)
    if (error) return toast(error.message, 'error')
    toast(t('saved'))
    loadForms()
    return undefined
  }

  const reorder = async (i, dir) => {
    const next = moveItem(fields, i, dir).map((r, idx) => ({ ...r, sort: idx + 1 }))
    setFields(next)
    const { error } = await supabase.from('form_fields').upsert(next)
    if (error) toast(error.message, 'error')
  }

  const saveField = async () => {
    const f = { ...edit }
    f.name = String(f.name || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '')
    if (!f.name || !f.label_ar.trim()) return toast(t('fill_required'), 'error')
    if (f.pattern) {
      try { new RegExp(f.pattern) } catch { return toast(t('err_regex'), 'error') }
    }
    f.options = (f.options || []).filter((o) => o.value)
    if (['select', 'radio'].includes(f.type) && f.options.length === 0) return toast(t('err_options'), 'error')
    f.form_slug = slug
    if (!f.id) f.sort = fields.length + 1
    const { error } = f.id ? await supabase.from('form_fields').update(f).eq('id', f.id) : await supabase.from('form_fields').insert(f)
    if (error) return toast(error.code === '23505' ? t('err_duplicate_field') : error.message, 'error')
    toast(t('saved'))
    setEdit(null)
    loadFields()
    return undefined
  }

  const delField = async (f) => {
    if (!window.confirm(t('confirm_delete_field'))) return
    await supabase.from('form_fields').delete().eq('id', f.id)
    toast(t('deleted'))
    loadFields()
  }

  const deleteForm = async () => {
    const { count } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('form_slug', form.slug)
    const msg = count ? t('confirm_delete_form_entries', { n: count }) : t('confirm_delete_form')
    if (!window.confirm(msg)) return
    const { error } = await supabase.from('forms').delete().eq('slug', form.slug)
    if (error) return toast(/system_form/.test(error.message) ? t('system_form_locked') : error.message, 'error')
    toast(t('deleted'))
    setForm(null)
    setFields([])
    setSlug('')
    loadForms()
    return undefined
  }

  const createForm = async () => {
    const s = String(newForm.slug || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
    if (!s || !newForm.name_ar || !newForm.name_en) return toast(t('fill_required'), 'error')
    const { error } = await supabase.from('forms').insert({
      slug: s,
      name_ar: newForm.name_ar,
      name_en: newForm.name_en,
      show_in_header: newForm.show_in_header,
      show_in_footer: newForm.show_in_footer,
      home_position: newForm.home_position,
    })
    if (error) return toast(error.code === '23505' ? t('err_duplicate_slug') : error.message, 'error')
    setNewForm(null)
    setSlug(s)
    loadForms()
    return undefined
  }

  const setE = (p) => setEdit((s) => ({ ...s, ...p }))

  return (
    <>
      <PageHeader title={t('forms')} sub={t('forms_sub')}>
        <button type="button" className="btn btn-outline" onClick={() => setNewForm({ slug: '', name_ar: '', name_en: '', show_in_header: false, show_in_footer: true, home_position: 'none' })}><Icon name="plus" size={18} />{t('new_form')}</button>
      </PageHeader>

      <div className="seg">
        {forms.map((f) => (
          <button type="button" key={f.slug} className={slug === f.slug ? 'on' : ''} onClick={() => setSlug(f.slug)}>{pick(f, 'name')}</button>
        ))}
      </div>

      {form && (
        <>
          <div className="card">
            <div className="card-head">
              <h2>{t('form_settings')}</h2>
              <span className="muted small" dir="ltr">{t('public_url')}: {formPublicUrl(form.slug)}</span>
            </div>
            <BiField label={t('form_name')} obj={form} base="name" set={(p) => setForm((s) => ({ ...s, ...p }))} />
            <BiField label={t('form_description')} obj={form} base="description" set={(p) => setForm((s) => ({ ...s, ...p }))} textarea rows={2} hint={t('form_description_hint')} />
            <BiField label={t('submit_text')} obj={form} base="submit" set={(p) => setForm((s) => ({ ...s, ...p }))} />
            <div className="row-gap">
              <Toggle checked={form.require_terms} onChange={(v) => setForm((s) => ({ ...s, require_terms: v }))} label={t('require_terms')} />
              <Toggle checked={form.active} onChange={(v) => setForm((s) => ({ ...s, active: v }))} label={t('form_active')} />
            </div>
            {form.system ? (
              <p className="hint mt">{t('system_form_placement')}</p>
            ) : (
              <PlacementFields value={form} set={(p) => setForm((s) => ({ ...s, ...p }))} />
            )}
            <div className="form-actions">
              <button type="button" className="btn btn-primary" onClick={saveForm}>{t('save')}</button>
              <span className="flex1" />
              {!form.system && (
                <button type="button" className="btn btn-ghost danger" onClick={deleteForm}><Icon name="trash" size={16} />{t('delete_form')}</button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h2>{t('fields')}</h2>
              <button type="button" className="btn btn-sm btn-primary" onClick={() => setEdit({ ...BLANK_FIELD, options: [] })}><Icon name="plus" size={16} />{t('add_field')}</button>
            </div>
            <div className="list-card">
              {fields.map((f, i) => (
                <div key={f.id} className={`list-row ${f.active ? '' : 'inactive'}`}>
                  <div className="order-btns">
                    <button type="button" className="icon-btn sm" disabled={i === 0} onClick={() => reorder(i, -1)} aria-label="up"><Icon name="up" size={16} /></button>
                    <button type="button" className="icon-btn sm" disabled={i === fields.length - 1} onClick={() => reorder(i, 1)} aria-label="down"><Icon name="down" size={16} /></button>
                  </div>
                  <div className="list-main">
                    <b>{pick(f, 'label')}</b> {f.required && <span className="req">*</span>}
                    <div className="muted small"><span className="mono" dir="ltr">{f.name}</span> · {t(`ftype_${f.type}`)}{f.system ? ` · ${t('system_field')}` : ''}</div>
                  </div>
                  <Toggle checked={f.active} onChange={async (v) => { if (f.system && !v) return toast(t('system_field_locked'), 'error'); await supabase.from('form_fields').update({ active: v }).eq('id', f.id); loadFields(); return undefined }} />
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEdit({ ...BLANK_FIELD, ...f, options: f.options || [] })}><Icon name="edit" size={16} /></button>
                  <button type="button" className="btn btn-sm btn-ghost danger" disabled={f.system} title={f.system ? t('system_field_locked') : ''} onClick={() => delField(f)}><Icon name="trash" size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {edit && (
        <Modal
          wide
          title={edit.id ? t('edit_field') : t('add_field')}
          onClose={() => setEdit(null)}
          footer={<><button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>{t('cancel')}</button><button type="button" className="btn btn-primary" onClick={saveField}>{t('save')}</button></>}
        >
          <div className="form-grid">
            <div className="field">
              <label className="lbl">{t('field_key')}</label>
              <input className="input mono" dir="ltr" value={edit.name} disabled={edit.system} placeholder="e.g. city" onChange={(e) => setE({ name: e.target.value })} />
              <div className="hint">{t('field_key_hint')}</div>
            </div>
            <div className="field">
              <label className="lbl">{t('field_type')}</label>
              <select className="input" value={edit.type} onChange={(e) => setE({ type: e.target.value })}>
                {TYPES.map((ty) => <option key={ty} value={ty}>{t(`ftype_${ty}`)}</option>)}
              </select>
            </div>
          </div>
          <BiField label={t('label')} obj={edit} base="label" set={setE} />
          <BiField label={t('placeholder')} obj={edit} base="placeholder" set={setE} />
          {['select', 'radio'].includes(edit.type) && (
            <div className="field">
              <label className="lbl">{t('options')}</label>
              {edit.options.map((o, i) => (
                <div key={i} className="opt-row">
                  <input className="input sm mono" dir="ltr" placeholder="value" value={o.value} onChange={(e) => setE({ options: edit.options.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
                  <input className="input sm" dir="rtl" placeholder="عربي" value={o.label_ar} onChange={(e) => setE({ options: edit.options.map((x, j) => (j === i ? { ...x, label_ar: e.target.value } : x)) })} />
                  <input className="input sm" dir="ltr" placeholder="English" value={o.label_en} onChange={(e) => setE({ options: edit.options.map((x, j) => (j === i ? { ...x, label_en: e.target.value } : x)) })} />
                  <button type="button" className="icon-btn sm danger" onClick={() => setE({ options: edit.options.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>
                </div>
              ))}
              <button type="button" className="btn btn-sm btn-outline" onClick={() => setE({ options: [...edit.options, { value: '', label_ar: '', label_en: '' }] })}><Icon name="plus" size={14} />{t('add_option')}</button>
            </div>
          )}
          <div className="row-gap mt">
            <Toggle checked={edit.required} onChange={(v) => setE({ required: v })} label={t('required')} />
            <Toggle checked={edit.active} onChange={(v) => setE({ active: edit.system ? true : v })} label={t('active')} />
          </div>
          <details className="advanced">
            <summary>{t('validation_advanced')}</summary>
            <div className="field">
              <label className="lbl">{t('pattern')}</label>
              <input className="input mono" dir="ltr" value={edit.pattern || ''} placeholder="[12][0-9]{9}" onChange={(e) => setE({ pattern: e.target.value })} />
              <div className="hint">{t('pattern_hint')}</div>
            </div>
            <BiField label={t('error_message')} obj={edit} base="error" set={setE} />
          </details>
        </Modal>
      )}

      {newForm && (
        <Modal
          title={t('new_form')}
          onClose={() => setNewForm(null)}
          footer={<><button type="button" className="btn btn-ghost" onClick={() => setNewForm(null)}>{t('cancel')}</button><button type="button" className="btn btn-primary" onClick={createForm}>{t('create')}</button></>}
        >
          <div className="field">
            <label className="lbl">{t('url_slug')}</label>
            <input className="input mono" dir="ltr" placeholder="e.g. job-application" value={newForm.slug} onChange={(e) => setNewForm((s) => ({ ...s, slug: e.target.value }))} />
            <div className="hint">{t('new_form_hint')}</div>
          </div>
          <BiField label={t('form_name')} obj={newForm} base="name" set={(p) => setNewForm((s) => ({ ...s, ...p }))} />
          <PlacementFields value={newForm} set={(p) => setNewForm((s) => ({ ...s, ...p }))} />
          <p className="hint">{t('new_form_next')}</p>
        </Modal>
      )}
    </>
  )
}
