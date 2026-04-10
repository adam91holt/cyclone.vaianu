-- Historic weather samples for each impact region. The log-weather edge
-- function writes one row per region per 10-minute tick. Keeps ~30 days.
create table if not exists public.weather_history (
  id bigserial primary key,
  region text not null,
  recorded_at timestamptz not null default now(),
  wind_kmh real not null,
  gust_kmh real not null,
  pressure_hpa real not null,
  temp_c real not null,
  humidity int not null,
  precip_mm real not null
);

create index if not exists idx_weather_history_region_time
  on public.weather_history (region, recorded_at desc);

alter table public.weather_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'weather_history'
      and policyname = 'Allow anon read weather history'
  ) then
    create policy "Allow anon read weather history"
      on public.weather_history for select to anon using (true);
  end if;
end $$;

-- Retention: prune anything older than 30 days each run.
create or replace function public.prune_weather_history()
returns void language sql as $$
  delete from public.weather_history where recorded_at < now() - interval '30 days';
$$;
