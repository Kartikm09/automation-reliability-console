-- Automation Reliability Console
-- Synthetic, multi-tenant operational data model and authorization boundary.

create extension if not exists pgcrypto with schema extensions;
-- PGMQ creates and owns its pgmq schema during extension installation.
create extension if not exists pgmq;
create extension if not exists pg_cron;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'active' check (status in ('active', 'suspended', 'closed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'operator', 'viewer')),
  membership_status text not null default 'active'
    check (membership_status in ('invited', 'active', 'suspended', 'removed')),
  invited_by uuid references auth.users(id),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.environments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  environment_type text not null
    check (environment_type in ('development', 'staging', 'production')),
  created_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (organization_id, id)
);

create table public.integration_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  environment_id uuid not null references public.environments(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 120),
  provider_type text not null check (provider_type in ('custom', 'n8n', 'make', 'zapier')),
  status text not null default 'active' check (status in ('active', 'disabled', 'revoked')),
  external_account_reference text,
  public_configuration jsonb not null default '{}'::jsonb,
  webhook_key_prefix text,
  webhook_key_hash text,
  last_event_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint environment_matches_organization foreign key (organization_id, environment_id)
    references public.environments(organization_id, id) deferrable initially immediate
);

create table public.webhook_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_source_id uuid not null references public.integration_sources(id) on delete cascade,
  key_prefix text not null,
  key_hash text not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  unique (key_prefix)
);

create unique index one_active_credential_per_source
  on public.webhook_credentials(integration_source_id)
  where status = 'active';

create table public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  environment_id uuid not null references public.environments(id) on delete restrict,
  integration_source_id uuid not null references public.integration_sources(id) on delete restrict,
  external_workflow_id text not null,
  name text not null check (length(trim(name)) between 1 and 160),
  description text,
  enabled boolean not null default true,
  expected_sla_seconds integer check (expected_sla_seconds is null or expected_sla_seconds > 0),
  failure_threshold integer not null default 1 check (failure_threshold between 1 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_source_id, external_workflow_id)
);

create table public.raw_execution_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_source_id uuid not null references public.integration_sources(id) on delete restrict,
  external_event_id text,
  provider_type text not null check (provider_type in ('custom', 'n8n', 'make', 'zapier')),
  event_type text not null,
  source_schema_version text not null default '1',
  received_at timestamptz not null default now(),
  event_timestamp timestamptz,
  original_payload jsonb not null,
  payload_hash text not null,
  signature_valid boolean not null default false,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'processed', 'failed', 'dead_letter')),
  processing_attempts integer not null default 0 check (processing_attempts >= 0),
  processing_error_code text,
  processing_error_message text,
  processed_at timestamptz,
  correlation_id uuid not null default gen_random_uuid()
);

create unique index raw_event_external_id_unique
  on public.raw_execution_events(integration_source_id, external_event_id)
  where external_event_id is not null;
create unique index raw_event_payload_fallback_unique
  on public.raw_execution_events(integration_source_id, payload_hash)
  where external_event_id is null;

create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete restrict,
  integration_source_id uuid not null references public.integration_sources(id) on delete restrict,
  external_run_id text not null,
  parent_run_id uuid references public.workflow_runs(id) on delete set null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'timed_out')),
  trigger_type text not null default 'unknown',
  started_at timestamptz,
  ended_at timestamptz,
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  attempt_number integer not null default 1 check (attempt_number > 0),
  idempotency_key text not null,
  summary text,
  input_summary jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  last_event_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_source_id, external_run_id),
  unique (organization_id, idempotency_key),
  check (ended_at is null or started_at is null or ended_at >= started_at)
);

create table public.run_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  external_step_id text not null,
  sequence_number integer not null check (sequence_number >= 0),
  name text not null,
  step_type text not null default 'action',
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'skipped', 'timed_out')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  attempt_number integer not null default 1 check (attempt_number > 0),
  input_summary jsonb not null default '{}'::jsonb,
  output_summary jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow_run_id, external_step_id),
  unique (workflow_run_id, sequence_number),
  check (ended_at is null or started_at is null or ended_at >= started_at)
);

