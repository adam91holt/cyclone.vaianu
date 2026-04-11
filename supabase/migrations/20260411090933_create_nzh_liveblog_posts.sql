create table public.nzh_liveblog_posts (
  post_id text primary key,
  headline text not null,
  body text,
  author text,
  published_at timestamptz not null,
  source_updated_at timestamptz,
  shared_links jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now()
);

create index nzh_liveblog_posts_published_at_idx
  on public.nzh_liveblog_posts (published_at desc);

alter table public.nzh_liveblog_posts enable row level security;

create policy "Allow anonymous read nzh liveblog"
  on public.nzh_liveblog_posts for select to anon using (true);
