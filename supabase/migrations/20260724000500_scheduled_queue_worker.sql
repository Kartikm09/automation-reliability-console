-- Invoke the lightweight Edge queue consumer without embedding deployment
-- credentials in migrations. Deployment stores the three values in Vault.

create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'arc-queue-consumer',
  '*/2 * * * *',
  $$
    select net.http_post(
      url := settings.project_url || '/functions/v1/process-queues',
      headers := jsonb_build_object(
        'content-type', 'application/json',
        'apikey', settings.publishable_key,
        'x-internal-token', settings.internal_token
      ),
      body := jsonb_build_object(
        'source', 'supabase_cron',
        'scheduled_at', now()
      ),
      timeout_milliseconds := 10000
    )
    from (
      select
        max(decrypted_secret) filter (
          where name = 'arc_project_url'
        ) as project_url,
        max(decrypted_secret) filter (
          where name = 'arc_publishable_key'
        ) as publishable_key,
        max(decrypted_secret) filter (
          where name = 'arc_internal_function_token'
        ) as internal_token
      from vault.decrypted_secrets
      where name in (
        'arc_project_url',
        'arc_publishable_key',
        'arc_internal_function_token'
      )
    ) settings
    where settings.project_url is not null
      and settings.publishable_key is not null
      and settings.internal_token is not null;
  $$
);
