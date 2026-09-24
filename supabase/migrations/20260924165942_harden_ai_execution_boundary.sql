alter table public.ai_executions
  add column anamnesis_submission_id uuid,
  add constraint ai_executions_anamnesis_submission_client_fkey
    foreign key (anamnesis_submission_id, client_id)
    references public.anamnesis_submissions (id, client_id)
    on delete restrict,
  add constraint ai_executions_anamnesis_review_submission_check
    check (
      purpose_key <> 'anamnesis_review'
      or anamnesis_submission_id is not null
    );

create index ai_executions_anamnesis_submission_created_idx
  on public.ai_executions (anamnesis_submission_id, created_at desc, id)
  where anamnesis_submission_id is not null;

create or replace function public.validate_ai_execution_insert()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.user_roles ur
    join public.client_assignments ca
      on ca.staff_profile_id = ur.profile_id
      and ca.ended_at is null
    where ur.profile_id = new.initiated_by_profile_id
      and ur.role = 'admin'
      and ca.client_id = new.client_id
  ) then
    raise exception 'AI execution initiator must be an assigned admin'
      using errcode = '23514';
  end if;

  if new.purpose_key = 'anamnesis_review' then
    if not exists (
      select 1
      from public.anamnesis_submissions s
      where s.id = new.anamnesis_submission_id
        and s.client_id = new.client_id
        and s.submitted_at is not null
    ) then
      raise exception 'anamnesis_review requires a submitted anamnesis for the same client'
        using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.ai_prompt_versions p
      where p.id = new.prompt_version_id
        and p.prompt_key = 'anamnesis_review'
    ) then
      raise exception 'anamnesis_review requires an anamnesis_review prompt version'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

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
    or new.anamnesis_submission_id is distinct from old.anamnesis_submission_id
    or new.created_at is distinct from old.created_at then
    raise exception 'AI execution identity is immutable' using errcode = '55000';
  end if;

  if old.status = 'started' then
    if new.status not in ('completed', 'failed')
      or new.discarded_at is not null
      or new.discarded_by_profile_id is not null
      or new.discard_reason is not null then
      raise exception 'AI execution must transition from started to completed or failed'
        using errcode = '55000';
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
      raise exception 'completed AI execution only accepts one discard metadata transition'
        using errcode = '55000';
    end if;
  else
    raise exception 'failed AI execution is immutable' using errcode = '55000';
  end if;

  return new;
end;
$$;

create or replace function public.validate_ai_execution_source()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  execution_status text;
  execution_purpose text;
  execution_submission_id uuid;
