/**
 * Every editable piece of website text/image/link lives here with its default value.
 * The dashboard (Content page) shows these grouped; saved values in Supabase override them.
 *
 * kind:
 *   text      – one line, Arabic + English
 *   textarea  – multi-line, Arabic + English (supports simple formatting: # heading, - bullet, **bold**, [link](url))
 *   image     – one uploaded image (same for both languages)
 *   link      – a destination: internal page (/workers, /faq, /#contact …) or external URL
 *   setting   – one plain value (phone number, IDs …)
 */

export const CONTENT_GROUPS = [
  { id: 'general', ar: 'إعدادات عامة', en: 'General settings', preview: '/' },
  { id: 'hero', ar: 'الصفحة الرئيسية – البانر', en: 'Home – Hero banner', preview: '/' },
  { id: 'about', ar: 'الرئيسية – من نحن', en: 'Home – About', preview: '/#about' },
  { id: 'why', ar: 'الرئيسية – لماذا نحن', en: 'Home – Why us', preview: '/#why' },
  { id: 'service', ar: 'الرئيسية – خدمة الوساطة', en: 'Home – Mediation service', preview: '/#mediation' },
  { id: 'faq_teaser', ar: 'الرئيسية – الأسئلة الشائعة', en: 'Home – FAQ teaser', preview: '/#faq' },
  { id: 'contact', ar: 'الرئيسية – تواصل معنا', en: 'Home – Contact', preview: '/#contact' },
  { id: 'workers', ar: 'صفحة اختيار العمالة', en: 'Worker selection page', preview: '/workers' },
  { id: 'booking', ar: 'نموذج الحجز', en: 'Booking form page', preview: '/workers' },
  { id: 'faq', ar: 'صفحة الأسئلة الشائعة', en: 'FAQ page', preview: '/faq' },
  { id: 'terms', ar: 'الشروط والأحكام', en: 'Terms & conditions', preview: '/terms' },
  { id: 'privacy', ar: 'سياسة الخصوصية (PDPL)', en: 'Privacy policy (PDPL)', preview: '/privacy' },
  { id: 'thankyou', ar: 'صفحة الشكر', en: 'Thank-you page', preview: '/thank-you' },
]

const E = (group, key, kind, label, ar, en) => ({ group, key, kind, label, ar, en })
const S = (group, key, kind, label, value) => ({ group, key, kind, label, value })

