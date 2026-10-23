import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchAll, supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { useContent } from '../lib/content'
import { track } from '../lib/analytics'
import Icon from '../components/Icon'
import Markdown from '../components/Markdown'
import { Flag, Spinner, usePageTitle } from '../components/common'

function WorkerCard({ w, country, profs, selProf }) {
  const { t, pick } = useLang()
  const wps = w.worker_professions || []
  const cv =
    (selProf && wps.find((x) => x.profession_id === selProf.id)?.cv_url) ||
    w.cv_url ||
    wps.find((x) => x.cv_url)?.cv_url
  const bookUrl = `/book/${encodeURIComponent(w.worker_code)}${selProf ? `?profession=${selProf.slug}` : ''}`
  return (
    <article className="worker-card">
      <div className="worker-photo">
        {w.photo_url ? <img src={w.photo_url} alt={w.name} loading="lazy" /> : <Icon name="user" size={64} strokeWidth={1.3} />}
        {country && (
          <span className="worker-flag">
            <Flag code={country.code} />
          </span>
        )}
      </div>
      <div className="worker-body">
        <h3>{w.name}</h3>
        <dl className="worker-meta">
          <div><dt>{t('worker_id')}</dt><dd dir="ltr">{w.worker_code}</dd></div>
          {w.age ? <div><dt>{t('age')}</dt><dd>{w.age}</dd></div> : null}
          {country && <div><dt>{t('nationality')}</dt><dd>{pick(country, 'name')}</dd></div>}
        </dl>
        <div className="tags">
          {profs.map((p) => (
            <span key={p.id} className="tag">{pick(p, 'name')}</span>
          ))}
        </div>
      </div>
      <div className="worker-actions">
        {cv ? (
          <a className="btn btn-outline btn-sm" href={cv} target="_blank" rel="noopener noreferrer" onClick={() => track('view_cv', { worker: w.worker_code })}>
            <Icon name="file" size={16} />
            {t('show_cv')}
          </a>
        ) : (
          <span className="btn btn-outline btn-sm disabled">{t('cv_unavailable')}</span>
        )}
        <Link className="btn btn-primary btn-sm" to={bookUrl} onClick={() => track('choose_worker', { worker: w.worker_code })}>
          <Icon name="tick" size={16} />
          {t('choose_worker')}
        </Link>
      </div>
    </article>
  )
}

