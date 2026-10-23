import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { useContent } from '../lib/content'
import Icon from '../components/Icon'
import Markdown from '../components/Markdown'
import DynamicForm from '../components/DynamicForm'
import WhatsAppButton from '../components/WhatsAppButton'
import { usePageTitle } from '../components/common'

export function Terms() {
  const { c } = useContent()
  usePageTitle(`${c('terms_title')} | ${c('site_name')}`)
  return (
    <div>
      <section className="page-hero">
        <div className="container narrow"><h1>{c('terms_title')}</h1></div>
      </section>
      <div className="container narrow">
        <div className="card prose-card"><Markdown text={c('terms_body')} /></div>
      </div>
    </div>
  )
}

export function Contact() {
  const { c } = useContent()
  usePageTitle(`${c('contact_title')} | ${c('site_name')}`)
  return (
    <div>
      <section className="page-hero">
        <div className="container narrow">
          <h1>{c('contact_title')}</h1>
          <Markdown text={c('contact_subtitle')} className="page-hero-text" />
        </div>
      </section>
      <div className="container narrow">
        <div className="card form-card"><DynamicForm slug="contact" /></div>
      </div>
    </div>
  )
}

/** Any extra form created in the dashboard gets its own URL: /form/<slug> */
export function FormPage() {
  const { slug } = useParams()
  const { pick } = useLang()
  const { c } = useContent()
  const [form, setForm] = useState(null)
  useEffect(() => {
    if (!supabase) return
    supabase.from('forms').select('*').eq('slug', slug).maybeSingle().then(({ data }) => setForm(data))
  }, [slug])
  usePageTitle(`${form ? pick(form, 'name') : ''} | ${c('site_name')}`)
  return (
    <div>
      <section className="page-hero">
        <div className="container narrow">
          <h1>{form ? pick(form, 'name') : ' '}</h1>
          {form && pick(form, 'description') && <Markdown text={pick(form, 'description')} className="page-hero-text" />}
        </div>
      </section>
      <div className="container narrow">
        <div className="card form-card"><DynamicForm slug={slug} /></div>
      </div>
    </div>
  )
}

export function ThankYou() {
  const { c } = useContent()
  const { t } = useLang()
  const [sp] = useSearchParams()
  usePageTitle(`${c('thanks_title')} | ${c('site_name')}`)
  return (
    <div className="container narrow thanks">
      {c('logo_vertical') && <img className="thanks-logo" src={c('logo_vertical')} alt={c('site_name')} />}
      <div className="thanks-icon"><Icon name="tick" size={48} strokeWidth={2.5} /></div>
      <h1>{c('thanks_title')}</h1>
      <Markdown text={c('thanks_body')} />
      <div className="thanks-actions">
        <Link to="/" className="btn btn-primary">{t('back_home')}</Link>
        {sp.get('form') === 'booking' ? (
          <Link to="/workers" className="btn btn-outline">{t('back_to_workers')}</Link>
        ) : (
          <Link to="/faq" className="btn btn-outline">{t('nav_faq')}</Link>
        )}
      </div>
      <WhatsAppButton />
    </div>
  )
}

export function NotFound() {
  const { t } = useLang()
  return (
    <div className="container narrow thanks">
      <h1>404</h1>
      <p>{t('not_found')}</p>
      <Link to="/" className="btn btn-primary">{t('back_home')}</Link>
    </div>
  )
}
