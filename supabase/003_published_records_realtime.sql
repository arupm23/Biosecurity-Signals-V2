begin;

-- The WebSocket carries only a revision counter. Statement data is still
-- fetched through the existing published_records view and its RLS policies.
create table if not exists public.published_records_revision (
  id integer primary key check (id = 1),
  revision bigint not null default 0
);

insert into public.published_records_revision (id) values (1)
on conflict (id) do nothing;

alter table public.published_records_revision enable row level security;
revoke all on public.published_records_revision from public, anon, authenticated;
grant select on public.published_records_revision to anon, authenticated;
drop policy if exists published_records_revision_read on public.published_records_revision;
create policy published_records_revision_read on public.published_records_revision
  for select to anon, authenticated using (id = 1);

create or replace function public.advance_published_records_revision()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  before_row jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  after_row jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  affects_public boolean;
begin
  case tg_table_name
    when 'research_records' then
      affects_public := before_row ->> 'status' = 'published' or after_row ->> 'status' = 'published';
    when 'organizations' then
      select exists (
        select 1 from public.research_records
        where status = 'published' and organization_id in (before_row ->> 'id', after_row ->> 'id')
      ) into affects_public;
    when 'safeguards' then
      select exists (
        select 1 from public.record_safeguards rs
        join public.research_records r on r.id = rs.record_id
        where r.status = 'published' and rs.safeguard_key in (before_row ->> 'key', after_row ->> 'key')
      ) into affects_public;
    else
      select exists (
        select 1 from public.research_records
        where status = 'published' and id in (before_row ->> 'record_id', after_row ->> 'record_id')
      ) into affects_public;
  end case;

  if affects_public then
    update public.published_records_revision set revision = revision + 1 where id = 1;
  end if;
  return null;
end;
$$;
revoke all on function public.advance_published_records_revision() from public, anon, authenticated;

do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'research_records', 'research_sources', 'record_safeguards', 'organizations', 'safeguards'
  ] loop
    execute format('drop trigger if exists update_published_records_revision on public.%I', relation_name);
    execute format(
      'create trigger update_published_records_revision after insert or update or delete on public.%I
       for each row execute function public.advance_published_records_revision()', relation_name
    );
  end loop;

  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'published_records_revision'
  ) then
    alter publication supabase_realtime add table public.published_records_revision;
  end if;
end;
$$;

commit;
