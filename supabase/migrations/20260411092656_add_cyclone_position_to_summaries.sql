alter table public.cyclone_summaries
  add column if not exists cyclone_lat double precision,
  add column if not exists cyclone_lon double precision,
  add column if not exists cyclone_position_confidence text,
  add column if not exists cyclone_position_rationale text;
