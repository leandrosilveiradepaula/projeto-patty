alter table public.anamnesis_submissions
  add constraint anamnesis_submissions_id_client_key unique (id, client_id);

alter table public.anamnesis_answers
  add constraint anamnesis_answers_id_submission_key unique (id, submission_id);

alter table public.assessment_measurements
  add constraint assessment_measurements_id_assessment_key unique (id, assessment_id);

alter table public.professional_follow_ups
  add constraint professional_follow_ups_id_client_key unique (id, client_id);

create table public.ai_prompt_versions (
  id uuid primary key default gen_random_uuid(),
  prompt_key text not null,
  version_number integer not null,
  content jsonb not null,
  created_by_profile_id uuid references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (prompt_key, version_number),
  constraint ai_prompt_versions_key_not_blank check (length(trim(prompt_key)) > 0),
  constraint ai_prompt_versions_number_positive check (version_number > 0)
);

create table public.ai_executions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  purpose_key text not null,
  prompt_version_id uuid not null references public.ai_prompt_versions (id) on delete restrict,
  initiated_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  provider text not null,
  model_identifier text not null,
  status text not null default 'started',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  failed_at timestamptz,
  discarded_at timestamptz,
  discarded_by_profile_id uuid references public.profiles (id) on delete restrict,
  discard_reason text,
  unique (id, client_id),
  constraint ai_executions_purpose_not_blank check (length(trim(purpose_key)) > 0),
  constraint ai_executions_provider_not_blank check (length(trim(provider)) > 0),
  constraint ai_executions_model_not_blank check (length(trim(model_identifier)) > 0),
  constraint ai_executions_status_allowed check (status in ('started', 'completed', 'failed')),
  constraint ai_executions_lifecycle_timestamps check (
    (status = 'started' and completed_at is null and failed_at is null)
    or (status = 'completed' and completed_at is not null and failed_at is null and completed_at >= created_at)
    or (status = 'failed' and failed_at is not null and completed_at is null and failed_at >= created_at)
  ),
  constraint ai_executions_discard_metadata check (
    (discarded_at is null and discarded_by_profile_id is null and discard_reason is null)
    or (
      status = 'completed'
      and discarded_at is not null
      and discarded_by_profile_id is not null
      and discarded_at >= completed_at
    )
  ),
  constraint ai_executions_discard_reason_not_blank check (
    discard_reason is null or length(trim(discard_reason)) > 0
  )
);

create table public.ai_execution_outputs (
  execution_id uuid primary key,
  client_id uuid not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  constraint ai_execution_outputs_execution_client_fkey
    foreign key (execution_id, client_id)
    references public.ai_executions (id, client_id)
    on delete restrict
);

