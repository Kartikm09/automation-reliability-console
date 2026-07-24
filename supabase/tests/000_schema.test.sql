begin;

create extension if not exists pgtap with schema extensions;
select plan(39);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'organizations', 'organizations table exists');
select has_table('public', 'organization_members', 'organization_members table exists');
select has_table('public', 'environments', 'environments table exists');
select has_table('public', 'integration_sources', 'integration_sources table exists');
select has_table('public', 'webhook_credentials', 'webhook_credentials table exists');
select has_table('public', 'workflow_definitions', 'workflow_definitions table exists');
select has_table('public', 'raw_execution_events', 'raw_execution_events table exists');
select has_table('public', 'workflow_runs', 'workflow_runs table exists');
select has_table('public', 'run_steps', 'run_steps table exists');
select has_table('public', 'run_artifacts', 'run_artifacts table exists');
select has_table('public', 'incidents', 'incidents table exists');
select has_table('public', 'incident_events', 'incident_events table exists');
select has_table('public', 'replay_requests', 'replay_requests table exists');
select has_table('public', 'approval_requests', 'approval_requests table exists');
select has_table('public', 'notification_rules', 'notification_rules table exists');
select has_table('public', 'notifications', 'notifications table exists');
select has_table('public', 'audit_events', 'audit_events table exists');

select is(
  (
    select count(*)::integer
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in (
        'profiles', 'organizations', 'organization_members', 'environments',
        'integration_sources', 'webhook_credentials', 'workflow_definitions',
        'raw_execution_events', 'workflow_runs', 'run_steps', 'run_artifacts',
        'incidents', 'incident_events', 'replay_requests', 'approval_requests',
        'notification_rules', 'notifications', 'audit_events'
      )
      and relrowsecurity
  ),
  18,
  'RLS is enabled on every application table'
);
select is(
  (
    select count(*)::integer
    from pg_class
    where relnamespace = 'public'::regnamespace
      and relname in (
        'profiles', 'organizations', 'organization_members', 'environments',
        'integration_sources', 'webhook_credentials', 'workflow_definitions',
        'raw_execution_events', 'workflow_runs', 'run_steps', 'run_artifacts',
        'incidents', 'incident_events', 'replay_requests', 'approval_requests',
        'notification_rules', 'notifications', 'audit_events'
      )
      and relforcerowsecurity
  ),
  18,
  'RLS is forced on every application table'
);
select col_is_pk('public', 'profiles', 'id', 'profile ID is the primary key');
select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.organization_members'::regclass
      and contype = 'u'
  ),
  'organization membership has a uniqueness constraint'
);
select has_index(
  'public',
  'raw_execution_events',
  'raw_event_external_id_unique',
  'raw external event IDs are idempotent'
);
select has_index(
  'public',
  'workflow_runs',
  'workflow_runs_integration_source_id_external_run_id_key',
  'canonical runs are unique by source and external ID'
);
select is(
  (select public from storage.buckets where id = 'execution-artifacts'),
  false,
  'execution artifact bucket is private'
);
select hasnt_column(
  'public',
  'integration_sources_public',
  'webhook_key_hash',
  'safe integration view excludes credential hashes'
);
select has_function('public', 'is_org_member', array['uuid'], 'membership helper exists');
select has_function('public', 'org_role', array['uuid'], 'role helper exists');
select has_function(
  'public',
  'has_org_role',
  array['uuid', 'text'],
  'minimum-role helper exists'
);
select has_function(
  'public',
  'transition_incident',
  array['uuid', 'text', 'text'],
  'incident transition function exists'
);
select has_function(
  'public',
  'request_replay',
  array['uuid', 'text', 'text'],
  'replay request function exists'
);
select has_function(
  'public',
  'apply_canonical_event',
  array['uuid', 'jsonb'],
  'canonical event function exists'
);
select is(
  (
    select count(*)::integer
    from pgmq.list_queues()
    where queue_name in (
      'raw_event_normalization',
      'replay_jobs',
      'notification_jobs'
    )
  ),
  3,
  'three durable queues are provisioned'
);
select ok(
  (select count(*) > 0 from cron.job where jobname = 'arc-stale-event-health-check'),
  'scheduled workflow health check exists'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.raw_execution_events'::regclass
      and tgname = 'raw_execution_events_immutable_source'
  ),
  'raw payload immutability trigger exists'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.audit_events'::regclass
      and tgname = 'audit_events_append_only'
  ),
  'audit append-only trigger exists'
);
select ok(
  (select count(*) >= 3 from pg_policies where schemaname = 'storage'),
  'private Storage has read, upload, and delete policies'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'realtime'
      and policyname = 'organization_broadcast_receive'
  ),
  'private Realtime authorization policy exists'
);
select has_view(
  'public',
  'integration_sources_public',
  'safe integration metadata view exists'
);

select * from finish();
rollback;
