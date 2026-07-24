-- Reproducible fictional demonstration data.
-- Seed users receive random, unknown passwords. Use scripts/setup-demo-users.mjs
-- with environment-provided credentials to make them login-capable.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0',
    'authenticated',
    'authenticated',
    'owner@atlas.invalid',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Avery Atlas"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'authenticated',
    'authenticated',
    'admin@atlas.invalid',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Mira Atlas"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'authenticated',
    'authenticated',
    'viewer@atlas.invalid',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Vera Atlas"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'authenticated',
    'authenticated',
    'operator@atlas.invalid',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Dev Patel"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'authenticated',
    'authenticated',
    'admin@northstar.invalid',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Noah North"}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

insert into public.organizations (id, name, slug, status)
values
  ('11111111-1111-4111-8111-111111111111', 'Atlas Automation Labs', 'atlas-automation-labs', 'active'),
  ('22222222-2222-4222-8222-222222222222', 'Northstar Workflow Systems', 'northstar-workflow-systems', 'active')
on conflict (id) do nothing;

insert into public.organization_members (
  id, organization_id, user_id, role, membership_status, joined_at
) values
  (
    '11000000-0000-4000-8000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0',
    'owner',
    'active',
    now()
  ),
  (
    '11000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'admin',
    'active',
    now()
  ),
  (
    '11000000-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    'viewer',
    'active',
    now()
  ),
  (
    '11000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'operator',
    'active',
    now()
  ),
  (
    '22000000-0000-4000-8000-000000000001',
    '22222222-2222-4222-8222-222222222222',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    'owner',
    'active',
    now()
  ),
  (
    '22000000-0000-4000-8000-000000000002',
    '22222222-2222-4222-8222-222222222222',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'viewer',
    'active',
    now()
  )
on conflict (organization_id, user_id) do nothing;

insert into public.environments (
  id, organization_id, name, slug, environment_type
) values
  (
    '11110000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'Production',
    'production',
    'production'
  ),
  (
    '11110000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'Staging',
    'staging',
    'staging'
  ),
  (
    '22220000-0000-4000-8000-000000000001',
    '22222222-2222-4222-8222-222222222222',
    'Production',
    'production',
    'production'
  )
on conflict (id) do nothing;

