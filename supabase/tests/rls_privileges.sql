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
    'safeguards','record_safeguards','record_reviews','record_changes',
    'published_records_revision'
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

-- Requires the seed data. All test edits and revision increments roll back.
do $$
declare
  initial_revision bigint;
  published_id text;
begin
  select id into strict published_id from public.published_records order by id limit 1;
  select revision into strict initial_revision from public.published_records_revision where id = 1;

  update public.research_records set status = 'draft' where id = published_id;
  if (select revision from public.published_records_revision where id = 1) <> initial_revision + 1
    or exists (select 1 from public.published_records where id = published_id)
  then raise exception 'Unpublishing must remove the record and advance the revision'; end if;

  update public.research_sources set title = title || ' (test)' where record_id = published_id;
  if (select revision from public.published_records_revision where id = 1) <> initial_revision + 1
  then raise exception 'Draft source edits must leave the public revision unchanged'; end if;

  update public.research_records set status = 'published' where id = published_id;
  update public.research_sources set title = title || ' (published test)'
    where id = (select id from public.research_sources where record_id = published_id order by id limit 1);
  if (select revision from public.published_records_revision where id = 1) <> initial_revision + 3
  then raise exception 'Publication and published source edits must both advance the revision'; end if;

  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'published_records_revision'
  ) then raise exception 'The public revision table must be in the Realtime publication'; end if;
end;
$$;
rollback;
