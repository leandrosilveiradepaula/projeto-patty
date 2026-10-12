alter table public.ai_executions
  drop constraint ai_executions_failure_stage_code_pair_check,
  add constraint ai_executions_failure_stage_code_pair_check check (
    status <> 'failed'
    or (failure_stage = 'preflight' and failure_code = 'provider_not_configured')
    or (failure_stage = 'provider_request' and failure_code = 'provider_request_failed')
    or (failure_stage = 'output_parse' and failure_code = 'invalid_json')
    or (failure_stage = 'output_validation' and failure_code = 'invalid_output_schema')
    or (failure_stage = 'persistence' and failure_code = 'persistence_failed')
    or (failure_stage = 'recovery' and failure_code = 'manual_recovery')
  );

create or replace function public.recover_started_ai_execution(
  p_execution_id uuid,
  p_recovered_by_profile_id uuid,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  execution_client_id uuid;
  normalized_reason text;
begin
  normalized_reason := btrim(coalesce(p_reason, ''));

  if char_length(normalized_reason) < 10 or char_length(normalized_reason) > 500 then
    raise exception 'AI recovery reason must contain between 10 and 500 characters'
      using errcode = '23514';
  end if;

  select e.client_id
    into execution_client_id
  from public.ai_executions e
  where e.id = p_execution_id
    and e.status = 'started'
    and e.completed_at is null
    and e.failed_at is null
  for update;

  if not found then
    raise exception 'AI execution is not recoverable from started state'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    join public.client_assignments ca
      on ca.staff_profile_id = ur.profile_id
      and ca.ended_at is null
    where ur.profile_id = p_recovered_by_profile_id
      and ur.role = 'admin'
      and ca.client_id = execution_client_id
  ) then
    raise exception 'AI recovery requires an assigned admin'
      using errcode = '42501';
  end if;

  update public.ai_executions
  set status = 'failed',
      failed_at = statement_timestamp(),
      failure_stage = 'recovery',
      failure_code = 'manual_recovery',
      failure_message = normalized_reason
  where id = p_execution_id
    and status = 'started'
    and completed_at is null
    and failed_at is null;

  if not found then
    raise exception 'AI execution could not transition during recovery'
      using errcode = '55000';
  end if;
end;
$$;

revoke all on function public.recover_started_ai_execution(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.recover_started_ai_execution(uuid, uuid, text)
  to service_role;
