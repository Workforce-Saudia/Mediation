import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { useContent } from '../lib/content'
import Icon from '../components/Icon'
import Markdown from '../components/Markdown'
import DynamicForm from '../components/DynamicForm'
import { Flag, Spinner, usePageTitle } from '../components/common'

export default function Book() {
  const { code } = useParams()
  const [sp] = useSearchParams()
  const profSlug = sp.get('profession')
  const { t, pick } = useLang()
  const { c } = useContent()
  const [st, setSt] = useState({ loading: Boolean(supabase), worker: null })

  usePageTitle(`${c('booking_title')} | ${c('site_name')}`)

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase
        .from('workers')
        .select('id,worker_code,name,age,photo_url,cv_url,status,countries(code,name_ar,name_en),worker_professions(cv_url,professions(id,slug,name_ar,name_en))')
        .eq('worker_code', code)
        .eq('status', 'published')
        .maybeSingle()
      setSt({ loading: false, worker: data })
    })()
  }, [code])

  const w = st.worker
  const profs = useMemo(() => (w?.worker_professions || []).map((x) => x.professions).filter(Boolean), [w])
  const chosenProf = profs.find((p) => p.slug === profSlug) || (profs.length === 1 ? profs[0] : null)
  const cv =
    (chosenProf && w?.worker_professions.find((x) => x.professions?.id === chosenProf.id)?.cv_url) ||
    w?.cv_url ||
    w?.worker_professions?.find((x) => x.cv_url)?.cv_url

  // keep these stable so the form doesn't reset on every render
  const prefill = useMemo(() => ({ worker_code: code }), [code])
  const extra = useMemo(
    () => ({
      worker_name: w?.name || '',
      worker_country: w?.countries?.name_ar || '',
      profession: chosenProf ? chosenProf.name_ar : profs.map((p) => p.name_ar).join(' / '),
    }),
    [w, chosenProf, profs],
  )

  return (
    <div className="book-page">
      <section className="page-hero">
        <div className="container">
          <h1>{c('booking_title')}</h1>
          <Markdown text={c('booking_intro')} className="page-hero-text" />
        </div>
      </section>
      <div className="container">
        {st.loading ? (
          <Spinner />
        ) : !w ? (
          <div className="empty-state">
            <Icon name="search" size={40} />
            <p>{t('worker_not_available')}</p>
            <Link to="/workers" className="btn btn-primary">{t('back_to_workers')}</Link>
          </div>
        ) : (
          <div className="book-grid">
            <aside className="card worker-summary">
              <div className="worker-summary-photo">
                {w.photo_url ? <img src={w.photo_url} alt={w.name} /> : <Icon name="user" size={64} strokeWidth={1.3} />}
              </div>
              <h2>{w.name}</h2>
              <dl className="worker-meta">
                <div><dt>{t('worker_id')}</dt><dd dir="ltr">{w.worker_code}</dd></div>
                {w.age ? <div><dt>{t('age')}</dt><dd>{w.age}</dd></div> : null}
                {w.countries && (
                  <div><dt>{t('nationality')}</dt><dd><Flag code={w.countries.code} /> {pick(w.countries, 'name')}</dd></div>
                )}
              </dl>
              <div className="tags">
                {profs.map((p) => (
                  <span key={p.id} className={`tag ${chosenProf?.id === p.id ? 'on' : ''}`}>{pick(p, 'name')}</span>
                ))}
              </div>
              {cv && (
                <a className="btn btn-outline btn-block" href={cv} target="_blank" rel="noopener noreferrer">
                  <Icon name="file" size={16} />
                  {t('show_cv')}
                </a>
              )}
              <Link to="/workers" className="link-back">
                <Icon name="back" className="flip" size={16} />
                {t('choose_another')}
              </Link>
            </aside>
            <div className="card form-card">
              <DynamicForm slug="booking" prefill={prefill} readOnly={['worker_code']} extra={extra} workerId={w.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
