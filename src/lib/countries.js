// Quick-pick list for adding countries in the dashboard (any ISO code can still be typed manually)
export const COMMON_COUNTRIES = [
  ['ph', 'الفلبين', 'Philippines'],
  ['id', 'إندونيسيا', 'Indonesia'],
  ['lk', 'سريلانكا', 'Sri Lanka'],
  ['in', 'الهند', 'India'],
  ['bd', 'بنغلاديش', 'Bangladesh'],
  ['pk', 'باكستان', 'Pakistan'],
  ['np', 'نيبال', 'Nepal'],
  ['ke', 'كينيا', 'Kenya'],
  ['ug', 'أوغندا', 'Uganda'],
  ['et', 'إثيوبيا', 'Ethiopia'],
  ['bi', 'بوروندي', 'Burundi'],
  ['tz', 'تنزانيا', 'Tanzania'],
  ['rw', 'رواندا', 'Rwanda'],
  ['gh', 'غانا', 'Ghana'],
  ['sl', 'سيراليون', 'Sierra Leone'],
  ['vn', 'فيتنام', 'Vietnam'],
  ['th', 'تايلاند', 'Thailand'],
  ['mm', 'ميانمار', 'Myanmar'],
  ['eg', 'مصر', 'Egypt'],
  ['sd', 'السودان', 'Sudan'],
  ['ma', 'المغرب', 'Morocco'],
  ['tn', 'تونس', 'Tunisia'],
]

export const flagUrl = (code, w = 80) => `https://flagcdn.com/w${w}/${String(code || '').toLowerCase()}.png`

export const ICON_CHOICES = [
  'home', 'car', 'medical', 'heart', 'baby', 'users', 'user', 'bolt', 'shield', 'search', 'check', 'star',
  'clock', 'file', 'edit', 'phone', 'globe', 'award', 'headset',
]