export const CONTENT_DEFAULTS = [
  // ---------- General ----------
  E('general', 'site_name', 'text', ['اسم الموقع', 'Site name'], 'ورك فورس السعودية', 'Workforce Saudia'),
  S('general', 'logo', 'image', ['الشعار الأفقي (رأس الصفحة والتذييل) — تُزال الخلفية البيضاء والهوامش تلقائياً', 'Horizontal logo (header & footer) — white background and margins are removed automatically'], ''),
  S('general', 'logo_vertical', 'image', ['الشعار العمودي (صفحة الدخول وصفحة الشكر)', 'Vertical logo (login & thank-you pages)'], ''),
  S('general', 'logo_light', 'image', ['شعار للخلفيات الداكنة (اختياري — إن تُرك فارغاً يُعرض الشعار الأفقي باللون الأبيض)', 'Logo for dark backgrounds (optional — if empty, the horizontal logo is shown in white)'], ''),
  E('general', 'seo_title', 'text', ['عنوان الصفحة في جوجل', 'Browser / Google title'], 'ورك فورس السعودية | خدمة الوساطة للعمالة المنزلية', 'Workforce Saudia | Domestic worker mediation service'),
  E('general', 'seo_description', 'textarea', ['وصف الموقع في جوجل', 'Google description'], 'اختر العمالة المنزلية المناسبة من بين سير ذاتية موثوقة عبر خدمة الوساطة من ورك فورس السعودية.', 'Choose the right domestic worker from trusted CVs through the Workforce Saudia mediation service.'),
  E('general', 'header_cta_text', 'text', ['زر أعلى الصفحة – النص', 'Header button – text'], 'احجز الآن', 'Book now'),
  S('general', 'header_cta_link', 'link', ['زر أعلى الصفحة – الوجهة', 'Header button – destination'], '/workers'),
  S('general', 'whatsapp_number', 'setting', ['رقم واتساب (بالصيغة الدولية مثل 9665XXXXXXXX)', 'WhatsApp number (international, e.g. 9665XXXXXXXX)'], '966500000000'),
  E('general', 'whatsapp_message', 'text', ['رسالة واتساب الافتراضية', 'Default WhatsApp message'], 'السلام عليكم، أرغب في الاستفسار عن خدمة الوساطة', 'Hello, I would like to ask about the mediation service'),
  S('general', 'phone', 'setting', ['رقم الهاتف (يظهر في التذييل)', 'Phone (shown in footer)'], ''),
  S('general', 'email', 'setting', ['البريد الإلكتروني', 'Email'], ''),
  S('general', 'cr_number', 'setting', ['رقم السجل التجاري', 'Commercial registration no.'], '7002891070'),
  E('general', 'footer_about', 'textarea', ['نبذة في التذييل', 'Footer description'], 'حلول متكاملة لتوفير الكوادر البشرية بكفاءة واحترافية.', 'Integrated manpower solutions delivered efficiently and professionally.'),
  S('general', 'gtm_id', 'setting', ['معرف Google Tag Manager (مثل GTM-XXXXXXX) لتتبع الحملات', 'Google Tag Manager ID (e.g. GTM-XXXXXXX) for campaign tracking'], ''),

  // ---------- Hero ----------
  S('hero', 'hero_image', 'image', ['صورة البانر (يفضل 1920×900)', 'Banner image (1920×900 recommended)'], ''),
  E('hero', 'hero_badge', 'text', ['شارة صغيرة فوق العنوان', 'Small badge above title'], 'خدمة الوساطة عبر مساند', 'Mediation service via Musaned'),
  E('hero', 'hero_title', 'text', ['العنوان الرئيسي', 'Main headline'], 'استقدم عمالتك المنزلية بثقة وسهولة', 'Recruit your domestic worker with confidence'),
  E('hero', 'hero_subtitle', 'textarea', ['النص تحت العنوان', 'Text under headline'], 'اختر العاملة المناسبة من بين سير ذاتية موثوقة لعدة جنسيات، وأكمل طلبك خلال دقائق — ونحن نتابع معك حتى الوصول.', 'Pick the right worker from trusted CVs across many nationalities and complete your request in minutes — we follow up until arrival.'),
  E('hero', 'hero_cta_text', 'text', ['الزر الرئيسي – النص', 'Main button – text'], 'اختر العاملة الآن', 'Choose your worker now'),
  S('hero', 'hero_cta_link', 'link', ['الزر الرئيسي – الوجهة', 'Main button – destination'], '/workers'),
  E('hero', 'hero_cta2_text', 'text', ['الزر الثانوي – النص (اتركه فارغاً لإخفائه)', 'Secondary button – text (empty = hidden)'], 'تواصل معنا', 'Contact us'),
  S('hero', 'hero_cta2_link', 'link', ['الزر الثانوي – الوجهة', 'Secondary button – destination'], '/#contact'),

  // ---------- About ----------
  E('about', 'about_eyebrow', 'text', ['عنوان صغير', 'Small label'], 'من نحن', 'About us'),
  E('about', 'about_title', 'text', ['العنوان', 'Title'], 'ورك فورس السعودية… شريكك في استقدام العمالة المنزلية', 'Workforce Saudia… your partner in domestic recruitment'),
  E('about', 'about_body', 'textarea', ['النص', 'Text'],
    'ورك فورس السعودية شركة متخصصة في حلول الكوادر البشرية وتوفير العمالة المنزلية بكفاءة واحترافية.\n\nمن خلال **خدمة الوساطة** نساعدك على اختيار العاملة أو السائق أو المربية المناسبة من دول متعددة، ونتولى جميع الإجراءات عبر منصة مساند حتى وصول العمالة إليك.',
    'Workforce Saudia specializes in manpower solutions and providing domestic workers efficiently and professionally.\n\nThrough our **mediation service** we help you choose the right maid, driver or nanny from many countries, and we handle all procedures on Musaned until the worker arrives.'),
  S('about', 'about_image', 'image', ['صورة القسم', 'Section image'], ''),
  E('about', 'about_cta_text', 'text', ['الزر – النص', 'Button – text'], 'ابدأ حجز خدمة الوساطة', 'Start booking the mediation service'),
  S('about', 'about_cta_link', 'link', ['الزر – الوجهة', 'Button – destination'], '/workers'),

  // ---------- Why ----------
  E('why', 'why_title', 'text', ['العنوان', 'Title'], 'لماذا نحن؟', 'Why us?'),
  E('why', 'why_subtitle', 'text', ['النص تحت العنوان', 'Subtitle'], 'نلتزم بالجودة والشفافية في كل خطوة', 'Quality and transparency in every step'),
  E('why', 'why_cta_text', 'text', ['الزر – النص', 'Button – text'], 'تصفح السير الذاتية', 'Browse the CVs'),
  S('why', 'why_cta_link', 'link', ['الزر – الوجهة', 'Button – destination'], '/workers'),

  // ---------- Service ----------
  E('service', 'service_title', 'text', ['العنوان', 'Title'], 'خدمة الوساطة', 'Mediation service'),
  E('service', 'service_subtitle', 'text', ['النص تحت العنوان', 'Subtitle'], 'استقدام العمالة المنزلية بخطوات واضحة ومضمونة', 'Domestic recruitment in clear, reliable steps'),
  E('service', 'service_body', 'textarea', ['شرح الخدمة', 'Service explanation'],
    'خدمة الوساطة تتيح لك اختيار العمالة المنزلية بنفسك من بين سير ذاتية جاهزة ومحدّثة، بينما نتولى نحن إجراءات التعاقد والاستقدام عبر منصة **مساند** الرسمية.\n\nكل ما تحتاجه هو تأشيرة صادرة من مساند، ثم اختيار العاملة المناسبة وتعبئة نموذج الطلب.',
    'The mediation service lets you choose your domestic worker yourself from ready, up-to-date CVs, while we handle contracting and recruitment through the official **Musaned** platform.\n\nAll you need is a visa issued from Musaned, then pick the right worker and fill in the request form.'),
  E('service', 'service_cta_title', 'text', ['شريط الدعوة – العنوان', 'CTA band – title'], 'جاهز لاختيار العاملة المناسبة؟', 'Ready to choose the right worker?'),
  E('service', 'service_cta_sub', 'text', ['شريط الدعوة – النص', 'CTA band – text'], 'تصفح السير الذاتية المتاحة الآن حسب المهنة والجنسية', 'Browse available CVs by profession and nationality'),
  E('service', 'service_cta_text', 'text', ['الزر – النص', 'Button – text'], 'ابدأ اختيار العاملة', 'Start choosing a worker'),
  S('service', 'service_cta_link', 'link', ['الزر – الوجهة', 'Button – destination'], '/workers'),

  // ---------- FAQ teaser ----------
  E('faq_teaser', 'faq_teaser_title', 'text', ['العنوان', 'Title'], 'الأسئلة الشائعة', 'Frequently asked questions'),
  E('faq_teaser', 'faq_teaser_body', 'textarea', ['النص', 'Text'], 'من خلال صفحة الأسئلة الشائعة نجيب على معظم استفساراتكم ونرشدكم خطوة بخطوة خلال الإجراءات اللازمة.', 'Our FAQ page answers most of your questions and guides you step by step through the required procedures.'),
  E('faq_teaser', 'faq_teaser_cta', 'text', ['الزر – النص', 'Button – text'], 'تصفح الأسئلة الشائعة', 'Browse the FAQ'),

  // ---------- Contact ----------
  E('contact', 'contact_title', 'text', ['العنوان', 'Title'], 'تواصل معنا', 'Contact us'),
  E('contact', 'contact_subtitle', 'textarea', ['النص', 'Text'], 'نحن هنا لخدمتك. أرسل لنا شكوى أو استفسار أو اقتراح وسيتواصل معك فريقنا في أقرب وقت.', 'We are here to help. Send us a complaint, inquiry or suggestion and our team will get back to you shortly.'),

  // ---------- Workers page ----------
  E('workers', 'workers_title', 'text', ['عنوان الصفحة', 'Page title'], 'اختر العاملة المناسبة لك', 'Choose the right worker for you'),
  E('workers', 'workers_intro', 'textarea', ['نبذة عن خدمة الوساطة', 'Mediation service brief'], 'اختر المهنة ثم الدولة لعرض السير الذاتية المتاحة. اضغط «عرض السيرة الذاتية» للاطلاع على التفاصيل، ثم «اختيار» لإكمال طلبك.', 'Choose a profession, then a country to see available CVs. Tap “Show CV” for details, then “Choose” to complete your request.'),
  E('workers', 'workers_empty', 'textarea', ['رسالة عند عدم توفر سير ذاتية', 'Message when no CVs are available'], 'لا توجد سير ذاتية متاحة حالياً لهذا الاختيار. تواصل معنا وسنساعدك في إيجاد الأنسب.', 'No CVs are available for this selection right now. Contact us and we will help you find the right match.'),

  // ---------- Booking ----------
  E('booking', 'booking_title', 'text', ['عنوان صفحة الحجز', 'Booking page title'], 'إكمال طلب الحجز', 'Complete your booking'),
  E('booking', 'booking_intro', 'textarea', ['نص توضيحي', 'Intro text'], 'يرجى تعبئة البيانات التالية بدقة، وسيتواصل معك فريقنا لإتمام التعاقد عبر منصة مساند.', 'Please fill in the details accurately; our team will contact you to finalize the contract on Musaned.'),

  // ---------- FAQ page ----------
  E('faq', 'faq_title', 'text', ['عنوان الصفحة', 'Page title'], 'الأسئلة الشائعة', 'Frequently asked questions'),
  E('faq', 'faq_subtitle', 'text', ['النص تحت العنوان', 'Subtitle'], 'يمكنكم الضغط على أي سؤال لعرض التفاصيل', 'Tap any question to see the details'),
  E('faq', 'faq_banner_title', 'text', ['البطاقة – العنوان', 'Banner – title'], 'مرحباً بكم في مركز المساعدة', 'Welcome to the help center'),
  E('faq', 'faq_banner_body', 'text', ['البطاقة – النص', 'Banner – text'], 'نقدم لكم إجابات على أكثر الأسئلة شيوعاً حول خدماتنا', 'Answers to the most common questions about our services'),

  // ---------- Terms ----------
  E('terms', 'terms_title', 'text', ['العنوان (يظهر أيضاً كرابط في التذييل)', 'Title (also the footer link)'], 'الشروط والأحكام', 'Terms & Conditions'),
  E('terms', 'terms_body', 'textarea', ['نص الشروط والأحكام', 'Terms text'],
    '## مقدمة\nباستخدامك لهذا الموقع وتقديم طلب عبر خدمة الوساطة فإنك توافق على الشروط والأحكام التالية.\n\n## الطلبات\n- تقديم الطلب لا يعني حجزاً نهائياً للعامل/العاملة حتى إتمام التعاقد عبر منصة مساند.\n- يلتزم العميل بصحة البيانات المدخلة ورقم التأشيرة.\n\n## الخصوصية\nنستخدم بياناتك فقط لغرض معالجة طلبك والتواصل معك.\n\n## التواصل\nلأي استفسار يرجى التواصل معنا عبر نموذج تواصل معنا أو واتساب.',
    '## Introduction\nBy using this website and submitting a request through the mediation service you agree to the following terms.\n\n## Requests\n- Submitting a request is not a final reservation of the worker until the contract is completed on Musaned.\n- The customer is responsible for the accuracy of the data and visa number.\n\n## Privacy\nWe use your data only to process your request and contact you.\n\n## Contact\nFor any question please use the contact form or WhatsApp.'),

  // ---------- Privacy (PDPL) — DRAFT, to be reviewed by the legal department ----------
  E('privacy', 'privacy_title', 'text', ['العنوان (يظهر أيضاً كرابط في التذييل وفي النماذج)', 'Title (also the footer link and form checkbox link)'], 'سياسة الخصوصية وحماية البيانات الشخصية', 'Privacy & Personal Data Protection Policy'),
  E('privacy', 'privacy_updated', 'text', ['تاريخ آخر تحديث', 'Last updated'], 'آخر تحديث: أكتوبر 2026', 'Last updated: October 2026'),
  E('privacy', 'privacy_body', 'textarea', ['نص السياسة', 'Policy text'],
    '> مسودة — تخضع للمراجعة من الإدارة القانونية.\n\n## مقدمة\nتلتزم شركة ورك فورس السعودية بحماية بياناتك الشخصية وفقاً لنظام حماية البيانات الشخصية في المملكة العربية السعودية ولوائحه التنفيذية. توضح هذه السياسة البيانات التي نجمعها وكيف نستخدمها ونحميها، وحقوقك تجاهها.\n\n## البيانات التي نجمعها\n- الاسم ورقم الجوال والبريد الإلكتروني (إن وُجد).\n- رقم الهوية الوطنية أو الإقامة ورقم التأشيرة عند تقديم طلب حجز.\n- محتوى الرسائل والشكاوى والاستفسارات.\n- بيانات تقنية محدودة مثل مصدر الزيارة (الحملات الإعلانية) وعنوان IP بصيغة مشفّرة لأغراض الحماية من الرسائل المزعجة.\n\n## أغراض المعالجة\n- معالجة طلبات خدمة الوساطة وإتمام إجراءات التعاقد عبر منصة مساند.\n- التواصل معك بخصوص طلبك أو استفسارك.\n- تحسين خدماتنا وقياس فعالية حملاتنا التسويقية.\n- الالتزام بالمتطلبات النظامية.\n\n## الأساس النظامي\nنعالج بياناتك بناءً على موافقتك عند إرسال النموذج، ولتنفيذ الخدمة التي طلبتها، ووفقاً للالتزامات النظامية.\n\n## مشاركة البيانات\nلا نبيع بياناتك. قد نشاركها فقط مع الجهات اللازمة لتقديم الخدمة (مثل منصة مساند والجهات الحكومية المختصة) أو مع مزودي الخدمات التقنية الملتزمين بحماية البيانات.\n\n## مدة الاحتفاظ\nنحتفظ بالبيانات طوال المدة اللازمة لتحقيق أغراض جمعها أو حسب ما تتطلبه الأنظمة، ثم يتم إتلافها أو إخفاء هويتها.\n\n## حماية البيانات\nنطبق إجراءات أمنية تقنية وتنظيمية مناسبة، منها التشفير وتقييد الوصول إلى الموظفين المخولين فقط.\n\n## حقوقك\n- الحق في العلم بكيفية معالجة بياناتك.\n- الحق في الوصول إلى بياناتك والحصول على نسخة منها.\n- الحق في طلب تصحيح بياناتك أو تحديثها.\n- الحق في طلب إتلاف بياناتك متى انتفت الحاجة إليها.\n- الحق في الرجوع عن موافقتك.\n\n## التواصل معنا\nلممارسة حقوقك أو لأي استفسار يتعلق بالخصوصية يرجى التواصل معنا عبر [نموذج تواصل معنا](/contact).',
    '> Draft — subject to review by the legal department.\n\n## Introduction\nWorkforce Saudia is committed to protecting your personal data in accordance with the Personal Data Protection Law (PDPL) of the Kingdom of Saudi Arabia and its implementing regulations. This policy explains what data we collect, how we use and protect it, and your rights.\n\n## Data we collect\n- Name, mobile number and email (if provided).\n- National ID or Iqama number and visa number when you submit a booking request.\n- The content of your messages, complaints and inquiries.\n- Limited technical data such as the visit source (advertising campaigns) and an anonymised IP address used for spam protection.\n\n## Purposes of processing\n- Processing mediation service requests and completing contracting through the Musaned platform.\n- Contacting you about your request or inquiry.\n- Improving our services and measuring our marketing campaigns.\n- Complying with legal requirements.\n\n## Legal basis\nWe process your data based on the consent you give when submitting a form, to deliver the service you requested, and to meet legal obligations.\n\n## Sharing\nWe do not sell your data. We share it only with parties needed to deliver the service (such as Musaned and competent government authorities) or with technical service providers bound to protect it.\n\n## Retention\nWe keep data only as long as needed for the purposes it was collected for or as required by law, then destroy or anonymise it.\n\n## Security\nWe apply appropriate technical and organisational measures, including encryption and access limited to authorised staff only.\n\n## Your rights\n- To be informed about how your data is processed.\n- To access your data and obtain a copy.\n- To request correction or update of your data.\n- To request destruction of your data when no longer needed.\n- To withdraw your consent.\n\n## Contact us\nTo exercise your rights or for any privacy question, please use our [contact form](/contact).'),

  // ---------- Thank you ----------
  E('thankyou', 'thanks_title', 'text', ['العنوان', 'Title'], 'تم استلام طلبك بنجاح', 'Your request has been received'),
  E('thankyou', 'thanks_body', 'textarea', ['النص', 'Text'], 'شكراً لتواصلك مع ورك فورس السعودية. سيتواصل معك أحد ممثلينا في أقرب وقت.', 'Thank you for contacting Workforce Saudia. One of our representatives will contact you shortly.'),
]

