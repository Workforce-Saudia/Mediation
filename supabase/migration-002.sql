-- =====================================================================
--  Update 002  –  run ONCE in Supabase → SQL Editor (after schema.sql)
--  Safe to re-run. Does not delete any existing data.
--   1. Employee ID for users
--   2. Agents: no editing of website content, forms, FAQ, integrations
--   3. Form entries: who changed the status / notes and when
--   4. Workers: created-by / updated-by + full activity log
--   5. Forms: placement on the website + deleting forms
-- =====================================================================

-- ---------- 1. Employee ID ----------
alter table public.profiles add column if not exists employee_id text;
create unique index if not exists profiles_employee_id_key on public.profiles (employee_id) where employee_id is not null;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_first    boolean := not exists (select 1 from public.profiles);
  v_by_admin boolean := coalesce((new.raw_app_meta_data->>'created_by_admin')::boolean, false);
  v_role     text := coalesce(new.raw_app_meta_data->>'role', 'agent');
  v_user     text := lower(coalesce(new.raw_app_meta_data->>'username', split_part(new.email, '@', 1)));
begin
  if v_role not in ('admin','agent') then v_role := 'agent'; end if;
  if v_first then v_role := 'admin'; end if;
  insert into public.profiles (id, username, full_name, employee_id, role, active)
  values (new.id, v_user, new.raw_app_meta_data->>'full_name',
          nullif(new.raw_app_meta_data->>'employee_id', ''), v_role, v_first or v_by_admin)
  on conflict (id) do nothing;
  return new;
end $$;

-- name shown in logs: "username (employee ID)"
create or replace function public.current_staff_name() returns text
language sql stable security definer set search_path = public as $$
  select username || coalesce(' (' || employee_id || ')', '') from public.profiles where id = auth.uid();
$$;

-- ---------- 2. Admin-only areas ----------
drop policy if exists content_staff  on public.site_content;
drop policy if exists features_staff on public.features;
drop policy if exists faq_staff      on public.faq_items;
drop policy if exists forms_staff    on public.forms;
drop policy if exists fields_staff   on public.form_fields;
drop policy if exists webhooks_staff on public.webhooks;
drop policy if exists content_admin  on public.site_content;
drop policy if exists features_admin on public.features;
drop policy if exists faq_admin      on public.faq_items;
drop policy if exists forms_admin    on public.forms;
drop policy if exists fields_admin   on public.form_fields;
drop policy if exists webhooks_admin on public.webhooks;
create policy content_admin  on public.site_content for all using (public.is_admin()) with check (public.is_admin());
create policy features_admin on public.features     for all using (public.is_admin()) with check (public.is_admin());
create policy faq_admin      on public.faq_items    for all using (public.is_admin()) with check (public.is_admin());
create policy forms_admin    on public.forms        for all using (public.is_admin()) with check (public.is_admin());
create policy fields_admin   on public.form_fields  for all using (public.is_admin()) with check (public.is_admin());
create policy webhooks_admin on public.webhooks     for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.test_webhook(p_id uuid) returns bigint
language plpgsql security definer set search_path = public as $$
declare w public.webhooks; rid bigint;
begin
  if not public.is_admin() then raise exception 'not_allowed'; end if;
  select * into w from public.webhooks where id = p_id;
  if not found then raise exception 'not_found'; end if;
  select net.http_post(
    url := w.url,
    body := jsonb_build_object('event', 'test', 'message', 'Test webhook from Workforce Saudia website', 'sent_at', now()),
    headers := jsonb_build_object('Content-Type', 'application/json')
  ) into rid;
  return rid;
end $$;

-- ---------- 3. Form entries: last status / notes update ----------
alter table public.submissions
  add column if not exists status_updated_at  timestamptz,
  add column if not exists status_updated_by  uuid references auth.users(id) on delete set null,
  add column if not exists status_updated_by_name text,
  add column if not exists notes_updated_at   timestamptz,
  add column if not exists notes_updated_by_name text;

