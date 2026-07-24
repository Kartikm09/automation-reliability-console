begin;

create extension if not exists pgtap with schema extensions;
select plan(19);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select throws_ok(
  $$ select count(*) from public.organizations $$,
  '42501',
  'permission denied for table organizations',
  'anonymous users cannot read organizations'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  true
);
select is(
  (select count(*) from public.organizations),
  1::bigint,
  'Atlas administrator sees only their organization'
);
select is(
  (
    select count(*) from public.organizations
    where id = '22222222-2222-4222-8222-222222222222'
  ),
  0::bigint,
  'Atlas administrator cannot read Northstar'
);
select throws_ok(
  $$
    update public.organization_members
    set role = 'admin'
    where id = '11000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  'new row violates row-level security policy for table "organization_members"',
  'administrator cannot promote an operator to administrator'
);
select lives_ok(
  $$
    insert into public.environments (
      organization_id, name, slug, environment_type
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'RLS Test',
      'rls-test',
      'development'
    )
  $$,
  'administrator can create an environment in their organization'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  true
);
select is(
  (
    select count(*) from public.workflow_runs
    where organization_id = '11111111-1111-4111-8111-111111111111'
  ),
  0::bigint,
  'Northstar owner cannot read Atlas runs'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  true
);
select is(
  (
    select count(*)
    from public.workflow_definitions
    where id in (
      '10101010-0000-4000-8000-000000000001',
      '10101010-0000-4000-8000-000000000002',
      '10101010-0000-4000-8000-000000000003'
    )
  ),
  3::bigint,
  'viewer can read the seeded workflows in their organization'
);
select throws_ok(
  $$
    insert into public.notification_rules (
      organization_id, name, event_type, minimum_severity, channel_type
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'Forbidden viewer rule',
      'incident.created',
      'high',
      'in_app'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "notification_rules"',
  'viewer cannot create notification rules'
);
select throws_ok(
  $$
    select public.transition_incident(
      '50000000-0000-4000-8000-000000000001',
      'acknowledged',
      'Unauthorized attempt'
    )
  $$,
  '42501',
  'incident transition is not authorized',
  'viewer cannot transition an incident'
);
select throws_ok(
  $$
    insert into public.audit_events (
      organization_id, actor_type, action, resource_type
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'user',
      'forged',
      'incident'
    )
  $$,
  '42501',
  'permission denied for table audit_events',
  'viewer cannot forge an audit event'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  true
);
select ok(
  public.has_org_role('11111111-1111-4111-8111-111111111111', 'operator'),
  'operator has operator capability in Atlas'
);
select is(
  public.org_role('22222222-2222-4222-8222-222222222222'),
  'viewer',
  'one user can have a different role in another organization'
);
select is(
  (select count(*) from public.organizations),
  2::bigint,
  'multi-organization user sees both memberships'
);
select throws_ok(
  $$ select count(*) from public.integration_sources $$,
  '42501',
  'permission denied for table integration_sources',
  'browser users cannot query the credential-bearing source table'
);
select is(
  (
    select count(*) from public.integration_sources_public
    where organization_id = '11111111-1111-4111-8111-111111111111'
      and id in (
        '11111000-0000-4000-8000-000000000001',
        '11111000-0000-4000-8000-000000000002'
      )
  ),
  2::bigint,
  'operator can read safe source metadata for Atlas'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0',
  true
);
select lives_ok(
  $$
    update public.organization_members
    set role = 'admin'
    where id = '11000000-0000-4000-8000-000000000003'
  $$,
  'owner can assign an administrator role to another member'
);
reset role;

update public.organization_members
set membership_status = 'suspended'
where id = '11000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  true
);
select is(
  (
    select count(*) from public.workflow_runs
    where organization_id = '11111111-1111-4111-8111-111111111111'
  ),
  0::bigint,
  'suspended member immediately loses Atlas data access'
);
select is(
  (
    select count(*) from public.audit_events
    where organization_id = '11111111-1111-4111-8111-111111111111'
  ),
  0::bigint,
  'suspended member cannot read Atlas audit history through another membership'
);
reset role;

select is(
  (
    select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('organizations', 'organization_members', 'workflow_runs')
  ) >= 3,
  true,
  'core tenant tables have explicit policies'
);

select * from finish();
rollback;
