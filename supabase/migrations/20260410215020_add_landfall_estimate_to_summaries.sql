alter table public.cyclone_summaries
  add column if not exists landfall_estimate_iso timestamptz,
  add column if not exists landfall_confidence text,
  add column if not exists landfall_region text,
  add column if not exists landfall_rationale text;

comment on column public.cyclone_summaries.landfall_estimate_iso is 'AI-estimated landfall time based on news, warnings, weather data.';
comment on column public.cyclone_summaries.landfall_confidence is 'low | medium | high';
