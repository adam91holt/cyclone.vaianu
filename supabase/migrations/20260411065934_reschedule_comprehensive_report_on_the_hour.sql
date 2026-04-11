select cron.unschedule('vaianu-comprehensive-report-hourly');

select cron.schedule(
  'vaianu-comprehensive-report-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://' || (select decrypted_secret from vault.decrypted_secrets where name = 'project_url_host') || '/functions/v1/generate-comprehensive-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
