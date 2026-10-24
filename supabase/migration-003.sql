-- =====================================================================
--  Update 003 – security hardening + privacy consent
--  Run ONCE in Supabase → SQL Editor, AFTER migration-002.sql.
--  Safe to re-run. Does not delete any data.
--
--  IMPORTANT: deploy the new website code (with the submit-form function)
--  at the same time — after this script, forms can only be sent through
--  the server function (browsers can no longer write to the table directly).
-- =====================================================================

-- ---------- 1. Form entries only through the server (spam check + rate limit) ----------
drop policy if exists submissions_insert on public.submissions;
alter table public.submissions add column if not exists ip_hash text;   -- anonymised visitor IP (for rate limiting)
create index if not exists submissions_ip_idx on public.submissions (ip_hash, created_at desc);

-- ---------- 2. Privacy policy (PDPL) consent on forms ----------
alter table public.forms add column if not exists require_privacy boolean not null default false;
update public.forms set require_privacy = true where slug in ('contact', 'booking');

-- ---------- 3. Two-step login (MFA) ----------
-- A user who has set up an authenticator app must have used it in this session (aal2).
create or replace function public.mfa_ok() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active) and public.mfa_ok();
$$;

-- Admin powers ALWAYS require two-step login.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and active and role = 'admin')
     and coalesce(auth.jwt()->>'aal', 'aal1') = 'aal2';
$$;

-- ---------- 4. Upload limits on the file bucket ----------
update storage.buckets
   set file_size_limit = 52428800,  -- 50 MB max per file (the dashboard applies smaller limits per type)
       allowed_mime_types = array['image/png','image/jpeg','image/webp','application/pdf','video/mp4','video/webm']
 where id = 'media';
