import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/i18n'
import { toast } from '../lib/toast'
import { PageHeader } from './ui'

export default function Account() {
  const { profile } = useAuth()
  const { t } = useLang()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)

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
