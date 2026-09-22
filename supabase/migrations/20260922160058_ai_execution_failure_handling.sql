do $$
begin
  if exists (
    select 1
    from public.ai_executions
    where status = 'failed'
  ) then
    raise exception 'AI failure metadata migration requires manual handling of existing failed executions'
      using errcode = '23514';
  end if;
end;
$$;

alter table public.ai_executions
  add column failure_stage text,
  add column failure_code text,
  add column failure_message text,
  add constraint ai_executions_failure_metadata_state_check check (
    (
      status = 'failed'
      and failure_stage is not null
      and failure_code is not null
    )
    or (
      status <> 'failed'
      and failure_stage is null
      and failure_code is null
      and failure_message is null
    )
  ),
  add constraint ai_executions_failure_message_not_blank_check check (
    failure_message is null or btrim(failure_message) <> ''
  ),
  add constraint ai_executions_failure_stage_code_pair_check check (
    status <> 'failed'
    or (failure_stage = 'preflight' and failure_code = 'provider_not_configured')
    or (failure_stage = 'provider_request' and failure_code = 'provider_request_failed')
    or (failure_stage = 'output_parse' and failure_code = 'invalid_json')
    or (failure_stage = 'output_validation' and failure_code = 'invalid_output_schema')
    or (failure_stage = 'persistence' and failure_code = 'persistence_failed')
  );

create table public.ai_execution_failure_responses (
  execution_id uuid primary key,
  client_id uuid not null,
  content text not null,
  content_format text not null,
  received_at timestamptz not null,
  constraint ai_execution_failure_responses_execution_client_fkey
    foreign key (execution_id, client_id)
    references public.ai_executions (id, client_id)
    on delete restrict,
  constraint ai_execution_failure_responses_content_format_check
    check (content_format in ('text', 'json'))
);

create or replace function public.validate_ai_execution_transition()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'AI executions are retained' using errcode = '55000';
  end if;

  if new.id is distinct from old.id
    or new.client_id is distinct from old.client_id
    or new.purpose_key is distinct from old.purpose_key
    or new.prompt_version_id is distinct from old.prompt_version_id
    or new.initiated_by_profile_id is distinct from old.initiated_by_profile_id
    or new.provider is distinct from old.provider
    or new.model_identifier is distinct from old.model_identifier
    or new.created_at is distinct from old.created_at then
    raise exception 'AI execution identity is immutable' using errcode = '55000';
  end if;

  if old.status = 'started' then
    if new.status not in ('completed', 'failed')
      or new.discarded_at is not null
      or new.discarded_by_profile_id is not null
      or new.discard_reason is not null then
      raise exception 'AI execution must transition from started to completed or failed' using errcode = '55000';
    end if;
  elsif old.status = 'completed' then
    if new.status <> 'completed'
      or new.completed_at is distinct from old.completed_at
      or new.failed_at is distinct from old.failed_at
      or new.failure_stage is not null
      or new.failure_code is not null
      or new.failure_message is not null
      or old.discarded_at is not null
      or new.discarded_at is null
      or new.discarded_by_profile_id is null then
      raise exception 'completed AI execution only accepts one discard metadata transition' using errcode = '55000';
    end if;
  else
    raise exception 'failed AI execution is immutable' using errcode = '55000';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_ai_execution_output_state()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  target_execution_id uuid;
  target_status text;
  target_failure_code text;
  output_count integer;
  failure_response_count integer;
begin
  if tg_table_name = 'ai_executions' then
    target_execution_id := new.id;
  else
    target_execution_id := new.execution_id;
  end if;

  select status, failure_code
    into target_status, target_failure_code
  from public.ai_executions
  where id = target_execution_id;

  select count(*) into output_count
  from public.ai_execution_outputs
  where execution_id = target_execution_id;

  select count(*) into failure_response_count
  from public.ai_execution_failure_responses
  where execution_id = target_execution_id;

  if target_status = 'completed' then
    if output_count <> 1 or failure_response_count <> 0 then
      raise exception 'completed AI execution requires exactly one output and no failure response'
        using errcode = '23514';
    end if;
  elsif target_status = 'started' then
    if output_count <> 0 or failure_response_count <> 0 then
      raise exception 'started AI execution cannot have an output or failure response'
        using errcode = '23514';
    end if;
  elsif target_status = 'failed' then
    if output_count <> 0 then
      raise exception 'failed AI execution cannot have an output' using errcode = '23514';
    end if;

    if target_failure_code in ('invalid_json', 'invalid_output_schema', 'persistence_failed')
      and failure_response_count <> 1 then
      raise exception 'failed AI execution with a received provider response requires exactly one failure response'
        using errcode = '23514';
    end if;

    if target_failure_code in ('provider_not_configured', 'provider_request_failed')
      and failure_response_count <> 0 then
      raise exception 'failed AI execution without a received provider response cannot have a failure response'
        using errcode = '23514';
    end if;
  else
    raise exception 'AI execution has an invalid lifecycle status' using errcode = '23514';
  end if;

  return null;
end;
$$;

create trigger ai_execution_failure_responses_immutable
before update or delete on public.ai_execution_failure_responses
for each row execute function public.reject_ai_immutable_mutation();

create constraint trigger ai_execution_failure_responses_state_check
after insert or update on public.ai_execution_failure_responses
deferrable initially deferred
for each row execute function public.enforce_ai_execution_output_state();

revoke all on function public.reject_ai_immutable_mutation() from public, anon, authenticated;
revoke all on function public.validate_ai_execution_transition() from public, anon, authenticated;
revoke all on function public.enforce_ai_execution_output_state() from public, anon, authenticated;

alter table public.ai_execution_failure_responses enable row level security;

revoke all on table public.ai_execution_failure_responses from public, anon, authenticated;
grant select on table public.ai_execution_failure_responses to authenticated;

create policy "ai_execution_failure_responses_select_assigned_admin"
  on public.ai_execution_failure_responses
  for select to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
        and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
        and ca.client_id = ai_execution_failure_responses.client_id
    )
  );
