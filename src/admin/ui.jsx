import { useEffect, useRef, useState } from 'react'
import { useLang } from '../lib/i18n'
import { uploadFile } from '../lib/supabase'
import { toast } from '../lib/toast'
import { PAGE_LINKS } from '../lib/defaults'
import Icon from '../components/Icon'

export function PageHeader({ title, sub, children }) {
  return (
    <div className="a-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="a-head-actions">{children}</div>}
    </div>
  )
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="close"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-dot" /></span>
      {label && <span>{label}</span>}
    </label>
  )
}

export function StatusBadge({ status }) {
  const { t } = useLang()
  return <span className={`badge badge-${status}`}>{t(`status_${status}`)}</span>
}

/** Arabic + English inputs side by side.  set(patch) */
export function BiField({ label, obj, base, set, textarea, rows = 3, hint }) {
  const Comp = textarea ? 'textarea' : 'input'
  return (
    <div className="bi-field">
      <label className="lbl">{label}</label>
      <div className="bi-row">
        <div className="bi-col">
          <span className="bi-tag">AR</span>
          <Comp dir="rtl" className="input" rows={textarea ? rows : undefined} value={obj[`${base}_ar`] ?? ''} onChange={(e) => set({ [`${base}_ar`]: e.target.value })} />
        </div>
        <div className="bi-col">
          <span className="bi-tag">EN</span>
          <Comp dir="ltr" className="input" rows={textarea ? rows : undefined} value={obj[`${base}_en`] ?? ''} onChange={(e) => set({ [`${base}_en`]: e.target.value })} />
        </div>
      </div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  )
}

export function Uploader({ value, onChange, accept = ['png', 'jpg', 'jpeg'], folder = 'misc', compact, transform }) {
  const { t } = useLang()
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)
  const onFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setBusy(true)
    try {
      const ext = (f.name.split('.').pop() || '').toLowerCase()
      if (!accept.includes(ext)) {
        const err = new Error('invalid_type')
        err.code = 'invalid_type'
        throw err
      }
      const file = transform ? await transform(f) : f
      const url = await uploadFile(file, folder)
      onChange(url)
      toast(t('uploaded'))
    } catch (err) {
      toast(err.code === 'invalid_type' ? t('invalid_file_type', { types: accept.join(', ') }) : err.message, 'error')
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }
  const isImg = value && /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(value)
  return (
    <div className={`uploader ${compact ? 'compact' : ''}`}>
      {value ? (
        isImg ? (
          <a href={value} target="_blank" rel="noreferrer"><img src={value} className="uploader-preview" alt="" /></a>
        ) : (
          <a href={value} target="_blank" rel="noreferrer" className="uploader-file"><Icon name="file" size={18} />{t('view_file')}</a>
        )
      ) : (
        <div className="uploader-empty">{t('no_file')}</div>
      )}
      <div className="uploader-actions">
        <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => ref.current?.click()}>
          <Icon name="upload" size={16} />
          {busy ? t('uploading') : value ? t('replace') : t('upload')}
        </button>
        {value && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onChange('')}>{t('remove')}</button>
        )}
      </div>
      <input ref={ref} type="file" hidden accept={accept.map((a) => `.${a}`).join(',')} onChange={onFile} />
    </div>
  )
}

/** Choose a button destination: internal page or custom URL */
export function LinkPicker({ value, onChange }) {
  const { lang, t } = useLang()
  const known = PAGE_LINKS.some((p) => p.value === value)
  const [custom, setCustom] = useState(!known && !!value)
  return (
    <div className="link-picker">
      <select
        className="input"
        value={custom ? '__custom' : value || ''}
        onChange={(e) => {
          if (e.target.value === '__custom') setCustom(true)
          else {
            setCustom(false)
            onChange(e.target.value)
          }
        }}
      >
        {PAGE_LINKS.map((p) => (
          <option key={p.value} value={p.value}>{p[lang]} ({p.value})</option>
        ))}
        <option value="__custom">{t('custom_link')}</option>
      </select>
      {custom && (
        <input className="input" dir="ltr" placeholder="/workers/housemaid  or  https://…" value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

export function Empty({ children }) {
  return <div className="a-empty">{children}</div>
}

/** Move item in array and return a new array */
export function moveItem(arr, index, dir) {
  const j = index + dir
  if (j < 0 || j >= arr.length) return arr
  const copy = arr.slice()
  ;[copy[index], copy[j]] = [copy[j], copy[index]]
  return copy
}
