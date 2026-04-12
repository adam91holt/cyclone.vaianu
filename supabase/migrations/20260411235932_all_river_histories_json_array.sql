
drop function if exists public.get_all_river_histories(int, int);

create or replace function public.get_all_river_histories(
  p_hours int default 24,
  p_buckets int default 48
)
returns table (
  council text,
  site text,
  buckets jsonb
)
language sql
stable
security definer
set search_path to 'public'
as $$
  with params as (
    select
      now() - make_interval(hours => least(greatest(p_hours, 1), 336)) as start_ts,
      now() as end_ts,
      least(greatest(p_buckets, 6), 200) as n_buckets
  ),
  bucketed as (
    select
      r.council,
      r.site,
      least(
        p.n_buckets - 1,
        floor(
          extract(epoch from (r.ts - p.start_ts))
          / (extract(epoch from (p.end_ts - p.start_ts)) / p.n_buckets)
        )::int
      ) as bucket_idx,
      avg(r.value)::numeric as value
    from public.river_readings r
    cross join params p
    where r.measurement = 'Stage'
      and r.value is not null
      and r.ts >= p.start_ts
      and r.ts <= p.end_ts
    group by r.council, r.site, bucket_idx
  )
  select
    council,
    site,
    jsonb_agg(jsonb_build_array(bucket_idx, value) order by bucket_idx) as buckets
  from bucketed
  group by council, site
  order by council, site;
$$;

