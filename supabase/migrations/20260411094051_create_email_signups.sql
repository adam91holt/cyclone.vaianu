create table public.email_signups (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  created_at timestamptz default now(),
  user_agent text,
  referrer text
);

create unique index email_signups_email_lower_idx
  on public.email_signups (lower(email));

alter table public.email_signups enable row level security;

-- Allow anonymous inserts (signup form). No select/update/delete from anon.
create policy "Allow anonymous insert" on public.email_signups
  for insert to anon with check (true);

