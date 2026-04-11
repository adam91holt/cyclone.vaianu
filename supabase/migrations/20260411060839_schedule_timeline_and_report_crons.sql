-- Harvest the notable-events timeline every 5 minutes.
select cron.schedule(
  'vaianu-timeline-every-5',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://frqzgozrmtcfgnoobtvo.supabase.co/functions/v1/harvest-timeline',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Generate the comprehensive Opus report on the hour, every hour.
select cron.schedule(
  'vaianu-comprehensive-report-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://frqzgozrmtcfgnoobtvo.supabase.co/functions/v1/generate-comprehensive-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

