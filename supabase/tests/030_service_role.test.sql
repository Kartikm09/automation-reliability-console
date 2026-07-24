begin;
select plan(6);

select ok(
  has_table_privilege('service_role', 'public.integration_sources', 'SELECT'),
  'service role can identify a webhook source'
);
select ok(
  has_table_privilege('service_role', 'public.integration_sources', 'UPDATE'),
  'service role can record source activity'
);
select ok(
  has_table_privilege('service_role', 'public.webhook_credentials', 'UPDATE'),
  'service role can record credential usage'
);
select ok(
  has_table_privilege('service_role', 'public.raw_execution_events', 'INSERT'),
  'service role can preserve an incoming raw event'
);
select ok(
  has_table_privilege('service_role', 'public.raw_execution_events', 'UPDATE'),
  'service role can update processing metadata'
);
select ok(
  not has_table_privilege(
    'authenticated',
    'public.raw_execution_events',
    'INSERT'
  ),
  'browser users cannot forge raw events'
);

select * from finish();
rollback;
