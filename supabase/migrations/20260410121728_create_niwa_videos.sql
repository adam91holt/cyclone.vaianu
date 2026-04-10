create table public.niwa_videos (
  id uuid default gen_random_uuid() primary key,
  tag text not null,
  vimeo_id text not null,
  vimeo_uri text not null unique,
  name text not null,
  release_time timestamptz not null,
  thumbnail_url text,
  first_seen_at timestamptz default now() not null,
  last_seen_at timestamptz default now() not null
);

create index niwa_videos_tag_release_idx on public.niwa_videos (tag, release_time desc);
create index niwa_videos_first_seen_idx on public.niwa_videos (first_seen_at desc);

alter table public.niwa_videos enable row level security;

create policy "Public read niwa_videos" on public.niwa_videos
  for select to anon using (true);

create policy "Service role manage niwa_videos" on public.niwa_videos
  for all to service_role using (true) with check (true);
