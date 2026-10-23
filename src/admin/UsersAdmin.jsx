import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { fmtDate, useLang } from '../lib/i18n'
import { toast } from '../lib/toast'
import Icon from '../components/Icon'
import { Spinner } from '../components/common'
import { Empty, Modal, PageHeader } from './ui'

const ERR_KEYS = {
  username_taken: 'err_username_taken',
  employee_id_taken: 'err_employee_id_taken',
  invalid_username: 'err_username',
  weak_password: 'err_password',
  cannot_deactivate_self: 'err_self',
  cannot_change_own_role: 'err_self',
  forbidden: 'no_access',
  server_not_configured: 'err_server_config',
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint32Array(10))
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

/** Visible password field with Generate + Copy, so the admin can hand it to the user */
function PasswordInput({ label, value, onChange }) {
  const { t } = useLang()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast(t('copied'))
    } catch {
      toast(value, 'success')
    }
  }
  return (
    <div className="field">
      <label className="lbl">{label || t('new_password')}</label>
      <div className="pw-row">
        <input className="input mono" dir="ltr" type="text" autoComplete="new-password" value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="btn btn-sm btn-outline" onClick={() => onChange(generatePassword())}><Icon name="refresh" size={14} />{t('generate')}</button>
        <button type="button" className="btn btn-sm btn-ghost" disabled={!value} onClick={copy}>{t('copy')}</button>
      </div>
      <div className="hint">{t('password_hint')}</div>
    </div>
  )
}

