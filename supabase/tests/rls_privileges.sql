-- Run in Supabase SQL Editor as project owner after migration.
-- Checks permissions/flags; supplement with actual anon API requests and
-- draft/publication visibility tests before deploying.
begin;
do $$
declare
  t text;
begin
  foreach t in array array[
    'organizations','research_records','research_sources',
    'safeguards','record_safeguards','record_reviews','record_changes'
  ] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relrowsecurity
    ) then raise exception 'RLS disabled on public.%', t; end if;
    if has_table_privilege('anon','public.' || t,'INSERT')
      or has_table_privilege('anon','public.' || t,'UPDATE')
      or has_table_privilege('anon','public.' || t,'DELETE')
      or has_table_privilege('authenticated','public.' || t,'INSERT')
      or has_table_privilege('authenticated','public.' || t,'UPDATE')
      or has_table_privilege('authenticated','public.' || t,'DELETE')
    then raise exception 'Unexpected client write access on %', t; end if;
  end loop;
  if has_table_privilege('anon','public.record_reviews','SELECT')
    or has_table_privilege('anon','public.record_changes','SELECT')
    or has_table_privilege('authenticated','public.record_reviews','SELECT')
    or has_table_privilege('authenticated','public.record_changes','SELECT')
  then raise exception 'Private review or audit data is exposed'; end if;
  if not has_table_privilege('anon','public.published_records','SELECT')
  then raise exception 'Public view is not readable'; end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='published_records'
      and 'security_invoker=true' = any(coalesce(c.reloptions,array[]::text[]))
  ) then raise exception 'published_records must be a security_invoker view'; end if;
  raise notice 'Privilege and RLS guard checks passed';
end;
$$;
rollback;
