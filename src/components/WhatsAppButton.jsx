import { useContent } from '../lib/content'
import { useLang } from '../lib/i18n'
import { track } from '../lib/analytics'
import { WhatsAppIcon } from './Icon'

export default function WhatsAppButton() {
  const { c } = useContent()
  const { t } = useLang()
  const num = (c('whatsapp_number') || '').replace(/\D/g, '')
  if (!num) return null
  const msg = c('whatsapp_message')
  const href = `https://wa.me/${num}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`
  return (
    <a
      className="wa-float"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('whatsapp_chat')}
      title={t('whatsapp_chat')}
      onClick={() => track('whatsapp_click', { page: window.location.pathname })}
    >
      <WhatsAppIcon size={32} />
    </a>
  )
}
