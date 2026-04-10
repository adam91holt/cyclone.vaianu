-- niwa_forecast: cached combined endpoint per location (upsert on location_id)
create table public.niwa_forecast (
  location_id bigint primary key,
  location_name text not null,
  latitude double precision,
  longitude double precision,
  forecast jsonb not null default '[]'::jsonb,
  summary jsonb not null default '[]'::jsonb,
  location jsonb,
  updated_at timestamptz not null default now()
);

create index niwa_forecast_updated_idx on public.niwa_forecast (updated_at desc);

alter table public.niwa_forecast enable row level security;

create policy "niwa_forecast public read"
  on public.niwa_forecast for select
  to anon, authenticated
  using (true);

create policy "niwa_forecast service write"
  on public.niwa_forecast for all
  to service_role
  using (true)
  with check (true);

-- niwa_tweets: unique tweet rows from the NIWA API
create table public.niwa_tweets (
  tweet_id text primary key,
  created_at timestamptz not null,
  full_text text not null,
  media_url text,
  media_type text,
  entities jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index niwa_tweets_created_idx on public.niwa_tweets (created_at desc);

alter table public.niwa_tweets enable row level security;

create policy "niwa_tweets public read"
  on public.niwa_tweets for select
  to anon, authenticated
  using (true);

create policy "niwa_tweets service write"
  on public.niwa_tweets for all
  to service_role
  using (true)
  with check (true);