create table public.run_artifacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  run_step_id uuid references public.run_steps(id) on delete set null,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null check (mime_type in ('text/plain', 'application/json', 'text/csv', 'application/pdf')),
  byte_size bigint not null check (byte_size between 1 and 5242880),
  sha256_hash text not null check (sha256_hash ~ '^[a-f0-9]{64}$'),
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (storage_path !~ '(^|/)\\.\\.(/|$)')
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_definition_id uuid not null references public.workflow_definitions(id) on delete restrict,
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open'
    check (status in ('open', 'acknowledged', 'investigating', 'resolved', 'closed')),
  title text not null,
  summary text not null,
  detection_source text not null,
  detected_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id),
  assigned_to uuid references auth.users(id),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  root_cause text,
  resolution_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_active_incident_per_run
  on public.incidents(workflow_run_id)
  where workflow_run_id is not null and status in ('open', 'acknowledged', 'investigating');

create table public.incident_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid references auth.users(id),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.replay_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  original_workflow_run_id uuid not null references public.workflow_runs(id) on delete restrict,
  resulting_workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  requested_by uuid not null references auth.users(id),
  reason text not null check (length(trim(reason)) between 8 and 1000),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'processing', 'succeeded', 'failed', 'rejected')),
  approved_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  idempotency_key text not null,
  unique (organization_id, idempotency_key)
);

create unique index one_active_replay_per_run
  on public.replay_requests(original_workflow_run_id)
  where status in ('pending', 'approved', 'processing');

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  run_step_id uuid references public.run_steps(id) on delete set null,
  title text not null,
  description text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  requested_by uuid references auth.users(id),
  assigned_to uuid not null references auth.users(id),
  due_at timestamptz,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now()
);

create table public.notification_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  enabled boolean not null default true,
  event_type text not null,
  minimum_severity text check (minimum_severity in ('low', 'medium', 'high', 'critical')),
  channel_type text not null check (channel_type in ('in_app', 'webhook', 'email')),
  destination_configuration jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  incident_id uuid references public.incidents(id) on delete set null,
  title text not null,
  body text not null,
  notification_type text not null,
  status text not null default 'unread' check (status in ('unread', 'read', 'archived')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  actor_type text not null check (actor_type in ('user', 'service', 'system', 'webhook')),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  correlation_id uuid not null default gen_random_uuid(),
  old_values jsonb not null default '{}'::jsonb,
  new_values jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organization_members_user_active_idx
  on public.organization_members(user_id, organization_id)
  where membership_status = 'active';
create index environments_org_idx on public.environments(organization_id);
create index sources_org_status_idx on public.integration_sources(organization_id, status);
create index workflows_org_enabled_idx on public.workflow_definitions(organization_id, enabled);
create index workflows_source_idx on public.workflow_definitions(integration_source_id);
create index raw_events_processing_idx on public.raw_execution_events(processing_status, received_at);
create index raw_events_org_received_idx on public.raw_execution_events(organization_id, received_at desc);
create index runs_org_status_started_idx on public.workflow_runs(organization_id, status, started_at desc);
create index runs_workflow_started_idx on public.workflow_runs(workflow_definition_id, started_at desc);
create index run_steps_run_sequence_idx on public.run_steps(workflow_run_id, sequence_number);
create index incidents_org_status_detected_idx on public.incidents(organization_id, status, detected_at desc);
create index incidents_workflow_idx on public.incidents(workflow_definition_id, detected_at desc);
create index incident_events_timeline_idx on public.incident_events(incident_id, created_at);
create index replay_org_status_idx on public.replay_requests(organization_id, status, requested_at desc);
create index approvals_assigned_status_idx on public.approval_requests(assigned_to, status, due_at);
create index notifications_user_status_idx on public.notifications(user_id, status, created_at desc);
create index audit_org_created_idx on public.audit_events(organization_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles', 'organizations', 'integration_sources', 'workflow_definitions',
    'workflow_runs', 'run_steps', 'incidents', 'notification_rules'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      target_table || '_set_updated_at',
      target_table
    );
  end loop;
end;
$$;

create or replace function public.role_rank(candidate_role text)
returns integer
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select case candidate_role
    when 'viewer' then 1
    when 'operator' then 2
    when 'admin' then 3
    when 'owner' then 4
    else 0
  end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Console user'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_profile_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.organization_members member
    join public.organizations organization on organization.id = member.organization_id
    where member.organization_id = target_organization_id
      and member.user_id = auth.uid()
      and member.membership_status = 'active'
      and organization.status = 'active'
  )
