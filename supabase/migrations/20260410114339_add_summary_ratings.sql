-- Add ratings jsonb column to cyclone_summaries.
-- Shape:
-- {
--   seriousness: 1-10,        -- overall state-of-emergency gravity
--   weather_extremity: 1-10,  -- raw meteorological intensity
--   public_safety_risk: 1-10, -- risk to people (evacuation, injury)
--   infrastructure_risk: 1-10,-- risk to roads, power, buildings
--   trajectory: "intensifying" | "steady" | "weakening",
--   rationale: "short text explaining the scores"
-- }
alter table public.cyclone_summaries
  add column if not exists ratings jsonb;

-- Also add a cheap top-level seriousness so we can order/filter quickly.
alter table public.cyclone_summaries
  add column if not exists seriousness int;

-- Make sure anon can read (history panel is public like everything else).
-- RLS already enabled; verify policies exist.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'cyclone_summaries'
      and policyname = 'Allow anon read summaries'
  ) then
    create policy "Allow anon read summaries"
      on public.cyclone_summaries for select to anon using (true);
  end if;
end $$;
