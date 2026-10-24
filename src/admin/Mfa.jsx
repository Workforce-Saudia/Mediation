import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { toast } from '../lib/toast'
import Icon from '../components/Icon'
import { latinDigits } from '../components/common'

// Two-step login (TOTP authenticator app: Google Authenticator, Microsoft Authenticator, Authy…)
// using Supabase Auth MFA. The database (migration-003) requires it for Admin actions.

export function useMfaStatus() {
  const [st, setSt] = useState({ loading: true, currentLevel: null, nextLevel: null, factors: [] })
  const refresh = useCallback(async () => {
    const [aal, list] = await Promise.all([supabase.auth.mfa.getAuthenticatorAssuranceLevel(), supabase.auth.mfa.listFactors()])
    setSt({
      loading: false,
      currentLevel: aal.data?.currentLevel || 'aal1',
      nextLevel: aal.data?.nextLevel || 'aal1',
      factors: list.data?.totp || [],
      error: aal.error || list.error || null,
    })
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh])
  return { ...st, refresh }
}

function CodeInput({ value, onChange, onEnter }) {
  return (
    <input
      className="input code-otp"
      dir="ltr"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      autoFocus
      placeholder="000000"
      value={value}
      onChange={(e) => onChange(latinDigits(e.target.value).replace(/\D/g, '').slice(0, 6))}
      onKeyDown={(e) => e.key === 'Enter' && value.length === 6 && onEnter()}
    />
  )
}

/** Ask for the 6-digit code (user already has an authenticator set up) */
export function MfaChallenge({ factors, onDone, onCancel }) {
  const { t } = useLang()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const verify = async () => {
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factors[0].id, code })
    setBusy(false)
    if (error) {
      setErr(t('mfa_wrong_code'))
      setCode('')
      return
    }
    onDone()
  }
  return (
    <div className="mfa-box">
      <div className="mfa-icon"><Icon name="lock" size={30} /></div>
      <h2>{t('mfa_enter_title')}</h2>
      <p className="muted">{t('mfa_enter_desc')}</p>
      <CodeInput value={code} onChange={setCode} onEnter={verify} />
      {err && <div className="notice notice-error">{err}</div>}
      <button type="button" className="btn btn-primary btn-block" disabled={busy || code.length !== 6} onClick={verify}>{busy ? t('please_wait') : t('mfa_verify')}</button>
      {onCancel && <button type="button" className="btn btn-ghost btn-block" onClick={onCancel}>{t('logout')}</button>}
      <p className="hint">{t('mfa_lost_phone')}</p>
    </div>
  )
}

/** Set up an authenticator app (QR code + first code) */
export function MfaEnroll({ onDone, onCancel, mandatory }) {
  const { t } = useLang()
  const [enrollment, setEnrollment] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      // clean up any half-finished setup first
      const { data: list } = await supabase.auth.mfa.listFactors()
      for (const f of list?.all || []) {
        if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `WFS ${new Date().toISOString().slice(0, 16)}` })
      if (!alive) return
      if (error) setErr(error.message)
      else setEnrollment(data)
    })()
    return () => {
      alive = false
    }
  }, [])

  const verify = async () => {
    setBusy(true)
    setErr('')
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.id, code })
    setBusy(false)
    if (error) {
      setErr(t('mfa_wrong_code'))
      setCode('')
      return
    }
    toast(t('mfa_enabled'))
    onDone()
  }

  return (
    <div className="mfa-box">
      <div className="mfa-icon"><Icon name="shield" size={30} /></div>
      <h2>{t('mfa_setup_title')}</h2>
      {mandatory && <p className="notice">{t('mfa_required_admin')}</p>}
      <ol className="steps-list mfa-steps">
        <li>{t('mfa_step1')}</li>
        <li>{t('mfa_step2')}</li>
        <li>{t('mfa_step3')}</li>
      </ol>
      {enrollment ? (
        <>
          <img className="mfa-qr" src={enrollment.totp.qr_code} alt="QR code" />
          <details className="advanced">
            <summary>{t('mfa_cant_scan')}</summary>
            <code className="mfa-secret" dir="ltr">{enrollment.totp.secret}</code>
          </details>
          <CodeInput value={code} onChange={setCode} onEnter={verify} />
          {err && <div className="notice notice-error">{err}</div>}
          <button type="button" className="btn btn-primary btn-block" disabled={busy || code.length !== 6} onClick={verify}>{busy ? t('please_wait') : t('mfa_activate')}</button>
        </>
      ) : err ? (
        <div className="notice notice-error">{err}</div>
      ) : (
        <div className="spinner-wrap"><div className="spinner" /></div>
      )}
      {onCancel && <button type="button" className="btn btn-ghost btn-block" onClick={onCancel}>{mandatory ? t('logout') : t('cancel')}</button>}
    </div>
  )
}
