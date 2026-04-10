
-- Unschedule broken jobs
select cron.unschedule('metservice-warnings-every-10-min');
select cron.unschedule('niwa-feed-every-15-min');
select cron.unschedule('stuff-liveblog-every-5-min');

-- Reschedule with the same pattern as the working jobs
select cron.schedule(
  'metservice-warnings-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://frqzgozrmtcfgnoobtvo.supabase.co/functions/v1/metservice-warnings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'niwa-feed-every-15-min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://frqzgozrmtcfgnoobtvo.supabase.co/functions/v1/niwa-feed',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

select cron.schedule(
  'stuff-liveblog-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://frqzgozrmtcfgnoobtvo.supabase.co/functions/v1/stuff-liveblog',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

