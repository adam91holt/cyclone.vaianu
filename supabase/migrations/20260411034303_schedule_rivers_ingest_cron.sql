-- Schedule ingest-rivers to run every 10 minutes. The function fetches
-- Stage readings for all ~1700 named sites across all 10 regional
-- councils and upserts into river_sites / river_readings.
select cron.schedule(
  'vaianu-rivers-every-10',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://frqzgozrmtcfgnoobtvo.supabase.co/functions/v1/ingest-rivers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000
  );
  $$
);

