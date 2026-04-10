
create table if not exists public.stuff_liveblog_posts (
  post_id text primary key,
  headline text not null,
  body text,
  author text,
  published_at timestamptz not null,
  source_updated_at timestamptz,
  shared_links jsonb default '[]'::jsonb,
  fetched_at timestamptz default now()
);

create index if not exists stuff_liveblog_posts_published_idx
  on public.stuff_liveblog_posts (published_at desc);

alter table public.stuff_liveblog_posts enable row level security;

create policy "Allow public read stuff liveblog"
  on public.stuff_liveblog_posts for select
  to anon, authenticated
  using (true);

create policy "Service role manages stuff liveblog"
  on public.stuff_liveblog_posts for all
  to service_role
  using (true) with check (true);