export default function UsersAdmin() {
  const { t, lang } = useLang()
  const { isAdmin, callAdmin, profile } = useAuth()
  const [users, setUsers] = useState(null)
  const [loadErr, setLoadErr] = useState('')
  const [create, setCreate] = useState(null)
  const [pw, setPw] = useState(null)
  const [edit, setEdit] = useState(null)
  const [busy, setBusy] = useState(false)

  const errMsg = (e) => (ERR_KEYS[e.message] ? t(ERR_KEYS[e.message]) : e.message)

  const load = useCallback(async () => {
    try {
      const r = await callAdmin({ action: 'list' })
      setUsers(r.users)
      setLoadErr('')
    } catch (e) {
      setLoadErr(e.message)
      setUsers([])
    }
  }, [callAdmin])

  useEffect(() => {
    if (isAdmin) load()
  }, [isAdmin, load])

  if (!isAdmin) return <Empty>{t('no_access')}</Empty>
  if (!users) return <Spinner />

  const run = async (body, okMsg) => {
    setBusy(true)
    try {
      await callAdmin(body)
      toast(okMsg || t('saved'))
      await load()
      return true
    } catch (e) {
      toast(errMsg(e), 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  const submitCreate = async () => {
    if (await run({ action: 'create', ...create }, t('user_created'))) setCreate(null)
  }
  const submitPw = async () => {
    if (await run({ action: 'set_password', id: pw.id, password: pw.password }, t('password_changed'))) setPw(null)
  }
  const submitEdit = async () => {
    if (await run({ action: 'update_profile', id: edit.id, full_name: edit.full_name, employee_id: edit.employee_id })) setEdit(null)
  }

  return (
    <>
      <PageHeader title={t('users')} sub={t('users_sub')}>
        <button type="button" className="btn btn-primary" onClick={() => setCreate({ username: '', full_name: '', employee_id: '', password: '', role: 'agent' })}><Icon name="plus" size={18} />{t('add_user')}</button>
      </PageHeader>

      {loadErr && <div className="notice notice-error">{t('users_load_error')} ({errMsg({ message: loadErr })})</div>}

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>{t('employee_id')}</th><th>{t('username')}</th><th>{t('full_name')}</th><th>{t('role')}</th><th>{t('status')}</th><th>{t('last_login')}</th><th /></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === profile.id
                return (
                  <tr key={u.id} className={u.active ? '' : 'inactive'}>
                    <td dir="ltr" className="mono">{u.employee_id || '—'}</td>
                    <td dir="ltr" className="mono">{u.username}{self && <span className="tag sm">{t('you')}</span>}</td>
                    <td>{u.full_name || '—'}</td>
                    <td>
                      <select className="input sm" value={u.role} disabled={self || busy} onChange={(e) => run({ action: 'set_role', id: u.id, role: e.target.value })}>
                        <option value="admin">{t('role_admin')}</option>
                        <option value="agent">{t('role_agent')}</option>
                      </select>
                    </td>
                    <td><span className={`badge ${u.active ? 'badge-published' : 'badge-retired'}`}>{u.active ? t('active') : t('inactive')}</span></td>
                    <td className="small nowrap">{fmtDate(u.last_sign_in_at, lang)}</td>
                    <td className="nowrap actions">
                      <button type="button" className="btn btn-sm btn-ghost" disabled={busy} title={t('edit')} onClick={() => setEdit({ id: u.id, username: u.username, full_name: u.full_name || '', employee_id: u.employee_id || '' })}><Icon name="edit" size={14} /></button>
                      <button type="button" className="btn btn-sm btn-outline" disabled={busy} onClick={() => setPw({ id: u.id, username: u.username, password: '' })}><Icon name="lock" size={14} />{t('change_password')}</button>
                      {!self && (u.active ? (
                        <button type="button" className="btn btn-sm btn-warn" disabled={busy} onClick={() => window.confirm(t('confirm_deactivate')) && run({ action: 'set_active', id: u.id, active: false })}>{t('deactivate')}</button>
                      ) : (
                        <button type="button" className="btn btn-sm btn-success" disabled={busy} onClick={() => run({ action: 'set_active', id: u.id, active: true })}>{t('reactivate')}</button>
                      ))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="hint mt">{t('roles_hint')}</p>
      </div>

      {create && (
        <Modal
          title={t('add_user')}
          onClose={() => setCreate(null)}
          footer={<><button type="button" className="btn btn-ghost" onClick={() => setCreate(null)}>{t('cancel')}</button><button type="button" className="btn btn-primary" disabled={busy} onClick={submitCreate}>{t('create')}</button></>}
        >
          <div className="field">
            <label className="lbl">{t('username')}</label>
            <input className="input mono" dir="ltr" autoComplete="off" value={create.username} onChange={(e) => setCreate((s) => ({ ...s, username: e.target.value.toLowerCase() }))} />
            <div className="hint">{t('username_hint')}</div>
          </div>
          <div className="field">
            <label className="lbl">{t('full_name')}</label>
            <input className="input" value={create.full_name} onChange={(e) => setCreate((s) => ({ ...s, full_name: e.target.value }))} />
          </div>
          <div className="field">
            <label className="lbl">{t('employee_id')}</label>
            <input className="input mono" dir="ltr" value={create.employee_id} onChange={(e) => setCreate((s) => ({ ...s, employee_id: e.target.value }))} />
            <div className="hint">{t('employee_id_hint')}</div>
          </div>
          <PasswordInput label={t('password')} value={create.password} onChange={(v) => setCreate((s) => ({ ...s, password: v }))} />
          <div className="field">
            <label className="lbl">{t('role')}</label>
            <select className="input" value={create.role} onChange={(e) => setCreate((s) => ({ ...s, role: e.target.value }))}>
              <option value="agent">{t('role_agent')}</option>
              <option value="admin">{t('role_admin')}</option>
            </select>
          </div>
        </Modal>
      )}

      {edit && (
        <Modal
          title={`${t('edit')} — ${edit.username}`}
          onClose={() => setEdit(null)}
          footer={<><button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>{t('cancel')}</button><button type="button" className="btn btn-primary" disabled={busy} onClick={submitEdit}>{t('save')}</button></>}
        >
          <div className="field">
            <label className="lbl">{t('full_name')}</label>
            <input className="input" value={edit.full_name} onChange={(e) => setEdit((s) => ({ ...s, full_name: e.target.value }))} />
          </div>
          <div className="field">
            <label className="lbl">{t('employee_id')}</label>
            <input className="input mono" dir="ltr" value={edit.employee_id} onChange={(e) => setEdit((s) => ({ ...s, employee_id: e.target.value }))} />
          </div>
        </Modal>
      )}

      {pw && (
        <Modal
          title={`${t('change_password')} — ${pw.username}`}
          onClose={() => setPw(null)}
          footer={<><button type="button" className="btn btn-ghost" onClick={() => setPw(null)}>{t('cancel')}</button><button type="button" className="btn btn-primary" disabled={busy} onClick={submitPw}>{t('save')}</button></>}
        >
          <p className="notice">{t('password_reset_info')}</p>
          <PasswordInput value={pw.password} onChange={(v) => setPw((s) => ({ ...s, password: v }))} />
        </Modal>
      )}
    </>
  )
}
