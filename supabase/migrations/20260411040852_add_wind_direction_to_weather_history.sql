alter table public.weather_history
  add column if not exists wind_direction_deg integer;

create or replace function public.get_latest_region_weather()
returns table (
  region text,
  recorded_at timestamptz,
  wind_kmh real,
  gust_kmh real,
  wind_direction_deg integer,
  pressure_hpa real,
  precip_mm real,
  temp_c real,
  humidity integer
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (region)
    region, recorded_at, wind_kmh, gust_kmh, wind_direction_deg,
    pressure_hpa, precip_mm, temp_c, humidity
  from public.weather_history
  where recorded_at > now() - interval '1 hour'
  order by region, recorded_at desc;
$$;

grant execute on function public.get_latest_region_weather() to anon, authenticated;
