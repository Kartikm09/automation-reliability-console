-- Transactional canonical-event application and durable queue access.

create or replace function public.is_legal_run_transition(
  current_status text,
  target_status text
)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select current_status = target_status
    or (current_status = 'queued' and target_status in (
      'running', 'succeeded', 'failed', 'cancelled', 'timed_out'
    ))
    or (current_status = 'running' and target_status in (
      'succeeded', 'failed', 'cancelled', 'timed_out'
    ))
$$;

create or replace function public.apply_canonical_event(
  target_raw_event_id uuid,
  canonical jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, realtime
as $$
declare
  raw_event public.raw_execution_events;
  source_record public.integration_sources;
  workflow_record public.workflow_definitions;
  run_record public.workflow_runs;
  existing_run public.workflow_runs;
  event_time timestamptz;
  incoming_status text;
  step jsonb;
  incident_record public.incidents;
  run_changed boolean := false;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into raw_event
  from public.raw_execution_events
  where id = target_raw_event_id
  for update;
  if not found then
    raise exception 'raw event not found' using errcode = 'P0002';
  end if;
  if raw_event.processing_status = 'processed' then
    select * into existing_run
    from public.workflow_runs
    where integration_source_id = raw_event.integration_source_id
      and external_run_id = canonical->>'external_run_id';
    return jsonb_build_object(
      'outcome', 'already_processed',
      'run_id', existing_run.id
    );
  end if;

  select * into source_record
  from public.integration_sources
  where id = raw_event.integration_source_id
  for share;
  if not found or source_record.status <> 'active' then
    raise exception 'integration source is unavailable' using errcode = '55000';
  end if;

  if canonical->>'provider' <> source_record.provider_type
    or nullif(canonical->>'external_workflow_id', '') is null
    or nullif(canonical->>'external_run_id', '') is null
  then
    raise exception 'canonical event identity is invalid' using errcode = '22023';
  end if;

  incoming_status := canonical->>'run_status';
  if incoming_status not in ('queued', 'running', 'succeeded', 'failed', 'cancelled', 'timed_out') then
    raise exception 'canonical run status is invalid' using errcode = '22023';
  end if;
  event_time := coalesce(
    nullif(canonical->>'event_timestamp', '')::timestamptz,
    raw_event.event_timestamp,
    raw_event.received_at
  );

  insert into public.workflow_definitions (
    organization_id,
    environment_id,
    integration_source_id,
    external_workflow_id,
    name,
    metadata
  ) values (
    raw_event.organization_id,
    source_record.environment_id,
    source_record.id,
    canonical->>'external_workflow_id',
    coalesce(nullif(canonical->>'workflow_name', ''), canonical->>'external_workflow_id'),
    jsonb_build_object(
      'source_schema_version', canonical->>'source_schema_version',
      'normalization_warnings', coalesce(canonical->'warnings', '[]'::jsonb)
    )
  )
  on conflict (integration_source_id, external_workflow_id)
  do update set
    name = coalesce(nullif(excluded.name, ''), workflow_definitions.name),
    metadata = workflow_definitions.metadata || excluded.metadata
  returning * into workflow_record;

  select * into existing_run
  from public.workflow_runs
  where integration_source_id = source_record.id
    and external_run_id = canonical->>'external_run_id'
  for update;

  if found
    and event_time < existing_run.last_event_at
    and existing_run.status in ('succeeded', 'failed', 'cancelled', 'timed_out')
  then
    update public.raw_execution_events
    set
      processing_status = 'processed',
      processing_attempts = processing_attempts + 1,
      processing_error_code = 'out_of_order_ignored',
      processing_error_message = 'Older event preserved but not applied to terminal run state.',
      processed_at = now()
    where id = raw_event.id;

    return jsonb_build_object(
      'outcome', 'out_of_order_ignored',
      'run_id', existing_run.id,
      'status', existing_run.status
    );
  end if;

  if found and not public.is_legal_run_transition(existing_run.status, incoming_status) then
    update public.raw_execution_events
    set
      processing_status = 'failed',
      processing_attempts = processing_attempts + 1,
      processing_error_code = 'illegal_state_transition',
      processing_error_message = format(
        'Transition %s -> %s rejected.',
        existing_run.status,
        incoming_status
      )
    where id = raw_event.id;
    raise exception 'illegal run transition: % -> %', existing_run.status, incoming_status
      using errcode = '22023';
  end if;

  insert into public.workflow_runs (
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
  ) values (
    raw_event.organization_id,
    workflow_record.id,
    source_record.id,
    canonical->>'external_run_id',
    incoming_status,
    coalesce(nullif(canonical->>'trigger_type', ''), 'unknown'),
    nullif(canonical->>'started_at', '')::timestamptz,
    nullif(canonical->>'ended_at', '')::timestamptz,
    nullif(canonical->>'duration_ms', '')::bigint,
    coalesce(nullif(canonical->>'attempt_number', '')::integer, 1),
    source_record.id::text || ':' || (canonical->>'external_run_id'),
    canonical->>'summary',
    coalesce(canonical->'input_summary', '{}'::jsonb),
    coalesce(canonical->'output_summary', '{}'::jsonb),
    canonical#>>'{error,code}',
    canonical#>>'{error,message}',
    event_time
  )
  on conflict (integration_source_id, external_run_id)
  do update set
    status = excluded.status,
    trigger_type = excluded.trigger_type,
    started_at = coalesce(workflow_runs.started_at, excluded.started_at),
    ended_at = coalesce(excluded.ended_at, workflow_runs.ended_at),
    duration_ms = coalesce(excluded.duration_ms, workflow_runs.duration_ms),
    attempt_number = greatest(workflow_runs.attempt_number, excluded.attempt_number),
    summary = coalesce(excluded.summary, workflow_runs.summary),
    input_summary = case
      when excluded.input_summary = '{}'::jsonb then workflow_runs.input_summary
      else excluded.input_summary
    end,
    output_summary = case
      when excluded.output_summary = '{}'::jsonb then workflow_runs.output_summary
      else excluded.output_summary
    end,
    error_code = excluded.error_code,
    error_message = excluded.error_message,
    last_event_at = excluded.last_event_at
  returning * into run_record;
  run_changed := true;

  for step in
    select value from jsonb_array_elements(coalesce(canonical->'steps', '[]'::jsonb))
  loop
    if nullif(step->>'external_step_id', '') is null
      or nullif(step->>'name', '') is null
      or nullif(step->>'status', '') is null
    then
      continue;
    end if;

    insert into public.run_steps (
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
      attempt_number,
      input_summary,
      output_summary,
      error_code,
      error_message
    ) values (
      run_record.organization_id,
      run_record.id,
      step->>'external_step_id',
      coalesce((step->>'sequence_number')::integer, 0),
      step->>'name',
      coalesce(nullif(step->>'step_type', ''), 'action'),
      step->>'status',
      nullif(step->>'started_at', '')::timestamptz,
      nullif(step->>'ended_at', '')::timestamptz,
      nullif(step->>'duration_ms', '')::bigint,
      coalesce(nullif(step->>'attempt_number', '')::integer, 1),
      coalesce(step->'input_summary', '{}'::jsonb),
      coalesce(step->'output_summary', '{}'::jsonb),
      step#>>'{error,code}',
      step#>>'{error,message}'
    )
    on conflict (workflow_run_id, external_step_id)
    do update set
      status = excluded.status,
      sequence_number = excluded.sequence_number,
      started_at = coalesce(run_steps.started_at, excluded.started_at),
      ended_at = coalesce(excluded.ended_at, run_steps.ended_at),
      duration_ms = coalesce(excluded.duration_ms, run_steps.duration_ms),
      output_summary = excluded.output_summary,
      error_code = excluded.error_code,
      error_message = excluded.error_message;
  end loop;

  if incoming_status in ('failed', 'timed_out') then
    insert into public.incidents (
      organization_id,
      workflow_definition_id,
      workflow_run_id,
      severity,
      title,
      summary,
      detection_source
    ) values (
      run_record.organization_id,
      run_record.workflow_definition_id,
      run_record.id,
      case when incoming_status = 'timed_out' then 'high' else 'medium' end,
      format('%s %s', workflow_record.name, replace(incoming_status, '_', ' ')),
      coalesce(run_record.error_message, 'The workflow run requires operator review.'),
      'canonical_event'
    )
    on conflict (workflow_run_id)
      where workflow_run_id is not null
        and status in ('open', 'acknowledged', 'investigating')
    do update set
      severity = case
        when incidents.severity = 'critical' then 'critical'
        when incoming_status = 'timed_out' then 'high'
        else incidents.severity
      end
    returning * into incident_record;

    insert into public.incident_events (
      organization_id, incident_id, event_type, note, metadata
    ) values (
      incident_record.organization_id,
      incident_record.id,
      'detected',
      'Incident created or refreshed by normalized workflow event.',
      jsonb_build_object('run_id', run_record.id, 'status', incoming_status)
    );

    insert into public.notifications (
      organization_id, incident_id, title, body, notification_type
    ) values (
      run_record.organization_id,
      incident_record.id,
      incident_record.title,
      incident_record.summary,
      'incident_created'
    );
  end if;

  update public.integration_sources
  set last_event_at = greatest(coalesce(last_event_at, event_time), event_time)
  where id = source_record.id;

  update public.raw_execution_events
  set
    processing_status = 'processed',
    processing_attempts = processing_attempts + 1,
    processing_error_code = null,
    processing_error_message = null,
    processed_at = now()
  where id = raw_event.id;

  insert into public.audit_events (
    organization_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    correlation_id,
    new_values,
    metadata
  ) values (
    run_record.organization_id,
    'system',
    'workflow_run.event_applied',
    'workflow_run',
    run_record.id,
    raw_event.correlation_id,
    jsonb_build_object('status', run_record.status),
    jsonb_build_object('raw_event_id', raw_event.id, 'provider', raw_event.provider_type)
  );

  if run_changed then
    perform realtime.send(
      jsonb_build_object(
        'run_id', run_record.id,
        'status', run_record.status,
        'workflow_definition_id', run_record.workflow_definition_id
      ),
      'run.updated',
      format('org:%s:runs', run_record.organization_id),
      true
    );
  end if;

  if incident_record.id is not null then
    perform realtime.send(
      jsonb_build_object(
        'incident_id', incident_record.id,
        'status', incident_record.status,
        'severity', incident_record.severity
      ),
      'incident.updated',
      format('org:%s:incidents', incident_record.organization_id),
      true
    );
  end if;

  return jsonb_build_object(
    'outcome', 'applied',
    'run_id', run_record.id,
    'run_status', run_record.status,
    'incident_id', incident_record.id
  );
exception
  when others then
    update public.raw_execution_events
    set
      processing_status = case
        when processing_attempts + 1 >= 5 then 'dead_letter'
        else 'failed'
      end,
      processing_attempts = processing_attempts + 1,
      processing_error_code = sqlstate,
      processing_error_message = left(sqlerrm, 500)
    where id = target_raw_event_id;
    return jsonb_build_object(
      'outcome', 'failed',
      'error_code', sqlstate,
      'error_message', left(sqlerrm, 500)
    );
end;
$$;

revoke all on function public.apply_canonical_event(uuid, jsonb) from public;
grant execute on function public.apply_canonical_event(uuid, jsonb) to service_role;

create or replace function public.read_platform_jobs(
  queue_name text,
  visibility_timeout_seconds integer default 60,
  batch_size integer default 10
)
returns setof jsonb
language plpgsql
security definer
set search_path = pg_catalog, pgmq
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if queue_name not in ('raw_event_normalization', 'replay_jobs', 'notification_jobs') then
    raise exception 'unknown queue' using errcode = '22023';
  end if;
  if visibility_timeout_seconds not between 5 and 900 or batch_size not between 1 and 50 then
    raise exception 'queue read bounds are invalid' using errcode = '22023';
  end if;
  return query execute format(
    'select to_jsonb(message_row) from pgmq.read(%L, %s, %s) message_row',
    queue_name,
    visibility_timeout_seconds,
    batch_size
  );
end;
$$;

create or replace function public.archive_platform_job(
  queue_name text,
  message_id bigint
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, pgmq
as $$
declare
  archived boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if queue_name not in ('raw_event_normalization', 'replay_jobs', 'notification_jobs') then
    raise exception 'unknown queue' using errcode = '22023';
  end if;
  execute format('select pgmq.archive(%L, $1)', queue_name)
  into archived
  using message_id;
  return archived;
end;
$$;

create or replace function public.dead_letter_platform_job(
  queue_name text,
  message_id bigint,
  payload jsonb,
  failure_message text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, pgmq
as $$
declare
  deleted boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;
  if queue_name not in ('raw_event_normalization', 'replay_jobs', 'notification_jobs') then
    raise exception 'unknown queue' using errcode = '22023';
  end if;
  perform pgmq.send(
    queue_name || '_dead_letter',
    jsonb_build_object(
      'original_message_id', message_id,
      'payload', payload,
      'failure', left(failure_message, 500),
      'dead_lettered_at', now()
    )
  );
  execute format('select pgmq.delete(%L, $1)', queue_name)
  into deleted
  using message_id;
  return deleted;
end;
$$;

revoke all on function public.read_platform_jobs(text, integer, integer) from public;
revoke all on function public.archive_platform_job(text, bigint) from public;
revoke all on function public.dead_letter_platform_job(text, bigint, jsonb, text) from public;
grant execute on function public.read_platform_jobs(text, integer, integer) to service_role;
grant execute on function public.archive_platform_job(text, bigint) to service_role;
grant execute on function public.dead_letter_platform_job(text, bigint, jsonb, text) to service_role;

select pgmq.create('raw_event_normalization_dead_letter')
where not exists (
  select 1 from pgmq.list_queues()
  where queue_name = 'raw_event_normalization_dead_letter'
);
select pgmq.create('replay_jobs_dead_letter')
where not exists (
  select 1 from pgmq.list_queues()
  where queue_name = 'replay_jobs_dead_letter'
);
select pgmq.create('notification_jobs_dead_letter')
where not exists (
  select 1 from pgmq.list_queues()
  where queue_name = 'notification_jobs_dead_letter'
);