create table public.ai_execution_sources (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null,
  client_id uuid not null,
  source_kind text not null,
  anamnesis_answer_id uuid,
  anamnesis_submission_id uuid,
  assessment_measurement_id uuid,
  assessment_id uuid,
  client_file_id uuid,
  protocol_version_id uuid,
  professional_follow_up_id uuid,
  created_at timestamptz not null default now(),
  constraint ai_execution_sources_execution_client_fkey
    foreign key (execution_id, client_id)
    references public.ai_executions (id, client_id)
    on delete restrict,
  constraint ai_execution_sources_answer_submission_fkey
    foreign key (anamnesis_answer_id, anamnesis_submission_id)
    references public.anamnesis_answers (id, submission_id)
    on delete restrict,
  constraint ai_execution_sources_submission_client_fkey
    foreign key (anamnesis_submission_id, client_id)
    references public.anamnesis_submissions (id, client_id)
    on delete restrict,
  constraint ai_execution_sources_measurement_assessment_fkey
    foreign key (assessment_measurement_id, assessment_id)
    references public.assessment_measurements (id, assessment_id)
    on delete restrict,
  constraint ai_execution_sources_assessment_client_fkey
    foreign key (assessment_id, client_id)
    references public.client_assessments (id, client_id)
    on delete restrict,
  constraint ai_execution_sources_file_client_fkey
    foreign key (client_file_id, client_id)
    references public.client_files (id, client_id)
    on delete restrict,
  constraint ai_execution_sources_protocol_version_client_fkey
    foreign key (protocol_version_id, client_id)
    references public.protocol_versions (id, client_id)
    on delete restrict,
  constraint ai_execution_sources_follow_up_client_fkey
    foreign key (professional_follow_up_id, client_id)
    references public.professional_follow_ups (id, client_id)
    on delete restrict,
  constraint ai_execution_sources_exactly_one_source check (
    (source_kind = 'anamnesis_answer'
      and anamnesis_answer_id is not null
      and anamnesis_submission_id is not null
      and assessment_measurement_id is null
      and assessment_id is null
      and client_file_id is null
      and protocol_version_id is null
      and professional_follow_up_id is null)
    or (source_kind = 'assessment_measurement'
      and anamnesis_answer_id is null
      and anamnesis_submission_id is null
      and assessment_measurement_id is not null
      and assessment_id is not null
      and client_file_id is null
      and protocol_version_id is null
      and professional_follow_up_id is null)
    or (source_kind = 'client_file'
      and anamnesis_answer_id is null
      and anamnesis_submission_id is null
      and assessment_measurement_id is null
      and assessment_id is null
      and client_file_id is not null
      and protocol_version_id is null
      and professional_follow_up_id is null)
    or (source_kind = 'protocol_version'
      and anamnesis_answer_id is null
      and anamnesis_submission_id is null
      and assessment_measurement_id is null
      and assessment_id is null
      and client_file_id is null
      and protocol_version_id is not null
      and professional_follow_up_id is null)
    or (source_kind = 'professional_follow_up'
      and anamnesis_answer_id is null
      and anamnesis_submission_id is null
      and assessment_measurement_id is null
      and assessment_id is null
      and client_file_id is null
      and protocol_version_id is null
      and professional_follow_up_id is not null)
  )
);

create table public.ai_draft_versions (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null,
  client_id uuid not null,
  version_number integer not null,
  based_on_draft_version_id uuid,
  content jsonb not null,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  discarded_at timestamptz,
  discarded_by_profile_id uuid references public.profiles (id) on delete restrict,
  discard_reason text,
  unique (execution_id, version_number),
  unique (id, execution_id, client_id),
  constraint ai_draft_versions_execution_client_fkey
    foreign key (execution_id, client_id)
    references public.ai_executions (id, client_id)
    on delete restrict,
  constraint ai_draft_versions_parent_fkey
    foreign key (based_on_draft_version_id, execution_id, client_id)
    references public.ai_draft_versions (id, execution_id, client_id)
    on delete restrict,
  constraint ai_draft_versions_number_positive check (version_number > 0),
  constraint ai_draft_versions_parent_required check (
    (version_number = 1 and based_on_draft_version_id is null)
    or (version_number > 1 and based_on_draft_version_id is not null)
  ),
  constraint ai_draft_versions_discard_metadata check (
    (discarded_at is null and discarded_by_profile_id is null and discard_reason is null)
    or (discarded_at is not null and discarded_by_profile_id is not null)
  ),
  constraint ai_draft_versions_discard_reason_not_blank check (
    discard_reason is null or length(trim(discard_reason)) > 0
  )
);

create table public.ai_hypotheses (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null,
  client_id uuid not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  confirmed_by_profile_id uuid references public.profiles (id) on delete restrict,
  confirmed_at timestamptz,
  constraint ai_hypotheses_execution_client_fkey
    foreign key (execution_id, client_id)
    references public.ai_executions (id, client_id)
    on delete restrict,
  constraint ai_hypotheses_confirmation_pair check (
    (confirmed_by_profile_id is null) = (confirmed_at is null)
  )
);

create index ai_executions_client_created_idx
  on public.ai_executions (client_id, created_at desc, id);
create index ai_execution_sources_execution_idx
  on public.ai_execution_sources (execution_id);
create index ai_draft_versions_execution_version_idx
  on public.ai_draft_versions (execution_id, version_number desc);
create index ai_hypotheses_execution_created_idx
  on public.ai_hypotheses (execution_id, created_at);

create unique index ai_execution_sources_answer_once_idx
  on public.ai_execution_sources (execution_id, anamnesis_answer_id)
  where source_kind = 'anamnesis_answer';
