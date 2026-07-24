begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select has_extension('pg_net', 'pg_net is installed for scheduled HTTP calls');
select has_schema('vault', 'Vault is available for encrypted Cron credentials');
select is(
  (select schedule from cron.job where jobname = 'arc-queue-consumer'),
  '*/2 * * * *',
  'the queue consumer uses a low-frequency schedule'
);
select ok(
  (select command like '%vault.decrypted_secrets%'
   from cron.job where jobname = 'arc-queue-consumer'),
  'the queue job reads deployment credentials from Vault'
);
select ok(
  (select command not like '%supabase.co%'
   from cron.job where jobname = 'arc-queue-consumer'),
  'the queue job does not embed a hosted project URL'
);

select * from finish();
rollback;
