select cron.unschedule('vaianu-summary-every-15');

select cron.schedule(
  'vaianu-summary-every-3h',
  '30 */3 * * *',
  $$
  select net.http_post(
    url := 'https://' || (select decrypted_secret from vault.decrypted_secrets where name = 'project_url_host') || '/functions/v1/generate-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
