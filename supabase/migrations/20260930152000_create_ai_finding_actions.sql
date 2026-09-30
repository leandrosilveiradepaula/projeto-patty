create table public.ai_finding_actions (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null,
  client_id uuid not null,
  finding_index integer not null,
  finding_snapshot jsonb not null,
  action text not null,
  acted_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  anamnesis_review_id uuid references public.anamnesis_reviews (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (execution_id, finding_index, action),
  constraint ai_finding_actions_execution_client_fkey
    foreign key (execution_id, client_id)
    references public.ai_executions (id, client_id)
    on delete restrict,
  constraint ai_finding_actions_index_nonnegative
    check (finding_index >= 0),
  constraint ai_finding_actions_action_allowed
    check (action in ('accepted_internal_observation', 'converted_to_patty_note')),
  constraint ai_finding_actions_review_pair
    check (
      (action = 'accepted_internal_observation' and anamnesis_review_id is null)
      or
      (action = 'converted_to_patty_note' and anamnesis_review_id is not null)
    )
);

create index ai_finding_actions_execution_created_idx
  on public.ai_finding_actions (execution_id, created_at, id);

create trigger ai_finding_actions_immutable
before update or delete on public.ai_finding_actions
for each row execute function public.reject_ai_immutable_mutation();

alter table public.ai_finding_actions enable row level security;

revoke all on table public.ai_finding_actions from public, anon, authenticated;
grant select on table public.ai_finding_actions to authenticated;

create policy "ai_finding_actions_select_assigned_admin"
  on public.ai_finding_actions
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
        and ca.client_id = ai_finding_actions.client_id
    )
  );

create policy "admin_mfa_aal2_required"
  on public.ai_finding_actions
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create function public.record_ai_finding_action(
  p_execution_id uuid,
  p_finding_index integer,
  p_action text,
  p_note text default null
)
returns table (
  action_id uuid,
  anamnesis_review_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid;
  execution_row public.ai_executions%rowtype;
  output_content jsonb;
  finding_value jsonb;
  review_id uuid;
  inserted_action_id uuid;
begin
  actor_id := auth.uid();

  if actor_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not public.current_user_admin_mfa_satisfied() then
    raise exception 'admin MFA AAL2 required' using errcode = '42501';
  end if;

  if p_finding_index is null or p_finding_index < 0 then
    raise exception 'invalid finding index' using errcode = '22023';
  end if;

  if p_action not in ('accepted_internal_observation', 'converted_to_patty_note') then
    raise exception 'invalid finding action' using errcode = '22023';
  end if;

  if p_action = 'converted_to_patty_note'
     and (p_note is null or length(trim(p_note)) = 0) then
    raise exception 'Patty note is required' using errcode = '23514';
  end if;

  select e.*
  into execution_row
  from public.ai_executions e
  where e.id = p_execution_id
    and e.purpose_key = 'anamnesis_review'
    and e.status = 'completed'
    and e.anamnesis_submission_id is not null;

  if not found then
    raise exception 'completed anamnesis review execution not found' using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    join public.client_assignments ca
      on ca.staff_profile_id = ur.profile_id
     and ca.ended_at is null
    where ur.profile_id = actor_id
      and ur.role = 'admin'
      and ca.client_id = execution_row.client_id
  ) then
    raise exception 'active assignment required' using errcode = '42501';
  end if;

  select o.content
  into output_content
  from public.ai_execution_outputs o
  where o.execution_id = execution_row.id
    and o.client_id = execution_row.client_id;

  if output_content is null
     or jsonb_typeof(output_content -> 'findings') <> 'array' then
    raise exception 'execution output has no findings array' using errcode = '23514';
  end if;

  finding_value := (output_content -> 'findings') -> p_finding_index;

  if finding_value is null or finding_value = 'null'::jsonb then
    raise exception 'finding index not found' using errcode = '22023';
  end if;

  if p_action = 'converted_to_patty_note' then
    insert into public.anamnesis_reviews (
      submission_id,
      reviewer_profile_id,
      note
    )
    values (
      execution_row.anamnesis_submission_id,
      actor_id,
      trim(p_note)
    )
    returning id into review_id;
  end if;

  insert into public.ai_finding_actions (
    execution_id,
    client_id,
    finding_index,
    finding_snapshot,
    action,
    acted_by_profile_id,
    anamnesis_review_id
  )
  values (
    execution_row.id,
    execution_row.client_id,
    p_finding_index,
    finding_value,
    p_action,
    actor_id,
    review_id
  )
  returning id into inserted_action_id;

  action_id := inserted_action_id;
  anamnesis_review_id := review_id;
  return next;
end;
$$;

revoke all on function public.record_ai_finding_action(uuid, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.record_ai_finding_action(uuid, integer, text, text)
  to authenticated;