insert into public.integration_sources (
  id,
  organization_id,
  environment_id,
  name,
  provider_type,
  status,
  external_account_reference,
  public_configuration
) values
  (
    '11111000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '11110000-0000-4000-8000-000000000001',
    'Atlas n8n Production',
    'n8n',
    'active',
    'atlas-demo',
    '{"schema_version":"1","signature_window_seconds":300}'::jsonb
  ),
  (
    '11111000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '11110000-0000-4000-8000-000000000002',
    'Atlas Custom Staging',
    'custom',
    'active',
    'atlas-staging',
    '{"schema_version":"2"}'::jsonb
  ),
  (
    '22222000-0000-4000-8000-000000000001',
    '22222222-2222-4222-8222-222222222222',
    '22220000-0000-4000-8000-000000000001',
    'Northstar Make Production',
    'make',
    'active',
    'northstar-demo',
    '{"schema_version":"1"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.workflow_definitions (
  id,
  organization_id,
  environment_id,
  integration_source_id,
  external_workflow_id,
  name,
  description,
  expected_sla_seconds,
  failure_threshold,
  metadata
) values
  (
    '10101010-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '11110000-0000-4000-8000-000000000001',
    '11111000-0000-4000-8000-000000000001',
    'wf-lead-enrichment',
    'Lead Enrichment Pipeline',
    'Enriches synthetic inbound leads before CRM routing.',
    900,
    2,
    '{"owner_team":"Revenue Operations"}'::jsonb
  ),
  (
    '10101010-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '11110000-0000-4000-8000-000000000001',
    '11111000-0000-4000-8000-000000000001',
    'wf-support-triage',
    'Customer Support Triage',
    'Classifies fictional support requests and proposes routing.',
    300,
    1,
    '{"owner_team":"Support Operations"}'::jsonb
  ),
  (
    '10101010-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    '11110000-0000-4000-8000-000000000002',
    '11111000-0000-4000-8000-000000000002',
    'wf-invoice-sync',
    'Invoice Synchronization',
    'Synchronizes fictional invoice status between demo systems.',
    1200,
    1,
    '{"owner_team":"Finance Automation"}'::jsonb
  ),
  (
    '20202020-0000-4000-8000-000000000001',
    '22222222-2222-4222-8222-222222222222',
    '22220000-0000-4000-8000-000000000001',
    '22222000-0000-4000-8000-000000000001',
    'wf-application-review',
    'Application Review Agent',
    'Reviews fictional application records for completeness.',
    600,
    1,
    '{"owner_team":"Application Operations"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.workflow_runs (
  id,
  organization_id,
  workflow_definition_id,
  integration_source_id,
  external_run_id,
  status,
  trigger_type,
  started_at,
  ended_at,
  duration_ms,
  attempt_number,
  idempotency_key,
  summary,
  input_summary,
  output_summary,
  error_code,
  error_message,
  last_event_at
) values
  (
    '30000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '10101010-0000-4000-8000-000000000001',
    '11111000-0000-4000-8000-000000000001',
    'run-lead-001',
    'succeeded',
    'webhook',
    now() - interval '42 minutes',
    now() - interval '41 minutes 52 seconds',
    8000,
    1,
    'seed:run-lead-001',
    'Five fictional lead records enriched.',
    '{"record_count":5}'::jsonb,
    '{"enriched":5,"rejected":0}'::jsonb,
    null,
    null,
    now() - interval '41 minutes 52 seconds'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '10101010-0000-4000-8000-000000000002',
    '11111000-0000-4000-8000-000000000001',
    'run-support-044',
    'failed',
    'webhook',
    now() - interval '18 minutes',
    now() - interval '17 minutes 46 seconds',
    14000,
    1,
    'seed:run-support-044',
    'Synthetic triage run failed during CRM lookup.',
    '{"ticket_count":12}'::jsonb,
    '{"classified":8}'::jsonb,
    'CRM_RATE_LIMIT',
    'Fictional CRM returned a temporary rate-limit response.',
    now() - interval '17 minutes 46 seconds'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    '10101010-0000-4000-8000-000000000003',
    '11111000-0000-4000-8000-000000000002',
    'run-invoice-019',
    'timed_out',
    'schedule',
    now() - interval '2 hours',
    now() - interval '1 hour 40 minutes',
    1200000,
    2,
    'seed:run-invoice-019',
    'Invoice synchronization exceeded its expected duration.',
    '{"invoice_count":240}'::jsonb,
    '{"processed":188}'::jsonb,
    'UPSTREAM_TIMEOUT',
    'The fictional accounting endpoint did not complete in time.',
    now() - interval '1 hour 40 minutes'
  ),
  (
    '40000000-0000-4000-8000-000000000001',
    '22222222-2222-4222-8222-222222222222',
    '20202020-0000-4000-8000-000000000001',
    '22222000-0000-4000-8000-000000000001',
    'run-review-008',
    'running',
    'schedule',
    now() - interval '3 minutes',
    null,
    null,
    1,
    'seed:run-review-008',
    'Reviewing fictional applications.',
    '{"application_count":18}'::jsonb,
    '{}'::jsonb,
    null,
    null,
    now() - interval '1 minute'
  )
on conflict (id) do nothing;

