-- =====================================================================
--  Workforce Saudia – Mediation Website  |  Supabase schema
--  Run this whole file once in: Supabase Dashboard → SQL Editor → New query
--  (Safe to re-run: uses IF NOT EXISTS / OR REPLACE / ON CONFLICT where possible)
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_net;          -- outgoing webhooks (Zapier / Make / n8n)

-- ---------------------------------------------------------------------
-- 1. STAFF PROFILES  (Admin / Agent)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  full_name   text,
  role        text not null default 'agent' check (role in ('admin','agent')),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active and role = 'admin');
$$;

-- Creates a profile for every new auth user.
--  * The very first user ever created becomes an active Admin (bootstrap).
--  * Users created from the website's Users page (service role) carry
--    app_metadata.created_by_admin = true and are active.
--  * Anyone else (e.g. public sign-ups, which you should disable) is INACTIVE.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_first   boolean := not exists (select 1 from public.profiles);
  v_by_admin boolean := coalesce((new.raw_app_meta_data->>'created_by_admin')::boolean, false);
  v_role    text := coalesce(new.raw_app_meta_data->>'role', 'agent');
  v_user    text := lower(coalesce(new.raw_app_meta_data->>'username', split_part(new.email, '@', 1)));
begin
  if v_role not in ('admin','agent') then v_role := 'agent'; end if;
  if v_first then v_role := 'admin'; end if;
  insert into public.profiles (id, username, full_name, role, active)
  values (new.id, v_user, new.raw_app_meta_data->>'full_name', v_role, v_first or v_by_admin)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- ---------------------------------------------------------------------
-- 2. EDITABLE WEBSITE TEXT / IMAGES / LINKS / SETTINGS
-- ---------------------------------------------------------------------
create table if not exists public.site_content (
  key         text primary key,
  value_ar    text,
  value_en    text,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users(id) on delete set null
);

