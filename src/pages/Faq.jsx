import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../lib/i18n'
import { useContent } from '../lib/content'
import Icon from '../components/Icon'
import Markdown from '../components/Markdown'
import { Spinner, usePageTitle } from '../components/common'

function youtubeId(url) {
  const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m ? m[1] : null
}

function Attachment({ a }) {
  const { t, pick } = useLang()
  const label = pick(a, 'label')
  if (a.type === 'image') {
    return (
      <figure className="att att-image">
        <a href={a.url} target="_blank" rel="noopener noreferrer"><img src={a.url} alt={label || ''} loading="lazy" /></a>
        {label && <figcaption>{label}</figcaption>}
      </figure>
    )
  }
  if (a.type === 'pdf') {
    return (
      <div className="att att-pdf">
        <iframe src={a.url} title={label || 'PDF'} loading="lazy" />
        <a className="btn btn-outline btn-sm" href={a.url} target="_blank" rel="noopener noreferrer">
          <Icon name="file" size={16} />
          {label || t('open_pdf')}
        </a>
      </div>
    )
  }
  if (a.type === 'video') {
    const yt = youtubeId(a.url)
    return (
      <div className="att att-video">
        {yt ? (
          <iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title={label || 'Video'} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />
        ) : (
          <video src={a.url} controls preload="metadata" />
        )}
        {label && <p className="muted">{label}</p>}
      </div>
    )
  }
  return (
    <a className="btn btn-outline btn-sm att-link" href={a.url} target="_blank" rel="noopener noreferrer">
      <Icon name="external" size={16} />
      {label || t('open_link')}
    </a>
  )
}

const KIND_ICON = (it) => {
  if (it.kind === 'link') return 'external'
  const types = (it.attachments || []).map((a) => a.type)
  if (types.includes('video')) return 'video'
  if (types.includes('pdf')) return 'file'
  if (types.includes('image')) return 'image'
  return 'chevron'
}

export default function Faq() {
  const { t, pick } = useLang()
  const { c } = useContent()
  const [items, setItems] = useState(null)
  const [open, setOpen] = useState(null)
  usePageTitle(`${c('faq_title')} | ${c('site_name')}`)

  useEffect(() => {
    if (!supabase) {
      setItems([])
      return
    }
    supabase.from('faq_items').select('*').eq('active', true).order('sort').then(({ data }) => setItems(data || []))
  }, [])

  return (
    <div className="faq-page">
      <section className="page-hero page-hero-plain">
        <div className="container narrow">
          <h1>{c('faq_title')}</h1>
          <p>{c('faq_subtitle')}</p>
        </div>
      </section>
      <div className="container narrow">
        <div className="faq-banner">
          <Icon name="headset" size={40} />
          <h2>{c('faq_banner_title')}</h2>
          <p>{c('faq_banner_body')}</p>
        </div>
        {items === null ? (
          <Spinner />
        ) : (
          <div className="faq-list">
            {items.map((it) =>
              it.kind === 'link' ? (
                <a key={it.id} className="faq-item faq-q" href={it.link_url || '#'} target="_blank" rel="noopener noreferrer">
                  <span className="faq-q-icon"><Icon name="external" size={18} /></span>
                  <span className="faq-q-text">{pick(it, 'title')}</span>
                  <Icon name="arrow" className="flip faq-chev" size={18} />
                </a>
              ) : (
                <div key={it.id} className={`faq-item ${open === it.id ? 'open' : ''}`}>
                  <button type="button" className="faq-q" aria-expanded={open === it.id} onClick={() => setOpen(open === it.id ? null : it.id)}>
                    <span className="faq-q-icon"><Icon name={KIND_ICON(it) === 'chevron' ? 'search' : KIND_ICON(it)} size={18} /></span>
                    <span className="faq-q-text">{pick(it, 'title')}</span>
                    <Icon name="chevron" className="faq-chev" size={18} />
                  </button>
                  {open === it.id && (
                    <div className="faq-a">
                      {pick(it, 'body') && <Markdown text={pick(it, 'body')} />}
                      {(it.attachments || []).length > 0 && (
                        <div className="att-list">
                          {it.attachments.map((a, i) => <Attachment key={i} a={a} />)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        )}
        <div className="center mt-lg">
          <Link to="/" className="btn btn-outline">
            <Icon name="back" className="flip" size={16} />
            {t('back_home')}
          </Link>
        </div>
      </div>
    </div>
  )
}
