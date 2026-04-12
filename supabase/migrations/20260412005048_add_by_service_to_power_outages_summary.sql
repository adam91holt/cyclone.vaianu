alter table public.power_outages_summary
  add column if not exists by_service jsonb not null default '{}'::jsonb;
