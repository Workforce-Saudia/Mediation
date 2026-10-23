import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fmtDate, useLang } from '../lib/i18n'
import { useAuth } from '../lib/auth'
import Icon from '../components/Icon'
import { Spinner } from '../components/common'
import { PageHeader, StatusBadge } from './ui'

export default function Dashboard() {
  const { t, pick, lang } = useLang()
  const { profile } = useAuth()
  const [d, setD] = useState(null)

  useEffect(() => {
    ;(async () => {
      const count = (table, filters) => {
        let q = supabase.from(table).select('*', { count: 'exact', head: true })
        for (const [k, v] of Object.entries(filters)) q = q.eq(k, v)
        return q.then((r) => r.count || 0)
      }
      const [f, recent, published, draft, retired] = await Promise.all([
        supabase.from('forms').select('slug,name_ar,name_en').order('created_at'),
        supabase.from('submissions').select('id,form_slug,data,status,created_at').order('created_at', { ascending: false }).limit(8),
        count('workers', { status: 'published' }),
        count('workers', { status: 'draft' }),
        count('workers', { status: 'retired' }),
      ])
      const forms = f.data || []
      const newCounts = await Promise.all(forms.map((x) => count('submissions', { form_slug: x.slug, status: 'new' })))
      const perForm = {}
      forms.forEach((x, i) => { perForm[x.slug] = { new: newCounts[i] } })
      setD({ ws: { published, draft, retired }, perForm, forms, recent: recent.data || [] })
    })()
  }, [])

  if (!d) return <Spinner />
  const formName = (slug) => pick(d.forms.find((x) => x.slug === slug), 'name') || slug

  return (
    <>
      <PageHeader title={t('welcome', { name: profile.full_name || profile.username })} sub={t('dashboard_sub')}>
        <Link to="/admin/workers/new" className="btn btn-primary"><Icon name="plus" size={18} />{t('add_worker')}</Link>
      </PageHeader>

      <div className="stat-grid">
        <Link to="/admin/workers?status=published" className="stat"><span className="stat-ico ok"><Icon name="check" /></span><div><b>{d.ws.published}</b><small>{t('published_workers')}</small></div></Link>
        <Link to="/admin/workers?status=draft" className="stat"><span className="stat-ico"><Icon name="edit" /></span><div><b>{d.ws.draft}</b><small>{t('draft_workers')}</small></div></Link>
        <Link to="/admin/workers?status=retired" className="stat"><span className="stat-ico muted"><Icon name="history" /></span><div><b>{d.ws.retired}</b><small>{t('retired_workers')}</small></div></Link>
        {d.forms.map((f) => (
          <Link key={f.slug} to={`/admin/submissions/${f.slug}`} className="stat">
            <span className="stat-ico accent"><Icon name="inbox" /></span>
            <div>
              <b>{d.perForm[f.slug]?.new || 0}</b>
              <small>{t('new_entries_in', { form: pick(f, 'name') })}</small>
            </div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="card-head">
          <h2>{t('recent_submissions')}</h2>
          <Link to="/admin/submissions" className="btn btn-ghost btn-sm">{t('view_all')}</Link>
        </div>
        {d.recent.length === 0 ? (
          <p className="muted">{t('no_entries')}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>{t('date')}</th><th>{t('form')}</th><th>{t('name')}</th><th>{t('phone')}</th><th>{t('status')}</th></tr>
              </thead>
              <tbody>
                {d.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="nowrap">{fmtDate(r.created_at, lang)}</td>
                    <td><Link to={`/admin/submissions/${r.form_slug}`}>{formName(r.form_slug)}</Link></td>
                    <td>{r.data?.full_name || r.data?.name || '—'}</td>
                    <td dir="ltr">{r.data?.phone || '—'}</td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