export default function Workers() {
  const params = useParams()
  const profession = (params.profession || 'all').toLowerCase()
  const country = (params.country || 'all').toLowerCase()
  const navigate = useNavigate()
  const { t, pick } = useLang()
  const { c } = useContent()
  const [st, setSt] = useState({ loading: Boolean(supabase), professions: [], countries: [], workers: [] })

  usePageTitle(`${c('workers_title')} | ${c('site_name')}`)

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const [p, co, w] = await Promise.all([
        supabase.from('professions').select('*').eq('active', true).order('sort'),
        supabase.from('countries').select('*').eq('active', true).order('sort'),
        fetchAll(() =>
          supabase
            .from('workers')
            .select('id,worker_code,name,age,photo_url,cv_url,country_id,published_at,worker_professions(profession_id,cv_url)')
            .eq('status', 'published')
            .order('published_at', { ascending: false }),
        ).catch(() => []),
      ])
      setSt({ loading: false, professions: p.data || [], countries: co.data || [], workers: w })
    })()
  }, [])

  const { professions, countries, workers } = st

  const view = useMemo(() => {
    const hasProf = (w, pid) => (w.worker_professions || []).some((x) => x.profession_id === pid)
    // professions with the most CVs first
    const profList = professions
      .map((p) => ({ ...p, count: workers.filter((w) => hasProf(w, p.id)).length }))
      .sort((a, b) => b.count - a.count || a.sort - b.sort)
    const selProf = profession === 'all' ? null : professions.find((p) => p.slug === profession) || null
    const inProf = selProf ? workers.filter((w) => hasProf(w, selProf.id)) : workers
    // countries with the most CVs (within the chosen profession) first; hide empty ones
    const countryList = countries
      .map((co) => ({ ...co, count: inProf.filter((w) => w.country_id === co.id).length }))
      .filter((co) => co.count > 0)
      .sort((a, b) => b.count - a.count || a.sort - b.sort)
    const selCountry = country === 'all' ? null : countries.find((co) => co.code === country) || null
    const results = selCountry ? inProf.filter((w) => w.country_id === selCountry.id) : inProf
    return { profList, selProf, inProf, countryList, selCountry, results }
  }, [professions, countries, workers, profession, country])

  const { profList, selProf, inProf, countryList, selCountry, results } = view
  const countryById = useMemo(() => Object.fromEntries(countries.map((co) => [co.id, co])), [countries])
  const profById = useMemo(() => Object.fromEntries(professions.map((p) => [p.id, p])), [professions])

  const go = (p, co) => {
    if (p === 'all' && co === 'all') navigate('/workers')
    else navigate(`/workers/${p}${co !== 'all' ? `/${co}` : ''}`)
  }

  return (
    <div className="workers-page">
      <section className="page-hero">
        <div className="container">
          <h1>{c('workers_title')}</h1>
          <Markdown text={c('workers_intro')} className="page-hero-text" />
        </div>
      </section>

      <div className="container">
        {st.loading ? (
          <Spinner />
        ) : (
          <>
            {/* Profession tabs */}
            <div className="filter-block">
              <div className="filter-label"><Icon name="briefcase" size={18} />{t('choose_profession')}</div>
              <div className="tabs-scroll" role="tablist">
                <button type="button" role="tab" aria-selected={!selProf} className={`ptab ${!selProf ? 'on' : ''}`} onClick={() => go('all', 'all')}>
                  {t('all_professions')} <span className="count">{workers.length}</span>
                </button>
                {profList.map((p) => (
                  <button
                    type="button"
                    role="tab"
                    key={p.id}
                    aria-selected={selProf?.id === p.id}
                    className={`ptab ${selProf?.id === p.id ? 'on' : ''} ${p.count === 0 ? 'empty' : ''}`}
                    onClick={() => go(p.slug, 'all')}
                  >
                    <Icon name={p.icon || 'user'} size={18} />
                    {pick(p, 'name')} <span className="count">{p.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Country cards */}
            <div className="filter-block">
              <div className="filter-label"><Icon name="flag" size={18} />{t('choose_country')}</div>
              <div className="country-grid">
                <button type="button" className={`country-card ${!selCountry ? 'on' : ''}`} onClick={() => go(selProf?.slug || 'all', 'all')}>
                  <span className="country-globe"><Icon name="globe" size={22} /></span>
                  <span className="country-name">{t('all_countries')}</span>
                  <span className="count">{inProf.length}</span>
                </button>
                {countryList.map((co) => (
                  <button type="button" key={co.id} className={`country-card ${selCountry?.id === co.id ? 'on' : ''}`} onClick={() => go(selProf?.slug || 'all', co.code)}>
                    <Flag code={co.code} />
                    <span className="country-name">{pick(co, 'name')}</span>
                    <span className="count" title={t('available_cvs', { n: co.count })}>{co.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Results header (country page) */}
            <div className="results-head">
              {selCountry ? (
                <>
                  <Flag code={selCountry.code} size="lg" />
                  <div>
                    <h2>{pick(selCountry, 'name')}{selProf ? ` — ${pick(selProf, 'name')}` : ''}</h2>
                    <p>{t('available_cvs', { n: results.length })}</p>
                  </div>
                </>
              ) : (
                <div>
                  <h2>{selProf ? pick(selProf, 'name') : t('all_workers')}</h2>
                  <p>{t('available_cvs', { n: results.length })}</p>
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <div className="empty-state">
                <Icon name="search" size={40} />
                <Markdown text={c('workers_empty')} />
                <Link to="/#contact" className="btn btn-primary">{t('nav_contact')}</Link>
              </div>
            ) : (
              <div className="worker-grid">
                {results.map((w) => (
                  <WorkerCard
                    key={w.id}
                    w={w}
                    selProf={selProf}
                    country={countryById[w.country_id]}
                    profs={(w.worker_professions || []).map((x) => profById[x.profession_id]).filter(Boolean)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
