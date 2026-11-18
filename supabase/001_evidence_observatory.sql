-- Biosecurity Signals v2.0 (Supabase PostgreSQL 15+)
-- Run in the Supabase SQL Editor as the project owner.
-- Default-deny writes for browser roles, with RLS-scoped public reads.
-- No sensitive biological content, secrets, or personal researcher data belong here.

begin;

create table if not exists public.organizations (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,95}$'),
  name text not null check (char_length(name) between 2 and 220)
);

create table if not exists public.research_records (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,95}$'),
  organization_id text not null references public.organizations(id),
  name text not null check (char_length(name) between 2 and 220),
  record_type text not null,
  domain text not null,
  published_period text not null check (published_period ~ '^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$'),
  access_patterns text[] not null default '{}',
  evidence_label text not null,
  summary text not null,
  caveat text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  last_reviewed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_records_status_idx on public.research_records(status);
create index if not exists research_records_period_idx on public.research_records(published_period);

create table if not exists public.research_sources (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{0,120}$'),
  record_id text not null references public.research_records(id) on delete cascade,
  title text not null,
  url text not null check (url ~ '^https://[^[:space:]<>]+$'),
  source_type text not null,
  published_period text not null,
  evidence_note text not null default '',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, record_id)
);
create index if not exists research_sources_record_idx on public.research_sources(record_id);

create table if not exists public.safeguards (
  key text primary key check (key ~ '^[a-z0-9][a-z0-9-]{0,95}$'),
  label text not null unique,
  layer text not null check (layer in ('development','evaluation','release','governance','other')),
  description text not null default ''
);

create table if not exists public.record_safeguards (
  record_id text not null references public.research_records(id) on delete cascade,
  safeguard_key text not null references public.safeguards(key),
  source_id text not null,
  evidence_status text not null default 'reported'
    check (evidence_status in ('reported','independently-evaluated','unclear')),
  evidence_note text not null default '',
  primary key (record_id, safeguard_key, source_id),
  foreign key (source_id, record_id) references public.research_sources(id, record_id) on delete cascade
);
create index if not exists record_safeguards_key_idx on public.record_safeguards(safeguard_key);

-- Private: reviewer and change records are never exposed through the public API.
create table if not exists public.record_reviews (
  id bigint generated always as identity primary key,
  record_id text not null references public.research_records(id) on delete cascade,
  reviewer_label text not null,
  outcome text not null check (outcome in ('approved', 'needs-changes', 'rejected')),
  comments text not null default '',
  reviewed_at timestamptz not null default now()
);

create table if not exists public.record_changes (
  id bigint generated always as identity primary key,
  record_id text not null,
  action text not null,
  actor_uid uuid,
  changed_at timestamptz not null default now(),
  before_record jsonb,
  after_record jsonb
);

create or replace function public.update_record_timestamp()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists research_records_timestamp_trigger on public.research_records;
create trigger research_records_timestamp_trigger
before update on public.research_records
for each row execute function public.update_record_timestamp();

create or replace function public.capture_record_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  before_data jsonb;
  after_data jsonb;
  changed_record_id text;
begin
  if tg_op <> 'INSERT' then before_data := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then after_data := to_jsonb(new); end if;
  changed_record_id := coalesce(
    after_data ->> 'record_id', before_data ->> 'record_id',
    after_data ->> 'id', before_data ->> 'id'
  );
  insert into public.record_changes (record_id, action, actor_uid, before_record, after_record)
  values (changed_record_id, tg_table_name || ':' || tg_op, auth.uid(), before_data, after_data);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists research_records_audit_trigger on public.research_records;
create trigger research_records_audit_trigger
  after insert or update or delete on public.research_records
  for each row execute function public.capture_record_changes();

drop trigger if exists research_sources_audit_trigger on public.research_sources;
create trigger research_sources_audit_trigger
  after insert or update or delete on public.research_sources
  for each row execute function public.capture_record_changes();

