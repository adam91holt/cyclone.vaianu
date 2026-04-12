create or replace function public.get_river_history(
  p_council text,
  p_site text,
  p_hours int default 24
)
returns table (
  ts timestamptz,
  value numeric,
  unit text,
  name text,
  council_name text,
  latitude numeric,
  longitude numeric
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with s as (
    select council, name, unit, council_name, latitude, longitude
    from public.river_sites
    where council = p_council
      and name = p_site
      and measurement = 'Stage'
    limit 1
  )
  select
    r.ts,
    r.value,
    s.unit,
    s.name,
    s.council_name,
    s.latitude,
    s.longitude
  from public.river_readings r
  cross join s
  where r.council = p_council
    and r.site = p_site
    and r.measurement = 'Stage'
    and r.value is not null
    and r.ts > now() - make_interval(hours => least(greatest(p_hours, 1), 336))
  order by r.ts asc;
$$;

grant execute on function public.get_river_history(text, text, int) to anon, authenticated;
