
create table public.power_outages (
  provider text not null,
  incident_id text not null,
  service text not null default 'electricity', -- electricity | fibre
  status text not null default 'unplanned',    -- unplanned | planned
  title text,
  cause text,
  start_time timestamptz,
  end_time timestamptz,
  restoration_hint text,
  notes text,
  customer_count integer,
  localities text[] default '{}',
  equipment text,
  region text,                                  -- 'Northland' | 'Waikato' | 'Far North'
  geometry jsonb,                                -- GeoJSON Geometry (Polygon | MultiPolygon | Point)
  centroid_lat numeric(9, 6),
  centroid_lon numeric(9, 6),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  cleared_at timestamptz,
  primary key (provider, incident_id)
);

create index power_outages_active_idx
  on public.power_outages (last_seen_at desc)
  where cleared_at is null;

create index power_outages_region_idx
  on public.power_outages (region)
  where cleared_at is null;

alter table public.power_outages enable row level security;

create policy "public read active outages"
  on public.power_outages
  for select
  to anon, authenticated
  using (cleared_at is null or cleared_at > now() - interval '24 hours');

-- Summary table for quick top-bar stats
create table public.power_outages_summary (
  id integer primary key default 1,
  total_incidents integer not null default 0,
  total_customers integer not null default 0,
  by_provider jsonb not null default '{}'::jsonb,
  by_region jsonb not null default '{}'::jsonb,
  providers_failed text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.power_outages_summary (id) values (1) on conflict do nothing;

alter table public.power_outages_summary enable row level security;

create policy "public read summary"
  on public.power_outages_summary
  for select
  to anon, authenticated
  using (true);

