-- Schedule on the intended environment only, after its endpoint is deployed.
-- Store the environment's OPERATIONS_CRON_SECRET in Vault as
-- ct_attendance_retention_secret using a parameterized administrative connection.
-- Replace the URL below for the reviewed environment. Never commit a secret.
select cron.schedule('ct-attendance-evidence-45d', '0 19 * * *', $$
  select net.http_post(
    url := 'https://ct-noi-bo-test-chau-tuan.vercel.app/api/v1/operations/evidence-retention',
    headers := jsonb_build_object('Content-Type','application/json', 'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='ct_attendance_retention_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$$);