create or replace function public.submissions_track() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text := public.current_staff_name();
begin
  if new.status is distinct from old.status then
    new.status_updated_at := now();
    new.status_updated_by := auth.uid();
    new.status_updated_by_name := v_name;
  else
    new.status_updated_at := old.status_updated_at;
    new.status_updated_by := old.status_updated_by;
    new.status_updated_by_name := old.status_updated_by_name;
  end if;
  if new.notes is distinct from old.notes then
    new.notes_updated_at := now();
    new.notes_updated_by_name := v_name;
  else
    new.notes_updated_at := old.notes_updated_at;
    new.notes_updated_by_name := old.notes_updated_by_name;
  end if;
  return new;
end $$;
drop trigger if exists submissions_track on public.submissions;
create trigger submissions_track before update on public.submissions
  for each row execute function public.submissions_track();

-- ---------- 4. Workers: who created / updated + activity log ----------
alter table public.workers
  add column if not exists created_by_name text,
  add column if not exists updated_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_by_name text;

alter table public.worker_status_log drop constraint if exists worker_status_log_action_check;
alter table public.worker_status_log add constraint worker_status_log_action_check
  check (action in ('created','updated','published','republished','retired'));
alter table public.worker_status_log add column if not exists details text;

-- old log rows: store the employee-style name too
create or replace function public.workers_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text := public.current_staff_name();
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.created_by_name := v_name;
  end if;
  new.updated_by := auth.uid();
  new.updated_by_name := v_name;
  return new;
end $$;
drop trigger if exists workers_stamp on public.workers;
create trigger workers_stamp before insert or update on public.workers
  for each row execute function public.workers_stamp();

create or replace function public.workers_log_created() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.worker_status_log (worker_id, action, by_user, by_username)
  values (new.id, 'created', auth.uid(), public.current_staff_name());
  return new;
end $$;
drop trigger if exists workers_log_created on public.workers;
create trigger workers_log_created after insert on public.workers
  for each row execute function public.workers_log_created();

-- called by the dashboard after a worker profile is edited (lists what changed)
create or replace function public.log_worker_update(p_worker_id uuid, p_details text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  insert into public.worker_status_log (worker_id, action, by_user, by_username, details)
  values (p_worker_id, 'updated', auth.uid(), public.current_staff_name(), left(p_details, 500));
end $$;
grant execute on function public.log_worker_update(uuid, text) to authenticated;

-- publish / retire now also records the employee ID in the log
create or replace function public.set_worker_status(p_worker_id uuid, p_action text)
returns public.workers
language plpgsql security definer set search_path = public as $$
declare
  w public.workers;
  v_action text;
  v_user text := public.current_staff_name();
begin
  if not public.is_staff() then raise exception 'not_allowed'; end if;
  select * into w from public.workers where id = p_worker_id for update;
  if not found then raise exception 'not_found'; end if;

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

-- ---------- 5. Forms: placement + delete ----------
alter table public.forms
  add column if not exists system boolean not null default false,
  add column if not exists description_ar text,
  add column if not exists description_en text,
  add column if not exists show_in_header boolean not null default false,
  add column if not exists show_in_footer boolean not null default false,
  add column if not exists home_position text not null default 'none';
alter table public.forms drop constraint if exists forms_home_position_check;
alter table public.forms add constraint forms_home_position_check
  check (home_position in ('none','after_hero','after_about','after_why','after_service','after_faq','after_contact'));
update public.forms set system = true where slug in ('contact','booking');

-- deleting a form also deletes its entries (the dashboard warns first and offers export)
alter table public.submissions drop constraint if exists submissions_form_slug_fkey;
alter table public.submissions add constraint submissions_form_slug_fkey
  foreign key (form_slug) references public.forms(slug) on update cascade on delete cascade;

create or replace function public.forms_protect() returns trigger
language plpgsql as $$
begin
  if old.system then raise exception 'system_form'; end if;
  return old;
end $$;
drop trigger if exists forms_protect on public.forms;
create trigger forms_protect before delete on public.forms
  for each row execute function public.forms_protect();