drop trigger if exists record_safeguards_audit_trigger on public.record_safeguards;
create trigger record_safeguards_audit_trigger
  after insert or update or delete on public.record_safeguards
  for each row execute function public.capture_record_changes();

-- Row-level security applies even if someone discovers the base table names.
alter table public.organizations enable row level security;
alter table public.research_records enable row level security;
alter table public.research_sources enable row level security;
alter table public.safeguards enable row level security;
alter table public.record_safeguards enable row level security;
alter table public.record_reviews enable row level security;
alter table public.record_changes enable row level security;

-- Public and signed-in users may read published research only.
drop policy if exists organizations_published_read on public.organizations;
create policy organizations_published_read on public.organizations
for select to anon, authenticated
using (exists (
  select 1 from public.research_records r
  where r.organization_id = organizations.id and r.status = 'published'
));

drop policy if exists research_records_published_read on public.research_records;
create policy research_records_published_read on public.research_records
for select to anon, authenticated using (status = 'published');

drop policy if exists research_sources_published_read on public.research_sources;
create policy research_sources_published_read on public.research_sources
for select to anon, authenticated
using (exists (
  select 1 from public.research_records r
  where r.id = research_sources.record_id and r.status = 'published'
));

drop policy if exists safeguards_public_read on public.safeguards;
create policy safeguards_public_read on public.safeguards
for select to anon, authenticated using (true);

drop policy if exists record_safeguards_published_read on public.record_safeguards;
create policy record_safeguards_published_read on public.record_safeguards
for select to anon, authenticated
using (exists (
  select 1 from public.research_records r
  where r.id = record_safeguards.record_id and r.status = 'published'
));

-- Privileges remain explicitly read-only. Even authenticated users cannot write.
revoke all on public.organizations, public.research_records, public.research_sources,
  public.safeguards, public.record_safeguards, public.record_reviews,
  public.record_changes from public, anon, authenticated;
grant select on public.organizations, public.research_records, public.research_sources,
  public.safeguards, public.record_safeguards to anon, authenticated;
revoke all on function public.update_record_timestamp() from public, anon, authenticated;
revoke all on function public.capture_record_changes() from public, anon, authenticated;

-- A security-invoker view is intentional: it respects base-table RLS.
-- Requires PostgreSQL 15+. Unlike a default owner-rights view, it must not
-- bypass published-record policies.
create or replace view public.published_records with (security_invoker = true) as
select
  r.id,
  r.name,
  o.name as organization,
  r.record_type as "recordType",
  r.domain,
  r.published_period as "date",
  r.access_patterns as "access",
  r.evidence_label as evidence,
  r.summary,
  r.caveat,
  coalesce(primary_source.title, '') as "sourceTitle",
  coalesce(primary_source.url, '') as "sourceUrl",
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'title', s.title, 'url', s.url,
      'type', s.source_type, 'period', s.published_period
    ) order by s.is_primary desc, s.title)
    from public.research_sources s where s.record_id = r.id
  ), '[]'::jsonb) as sources,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'label', g.label, 'layer', g.layer, 'status', rs.evidence_status,
      'sourceId', rs.source_id, 'note', rs.evidence_note
    ) order by g.layer, g.label)
    from public.record_safeguards rs
    join public.safeguards g on g.key = rs.safeguard_key
    where rs.record_id = r.id
  ), '[]'::jsonb) as safeguards,
  coalesce((
    select array_agg(distinct g.label order by g.label)
    from public.record_safeguards rs
    join public.safeguards g on g.key = rs.safeguard_key
    where rs.record_id = r.id
  ), array[]::text[]) as actions,
  to_char(r.last_reviewed_on, 'YYYY-MM-DD') as "lastReviewedOn"
from public.research_records r
join public.organizations o on o.id = r.organization_id
left join lateral (
  select s.title, s.url from public.research_sources s
  where s.record_id = r.id order by s.is_primary desc, s.id limit 1
) primary_source on true
where r.status = 'published';

revoke all on public.published_records from public, anon, authenticated;
grant select on public.published_records to anon, authenticated;

commit;
