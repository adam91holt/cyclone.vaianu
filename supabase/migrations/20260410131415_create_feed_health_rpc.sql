
-- Exposes cron job health to the browser via a SECURITY DEFINER RPC.
-- Returns one row per job with its most recent run status.
create or replace function public.get_feed_health()
returns table (
  jobname text,
  schedule text,
  active boolean,
  last_run_at timestamptz,
  last_status text,
  last_message text,
  last_success_at timestamptz
)
language sql
security definer
set search_path = public, cron
as $$
  with latest as (
    select distinct on (r.jobid)
      r.jobid,
      r.start_time,
      r.status,
      r.return_message
    from cron.job_run_details r
    where r.start_time > now() - interval '24 hours'
    order by r.jobid, r.start_time desc
  ),
  latest_success as (
    select distinct on (r.jobid)
      r.jobid,
      r.start_time
    from cron.job_run_details r
    where r.status = 'succeeded'
      and r.start_time > now() - interval '24 hours'
    order by r.jobid, r.start_time desc
  )
  select
    j.jobname::text,
    j.schedule::text,
    j.active,
    l.start_time,
    l.status::text,
    l.return_message::text,
    ls.start_time
  from cron.job j
  left join latest l on l.jobid = j.jobid
  left join latest_success ls on ls.jobid = j.jobid
  order by j.jobname;
$$;

grant execute on function public.get_feed_health() to anon, authenticated;