insert into public.run_steps (
  id,
  organization_id,
  workflow_run_id,
  external_step_id,
  sequence_number,
  name,
  step_type,
  status,
  started_at,
  ended_at,
  duration_ms,
  output_summary,
  error_code,
  error_message
) values
  (
    '31000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '30000000-0000-4000-8000-000000000002',
    'step-validate',
    1,
    'Validate request',
    'validation',
    'succeeded',
    now() - interval '18 minutes',
    now() - interval '17 minutes 59 seconds',
    1000,
    '{"valid":12}'::jsonb,
    null,
    null
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '30000000-0000-4000-8000-000000000002',
    'step-classify',
    2,
    'Classify tickets',
    'ai_task',
    'succeeded',
    now() - interval '17 minutes 59 seconds',
    now() - interval '17 minutes 51 seconds',
    8000,
    '{"classified":12}'::jsonb,
    null,
    null
  ),
  (
    '31000000-0000-4000-8000-000000000003',
    '11111111-1111-4111-8111-111111111111',
    '30000000-0000-4000-8000-000000000002',
    'step-crm',
    3,
    'Resolve CRM account',
    'http_request',
    'failed',
    now() - interval '17 minutes 51 seconds',
    now() - interval '17 minutes 46 seconds',
    5000,
    '{"resolved":8}'::jsonb,
    'CRM_RATE_LIMIT',
    'Temporary synthetic rate limit.'
  )
on conflict (id) do nothing;

insert into public.incidents (
  id,
  organization_id,
  workflow_definition_id,
  workflow_run_id,
  severity,
  status,
  title,
  summary,
  detection_source,
  detected_at,
  assigned_to
) values
  (
    '50000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '10101010-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000002',
    'medium',
    'open',
    'Customer Support Triage failed',
    'The fictional CRM rate limit interrupted ticket routing.',
    'canonical_event',
    now() - interval '17 minutes',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '10101010-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000003',
    'high',
    'investigating',
    'Invoice Synchronization timed out',
    'The fictional accounting endpoint did not complete in time.',
    'duration_rule',
    now() - interval '1 hour 39 minutes',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'
  )
on conflict (id) do nothing;

insert into public.incident_events (
  id, organization_id, incident_id, event_type, actor_user_id, note, created_at
) values
  (
    '51000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    '50000000-0000-4000-8000-000000000001',
    'detected',
    null,
    'Created automatically from a normalized failure event.',
    now() - interval '17 minutes'
  ),
  (
    '51000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    '50000000-0000-4000-8000-000000000002',
    'status_changed',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'Investigating the fictional upstream timeout.',
    now() - interval '1 hour 25 minutes'
  )
on conflict (id) do nothing;

insert into public.approval_requests (
  id,
  organization_id,
  workflow_run_id,
  title,
  description,
  assigned_to,
  requested_by,
  due_at
) values (
  '60000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  '30000000-0000-4000-8000-000000000003',
  'Approve controlled invoice replay',
  'Review the safe input summary before allowing the synthetic replay.',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  now() + interval '2 hours'
)
on conflict (id) do nothing;

insert into public.notifications (
  id, organization_id, user_id, incident_id, title, body, notification_type
) values (
  '70000000-0000-4000-8000-000000000001',
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  '50000000-0000-4000-8000-000000000001',
  'Support triage needs attention',
  'A synthetic workflow failure is ready for investigation.',
  'incident_created'
)
on conflict (id) do nothing;

insert into public.audit_events (
  id,
  organization_id,
  actor_type,
  action,
  resource_type,
  resource_id,
  new_values,
  metadata,
  created_at
) values
  (
    '80000000-0000-4000-8000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'system',
    'workflow_run.completed',
    'workflow_run',
    '30000000-0000-4000-8000-000000000001',
    '{"status":"succeeded"}'::jsonb,
    '{"fixture":"seed"}'::jsonb,
    now() - interval '41 minutes'
  ),
  (
    '80000000-0000-4000-8000-000000000002',
    '11111111-1111-4111-8111-111111111111',
    'system',
    'incident.created',
    'incident',
    '50000000-0000-4000-8000-000000000001',
    '{"severity":"medium","status":"open"}'::jsonb,
    '{"fixture":"seed"}'::jsonb,
    now() - interval '17 minutes'
  )
on conflict (id) do nothing;
