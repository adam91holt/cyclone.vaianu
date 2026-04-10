-- Enable pg_cron + pg_net so we can call our Edge Function on a schedule.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule generate-summary to run every 15 minutes.
-- The function is idempotent; each run writes a new row to cyclone_summaries.
select cron.schedule(
  'vaianu-summary-every-15',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://frqzgozrmtcfgnoobtvo.supabase.co/functions/v1/generate-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Schedule news-feed to run every 10 minutes (keeps the ticker fresh).
select cron.schedule(
  'vaianu-news-every-10',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://frqzgozrmtcfgnoobtvo.supabase.co/functions/v1/news-feed',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