create unique index ai_execution_sources_measurement_once_idx
  on public.ai_execution_sources (execution_id, assessment_measurement_id)
  where source_kind = 'assessment_measurement';
create unique index ai_execution_sources_file_once_idx
  on public.ai_execution_sources (execution_id, client_file_id)
  where source_kind = 'client_file';
create unique index ai_execution_sources_protocol_once_idx
  on public.ai_execution_sources (execution_id, protocol_version_id)
  where source_kind = 'protocol_version';
create unique index ai_execution_sources_follow_up_once_idx
  on public.ai_execution_sources (execution_id, professional_follow_up_id)
  where source_kind = 'professional_follow_up';

create function public.reject_ai_immutable_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception '% rows are immutable', tg_table_name using errcode = '55000';
end;
$$;

create function public.validate_ai_execution_insert()
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
    raise exception 'AI execution initiator must be an assigned admin' using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.validate_ai_execution_transition()
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

create function public.enforce_ai_execution_output_state()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  target_execution_id uuid;
  target_status text;
  output_count integer;
begin
  if tg_table_name = 'ai_executions' then
    target_execution_id := new.id;
  else
    target_execution_id := new.execution_id;
  end if;

  select status into target_status
  from public.ai_executions
  where id = target_execution_id;

  select count(*) into output_count
  from public.ai_execution_outputs
  where execution_id = target_execution_id;

  if target_status = 'completed' and output_count <> 1 then
    raise exception 'completed AI execution requires exactly one output' using errcode = '23514';
  end if;

  if target_status in ('started', 'failed') and output_count <> 0 then
    raise exception 'started or failed AI execution cannot have an output' using errcode = '23514';
  end if;

  return null;
end;
$$;

create function public.validate_ai_execution_source()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op <> 'INSERT' then
    raise exception 'AI execution sources are immutable' using errcode = '55000';
  end if;

  if new.source_kind = 'anamnesis_answer' and not exists (
    select 1
    from public.anamnesis_submissions submission
    where submission.id = new.anamnesis_submission_id
      and submission.client_id = new.client_id
      and submission.submitted_at is not null
  ) then
    raise exception 'AI execution source requires a submitted anamnesis answer' using errcode = '23514';
  end if;

  if new.source_kind = 'client_file' and not exists (
    select 1
    from public.client_files file
    where file.id = new.client_file_id
      and file.client_id = new.client_id
      and file.file_kind in ('photo', 'exam', 'document')
  ) then
    raise exception 'AI execution source requires an allowed client file kind' using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.validate_ai_draft_version()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'AI draft versions are retained' using errcode = '55000';
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.ai_executions execution
      where execution.id = new.execution_id
        and execution.client_id = new.client_id
        and execution.status = 'completed'
    ) then
      raise exception 'AI draft version requires a completed execution' using errcode = '23514';
    end if;

    if new.version_number > 1 and not exists (
      select 1
      from public.ai_draft_versions parent
      where parent.id = new.based_on_draft_version_id
        and parent.execution_id = new.execution_id
        and parent.client_id = new.client_id
        and parent.version_number < new.version_number
    ) then
      raise exception 'AI draft parent must be an earlier version of the same execution' using errcode = '23514';
    end if;

    return new;
  end if;

  if new.id is distinct from old.id
    or new.execution_id is distinct from old.execution_id
    or new.client_id is distinct from old.client_id
    or new.version_number is distinct from old.version_number
    or new.based_on_draft_version_id is distinct from old.based_on_draft_version_id
    or new.content is distinct from old.content
    or new.created_by_profile_id is distinct from old.created_by_profile_id
    or new.created_at is distinct from old.created_at
    or old.discarded_at is not null
    or new.discarded_at is null
    or new.discarded_by_profile_id is null then
    raise exception 'AI draft version only accepts one discard metadata transition' using errcode = '55000';
  end if;

  return new;
end;
$$;

