-- Cache layer for MetService API responses.
-- Edge Function writes to this; browser reads via the Edge Function (never
-- directly — we don't want clients seeing stale-data races or the proxy
-- shape. Cache is also query-able for analytics / debugging.)
create table public.metservice_cache (
  resource text primary key,
  fetched_at timestamptz default now() not null,
  expires_at timestamptz not null,
  data jsonb not null,
  source_status int
);

create index metservice_cache_expires_at_idx
  on public.metservice_cache (expires_at);

alter table public.metservice_cache enable row level security;

-- Anon can read (they can't bypass Edge Function for writes, and the data
-- is public info anyway). This keeps a path open for direct supabase-js reads
-- if we ever want that.
create policy "Anyone can read metservice cache"
  on public.metservice_cache for select
  to anon
  using (true);

