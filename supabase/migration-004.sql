-- =====================================================================
--  Update 004 – no webhooks for entries flagged as spam
--  Run ONCE in Supabase → SQL Editor, after migration-003.sql. Safe to re-run.
--
--  Entries that fail the Cloudflare security check are now SAVED (status "spam")
--  instead of rejected, so no real customer is lost. They should not reach
--  Zapier / CRM automations, so the webhook trigger skips them.
-- =====================================================================

create or replace function public.on_submission_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_worker jsonb;
begin
  if new.status = 'spam' then
    return new; -- flagged entry: stays in the dashboard for review, no automation
  end if;
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
