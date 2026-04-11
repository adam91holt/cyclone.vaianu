-- River sites catalog: one row per (council, site, measurement).
-- Stores metadata plus the most recent value so the frontend can show
-- current levels without scanning readings.
create table public.river_sites (
  council text not null,
  name text not null,
  measurement text not null default 'Stage',
  council_name text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  unit text,
  latest_value numeric,
  latest_ts timestamptz,
  last_fetched_at timestamptz not null default now(),
  primary key (council, name, measurement)
);

create index river_sites_council_idx on public.river_sites (council);
create index river_sites_coords_idx on public.river_sites (latitude, longitude)
  where latitude is not null and longitude is not null;

alter table public.river_sites enable row level security;

create policy "public read river sites"
  on public.river_sites
  for select
  to anon, authenticated
  using (true);

-- River readings time series. Upsert on (council, site, measurement, ts).
-- PT2H windows overlap across ingestion cycles so dedupe is essential.
create table public.river_readings (
  council text not null,
  site text not null,
  measurement text not null default 'Stage',
  ts timestamptz not null,
  value numeric,
  primary key (council, site, measurement, ts)
);

create index river_readings_recent_idx
  on public.river_readings (council, site, measurement, ts desc);

create index river_readings_ts_idx
  on public.river_readings (ts desc);

alter table public.river_readings enable row level security;

create policy "public read river readings"
  on public.river_readings
  for select
  to anon, authenticated
  using (ts > now() - interval '14 days');