create function public.validate_ai_hypothesis()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'AI hypotheses are retained' using errcode = '55000';
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1
      from public.ai_executions execution
      where execution.id = new.execution_id
        and execution.client_id = new.client_id
        and execution.status = 'completed'
    ) then
      raise exception 'AI hypothesis requires a completed execution' using errcode = '23514';
    end if;

    return new;
  end if;

  if new.id is distinct from old.id
    or new.execution_id is distinct from old.execution_id
    or new.client_id is distinct from old.client_id
    or new.content is distinct from old.content
    or new.created_at is distinct from old.created_at
    or old.confirmed_at is not null
    or new.confirmed_at is null
    or new.confirmed_by_profile_id is null then
    raise exception 'AI hypothesis only accepts one confirmation' using errcode = '55000';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    join public.client_assignments ca
      on ca.staff_profile_id = ur.profile_id
      and ca.ended_at is null
    where ur.profile_id = new.confirmed_by_profile_id
      and ur.role = 'admin'
      and ca.client_id = new.client_id
  ) then
    raise exception 'AI hypothesis confirmation requires an assigned admin' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger ai_prompt_versions_immutable
before update or delete on public.ai_prompt_versions
for each row execute function public.reject_ai_immutable_mutation();

create trigger ai_execution_outputs_immutable
before update or delete on public.ai_execution_outputs
for each row execute function public.reject_ai_immutable_mutation();

create trigger ai_executions_validate_insert
before insert on public.ai_executions
for each row execute function public.validate_ai_execution_insert();

create trigger ai_executions_validate_transition
before update or delete on public.ai_executions
for each row execute function public.validate_ai_execution_transition();

create constraint trigger ai_executions_output_state_check
after insert or update on public.ai_executions
deferrable initially deferred
for each row execute function public.enforce_ai_execution_output_state();

create constraint trigger ai_execution_outputs_state_check
after insert or update on public.ai_execution_outputs
deferrable initially deferred
for each row execute function public.enforce_ai_execution_output_state();

create trigger ai_execution_sources_validate
before insert or update or delete on public.ai_execution_sources
for each row execute function public.validate_ai_execution_source();

create trigger ai_draft_versions_validate
before insert or update or delete on public.ai_draft_versions
for each row execute function public.validate_ai_draft_version();

create trigger ai_hypotheses_validate
before insert or update or delete on public.ai_hypotheses
for each row execute function public.validate_ai_hypothesis();

revoke all on function public.reject_ai_immutable_mutation() from public, anon, authenticated;
revoke all on function public.validate_ai_execution_insert() from public, anon, authenticated;
revoke all on function public.validate_ai_execution_transition() from public, anon, authenticated;
revoke all on function public.enforce_ai_execution_output_state() from public, anon, authenticated;
revoke all on function public.validate_ai_execution_source() from public, anon, authenticated;
revoke all on function public.validate_ai_draft_version() from public, anon, authenticated;
revoke all on function public.validate_ai_hypothesis() from public, anon, authenticated;

alter table public.ai_prompt_versions enable row level security;
alter table public.ai_executions enable row level security;
alter table public.ai_execution_outputs enable row level security;
alter table public.ai_execution_sources enable row level security;
alter table public.ai_draft_versions enable row level security;
alter table public.ai_hypotheses enable row level security;

revoke all on table public.ai_prompt_versions, public.ai_executions,
  public.ai_execution_outputs, public.ai_execution_sources,
  public.ai_draft_versions, public.ai_hypotheses from anon, authenticated;

grant select on table public.ai_prompt_versions, public.ai_executions,
  public.ai_execution_outputs, public.ai_execution_sources,
  public.ai_draft_versions, public.ai_hypotheses to authenticated;

create policy "ai_prompt_versions_select_relational_admin"
  on public.ai_prompt_versions
  for select to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy "ai_executions_select_assigned_admin"
  on public.ai_executions
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
        and ca.client_id = ai_executions.client_id
    )
  );

create policy "ai_execution_outputs_select_assigned_admin"
  on public.ai_execution_outputs
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
        and ca.client_id = ai_execution_outputs.client_id
    )
  );

create policy "ai_execution_sources_select_assigned_admin"
  on public.ai_execution_sources
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
        and ca.client_id = ai_execution_sources.client_id
    )
  );

create policy "ai_draft_versions_select_assigned_admin"
  on public.ai_draft_versions
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
        and ca.client_id = ai_draft_versions.client_id
    )
  );

create policy "ai_hypotheses_select_assigned_admin"
  on public.ai_hypotheses
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
        and ca.client_id = ai_hypotheses.client_id
    )
  );
