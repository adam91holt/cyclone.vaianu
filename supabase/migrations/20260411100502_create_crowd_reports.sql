-- Crowdsourced ground reports: anonymous submissions, admin moderation
create table public.crowd_reports (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  report_text text not null check (length(report_text) between 3 and 1000),
  location_text text not null check (length(location_text) between 2 and 200),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  image_url text,
  submitter_name text check (submitter_name is null or length(submitter_name) <= 60),
  user_agent text,
  reviewed_at timestamptz,
  reviewer_note text
);

create index crowd_reports_status_created_idx
  on public.crowd_reports (status, created_at desc);

create index crowd_reports_approved_created_idx
  on public.crowd_reports (created_at desc)
  where status = 'approved';

alter table public.crowd_reports enable row level security;

-- Anonymous users can submit reports (always as pending)
create policy "anon can submit pending reports"
  on public.crowd_reports
  for insert
  to anon
  with check (status = 'pending' and reviewed_at is null and reviewer_note is null);

-- Anonymous users can read approved reports only
create policy "anon can read approved reports"
  on public.crowd_reports
  for select
  to anon
  using (status = 'approved');

-- Storage bucket for crowd report images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crowd-reports',
  'crowd-reports',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anonymous can upload to the bucket
create policy "anon can upload crowd report images"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'crowd-reports');

-- Anyone can read crowd report images (bucket is public)
create policy "public can read crowd report images"
  on storage.objects
  for select
  to public
  using (bucket_id = 'crowd-reports');
