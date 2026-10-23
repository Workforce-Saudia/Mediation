import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { getUtm, track } from '../lib/analytics'
import { Spinner, latinDigits } from './common'

const NUMERIC_TYPES = ['tel', 'number']

function Field({ f, value, onChange, readOnly, error }) {
  const { pick, t } = useLang()
  const label = pick(f, 'label')
  const ph = pick(f, 'placeholder')
  const id = `f-${f.form_slug}-${f.name}`
  const opts = Array.isArray(f.options) ? f.options : []
  const ltr = ['tel', 'email', 'number'].includes(f.type) || /id|number|code/.test(f.name)
  const common = {
    id,
    name: f.name,
    value: value ?? '',
    onChange: (e) => onChange(e.target.value),
    readOnly,
    placeholder: ph || undefined,
    className: `input ${error ? 'invalid' : ''} ${readOnly ? 'readonly' : ''}`,
    'aria-invalid': error ? 'true' : undefined,
  }

  let control
  switch (f.type) {
    case 'textarea':
      control = <textarea rows={4} {...common} />
      break
    case 'select':
      control = (
        <select {...common} disabled={readOnly}>
          <option value="">{t('select_placeholder')}</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>{pick(o, 'label')}</option>
          ))}
        </select>
      )
      break
    case 'radio':
      control = (
        <div className="chip-group" role="radiogroup" aria-labelledby={`${id}-lbl`}>
          {opts.map((o) => (
            <label key={o.value} className={`chip ${value === o.value ? 'on' : ''}`}>
              <input type="radio" name={f.name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} disabled={readOnly} />
              {pick(o, 'label')}
            </label>
          ))}
        </div>
      )
      break
    case 'checkbox':
      control = (
        <label className="check">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} disabled={readOnly} />
          <span>
            {label}
            {f.required && <span className="req">*</span>}
          </span>
        </label>
      )
      break
    default:
      control = (
        <input
          type={f.type === 'number' ? 'text' : f.type}
          inputMode={NUMERIC_TYPES.includes(f.type) ? 'numeric' : undefined}
          dir={ltr ? 'ltr' : undefined}
          autoComplete={f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.name === 'full_name' ? 'name' : undefined}
          {...common}
        />
      )
  }

  return (
    <div className={`field ${f.type === 'textarea' || f.type === 'radio' ? 'field-wide' : ''}`}>
      {f.type !== 'checkbox' && (
        <label htmlFor={id} id={`${id}-lbl`}>
          {label}
          {f.required && <span className="req">*</span>}
        </label>
      )}
      {control}
      {error && <div className="field-error">{error}</div>}
    </div>
  )
}

/**
 * Renders any form defined in the dashboard (fields, order, labels, validation).
 *  prefill  – initial values  { worker_code: 'A123' }
 *  readOnly – field names that can't be changed
 *  extra    – extra data saved with the entry (not shown)
 */
export default function DynamicForm({ slug, prefill = {}, readOnly = [], extra = {}, workerId = null, onSuccess }) {
  const { t, pick, lang } = useLang()
  const navigate = useNavigate()
  const [form, setForm] = useState(null)
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(Boolean(supabase))
  const [values, setValues] = useState(prefill)
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [failMsg, setFailMsg] = useState('')
  const [honey, setHoney] = useState('')

  useEffect(() => {
    if (!supabase) return
    let alive = true
    ;(async () => {
      const [fr, ff] = await Promise.all([
        supabase.from('forms').select('*').eq('slug', slug).maybeSingle(),
        supabase.from('form_fields').select('*').eq('form_slug', slug).eq('active', true).order('sort'),
      ])
      if (!alive) return
      setForm(fr.data)
      setFields(ff.data || [])
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [slug])

  const prefillKey = JSON.stringify(prefill)
  useEffect(() => {
    setValues((v) => ({ ...v, ...JSON.parse(prefillKey) }))
  }, [prefillKey])

  if (!supabase) return <div className="notice">{t('form_preview_notice')}</div>
  if (loading) return <Spinner />
  if (!form || !form.active) return <div className="notice">{t('form_unavailable')}</div>

  const set = (name, type) => (v) => {
    const val = NUMERIC_TYPES.includes(type) || /id|number|phone/.test(name) ? latinDigits(v) : v
    setValues((s) => ({ ...s, [name]: val }))
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }))
  }

  const validate = () => {
    const errs = {}
    for (const f of fields) {
      const raw = values[f.name]
      const v = typeof raw === 'string' ? raw.trim() : raw
      const empty = v === undefined || v === null || v === '' || v === false
      if (f.required && empty) {
        errs[f.name] = t('err_required')
        continue
      }
      if (empty || typeof v !== 'string') continue
      if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errs[f.name] = t('err_email')
      if (f.pattern) {
        try {
          if (!new RegExp(`^(?:${f.pattern})$`).test(v.replace(/\s+/g, ''))) errs[f.name] = pick(f, 'error') || t('err_format')
        } catch { /* invalid regex in settings → ignore */ }
      }
    }
    if (form.require_terms && !agree) errs._terms = t('err_terms')
    return errs
  }

  const submit = async (e) => {
    e.preventDefault()
    setFailMsg('')
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).some((k) => errs[k])) {
      const first = Object.keys(errs)[0]
      document.getElementById(first === '_terms' ? `terms-${slug}` : `f-${slug}-${first}`)?.focus()
      return
    }
    if (honey) {
      // bot filled the hidden field → pretend success
      navigate(`/thank-you?form=${slug}`)
      return
    }
    setSending(true)
    const data = {}
    for (const f of fields) {
      const v = values[f.name]
      data[f.name] = typeof v === 'string' ? v.trim() : v ?? ''
    }
    if (form.require_terms) data.terms_accepted = true
    Object.assign(data, extra)
    const { error } = await supabase.from('submissions').insert({
      form_slug: slug,
      data,
      worker_id: workerId,
      lang,
      page_url: window.location.href.slice(0, 500),
      utm: getUtm(),
    })
    setSending(false)
    if (error) {
      setFailMsg(t('err_submit'))
      return
    }
    track('form_submit', { form: slug })
    if (onSuccess) onSuccess()
    else navigate(`/thank-you?form=${slug}`)
  }

  return (
    <form className="dyn-form" onSubmit={submit} noValidate>
      <div className="form-grid">
        {fields.map((f) => (
          <Field key={f.id} f={f} value={values[f.name]} onChange={set(f.name, f.type)} readOnly={readOnly.includes(f.name)} error={errors[f.name]} />
        ))}
      </div>
      <input className="hp" tabIndex={-1} autoComplete="off" name="company_website" value={honey} onChange={(e) => setHoney(e.target.value)} aria-hidden="true" />
      {form.require_terms && (
        <div className="field field-wide">
          <label className="check">
            <input id={`terms-${slug}`} type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setErrors((x) => ({ ...x, _terms: undefined })) }} />
            <span>
              {t('agree_prefix')}{' '}
              <Link to="/terms" target="_blank" rel="noopener">{t('terms_link')}</Link>
              <span className="req">*</span>
            </span>
          </label>
          {errors._terms && <div className="field-error">{errors._terms}</div>}
        </div>
      )}
      {failMsg && <div className="notice notice-error">{failMsg}</div>}
      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={sending || (form.require_terms && !agree)}>
        {sending ? t('sending') : pick(form, 'submit') || t('submit')}
      </button>
    </form>
  )
}
