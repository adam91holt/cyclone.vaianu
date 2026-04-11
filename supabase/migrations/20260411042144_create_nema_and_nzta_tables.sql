-- Cached NEMA civil defence / Emergency Mobile Alerts. The upstream RSS
-- only returns currently active alerts, so freshness is tracked via
-- last_seen_at — the UI filters to alerts seen in the last ~20 minutes
-- (cron runs every 5 min, so a gap > 4 missed runs means it's expired).
create table public.nema_alerts (
  id text primary key,
  title text not null,
  severity text not null,
  summary text,
  body text,
  link text,
  published_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index nema_alerts_last_seen_idx on public.nema_alerts (last_seen_at desc);

alter table public.nema_alerts enable row level security;

create policy "public read active nema alerts"
  on public.nema_alerts
  for select to anon, authenticated
  using (last_seen_at > now() - interval '30 minutes');

-- Cached NZTA state highway road events. Same last_seen_at pattern —
-- events disappear from the upstream feed when resolved, and we rely
-- on cron freshness to filter active ones.
create table public.nzta_road_events (
  id text primary key,
  event_type text,
  description text,
  comments text,
  impact text,
  severity text not null,
  planned boolean not null default false,
  status text,
  island text,
  region text,
  highway text,
  location text,
  alternative_route text,
  start_date timestamptz,
  end_date timestamptz,
  expected_resolution text,
  geometry jsonb,
  centroid_lon numeric(9, 6),
  centroid_lat numeric(9, 6),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index nzta_road_events_last_seen_idx on public.nzta_road_events (last_seen_at desc);
create index nzta_road_events_severity_planned_idx on public.nzta_road_events (planned, severity);

alter table public.nzta_road_events enable row level security;

create policy "public read active nzta road events"
  on public.nzta_road_events
  for select to anon, authenticated
  using (last_seen_at > now() - interval '30 minutes');
