-- Replay approval and idempotent synthetic replay worker.

create or replace function public.decide_replay_request(
  target_replay_request_id uuid,
  decision text
)
returns public.replay_requests
language plpgsql
security definer
set search_path = pg_catalog, public, pgmq
as $$
declare
  current_request public.replay_requests;
  resulting_request public.replay_requests;
begin
  select * into current_request
  from public.replay_requests
  where id = target_replay_request_id
  for update;
  if not found then
    raise exception 'replay request not found' using errcode = 'P0002';
  end if;
  if not public.has_org_role(current_request.organization_id, 'admin') then
    raise exception 'replay decision is not authorized' using errcode = '42501';
  end if;
  if current_request.status <> 'pending' or decision not in ('approved', 'rejected') then
    raise exception 'replay decision is not valid' using errcode = '22023';
  end if;

  update public.replay_requests
  set
    status = decision,
    approved_by = case when decision = 'approved' then auth.uid() else null end,
    processed_at = case when decision = 'rejected' then now() else null end
  where id = current_request.id
  returning * into resulting_request;

  if decision = 'approved' then
    perform pgmq.send(
      'replay_jobs',
      jsonb_build_object(
        'replay_request_id', resulting_request.id,
        'organization_id', resulting_request.organization_id,
        'correlation_id', gen_random_uuid()
      )
    );
  end if;

  insert into public.audit_events (
    organization_id, actor_user_id, actor_type, action, resource_type, resource_id,
    old_values, new_values
  ) values (
    resulting_request.organization_id,
    auth.uid(),
    'user',
    'replay.decided',
    'replay_request',
    resulting_request.id,
    jsonb_build_object('status', 'pending'),
    jsonb_build_object('status', decision)
  );

  perform realtime.send(
    jsonb_build_object(
      'replay_request_id', resulting_request.id,
      'status', resulting_request.status
    ),
    'replay.updated',
    format('org:%s:approvals', resulting_request.organization_id),
    true
  );
  return resulting_request;
end;
$$;

create or replace function public.process_replay_job(target_replay_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, realtime
as $$
declare
  replay_record public.replay_requests;
  original_run public.workflow_runs;
  replay_run public.workflow_runs;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  select * into replay_record
  from public.replay_requests
  where id = target_replay_request_id
  for update;
  if not found then
    raise exception 'replay request not found' using errcode = 'P0002';
  end if;
  if replay_record.status in ('succeeded', 'failed', 'rejected') then
    return jsonb_build_object(
      'outcome', 'already_terminal',
      'status', replay_record.status,
      'run_id', replay_record.resulting_workflow_run_id
    );
  end if;
  if replay_record.status <> 'approved' then
    return jsonb_build_object('outcome', 'awaiting_approval');
  end if;

  select * into original_run
  from public.workflow_runs
  where id = replay_record.original_workflow_run_id
  for share;
  if not found then
    raise exception 'original workflow run not found' using errcode = 'P0002';
  end if;

  update public.replay_requests
  set status = 'processing'
  where id = replay_record.id;

  insert into public.workflow_runs (
    organization_id,
    workflow_definition_id,
    integration_source_id,
    external_run_id,
    parent_run_id,
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
    last_event_at
  ) values (
    original_run.organization_id,
    original_run.workflow_definition_id,
    original_run.integration_source_id,
    'replay:' || replay_record.id::text,
    original_run.id,
    'succeeded',
    'replay',
    now(),
    now(),
    0,
    original_run.attempt_number + 1,
    'replay:' || replay_record.id::text,
    'Deterministic portfolio replay completed without invoking an external provider.',
    original_run.input_summary,
    jsonb_build_object(
      'replay_mode', 'synthetic',
      'original_run_id', original_run.id,
      'result', 'succeeded'
    ),
    now()
  )
  on conflict (organization_id, idempotency_key)
  do update set idempotency_key = excluded.idempotency_key
  returning * into replay_run;

  update public.replay_requests
  set
    status = 'succeeded',
    resulting_workflow_run_id = replay_run.id,
    processed_at = now(),
    error_message = null
  where id = replay_record.id;

  insert into public.audit_events (
    organization_id, actor_type, action, resource_type, resource_id, new_values
  ) values (
    replay_record.organization_id,
    'system',
    'replay.succeeded',
    'replay_request',
    replay_record.id,
    jsonb_build_object(
      'resulting_workflow_run_id', replay_run.id,
      'mode', 'synthetic'
    )
  );

  perform realtime.send(
    jsonb_build_object(
      'replay_request_id', replay_record.id,
      'status', 'succeeded',
      'resulting_workflow_run_id', replay_run.id
    ),
    'replay.updated',
    format('org:%s:runs', replay_record.organization_id),
    true
  );

  return jsonb_build_object(
    'outcome', 'succeeded',
    'run_id', replay_run.id
  );
exception
  when others then
    update public.replay_requests
    set status = 'failed', processed_at = now(), error_message = left(sqlerrm, 500)
    where id = target_replay_request_id
      and status = 'processing';
    return jsonb_build_object(
      'outcome', 'failed',
      'error_code', sqlstate,
      'error_message', left(sqlerrm, 500)
    );
end;
$$;

revoke all on function public.decide_replay_request(uuid, text) from public;
revoke all on function public.process_replay_job(uuid) from public;
grant execute on function public.decide_replay_request(uuid, text) to authenticated;
grant execute on function public.process_replay_job(uuid) to service_role;