$$;

create or replace function public.org_role(target_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select member.role
  from public.organization_members member
  join public.organizations organization on organization.id = member.organization_id
  where member.organization_id = target_organization_id
    and member.user_id = auth.uid()
    and member.membership_status = 'active'
    and organization.status = 'active'
$$;

create or replace function public.has_org_role(
  target_organization_id uuid,
  required_role text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.role_rank(coalesce(public.org_role(target_organization_id), ''))
    >= public.role_rank(required_role)
$$;

create or replace function public.can_access_workflow_run(target_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.workflow_runs run
    where run.id = target_run_id
      and public.is_org_member(run.organization_id)
  )
$$;

create or replace function public.can_mutate_incident(target_incident_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.incidents incident
    where incident.id = target_incident_id
      and public.has_org_role(incident.organization_id, 'operator')
  )
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.org_role(uuid) from public;
revoke all on function public.has_org_role(uuid, text) from public;
revoke all on function public.can_access_workflow_run(uuid) from public;
revoke all on function public.can_mutate_incident(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.org_role(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text) to authenticated;
grant execute on function public.can_access_workflow_run(uuid) to authenticated;
grant execute on function public.can_mutate_incident(uuid) to authenticated;

create or replace function public.create_organization_with_owner(
  organization_name text,
  organization_slug text
)
returns public.organizations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created_organization public.organizations;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (trim(organization_name), lower(trim(organization_slug)), auth.uid())
  returning * into created_organization;

  insert into public.organization_members (
    organization_id, user_id, role, membership_status, joined_at
  ) values (
    created_organization.id, auth.uid(), 'owner', 'active', now()
  );

  insert into public.environments (
    organization_id, name, slug, environment_type
  ) values
    (created_organization.id, 'Development', 'development', 'development'),
    (created_organization.id, 'Production', 'production', 'production');

  insert into public.audit_events (
    organization_id, actor_user_id, actor_type, action, resource_type, resource_id,
    new_values
  ) values (
    created_organization.id,
    auth.uid(),
    'user',
    'organization.created',
    'organization',
    created_organization.id,
    jsonb_build_object('name', created_organization.name, 'slug', created_organization.slug)
  );

  return created_organization;
end;
$$;

revoke all on function public.create_organization_with_owner(text, text) from public;
grant execute on function public.create_organization_with_owner(text, text) to authenticated;

create or replace function public.protect_raw_original_payload()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.original_payload is distinct from old.original_payload
    or new.payload_hash is distinct from old.payload_hash
    or new.integration_source_id is distinct from old.integration_source_id
  then
    raise exception 'raw execution event source data is immutable'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger raw_execution_events_immutable_source
before update on public.raw_execution_events
for each row execute function public.protect_raw_original_payload();

create or replace function public.protect_append_only_rows()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '55000';
end;
$$;

create trigger audit_events_append_only
before update or delete on public.audit_events
for each row execute function public.protect_append_only_rows();

create trigger incident_events_append_only
before update or delete on public.incident_events
for each row execute function public.protect_append_only_rows();

create or replace function public.transition_incident(
  target_incident_id uuid,
  target_status text,
  transition_note text default null
)
returns public.incidents
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_incident public.incidents;
  resulting_incident public.incidents;
  allowed boolean := false;
begin
  select * into current_incident
  from public.incidents
  where id = target_incident_id
  for update;

  if not found then
    raise exception 'incident not found' using errcode = 'P0002';
  end if;
  if not public.has_org_role(current_incident.organization_id, 'operator') then
    raise exception 'incident transition is not authorized' using errcode = '42501';
  end if;

  allowed := case current_incident.status
    when 'open' then target_status in ('acknowledged', 'investigating')
    when 'acknowledged' then target_status in ('investigating', 'resolved')
    when 'investigating' then target_status = 'resolved'
    when 'resolved' then target_status = 'closed'
    else false
  end;
  if not allowed then
    raise exception 'illegal incident transition: % -> %', current_incident.status, target_status
      using errcode = '22023';
  end if;

  update public.incidents
  set
    status = target_status,
    acknowledged_at = case
      when target_status = 'acknowledged' then coalesce(acknowledged_at, now())
      else acknowledged_at
    end,
    acknowledged_by = case
      when target_status = 'acknowledged' then coalesce(acknowledged_by, auth.uid())
      else acknowledged_by
    end,
    resolved_at = case when target_status = 'resolved' then now() else resolved_at end,
    resolved_by = case when target_status = 'resolved' then auth.uid() else resolved_by end
  where id = target_incident_id
  returning * into resulting_incident;

  insert into public.incident_events (
    organization_id, incident_id, event_type, actor_user_id, note
  ) values (
    current_incident.organization_id,
    current_incident.id,
    'status_changed',
    auth.uid(),
    transition_note
  );

  insert into public.audit_events (
    organization_id, actor_user_id, actor_type, action, resource_type, resource_id,
    old_values, new_values
  ) values (
    current_incident.organization_id,
    auth.uid(),
    'user',
    'incident.status_changed',
    'incident',
    current_incident.id,
    jsonb_build_object('status', current_incident.status),
    jsonb_build_object('status', target_status)
  );

  perform realtime.send(
    jsonb_build_object(
      'incident_id', resulting_incident.id,
      'status', resulting_incident.status
    ),
    'incident.updated',
    format('org:%s:incidents', resulting_incident.organization_id),
    true
  );

  return resulting_incident;
end;
$$;

create or replace function public.request_replay(
  target_run_id uuid,
  replay_reason text,
  request_idempotency_key text
)
returns public.replay_requests
language plpgsql
security definer
set search_path = pg_catalog, public, pgmq
as $$
declare
  current_run public.workflow_runs;
  created_request public.replay_requests;
begin
  select * into current_run
  from public.workflow_runs
  where id = target_run_id
  for share;

  if not found then
    raise exception 'workflow run not found' using errcode = 'P0002';
  end if;
  if not public.has_org_role(current_run.organization_id, 'operator') then
    raise exception 'replay request is not authorized' using errcode = '42501';
  end if;
  if current_run.status not in ('failed', 'timed_out', 'cancelled') then
    raise exception 'workflow run is not replayable in status %', current_run.status
      using errcode = '22023';
  end if;

  select * into created_request
  from public.replay_requests
  where organization_id = current_run.organization_id
    and idempotency_key = request_idempotency_key;
  if found then
    return created_request;
  end if;

  insert into public.replay_requests (
    organization_id,
    original_workflow_run_id,
    requested_by,
    reason,
    idempotency_key
  ) values (
    current_run.organization_id,
    current_run.id,
    auth.uid(),
    trim(replay_reason),
    request_idempotency_key
  )
  on conflict (organization_id, idempotency_key) do nothing
  returning * into created_request;

  if created_request.id is null then
    select * into created_request
    from public.replay_requests
    where organization_id = current_run.organization_id
      and idempotency_key = request_idempotency_key;
    return created_request;
  end if;

  perform pgmq.send(
    'replay_jobs',
    jsonb_build_object(
      'replay_request_id', created_request.id,
      'organization_id', created_request.organization_id,
      'correlation_id', gen_random_uuid()
    )
  );

  insert into public.audit_events (
    organization_id, actor_user_id, actor_type, action, resource_type, resource_id,
    new_values
  ) values (
    current_run.organization_id,
    auth.uid(),
    'user',
    'replay.requested',
    'replay_request',
    created_request.id,
    jsonb_build_object('status', created_request.status, 'run_id', current_run.id)
  );

  perform realtime.send(
    jsonb_build_object(
      'replay_request_id', created_request.id,
      'status', created_request.status
    ),
    'replay.updated',
    format('org:%s:approvals', created_request.organization_id),
    true
  );

  return created_request;
end;
$$;

create or replace function public.decide_approval(
  target_approval_id uuid,
  decision text,
  note text default null
)
returns public.approval_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_request public.approval_requests;
  resulting_request public.approval_requests;
begin
  select * into current_request
  from public.approval_requests
  where id = target_approval_id
  for update;

  if not found then
    raise exception 'approval request not found' using errcode = 'P0002';
  end if;
  if current_request.assigned_to <> auth.uid()
    or not public.has_org_role(current_request.organization_id, 'operator')
  then
    raise exception 'approval decision is not authorized' using errcode = '42501';
  end if;
  if current_request.status <> 'pending' or decision not in ('approved', 'rejected') then
    raise exception 'approval decision is not valid' using errcode = '22023';
  end if;

  update public.approval_requests
  set status = decision, decided_at = now(), decision_note = note
  where id = target_approval_id
  returning * into resulting_request;

  insert into public.audit_events (
    organization_id, actor_user_id, actor_type, action, resource_type, resource_id,
    old_values, new_values
  ) values (
    current_request.organization_id,
    auth.uid(),
    'user',
    'approval.decided',
    'approval_request',
    current_request.id,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', decision)
  );

  perform realtime.send(
    jsonb_build_object(
      'approval_request_id', resulting_request.id,
      'status', resulting_request.status
    ),
    'approval.updated',
    format('org:%s:approvals', resulting_request.organization_id),
    true
  );

  return resulting_request;
end;
$$;

create or replace function public.store_integration_credential(
  target_source_id uuid,
  new_key_prefix text,
  new_key_hash text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_source public.integration_sources;
  credential_id uuid;
begin
  select * into target_source
  from public.integration_sources
  where id = target_source_id
  for update;

  if not found then
    raise exception 'integration source not found' using errcode = 'P0002';
  end if;
  if not public.has_org_role(target_source.organization_id, 'admin') then
    raise exception 'credential management is not authorized' using errcode = '42501';
  end if;
  if new_key_prefix !~ '^wh_[a-zA-Z0-9]{10}$'
    or new_key_hash !~ '^[a-f0-9]{64}$'
  then
    raise exception 'credential format is invalid' using errcode = '22023';
  end if;

  update public.webhook_credentials
  set status = 'revoked', revoked_at = now(), revoked_by = auth.uid()
  where integration_source_id = target_source_id and status = 'active';

  insert into public.webhook_credentials (
    organization_id, integration_source_id, key_prefix, key_hash, created_by
  ) values (
    target_source.organization_id, target_source.id, new_key_prefix, new_key_hash, auth.uid()
  ) returning id into credential_id;

  update public.integration_sources
  set webhook_key_prefix = new_key_prefix, webhook_key_hash = new_key_hash
  where id = target_source.id;

  insert into public.audit_events (
    organization_id, actor_user_id, actor_type, action, resource_type, resource_id,
    new_values
  ) values (
    target_source.organization_id,
    auth.uid(),
    'user',
    'integration.credential_rotated',
    'integration_source',
    target_source.id,
    jsonb_build_object('key_prefix', new_key_prefix)
  );

  return credential_id;
end;
$$;

revoke all on function public.transition_incident(uuid, text, text) from public;
revoke all on function public.request_replay(uuid, text, text) from public;
revoke all on function public.decide_approval(uuid, text, text) from public;
revoke all on function public.store_integration_credential(uuid, text, text) from public;
grant execute on function public.transition_incident(uuid, text, text) to authenticated;
grant execute on function public.request_replay(uuid, text, text) to authenticated;
grant execute on function public.decide_approval(uuid, text, text) to authenticated;
grant execute on function public.store_integration_credential(uuid, text, text) to authenticated;

create or replace function public.enqueue_platform_job(queue_name text, payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, pgmq
as $$
declare
  message_id bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if queue_name not in ('raw_event_normalization', 'replay_jobs', 'notification_jobs') then
    raise exception 'unknown queue' using errcode = '22023';
  end if;
  select pgmq.send(queue_name, payload) into message_id;
  return message_id;
end;
$$;

revoke all on function public.enqueue_platform_job(text, jsonb) from public;
grant execute on function public.enqueue_platform_job(text, jsonb) to service_role;

-- RLS is explicitly enabled on every application table.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'profiles', 'organizations', 'organization_members', 'environments',
    'integration_sources', 'webhook_credentials', 'workflow_definitions',
    'raw_execution_events', 'workflow_runs', 'run_steps', 'run_artifacts',
    'incidents', 'incident_events', 'replay_requests', 'approval_requests',
    'notification_rules', 'notifications', 'audit_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', target_table);
    execute format('alter table public.%I force row level security', target_table);
    execute format('revoke all on public.%I from anon, authenticated', target_table);
  end loop;
end;
$$;

create policy profiles_read_shared_organization
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs
      on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid()
      and mine.membership_status = 'active'
      and theirs.user_id = profiles.id
      and theirs.membership_status = 'active'
  )
);
create policy profiles_update_self
on public.profiles for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_read_members
on public.organizations for select to authenticated
using (public.is_org_member(id));
create policy organizations_create_authenticated
on public.organizations for insert to authenticated
with check (created_by = auth.uid());
create policy organizations_update_admin
on public.organizations for update to authenticated
using (public.has_org_role(id, 'admin'))
with check (public.has_org_role(id, 'admin'));

create policy members_read_same_organization
on public.organization_members for select to authenticated
using (public.is_org_member(organization_id));
create policy members_insert_managers
on public.organization_members for insert to authenticated
with check (
  user_id <> auth.uid()
  and (
    public.org_role(organization_id) = 'owner'
    or (
      public.org_role(organization_id) = 'admin'
      and role in ('operator', 'viewer')
    )
  )
);
create policy members_update_managers
on public.organization_members for update to authenticated
using (
  user_id <> auth.uid()
  and (
    public.org_role(organization_id) = 'owner'
    or (
      public.org_role(organization_id) = 'admin'
      and role in ('operator', 'viewer')
    )
  )
)
with check (
  user_id <> auth.uid()
  and (
    public.org_role(organization_id) = 'owner'
    or (
      public.org_role(organization_id) = 'admin'
      and role in ('operator', 'viewer')
    )
  )
);

create policy environments_read_members
on public.environments for select to authenticated
using (public.is_org_member(organization_id));
create policy environments_manage_admin
on public.environments for all to authenticated
using (public.has_org_role(organization_id, 'admin'))
with check (public.has_org_role(organization_id, 'admin'));

create policy sources_read_members
on public.integration_sources for select to authenticated
using (public.is_org_member(organization_id));
create policy sources_manage_admin
on public.integration_sources for all to authenticated
using (public.has_org_role(organization_id, 'admin'))
with check (public.has_org_role(organization_id, 'admin'));

create policy credentials_admin_only
on public.webhook_credentials for select to authenticated
using (public.has_org_role(organization_id, 'admin'));

create policy workflows_read_members
on public.workflow_definitions for select to authenticated
using (public.is_org_member(organization_id));
create policy workflows_manage_admin
on public.workflow_definitions for all to authenticated
using (public.has_org_role(organization_id, 'admin'))
with check (public.has_org_role(organization_id, 'admin'));

create policy raw_events_read_operator
on public.raw_execution_events for select to authenticated
using (public.has_org_role(organization_id, 'operator'));

create policy runs_read_members
on public.workflow_runs for select to authenticated
using (public.is_org_member(organization_id));
create policy steps_read_members
on public.run_steps for select to authenticated
using (public.is_org_member(organization_id));
create policy artifacts_read_members
on public.run_artifacts for select to authenticated
using (public.is_org_member(organization_id));

create policy incidents_read_members
on public.incidents for select to authenticated
using (public.is_org_member(organization_id));
create policy incident_events_read_members
on public.incident_events for select to authenticated
using (public.is_org_member(organization_id));
create policy replay_requests_read_members
on public.replay_requests for select to authenticated
using (public.is_org_member(organization_id));
create policy approval_requests_read_members
on public.approval_requests for select to authenticated
using (public.is_org_member(organization_id));

create policy notification_rules_read_members
on public.notification_rules for select to authenticated
using (public.is_org_member(organization_id));
create policy notification_rules_manage_admin
on public.notification_rules for all to authenticated
using (public.has_org_role(organization_id, 'admin'))
with check (public.has_org_role(organization_id, 'admin'));
create policy notifications_read_recipients
on public.notifications for select to authenticated
using (
  public.is_org_member(organization_id)
  and (user_id is null or user_id = auth.uid())
);
create policy notifications_update_recipients
on public.notifications for update to authenticated
using (
  public.is_org_member(organization_id)
  and (user_id is null or user_id = auth.uid())
)
with check (
  public.is_org_member(organization_id)
  and (user_id is null or user_id = auth.uid())
);
create policy audit_read_members
on public.audit_events for select to authenticated
using (public.is_org_member(organization_id));

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, insert, update on public.organization_members to authenticated;
grant select, insert, update, delete on public.environments to authenticated;
grant insert, update, delete on public.integration_sources to authenticated;
grant select, insert, update, delete on public.workflow_definitions to authenticated;
grant select on public.raw_execution_events to authenticated;
grant select on public.workflow_runs to authenticated;
grant select on public.run_steps to authenticated;
grant select on public.run_artifacts to authenticated;
grant select on public.incidents to authenticated;
grant select on public.incident_events to authenticated;
grant select on public.replay_requests to authenticated;
grant select on public.approval_requests to authenticated;
grant select, insert, update, delete on public.notification_rules to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.audit_events to authenticated;

create or replace view public.integration_sources_public
with (security_barrier = true)
as
select
  id,
  organization_id,
  environment_id,
  name,
  provider_type,
  status,
  external_account_reference,
  public_configuration,
  webhook_key_prefix,
  last_event_at,
  created_by,
  created_at,
  updated_at
from public.integration_sources
where public.is_org_member(organization_id);
revoke all on public.integration_sources_public from public, anon;
grant select on public.integration_sources_public to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'execution-artifacts',
  'execution-artifacts',
  false,
  5242880,
  array['text/plain', 'application/json', 'text/csv', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy artifact_objects_read
on storage.objects for select to authenticated
using (
  bucket_id = 'execution-artifacts'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.is_org_member(((storage.foldername(name))[1])::uuid)
);

create policy artifact_objects_upload
on storage.objects for insert to authenticated
with check (
  bucket_id = 'execution-artifacts'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.has_org_role(((storage.foldername(name))[1])::uuid, 'operator')
  and name !~ '(^|/)\\.\\.(/|$)'
);

create policy artifact_objects_delete_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'execution-artifacts'
  and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
  and public.has_org_role(((storage.foldername(name))[1])::uuid, 'admin')
);

-- Private Broadcast authorization. Clients subscribe with private=true and
-- refetch authoritative rows after any notification.
create policy organization_broadcast_receive
on realtime.messages for select to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and split_part(realtime.topic(), ':', 1) = 'org'
  and split_part(realtime.topic(), ':', 2) ~ '^[0-9a-f-]{36}$'
  and public.is_org_member(split_part(realtime.topic(), ':', 2)::uuid)
);

select pgmq.create('raw_event_normalization')
where not exists (select 1 from pgmq.list_queues() where queue_name = 'raw_event_normalization');
select pgmq.create('replay_jobs')
where not exists (select 1 from pgmq.list_queues() where queue_name = 'replay_jobs');
select pgmq.create('notification_jobs')
where not exists (select 1 from pgmq.list_queues() where queue_name = 'notification_jobs');

select cron.schedule(
  'arc-stale-event-health-check',
  '*/15 * * * *',
  $$
    insert into public.audit_events (
      organization_id, actor_type, action, resource_type, metadata
    )
    select
      organization_id,
      'system',
      'workflow.activity_missing',
      'workflow_definition',
      jsonb_build_object('workflow_id', id, 'checked_at', now())
    from public.workflow_definitions
    where enabled
      and expected_sla_seconds is not null
      and not exists (
        select 1
        from public.workflow_runs run
        where run.workflow_definition_id = workflow_definitions.id
          and run.started_at > now() - make_interval(secs => workflow_definitions.expected_sla_seconds)
      )
      and not exists (
        select 1
        from public.audit_events audit
        where audit.organization_id = workflow_definitions.organization_id
          and audit.action = 'workflow.activity_missing'
          and audit.metadata->>'workflow_id' = workflow_definitions.id::text
          and audit.created_at > now() - interval '1 hour'
      );
  $$
);