begin
  if tg_op <> 'INSERT' then
    raise exception 'AI execution sources are immutable' using errcode = '55000';
  end if;

  select e.status, e.purpose_key, e.anamnesis_submission_id
    into execution_status, execution_purpose, execution_submission_id
  from public.ai_executions e
  where e.id = new.execution_id
    and e.client_id = new.client_id;

  if not found then
    raise exception 'AI execution source requires an existing execution for the same client'
      using errcode = '23514';
  end if;

  if execution_status <> 'started' then
    raise exception 'AI execution sources can only be added while execution is started'
      using errcode = '55000';
  end if;

  if execution_purpose = 'anamnesis_review'
     and new.source_kind <> 'anamnesis_answer' then
    raise exception 'anamnesis_review accepts only anamnesis_answer sources'
      using errcode = '23514';
  end if;

  if new.source_kind = 'anamnesis_answer' then
    if not exists (
      select 1
      from public.anamnesis_submissions s
      where s.id = new.anamnesis_submission_id
        and s.client_id = new.client_id
        and s.submitted_at is not null
    ) then
      raise exception 'AI execution source requires a submitted anamnesis answer'
        using errcode = '23514';
    end if;

    if execution_purpose = 'anamnesis_review'
       and new.anamnesis_submission_id is distinct from execution_submission_id then
      raise exception 'anamnesis_review sources must belong to the selected submission'
        using errcode = '23514';
    end if;
  end if;

  if new.source_kind = 'client_file' and not exists (
    select 1
    from public.client_files file
    where file.id = new.client_file_id
      and file.client_id = new.client_id
      and file.file_kind in ('photo', 'exam', 'document')
  ) then
    raise exception 'AI execution source requires an allowed client file kind'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.start_anamnesis_review_execution(
  p_client_id uuid,
  p_submission_id uuid,
  p_prompt_version_id uuid,
  p_initiated_by_profile_id uuid,
  p_provider text,
  p_model_identifier text,
  p_answer_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  execution_id uuid;
begin
  insert into public.ai_executions (
    client_id,
    purpose_key,
    prompt_version_id,
    initiated_by_profile_id,
    provider,
    model_identifier,
    anamnesis_submission_id
  )
  values (
    p_client_id,
    'anamnesis_review',
    p_prompt_version_id,
    p_initiated_by_profile_id,
    p_provider,
    p_model_identifier,
    p_submission_id
  )
  returning id into execution_id;

  insert into public.ai_execution_sources (
    execution_id,
    client_id,
    source_kind,
    anamnesis_answer_id,
    anamnesis_submission_id
  )
  select
    execution_id,
    p_client_id,
    'anamnesis_answer',
    source.answer_id,
    p_submission_id
  from (
    select distinct answer_id
    from unnest(coalesce(p_answer_ids, array[]::uuid[])) as answer_id
  ) source;

  return execution_id;
end;
$$;

create or replace function public.complete_ai_execution(
  p_execution_id uuid,
  p_content jsonb
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  execution_client_id uuid;
begin
  select e.client_id
    into execution_client_id
  from public.ai_executions e
  where e.id = p_execution_id
    and e.status = 'started'
  for update;

  if not found then
    raise exception 'AI execution is not in started state'
      using errcode = '55000';
  end if;

  insert into public.ai_execution_outputs (
    execution_id,
    client_id,
    content
  )
  values (
    p_execution_id,
    execution_client_id,
    p_content
  );

  update public.ai_executions
  set status = 'completed',
      completed_at = statement_timestamp()
  where id = p_execution_id
    and status = 'started';

  if not found then
    raise exception 'AI execution could not transition to completed'
      using errcode = '55000';
  end if;
end;
$$;

create or replace function public.fail_ai_execution(
  p_execution_id uuid,
  p_failure_stage text,
  p_failure_code text,
  p_failure_message text,
  p_response_content text,
  p_response_content_format text,
  p_response_received_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  execution_client_id uuid;
begin
  select e.client_id
    into execution_client_id
  from public.ai_executions e
  where e.id = p_execution_id
    and e.status = 'started'
  for update;

  if not found then
    raise exception 'AI execution is not in started state'
      using errcode = '55000';
  end if;

  if p_response_content is null then
    if p_response_content_format is not null
       or p_response_received_at is not null then
      raise exception 'failure response metadata requires response content'
        using errcode = '23514';
    end if;
  else
    if p_response_content_format is null
       or p_response_received_at is null then
      raise exception 'failure response content requires format and received_at'
        using errcode = '23514';
    end if;

    insert into public.ai_execution_failure_responses (
      execution_id,
      client_id,
      content,
      content_format,
      received_at
    )
    values (
      p_execution_id,
      execution_client_id,
      p_response_content,
      p_response_content_format,
      p_response_received_at
    );
  end if;

  update public.ai_executions
  set status = 'failed',
      failed_at = statement_timestamp(),
      failure_stage = p_failure_stage,
      failure_code = p_failure_code,
      failure_message = p_failure_message
  where id = p_execution_id
    and status = 'started';

  if not found then
    raise exception 'AI execution could not transition to failed'
      using errcode = '55000';
  end if;
end;
$$;

revoke all on function public.start_anamnesis_review_execution(
  uuid, uuid, uuid, uuid, text, text, uuid[]
) from public, anon, authenticated;
revoke all on function public.complete_ai_execution(uuid, jsonb)
  from public, anon, authenticated;
revoke all on function public.fail_ai_execution(
  uuid, text, text, text, text, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.start_anamnesis_review_execution(
  uuid, uuid, uuid, uuid, text, text, uuid[]
) to service_role;
grant execute on function public.complete_ai_execution(uuid, jsonb)
  to service_role;
grant execute on function public.fail_ai_execution(
  uuid, text, text, text, text, text, timestamptz
) to service_role;

revoke all on function public.validate_ai_execution_insert()
  from public, anon, authenticated;
revoke all on function public.validate_ai_execution_transition()
  from public, anon, authenticated;
revoke all on function public.validate_ai_execution_source()
  from public, anon, authenticated;
