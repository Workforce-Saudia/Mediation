// The Workforce Saudia chevron mark (vector), used as fallback logo and favicon.
export default function LogoMark({ size = 40, color = '#0aa19b', className = '' }) {
  return (
    <svg className={className} width={size} height={(size * 405) / 854} viewBox="0 0 854 405" fill={color} aria-hidden="true">
      <path d="M117 143 0 405l117-79 117 79z" />
      <path d="M427 143 310 405l117-79 117 79z" />
      <path d="M737 143 620 405l117-79 117 79z" />
      <path d="M156 0l116 79L388 0 272 263z" />
      <path d="M465 0l116 79L697 0 581 263z" />
    </svg>
  )
}