-- ---------------------------------------------------------------------
-- 3. PROFESSIONS, COUNTRIES, WORKERS
-- ---------------------------------------------------------------------
create table if not exists public.professions (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,            -- used in URL: /workers/housemaid
  name_ar     text not null,
  name_en     text not null,
  icon        text default 'home',
  sort        int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.countries (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null check (code ~ '^[a-z]{2}$'),   -- ISO-3166 alpha-2, used for flag + URL
  name_ar     text not null,
  name_en     text not null,
  sort        int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.workers (
  id                  uuid primary key default gen_random_uuid(),
  worker_code         text unique not null,     -- Worker ID number
  name                text not null,
  age                 int check (age is null or age between 16 and 80),
  country_id          uuid not null references public.countries(id) on delete restrict,
  photo_url           text,
  cv_url              text,                     -- default CV (used when no profession-specific CV)
  notes               text,                     -- internal only
  status              text not null default 'draft' check (status in ('draft','published','retired')),
  published_at        timestamptz,              -- latest publish date/time
  first_published_at  timestamptz,
  retired_at          timestamptz,
  publish_count       int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id) on delete set null
);
drop trigger if exists workers_touch on public.workers;
create trigger workers_touch before update on public.workers
  for each row execute function public.touch_updated_at();

-- A worker can fit several professions; each can have its own CV
create table if not exists public.worker_professions (
  worker_id      uuid not null references public.workers(id) on delete cascade,
  profession_id  uuid not null references public.professions(id) on delete cascade,
  cv_url         text,
  primary key (worker_id, profession_id)
);

-- Full history of publish / retire / republish
create table if not exists public.worker_status_log (
  id           bigint generated always as identity primary key,
  worker_id    uuid not null references public.workers(id) on delete cascade,
  action       text not null check (action in ('published','republished','retired')),
  at           timestamptz not null default now(),
  by_user      uuid references auth.users(id) on delete set null,
  by_username  text
);
create index if not exists worker_status_log_worker_idx on public.worker_status_log(worker_id, at desc);

-- ---------------------------------------------------------------------
-- 4. HOME PAGE LISTS  ("Why us" cards + "Mediation service" steps)
-- ---------------------------------------------------------------------
create table if not exists public.features (
  id        uuid primary key default gen_random_uuid(),
  grp       text not null check (grp in ('why','service')),
  icon      text default 'check',
  title_ar  text not null default '',
  title_en  text not null default '',
  body_ar   text default '',
  body_en   text default '',
  sort      int not null default 0,
  active    boolean not null default true
);

-- ---------------------------------------------------------------------
-- 5. FAQ
-- ---------------------------------------------------------------------
create table if not exists public.faq_items (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'content' check (kind in ('content','link')),
  title_ar     text not null default '',
  title_en     text not null default '',
  body_ar      text default '',
  body_en      text default '',
  link_url     text,                                  -- used when kind = 'link'
  attachments  jsonb not null default '[]'::jsonb,    -- [{type:pdf|image|video|link, url, label_ar, label_en}]
  sort         int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. FORMS (editable fields + order) & SUBMISSIONS
-- ---------------------------------------------------------------------
create table if not exists public.forms (
  slug           text primary key check (slug ~ '^[a-z0-9-]+$'),
  name_ar        text not null,
  name_en        text not null,
  submit_ar      text default 'إرسال',
  submit_en      text default 'Submit',
  require_terms  boolean not null default false,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists public.form_fields (
  id              uuid primary key default gen_random_uuid(),
  form_slug       text not null references public.forms(slug) on delete cascade on update cascade,
  name            text not null check (name ~ '^[a-z0-9_]+$'),
  type            text not null default 'text'
                  check (type in ('text','textarea','email','tel','number','date','select','radio','checkbox')),
  label_ar        text not null default '',
  label_en        text not null default '',
  placeholder_ar  text,
  placeholder_en  text,
  options         jsonb not null default '[]'::jsonb,   -- [{value, label_ar, label_en}]
  required        boolean not null default false,
  pattern         text,                                 -- optional regex validation
  error_ar        text,
  error_en        text,
  system          boolean not null default false,       -- system fields cannot be deleted
  sort            int not null default 0,
  active          boolean not null default true,
  unique (form_slug, name)
);

create table if not exists public.submissions (
  id          uuid primary key default gen_random_uuid(),
  form_slug   text not null references public.forms(slug) on update cascade,
  data        jsonb not null default '{}'::jsonb,
  worker_id   uuid references public.workers(id) on delete set null,
  status      text not null default 'new' check (status in ('new','in_progress','done','spam')),
  notes       text,
  lang        text,
  page_url    text,
  utm         jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists submissions_form_idx on public.submissions(form_slug, created_at desc);

-- ---------------------------------------------------------------------
-- 7. WEBHOOKS  (Zapier / Make / n8n …)
-- ---------------------------------------------------------------------
create table if not exists public.webhooks (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  url         text not null check (url ~* '^https?://'),
  event       text not null default 'submission.created'
              check (event in ('submission.created','worker.published','worker.retired')),
  form_slug   text references public.forms(slug) on delete cascade on update cascade,  -- null = all forms
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create or replace function public.fire_webhooks(p_event text, p_form text, p_payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare w record;
begin
  for w in
    select * from public.webhooks
    where active and event = p_event and (form_slug is null or form_slug = p_form)
  loop
    perform net.http_post(
      url     := w.url,
      body    := p_payload,
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end loop;
exception when others then
  -- never block a form submission because of a webhook problem
  raise warning 'fire_webhooks failed: %', sqlerrm;
end $$;
revoke execute on function public.fire_webhooks(text, text, jsonb) from public, anon, authenticated;

create or replace function public.on_submission_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_worker jsonb;
begin
  if new.worker_id is not null then
    select jsonb_build_object('id', w.id, 'worker_code', w.worker_code, 'name', w.name,
                              'country', c.name_en, 'country_code', c.code)
      into v_worker
      from public.workers w join public.countries c on c.id = w.country_id
     where w.id = new.worker_id;
  end if;
  perform public.fire_webhooks('submission.created', new.form_slug, jsonb_build_object(
    'event', 'submission.created',
    'id', new.id,
    'form', new.form_slug,
    'created_at', new.created_at,
    'lang', new.lang,
    'page_url', new.page_url,
    'utm', coalesce(new.utm, '{}'::jsonb),
    'worker', v_worker,
    'data', new.data
  ));
  return new;
end $$;

drop trigger if exists submissions_webhook on public.submissions;
create trigger submissions_webhook after insert on public.submissions
  for each row execute function public.on_submission_created();

create or replace function public.test_webhook(p_id uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare w public.webhooks; rid bigint;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  select * into w from public.webhooks where id = p_id;
  if not found then raise exception 'not_found'; end if;
  select net.http_post(
    url := w.url,
    body := jsonb_build_object('event', 'test', 'message', 'Test webhook from Workforce Saudia website', 'sent_at', now()),
    headers := jsonb_build_object('Content-Type', 'application/json')
  ) into rid;
  return rid;
end $$;

-- ---------------------------------------------------------------------
-- 8. PUBLISH / RETIRE / REPUBLISH  (keeps history + fires webhooks)
-- ---------------------------------------------------------------------
create or replace function public.set_worker_status(p_worker_id uuid, p_action text)
returns public.workers
language plpgsql security definer set search_path = public as $$
declare
  w public.workers;
  v_action text;
  v_user text;
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  select * into w from public.workers where id = p_worker_id for update;
  if not found then raise exception 'not_found'; end if;
  select username into v_user from public.profiles where id = auth.uid();

  if p_action = 'publish' then
    if w.status = 'published' then return w; end if;
    v_action := case when w.publish_count > 0 then 'republished' else 'published' end;
    update public.workers
       set status = 'published', published_at = now(),
           first_published_at = coalesce(first_published_at, now()),
           publish_count = publish_count + 1, retired_at = null
     where id = p_worker_id returning * into w;
  elsif p_action = 'retire' then
    if w.status <> 'published' then return w; end if;
    v_action := 'retired';
    update public.workers set status = 'retired', retired_at = now()
     where id = p_worker_id returning * into w;
  else
    raise exception 'invalid_action';
  end if;

  insert into public.worker_status_log (worker_id, action, by_user, by_username)
  values (p_worker_id, v_action, auth.uid(), v_user);

  perform public.fire_webhooks(
    case when v_action = 'retired' then 'worker.retired' else 'worker.published' end, null,
    jsonb_build_object('event', case when v_action = 'retired' then 'worker.retired' else 'worker.published' end,
                       'action', v_action, 'worker_id', w.id, 'worker_code', w.worker_code,
                       'name', w.name, 'at', now(), 'by', v_user));
  return w;
end $$;

-- ---------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.site_content        enable row level security;
alter table public.professions         enable row level security;
alter table public.countries           enable row level security;
alter table public.workers             enable row level security;
alter table public.worker_professions  enable row level security;
alter table public.worker_status_log   enable row level security;
alter table public.features            enable row level security;
alter table public.faq_items           enable row level security;
alter table public.forms               enable row level security;
alter table public.form_fields         enable row level security;
alter table public.submissions         enable row level security;
alter table public.webhooks            enable row level security;

-- helper to (re)create policies idempotently
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles: you can read yourself; admins read everyone. Writes go through the server function.
create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_admin());

-- public read
create policy content_read      on public.site_content for select using (true);
create policy professions_read  on public.professions  for select using (active or public.is_staff());
create policy countries_read    on public.countries    for select using (active or public.is_staff());
create policy workers_read      on public.workers      for select using (status = 'published' or public.is_staff());
create policy wp_read           on public.worker_professions for select using (
  public.is_staff() or exists (select 1 from public.workers w where w.id = worker_id and w.status = 'published'));
create policy features_read     on public.features     for select using (active or public.is_staff());
create policy faq_read          on public.faq_items    for select using (active or public.is_staff());
create policy forms_read        on public.forms        for select using (active or public.is_staff());
create policy fields_read       on public.form_fields  for select using (active or public.is_staff());

-- staff (admin + agent) manage everything else
create policy content_staff     on public.site_content       for all using (public.is_staff()) with check (public.is_staff());
create policy professions_staff on public.professions        for all using (public.is_staff()) with check (public.is_staff());
create policy countries_staff   on public.countries          for all using (public.is_staff()) with check (public.is_staff());
create policy workers_staff     on public.workers            for all using (public.is_staff()) with check (public.is_staff());
create policy wp_staff          on public.worker_professions for all using (public.is_staff()) with check (public.is_staff());
create policy log_staff_read    on public.worker_status_log  for select using (public.is_staff());
create policy features_staff    on public.features           for all using (public.is_staff()) with check (public.is_staff());
create policy faq_staff         on public.faq_items          for all using (public.is_staff()) with check (public.is_staff());
create policy forms_staff       on public.forms              for all using (public.is_staff()) with check (public.is_staff());
create policy fields_staff      on public.form_fields        for all using (public.is_staff()) with check (public.is_staff());
create policy webhooks_staff    on public.webhooks           for all using (public.is_staff()) with check (public.is_staff());

-- submissions: anyone can submit an active form; only staff can read / update / delete
create policy submissions_insert on public.submissions for insert to anon, authenticated
  with check (status = 'new' and notes is null
              and exists (select 1 from public.forms f where f.slug = form_slug and f.active));
create policy submissions_staff_read   on public.submissions for select using (public.is_staff());
create policy submissions_staff_update on public.submissions for update using (public.is_staff()) with check (public.is_staff());
create policy submissions_admin_delete on public.submissions for delete using (public.is_admin());

grant execute on function public.set_worker_status(uuid, text) to authenticated;
grant execute on function public.test_webhook(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 10. STORAGE  (images, CVs, PDFs)  → public bucket "media"
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists media_read   on storage.objects;
drop policy if exists media_insert on storage.objects;
drop policy if exists media_update on storage.objects;
drop policy if exists media_delete on storage.objects;
create policy media_read   on storage.objects for select using (bucket_id = 'media');
create policy media_insert on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.is_staff());
create policy media_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.is_staff());
create policy media_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.is_staff());

-- =====================================================================
-- 11. STARTER DATA (edit everything later from the dashboard)
-- =====================================================================
insert into public.professions (slug, name_ar, name_en, icon, sort) values
  ('housemaid',  'عاملة منزلية',    'House maid',   'home',    1),
  ('driver',     'سائق خاص',        'Driver',       'car',     2),
  ('nurse',      'ممرضة منزلية',    'Nurse',        'medical', 3),
  ('caretaker',  'مرافقة كبار سن',  'Caretaker',    'heart',   4),
  ('babysitter', 'مربية أطفال',     'Baby sitter',  'baby',    5)
on conflict (slug) do nothing;

insert into public.countries (code, name_ar, name_en, sort) values
  ('ph', 'الفلبين',    'Philippines', 1),
  ('id', 'إندونيسيا',  'Indonesia',   2),
  ('lk', 'سريلانكا',   'Sri Lanka',   3),
  ('in', 'الهند',      'India',       4),
  ('bd', 'بنغلاديش',   'Bangladesh',  5),
  ('ke', 'كينيا',      'Kenya',       6),
  ('ug', 'أوغندا',     'Uganda',      7),
  ('et', 'إثيوبيا',    'Ethiopia',    8),
  ('np', 'نيبال',      'Nepal',       9),
  ('pk', 'باكستان',    'Pakistan',   10)
on conflict (code) do nothing;

insert into public.features (grp, icon, title_ar, title_en, body_ar, body_en, sort)
select * from (values
  ('why','bolt',   'سرعة التنفيذ',  'Fast processing',   'إنجاز الإجراءات بأسرع وقت ممكن',            'We complete procedures as fast as possible', 1),
  ('why','shield', 'موثوقية عالية', 'High reliability',  'شفافية كاملة في جميع التعاملات',            'Full transparency in every transaction',      2),
  ('why','search', 'اختيار دقيق',   'Careful selection', 'كوادر مدربة بعناية لتناسب احتياجك',         'Carefully trained workers that fit your needs', 3),
  ('why','heart',  'رضاء العملاء',  'Customer satisfaction', 'نضع رضاك كأولوية قصوى',               'Your satisfaction is our top priority',       4),
  ('service','search', 'اختر المهنة والدولة', 'Choose profession & country', 'حدد المهنة المطلوبة والجنسية المفضلة لديك.', 'Pick the profession you need and your preferred nationality.', 1),
  ('service','file',   'تصفح السير الذاتية',  'Browse the CVs',              'اطّلع على السير الذاتية المتاحة واختر العامل/العاملة المناسبة.', 'Review available CVs and choose the right worker.', 2),
  ('service','edit',   'أكمل بيانات الطلب',   'Complete your request',       'أدخل بياناتك ورقم التأشيرة الصادرة ووافق على الشروط والأحكام.', 'Enter your details and issued visa number, and accept the terms.', 3),
  ('service','check',  'نتابع حتى الوصول',    'We follow up to arrival',     'يتواصل معك فريقنا لإتمام التعاقد عبر منصة مساند ومتابعة وصول العمالة.', 'Our team contacts you to finalize the contract on Musaned and follow up until arrival.', 4)
) v(grp, icon, title_ar, title_en, body_ar, body_en, sort)
where not exists (select 1 from public.features);

insert into public.faq_items (kind, title_ar, title_en, body_ar, body_en, sort)
select * from (values
  ('content', 'ما هي خدمة الوساطة؟', 'What is the mediation service?',
   'خدمة الوساطة تتيح لك اختيار العمالة المنزلية من بين سير ذاتية جاهزة، ونقوم نحن بإتمام إجراءات الاستقدام والتعاقد عبر منصة مساند نيابة عنك.',
   'The mediation service lets you choose a domestic worker from ready CVs, and we complete the recruitment and contracting through Musaned on your behalf.', 1),
  ('content', 'ما المستندات المطلوبة لبدء الطلب؟', 'What documents do I need to start?',
   '- رقم الهوية أو الإقامة\n- رقم التأشيرة الصادرة من منصة مساند\n- رقم جوال للتواصل',
   '- National ID or Iqama number\n- The visa number issued from Musaned\n- A mobile number to contact you', 2),
  ('link', 'منصة مساند', 'Musaned platform', '', '', 3)
) v(kind, title_ar, title_en, body_ar, body_en, sort)
where not exists (select 1 from public.faq_items);
update public.faq_items set link_url = 'https://musaned.com.sa' where kind = 'link' and link_url is null;

insert into public.forms (slug, name_ar, name_en, submit_ar, submit_en, require_terms) values
  ('contact', 'تواصل معنا',        'Contact us',       'إرسال',       'Send',            false),
  ('booking', 'طلب حجز عامل/عاملة', 'Worker booking',  'تأكيد الطلب',  'Confirm request', true)
on conflict (slug) do nothing;

insert into public.form_fields (form_slug, name, type, label_ar, label_en, placeholder_ar, placeholder_en, options, required, pattern, error_ar, error_en, system, sort)
values
  ('contact','request_type','radio','نوع الطلب','Request type',null,null,
   '[{"value":"complaint","label_ar":"شكوى","label_en":"Complaint"},{"value":"inquiry","label_ar":"استفسار","label_en":"Inquiry"},{"value":"suggestion","label_ar":"اقتراح","label_en":"Suggestion"}]',
   true,null,null,null,false,1),
  ('contact','full_name','text','الاسم الكامل','Full name','اكتب اسمك','Your name','[]',true,null,null,null,false,2),
  ('contact','phone','tel','رقم الجوال','Mobile number','05XXXXXXXX','05XXXXXXXX','[]',true,
   '(0?5[0-9]{8}|(\+|00)?9665[0-9]{8})','أدخل رقم جوال سعودي صحيح مثل 05XXXXXXXX','Enter a valid Saudi mobile e.g. 05XXXXXXXX',false,3),
  ('contact','email','email','البريد الإلكتروني','Email',null,null,'[]',false,null,null,null,false,4),
  ('contact','message','textarea','الرسالة','Message','اكتب تفاصيل طلبك','Write your message','[]',true,null,null,null,false,5),

  ('booking','full_name','text','الاسم الكامل','Full name','الاسم كما في الهوية','Name as on your ID','[]',true,null,null,null,false,1),
  ('booking','phone','tel','رقم الجوال','Mobile number','05XXXXXXXX','05XXXXXXXX','[]',true,
   '(0?5[0-9]{8}|(\+|00)?9665[0-9]{8})','أدخل رقم جوال سعودي صحيح مثل 05XXXXXXXX','Enter a valid Saudi mobile e.g. 05XXXXXXXX',false,2),
  ('booking','national_id','text','رقم الهوية / الإقامة','National ID / Iqama number','1XXXXXXXXX','1XXXXXXXXX','[]',true,
   '[12][0-9]{9}','رقم الهوية/الإقامة 10 أرقام ويبدأ بـ 1 أو 2','ID/Iqama must be 10 digits starting with 1 or 2',false,3),
  ('booking','visa_number','text','رقم التأشيرة (الصادر)','Issued visa number',null,null,'[]',true,'[0-9]{5,15}',
   'رقم التأشيرة يجب أن يحتوي على أرقام فقط','Visa number must contain digits only',false,4),
  ('booking','worker_code','text','رقم العامل','Worker ID number',null,null,'[]',true,null,null,null,true,5)
on conflict (form_slug, name) do nothing;
