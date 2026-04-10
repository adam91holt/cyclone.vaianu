create table public.metservice_warnings_national (
  cap_id text primary key,
  warn_level text,
  event_type text,
  warning_type text,
  base_name text,
  name text,
  area_description text,
  regions text[],
  display_regions text[],
  threat_start_time timestamptz,
  threat_end_time timestamptz,
  threat_period text,
  threat_period_short text,
  issued_at timestamptz,
  expires_at timestamptz,
  next_issue_at timestamptz,
  icon text,
  warn_icon text,
  text text,
  impact text,
  instruction text,
  situation_headline text,
  situation_statement text,
  preview_markdown text,
  change_notes text,
  is_active boolean default true,
  polygons jsonb,
  raw jsonb,
  fetched_at timestamptz not null default now()
);

create index metservice_warnings_national_level_idx on public.metservice_warnings_national (warn_level);
create index metservice_warnings_national_start_idx on public.metservice_warnings_national (threat_start_time);
create index metservice_warnings_national_fetched_idx on public.metservice_warnings_national (fetched_at desc);

alter table public.metservice_warnings_national enable row level security;

create policy "metservice_warnings_national public read"
  on public.metservice_warnings_national for select
  to anon, authenticated
  using (true);

create policy "metservice_warnings_national service write"
  on public.metservice_warnings_national for all
  to service_role
  using (true)
  with check (true);

-- Summary table: one-row snapshot of the summary list + metadata
create table public.metservice_warnings_summary (
  id integer primary key default 1,
  summary jsonb not null default '[]'::jsonb,
  warning_count integer not null default 0,
  highest_level text,
  fetched_at timestamptz not null default now(),
  constraint metservice_warnings_summary_singleton check (id = 1)
);

alter table public.metservice_warnings_summary enable row level security;

create policy "metservice_warnings_summary public read"
  on public.metservice_warnings_summary for select
  to anon, authenticated
  using (true);

create policy "metservice_warnings_summary service write"
  on public.metservice_warnings_summary for all
  to service_role
  using (true)
  with check (true);

insert into public.metservice_warnings_summary (id) values (1)
  on conflict (id) do nothing;
