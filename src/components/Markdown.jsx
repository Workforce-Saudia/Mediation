import { createElement } from 'react'

// Tiny, safe formatter for editable text:
//   # / ## / ### heading,  - bullet,  1. numbered,  **bold**,  [text](https://link)
function inline(text, keyBase) {
  const parts = []
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g
  let last = 0
  let m
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) {
      parts.push(<strong key={`${keyBase}-${i++}`}>{tok.slice(2, -2)}</strong>)
    } else {
      const mm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)
      const href = /^(https?:|mailto:|tel:|\/|#)/i.test(mm[2]) ? mm[2] : '#'
      const ext = /^https?:/i.test(href)
      parts.push(
        <a key={`${keyBase}-${i++}`} href={href} target={ext ? '_blank' : undefined} rel={ext ? 'noopener noreferrer' : undefined}>
          {mm[1]}
        </a>,
      )
    }
    last = m.index + tok.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export default function Markdown({ text = '', className = '' }) {
  const lines = String(text || '').replace(/\r/g, '').split('\n')
  const out = []
  let list = null
  let para = []

  const flushPara = () => {
    if (!para.length) return
    const k = out.length
    const children = []
    para.forEach((line, idx) => {
      if (idx) children.push(<br key={`br-${k}-${idx}`} />)
      children.push(...inline(line, `${k}-${idx}`))
    })
    out.push(<p key={k}>{children}</p>)
    para = []
  }
  const flushList = () => {
    if (!list) return
    const k = out.length
    out.push(
      createElement(
        list.type,
        { key: k },
        list.items.map((it, idx) => <li key={idx}>{inline(it, `${k}-${idx}`)}</li>),
      ),
    )
    list = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    let m
    if (!line) {
      flushPara()
      flushList()
    } else if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      flushPara()
      flushList()
      out.push(createElement(`h${m[1].length + 1}`, { key: out.length }, inline(m[2], out.length)))
    } else if ((m = line.match(/^[-*•]\s+(.*)$/))) {
      flushPara()
      if (!list || list.type !== 'ul') {
        flushList()
        list = { type: 'ul', items: [] }
      }
      list.items.push(m[1])
    } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      flushPara()
      if (!list || list.type !== 'ol') {
        flushList()
        list = { type: 'ol', items: [] }
      }
      list.items.push(m[1])
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()

  return <div className={`prose ${className}`}>{out}</div>
}
