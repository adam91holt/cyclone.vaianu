create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('suggestion', 'data_issue', 'other')),
  message text not null check (char_length(message) between 3 and 2000),
  created_at timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Anyone can read all feedback — the board is public by design.
create policy "public read feedback"
  on public.feedback
  for select
  to anon, authenticated
  using (true);

-- Anyone can submit feedback — no auth required.
create policy "public insert feedback"
  on public.feedback
  for insert
  to anon, authenticated
  with check (true);