export const DEFAULTS_BY_KEY = Object.fromEntries(CONTENT_DEFAULTS.map((d) => [d.key, d]))
export const SINGLE_KINDS = ['image', 'link', 'setting']

/** Internal destinations offered for buttons (custom URLs also allowed) */
export const PAGE_LINKS = [
  { value: '/workers', ar: 'صفحة اختيار العمالة', en: 'Worker selection page' },
  { value: '/#about', ar: 'الرئيسية – من نحن', en: 'Home – About' },
  { value: '/#why', ar: 'الرئيسية – لماذا نحن', en: 'Home – Why us' },
  { value: '/#mediation', ar: 'الرئيسية – خدمة الوساطة', en: 'Home – Mediation service' },
  { value: '/#contact', ar: 'الرئيسية – تواصل معنا', en: 'Home – Contact' },
  { value: '/faq', ar: 'الأسئلة الشائعة', en: 'FAQ page' },
  { value: '/contact', ar: 'صفحة تواصل معنا', en: 'Contact page' },
  { value: '/terms', ar: 'الشروط والأحكام', en: 'Terms page' },
  { value: '/privacy', ar: 'سياسة الخصوصية', en: 'Privacy policy' },
  { value: '/', ar: 'الصفحة الرئيسية', en: 'Home page' },
]

