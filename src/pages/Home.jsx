import { Link } from 'react-router-dom'
import { useContent } from '../lib/content'
import { useLang } from '../lib/i18n'
import { track } from '../lib/analytics'
import Icon from '../components/Icon'
import Markdown from '../components/Markdown'
import DynamicForm from '../components/DynamicForm'
import WhatsAppButton from '../components/WhatsAppButton'
import { SmartLink, useFeatures, usePageTitle } from '../components/common'

function SectionHead({ title, sub }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
      <span className="section-line" />
    </div>
  )
}

export default function Home() {
  const { c } = useContent()
  const { t, pick } = useLang()
  const why = useFeatures('why')
  const steps = useFeatures('service')
  usePageTitle(c('seo_title'))

  const heroImg = c('hero_image')
  const aboutImg = c('about_image')
  const phone = c('phone')
  const email = c('email')
  const wa = (c('whatsapp_number') || '').replace(/\D/g, '')

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className={`hero ${heroImg ? 'has-img' : ''}`} style={heroImg ? { backgroundImage: `url("${heroImg}")` } : undefined}>
        <div className="hero-overlay" />
        <div className="container hero-content">
          {c('hero_badge') && <span className="hero-badge">{c('hero_badge')}</span>}
          <h1>{c('hero_title')}</h1>
          {c('hero_subtitle') && <p className="hero-sub">{c('hero_subtitle')}</p>}
          <div className="hero-actions">
            <SmartLink to={c('hero_cta_link')} className="btn btn-accent btn-lg" onClick={() => track('cta_click', { cta: 'hero' })}>
              {c('hero_cta_text')}
              <Icon name="arrow" className="flip" size={18} />
            </SmartLink>
            {c('hero_cta2_text') && (
              <SmartLink to={c('hero_cta2_link')} className="btn btn-glass btn-lg">
                {c('hero_cta2_text')}
              </SmartLink>
            )}
          </div>
        </div>
      </section>

      {/* ---------- 1. ABOUT ---------- */}
      <section id="about" className="section">
        <div className="container split">
          <div className="split-text">
            {c('about_eyebrow') && <span className="eyebrow">{c('about_eyebrow')}</span>}
            <h2>{c('about_title')}</h2>
            <Markdown text={c('about_body')} />
            <SmartLink to={c('about_cta_link')} className="btn btn-primary btn-lg" onClick={() => track('cta_click', { cta: 'about' })}>
              {c('about_cta_text')}
              <Icon name="arrow" className="flip" size={18} />
            </SmartLink>
          </div>
          <div className="split-media">
            {aboutImg ? (
              <img src={aboutImg} alt={c('about_title')} loading="lazy" />
            ) : (
              <div className="media-placeholder">
                <Icon name="users" size={72} strokeWidth={1.4} />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ---------- 2. WHY US ---------- */}
      <section id="why" className="section section-tint">
        <div className="container">
          <SectionHead title={c('why_title')} sub={c('why_subtitle')} />
          <div className="feature-grid">
            {why.map((f) => (
              <div className="feature-card" key={f.id}>
                <div className="feature-icon"><Icon name={f.icon || 'check'} size={26} /></div>
                <h3>{pick(f, 'title')}</h3>
                {pick(f, 'body') && <p>{pick(f, 'body')}</p>}
              </div>
            ))}
          </div>
          <div className="center mt-lg">
            <SmartLink to={c('why_cta_link')} className="btn btn-primary btn-lg" onClick={() => track('cta_click', { cta: 'why' })}>
              {c('why_cta_text')}
              <Icon name="arrow" className="flip" size={18} />
            </SmartLink>
          </div>
        </div>
      </section>

      {/* ---------- 3. MEDIATION SERVICE ---------- */}
      <section id="mediation" className="section">
        <div className="container">
          <SectionHead title={c('service_title')} sub={c('service_subtitle')} />
          <div className="service-intro">
            <Markdown text={c('service_body')} />
          </div>
          <div className="steps">
            {steps.map((s, i) => (
              <div className="step" key={s.id}>
                <div className="step-num">{i + 1}</div>
                <div className="step-icon"><Icon name={s.icon || 'check'} size={22} /></div>
                <h3>{pick(s, 'title')}</h3>
                {pick(s, 'body') && <p>{pick(s, 'body')}</p>}
              </div>
            ))}
          </div>
          <div className="cta-band">
            <div>
              <h3>{c('service_cta_title')}</h3>
              {c('service_cta_sub') && <p>{c('service_cta_sub')}</p>}
            </div>
            <SmartLink to={c('service_cta_link')} className="btn btn-accent btn-xl pulse" onClick={() => track('cta_click', { cta: 'service' })}>
              {c('service_cta_text')}
              <Icon name="arrow" className="flip" size={20} />
            </SmartLink>
          </div>
        </div>
      </section>

      {/* ---------- 4. FAQ TEASER ---------- */}
      <section id="faq" className="section section-tint">
        <div className="container">
          <div className="faq-teaser">
            <div className="faq-teaser-icon"><Icon name="headset" size={40} /></div>
            <div className="faq-teaser-text">
              <h2>{c('faq_teaser_title')}</h2>
              <p>{c('faq_teaser_body')}</p>
            </div>
            <Link to="/faq" className="btn btn-primary btn-lg">
              {c('faq_teaser_cta')}
              <Icon name="arrow" className="flip" size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- 5. CONTACT ---------- */}
      <section id="contact" className="section">
        <div className="container contact-grid">
          <div className="contact-aside">
            <h2>{c('contact_title')}</h2>
            <Markdown text={c('contact_subtitle')} />
            <ul className="contact-list">
              {phone && <li><span className="ci"><Icon name="phone" size={18} /></span><a href={`tel:${phone}`} dir="ltr">{phone}</a></li>}
              {email && <li><span className="ci"><Icon name="mail" size={18} /></span><a href={`mailto:${email}`}>{email}</a></li>}
              {wa && <li><span className="ci"><Icon name="phone" size={18} /></span><a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">{t('whatsapp_chat')}</a></li>}
            </ul>
          </div>
          <div className="card form-card">
            <DynamicForm slug="contact" />
          </div>
        </div>
      </section>

      <WhatsAppButton />
    </>
  )
}
