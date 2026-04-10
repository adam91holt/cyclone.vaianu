-- Cyclone AI summaries (15-min rollups)
create table public.cyclone_summaries (
  id uuid default gen_random_uuid() primary key,
  generated_at timestamptz default now() not null,
  headline text not null,
  summary text not null,
  severity text not null check (severity in ('red','orange','yellow','advisory')),
  key_points jsonb not null default '[]'::jsonb,
  regional_snapshot jsonb not null default '{}'::jsonb,
  model text not null default 'claude-haiku-4-5-20251001'
);

create index cyclone_summaries_generated_at_idx
  on public.cyclone_summaries (generated_at desc);

alter table public.cyclone_summaries enable row level security;

-- Public read so the dashboard + API endpoint can fetch
create policy "Anyone can read summaries"
  on public.cyclone_summaries for select
  to anon
  using (true);

-- News items (RSS aggregated, cached)
create table public.news_items (
  id uuid default gen_random_uuid() primary key,
  fetched_at timestamptz default now() not null,
  published_at timestamptz,
  source text not null,
  title text not null,
  url text not null unique,
  summary text
);

create index news_items_published_at_idx
  on public.news_items (published_at desc nulls last);

alter table public.news_items enable row level security;

create policy "Anyone can read news"
  on public.news_items for select
  to anon
  using (true);

