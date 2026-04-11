-- Trigger needs to bypass RLS on crowd_reports to update vote_score from
-- an anonymous user's session. SECURITY DEFINER runs as the function owner.
create or replace function public.recompute_crowd_report_score()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  target_id := coalesce(new.report_id, old.report_id);
  update public.crowd_reports
  set vote_score = (
    select coalesce(sum(vote), 0)::int
    from public.crowd_report_votes
    where report_id = target_id
  )
  where id = target_id;
  return null;
end;
$$;
