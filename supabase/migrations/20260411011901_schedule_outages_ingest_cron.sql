-- Schedule ingest-outages to run every 2 minutes. The orchestrator calls
-- all provider adapters in parallel and upserts the results.
select cron.schedule(
  'vaianu-outages-every-2',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://frqzgozrmtcfgnoobtvo.supabase.co/functions/v1/ingest-outages',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);
