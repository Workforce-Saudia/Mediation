import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/i18n'
import { toast } from '../lib/toast'
import { PageHeader } from './ui'
import Icon from '../components/Icon'
import { MfaEnroll, useMfaStatus } from './Mfa'

export default function Account() {
  const { profile } = useAuth()
  const { t } = useLang()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const mfa = useMfaStatus()

  const disableMfa = async () => {
    if (!window.confirm(t('mfa_disable_confirm'))) return
    for (const f of mfa.factors) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id })
      if (error) return toast(error.message, 'error')
    }
    toast(t('saved'))
    mfa.refresh()
    return undefined
  }

  const save = async (e) => {
    e.preventDefault()
    if (pw.length < 8) return toast(t('err_password'), 'error')
    if (pw !== pw2) return toast(t('err_password_match'), 'error')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return toast(error.message, 'error')
    setPw('')
    setPw2('')
    toast(t('password_changed'))
    return undefined
  }

  return (
    <>
      <PageHeader title={t('my_account')} />
      <div className="card narrow-card">
        <div className="kv">
          <span>{t('username')}</span><b dir="ltr">{profile.username}</b>
          <span>{t('full_name')}</span><b>{profile.full_name || '—'}</b>
          <span>{t('role')}</span><b>{t(`role_${profile.role}`)}</b>
        </div>
      </div>
      <div className="card narrow-card">
        <h2 className="card-title"><Icon name="shield" size={18} /> {t('mfa_title')}</h2>
        {mfa.loading ? null : enrolling ? (
          <MfaEnroll onDone={() => { setEnrolling(false); mfa.refresh() }} onCancel={() => setEnrolling(false)} />
        ) : mfa.factors.length ? (
          <>
            <p><span className="badge badge-published">{t('mfa_on')}</span></p>
            <p className="hint">{t('mfa_on_desc')}</p>
            {profile.role !== 'admin' && (
              <button type="button" className="btn btn-sm btn-ghost danger" onClick={disableMfa}>{t('mfa_disable')}</button>
            )}
          </>
        ) : (
          <>
            <p><span className="badge badge-draft">{t('mfa_off')}</span></p>
            <p className="hint">{t('mfa_off_desc')}</p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEnrolling(true)}>{t('mfa_enable')}</button>
          </>
        )}
      </div>
      <form className="card narrow-card" onSubmit={save}>
        <h2 className="card-title">{t('change_my_password')}</h2>
        <div className="field">
          <label className="lbl">{t('new_password')}</label>
          <input className="input" dir="ltr" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <div className="field">
          <label className="lbl">{t('confirm_password')}</label>
          <input className="input" dir="ltr" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        <button className="btn btn-primary" disabled={busy}>{t('save')}</button>
      </form>
    </>
  )
}
