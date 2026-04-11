-- Returns one row per river monitoring site with its current level plus a
-- ~2-hour baseline and the change against that baseline. The dashboard
-- uses this to colour markers and list the fastest-rising rivers.
--
-- We compute the baseline from the earliest reading in the last 3 hours
-- (river_readings is pruned at ~14 days via RLS, so the window is safe).
-- If a site has only a single reading, baseline = latest and change = 0.
create or replace function public.get_river_summary()
returns table (
  council text,
  council_name text,
  name text,
  latitude numeric,
  longitude numeric,
  unit text,
  latest_value numeric,
  latest_ts timestamptz,
  baseline_value numeric,
  baseline_ts timestamptz,
  change numeric,
  change_pct numeric,
  reading_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with windowed as (
    select
      r.council,
      r.site,
      r.value,
      r.ts,
      row_number() over (partition by r.council, r.site order by r.ts asc) as rn_asc,
      row_number() over (partition by r.council, r.site order by r.ts desc) as rn_desc,
      count(*) over (partition by r.council, r.site) as n
    from public.river_readings r
    where r.measurement = 'Stage'
      and r.ts > now() - interval '3 hours'
      and r.value is not null
  ),
  latest as (
    select council, site, value as latest_value, ts as latest_ts, n
    from windowed
    where rn_desc = 1
  ),
  baseline as (
    select council, site, value as baseline_value, ts as baseline_ts
    from windowed
    where rn_asc = 1
  )
  select
    s.council,
    s.council_name,
    s.name,
    s.latitude,
    s.longitude,
    s.unit,
    l.latest_value,
    l.latest_ts,
    b.baseline_value,
    b.baseline_ts,
    (l.latest_value - b.baseline_value) as change,
    case
      when b.baseline_value is null or b.baseline_value = 0 then null
      else round(((l.latest_value - b.baseline_value) / b.baseline_value) * 100, 2)
    end as change_pct,
    l.n as reading_count
  from public.river_sites s
  left join latest l on l.council = s.council and l.site = s.name
  left join baseline b on b.council = s.council and b.site = s.name
  where s.measurement = 'Stage'
    and s.latitude is not null
    and s.longitude is not null;
$$;

grant execute on function public.get_river_summary() to anon, authenticated;

