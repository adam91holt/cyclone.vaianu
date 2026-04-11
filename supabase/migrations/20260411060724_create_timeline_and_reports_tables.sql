-- timeline_events: deduped feed of notable events across all sources.
-- Harvested every 5 min from source tables by the harvest-timeline fn.
create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique, -- stable dedup key, e.g. 'nema:abc', 'warn:capid', 'outage:incident-id'
  kind text not null,              -- nema_alert | warning | road_closure | outage | river_rise | cyclone_report | liveblog
  severity text not null,          -- red | orange | yellow | info
  title text not null,
  body text,
  link text,
  source text,                     -- display label: "NEMA", "MetService", "NZTA", etc.
  region text,
  occurred_at timestamptz not null,
  metadata jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index timeline_events_occurred_at_idx on public.timeline_events (occurred_at desc);
create index timeline_events_kind_idx on public.timeline_events (kind);
create index timeline_events_severity_idx on public.timeline_events (severity);

alter table public.timeline_events enable row level security;

-- Public read: show events that occurred in the last 12 hours OR have been
-- seen in the last 30 min. Keeps the feed fresh without losing context from
-- recently-cleared items.
create policy "public read active timeline events"
  on public.timeline_events
  for select
  to anon, authenticated
  using (
    occurred_at > now() - interval '12 hours'
    or last_seen_at > now() - interval '30 minutes'
  );

-- comprehensive_reports: hourly Opus-generated super reports.
create table public.comprehensive_reports (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  headline text not null,
  summary text,
  markdown text not null,
  key_findings jsonb,
  severity text,
  model text not null,
  tool_calls jsonb,
  duration_ms integer,
  input_tokens integer,
  output_tokens integer,
  cache_read_tokens integer,
  cache_creation_tokens integer
);

create index comprehensive_reports_generated_at_idx
  on public.comprehensive_reports (generated_at desc);

alter table public.comprehensive_reports enable row level security;

-- Public read: everyone sees the latest reports.
create policy "public read comprehensive reports"
  on public.comprehensive_reports
  for select
  to anon, authenticated
  using (true);

