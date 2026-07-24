begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

create temporary table state_machine_audit_baseline as
select count(*)::bigint as audit_count
from public.audit_events
where action in (
  'incident.status_changed',
  'replay.requested',
  'replay.decided'
);

select ok(public.is_legal_run_transition('queued', 'running'), 'queued can become running');
select ok(public.is_legal_run_transition('running', 'succeeded'), 'running can succeed');
select ok(
  not public.is_legal_run_transition('succeeded', 'running'),
  'terminal run cannot move backward'
);
select ok(
  not public.is_legal_run_transition('failed', 'succeeded'),
  'failed run cannot silently become successful'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  true
);
select is(
  (
    select status from public.transition_incident(
      '50000000-0000-4000-8000-000000000001',
      'acknowledged',
      'Verified signal'
    )
  ),
  'acknowledged',
  'operator can acknowledge an open incident'
);
select is(
  (
    select status from public.transition_incident(
      '50000000-0000-4000-8000-000000000001',
      'investigating',
      'Started investigation'
    )
  ),
  'investigating',
  'acknowledged incident can enter investigation'
);
select is(
  (
    select status from public.transition_incident(
      '50000000-0000-4000-8000-000000000001',
      'resolved',
      'Synthetic dependency recovered'
    )
  ),
  'resolved',
  'investigating incident can resolve'
);
select is(
  (
    select status from public.transition_incident(
      '50000000-0000-4000-8000-000000000001',
      'closed',
      'Review complete'
    )
  ),
  'closed',
  'resolved incident can close'
);
select throws_ok(
  $$
    select public.transition_incident(
      '50000000-0000-4000-8000-000000000001',
      'open',
      'Invalid reopen'
    )
  $$,
  '22023',
  'illegal incident transition: closed -> open',
  'closed incident cannot reopen through an impossible transition'
);
select is(
  (
    select id from public.request_replay(
      '30000000-0000-4000-8000-000000000002',
      'Retry after the fictional rate limit window.',
      '00000000-0000-4000-8000-000000000777'
    )
  ),
  (
    select id from public.request_replay(
      '30000000-0000-4000-8000-000000000002',
      'Same idempotent request.',
      '00000000-0000-4000-8000-000000000777'
    )
  ),
  'replay request idempotency returns the same record'
);
select is(
  (
    select count(*) from public.replay_requests
    where idempotency_key = '00000000-0000-4000-8000-000000000777'
  ),
  1::bigint,
  'duplicate replay requests do not create duplicate rows'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  true
);
select is(
  (
    select status from public.decide_replay_request(
      (
        select id from public.replay_requests
        where idempotency_key = '00000000-0000-4000-8000-000000000777'
      ),
      'approved'
    )
  ),
  'approved',
  'administrator can approve a pending replay'
);
select throws_ok(
  $$
    select public.decide_replay_request(
      (
        select id from public.replay_requests
        where idempotency_key = '00000000-0000-4000-8000-000000000777'
      ),
      'approved'
    )
  $$,
  '22023',
  'replay decision is not valid',
  'duplicate terminal replay decisions are rejected'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  true
);
select throws_ok(
  $$
    select public.request_replay(
      '30000000-0000-4000-8000-000000000001',
      'Successful runs must not be replayed.',
      '00000000-0000-4000-8000-000000000778'
    )
  $$,
  '22023',
  'workflow run is not replayable in status succeeded',
  'successful workflow run cannot be replayed'
);
reset role;

select is(
  (
    select count(*) - baseline.audit_count
    from public.audit_events
    cross join state_machine_audit_baseline baseline
    where action in ('incident.status_changed', 'replay.requested', 'replay.decided')
    group by baseline.audit_count
  ),
  6::bigint,
  'state changes append audit evidence'
);

insert into public.raw_execution_events (
  id,
  organization_id,
  integration_source_id,
  external_event_id,
  provider_type,
  event_type,
  event_timestamp,
  original_payload,
  payload_hash,
  signature_valid
) values (
  '60000000-0000-4000-8000-000000000099',
  '11111111-1111-4111-8111-111111111111',
  '11111000-0000-4000-8000-000000000002',
  'evt-pgtap-regression',
  'custom',
  'run.failed',
  '2026-07-24T09:00:04Z',
  '{"synthetic":true}'::jsonb,
  'pgtap-regression-hash',
  true
);

set local role service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
select is(
  (
    public.apply_canonical_event(
      '60000000-0000-4000-8000-000000000099',
      '{
        "provider":"custom",
        "external_event_id":"evt-pgtap-regression",
        "external_workflow_id":"wf-pgtap-regression",
        "workflow_name":"pgTAP Regression Workflow",
        "external_run_id":"run-pgtap-regression",
        "event_type":"run.failed",
        "run_status":"failed",
        "event_timestamp":"2026-07-24T09:00:04Z",
        "started_at":"2026-07-24T09:00:00Z",
        "ended_at":"2026-07-24T09:00:04Z",
        "duration_ms":4000,
        "attempt_number":1,
        "trigger_type":"test",
        "input_summary":{},
        "output_summary":{},
        "error":{"code":"SYNTHETIC","message":"Synthetic test failure."},
        "steps":[],
        "source_schema_version":"1",
        "warnings":[]
      }'::jsonb
    )->>'outcome'
  ),
  'applied',
  'canonical event application creates a run without JSON precedence errors'
);
reset role;
select is(
  (
    select idempotency_key
    from public.workflow_runs
    where external_run_id = 'run-pgtap-regression'
  ),
  '11111000-0000-4000-8000-000000000002:run-pgtap-regression',
  'canonical run receives a stable source-and-run idempotency key'
);

select * from finish();
rollback;
