create table public.metservice_observations (
  town_slug text primary key,
  town_name text not null,
  display_order int not null default 0,
  station text,
  obs_time timestamptz,
  rainfall_3h_mm numeric,
  rainfall_24h_mm numeric,
  temp_c numeric,
  wind_speed_kmh numeric,
  wind_direction text,
  pressure_hpa numeric,
  pressure_trend text,
  humidity numeric,
  fetched_at timestamptz not null default now()
);

alter table public.metservice_observations enable row level security;

create policy "metservice_observations_public_read"
  on public.metservice_observations
  for select
  to anon, authenticated
  using (true);

create policy "metservice_observations_service_manage"
  on public.metservice_observations
  for all
  to service_role
  using (true)
  with check (true);

create index metservice_observations_display_order_idx
  on public.metservice_observations (display_order);
