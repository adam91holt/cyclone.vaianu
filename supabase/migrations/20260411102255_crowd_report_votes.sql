-- Per-report vote score, maintained by trigger from the votes table
alter table public.crowd_reports
  add column if not exists vote_score integer not null default 0;

create index if not exists crowd_reports_approved_score_idx
  on public.crowd_reports (vote_score desc, created_at desc)
  where status = 'approved';

-- Votes table — anonymous voters keyed by a uuid stored in localStorage
create table public.crowd_report_votes (
  id uuid default gen_random_uuid() primary key,
  report_id uuid not null references public.crowd_reports(id) on delete cascade,
  voter_id uuid not null,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (report_id, voter_id)
);

create index crowd_report_votes_report_idx on public.crowd_report_votes (report_id);
create index crowd_report_votes_voter_idx on public.crowd_report_votes (voter_id);

alter table public.crowd_report_votes enable row level security;

-- Anyone can read vote rows (so we can check our own + show counts if needed)
create policy "anon can read votes" on public.crowd_report_votes
  for select to anon using (true);

-- Anyone can insert/update/delete their own vote. We can't enforce voter_id
-- ownership without auth — the unique (report_id, voter_id) constraint
-- prevents one voter_id from voting twice on the same report, which is the
-- guarantee we actually need.
create policy "anon can insert votes" on public.crowd_report_votes
  for insert to anon with check (true);

create policy "anon can update votes" on public.crowd_report_votes
  for update to anon using (true) with check (true);

create policy "anon can delete votes" on public.crowd_report_votes
  for delete to anon using (true);

-- Trigger: recompute vote_score on the report when votes change
create or replace function public.recompute_crowd_report_score()
returns trigger language plpgsql as $$
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

create trigger crowd_report_votes_after
  after insert or update or delete on public.crowd_report_votes
  for each row execute function public.recompute_crowd_report_score();

-- Touch updated_at on update
create or replace function public.touch_crowd_report_vote()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger crowd_report_votes_touch
  before update on public.crowd_report_votes
  for each row execute function public.touch_crowd_report_vote();