/** Used only when Supabase is not connected yet (preview mode) */
export const PREVIEW_FEATURES = {
  why: [
    { id: 'w1', icon: 'bolt', title_ar: 'سرعة التنفيذ', title_en: 'Fast processing', body_ar: 'إنجاز الإجراءات بأسرع وقت ممكن', body_en: 'We complete procedures as fast as possible' },
    { id: 'w2', icon: 'shield', title_ar: 'موثوقية عالية', title_en: 'High reliability', body_ar: 'شفافية كاملة في جميع التعاملات', body_en: 'Full transparency in every transaction' },
    { id: 'w3', icon: 'search', title_ar: 'اختيار دقيق', title_en: 'Careful selection', body_ar: 'كوادر مدربة بعناية لتناسب احتياجك', body_en: 'Carefully trained workers that fit your needs' },
    { id: 'w4', icon: 'heart', title_ar: 'رضاء العملاء', title_en: 'Customer satisfaction', body_ar: 'نضع رضاك كأولوية قصوى', body_en: 'Your satisfaction is our top priority' },
  ],
  service: [
    { id: 's1', icon: 'search', title_ar: 'اختر المهنة والدولة', title_en: 'Choose profession & country', body_ar: 'حدد المهنة المطلوبة والجنسية المفضلة لديك.', body_en: 'Pick the profession you need and your preferred nationality.' },
    { id: 's2', icon: 'file', title_ar: 'تصفح السير الذاتية', title_en: 'Browse the CVs', body_ar: 'اطّلع على السير الذاتية المتاحة واختر العامل/العاملة المناسبة.', body_en: 'Review available CVs and choose the right worker.' },
    { id: 's3', icon: 'edit', title_ar: 'أكمل بيانات الطلب', title_en: 'Complete your request', body_ar: 'أدخل بياناتك ورقم التأشيرة الصادرة ووافق على الشروط والأحكام.', body_en: 'Enter your details and issued visa number, and accept the terms.' },
    { id: 's4', icon: 'check', title_ar: 'نتابع حتى الوصول', title_en: 'We follow up to arrival', body_ar: 'يتواصل معك فريقنا لإتمام التعاقد عبر منصة مساند ومتابعة وصول العمالة.', body_en: 'Our team contacts you to finalize the contract on Musaned and follow up until arrival.' },
  ],
}
