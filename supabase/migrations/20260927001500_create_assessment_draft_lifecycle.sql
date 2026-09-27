alter table public.client_assessments
  add column assessment_kind text,
  add column created_by_profile_id uuid references public.profiles (id) on delete restrict,
  add column finalized_at timestamptz,
  add column finalized_by_profile_id uuid references public.profiles (id) on delete restrict,
  add constraint client_assessments_kind_allowed check (
    assessment_kind is null or assessment_kind in ('fortnightly', 'monthly')
  ),
  add constraint client_assessments_finalization_actor_consistent check (
    (finalized_at is null and finalized_by_profile_id is null)
    or
    finalized_at is not null
  );

update public.client_assessments
set finalized_at = created_at
where finalized_at is null;

create index client_assessments_client_id_finalized_at_assessed_at_idx
  on public.client_assessments (client_id, finalized_at, assessed_at);

create index client_assessments_created_by_profile_id_idx
  on public.client_assessments (created_by_profile_id)
  where created_by_profile_id is not null;

create index client_assessments_finalized_by_profile_id_idx
  on public.client_assessments (finalized_by_profile_id)
  where finalized_by_profile_id is not null;

create function public.enforce_client_assessment_lifecycle()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.finalized_at is not null then
    raise exception 'finalized assessment is immutable'
      using errcode = '55000';
  end if;

  if new.client_id is distinct from old.client_id
     or new.created_at is distinct from old.created_at
     or new.created_by_profile_id is distinct from old.created_by_profile_id then
    raise exception 'assessment identity fields are immutable'
      using errcode = '55000';
  end if;

  if new.finalized_at is null and new.finalized_by_profile_id is not null then
    raise exception 'finalization actor requires finalized_at'
      using errcode = '23514';
  end if;

  if new.finalized_at is not null and new.finalized_by_profile_id is null then
    raise exception 'finalized assessment requires finalization actor'
      using errcode = '23514';
  end if;

  if old.finalized_at is null and new.finalized_at is not null then
    new.finalized_at := now();
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_client_assessment_lifecycle()
  from public, anon, authenticated;

create trigger client_assessments_lifecycle_guard
before update on public.client_assessments
for each row execute function public.enforce_client_assessment_lifecycle();

create function public.require_draft_assessment_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  target_assessment_id uuid;
begin
  if tg_op = 'DELETE' then
    target_assessment_id := old.assessment_id;
  else
    target_assessment_id := new.assessment_id;
  end if;

  if tg_op = 'UPDATE'
     and new.assessment_id is distinct from old.assessment_id then
    raise exception 'measurement cannot move between assessments'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from public.client_assessments ca
    where ca.id = target_assessment_id
      and ca.finalized_at is null
  ) then
    raise exception 'assessment content can change only while draft'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke execute on function public.require_draft_assessment_mutation()
  from public, anon, authenticated;

create trigger assessment_measurements_draft_guard
before insert or update or delete on public.assessment_measurements
for each row execute function public.require_draft_assessment_mutation();

create trigger assessment_files_draft_guard
before insert or delete on public.assessment_files
for each row execute function public.require_draft_assessment_mutation();

revoke all on table public.client_assessments from anon, authenticated;
revoke all on table public.assessment_measurements from anon, authenticated;
revoke all on table public.assessment_files from anon, authenticated;

grant select, insert, update on table public.client_assessments to authenticated;
grant select, insert, update, delete on table public.assessment_measurements to authenticated;
grant select, insert, delete on table public.assessment_files to authenticated;

create policy "client_assessments_insert_draft_active_assignment_admin"
  on public.client_assessments
  for insert
  to authenticated
  with check (
    created_by_profile_id = (select auth.uid())
    and finalized_at is null
    and finalized_by_profile_id is null
    and assessment_kind in ('fortnightly', 'monthly')
    and exists (
      select 1
      from public.user_roles
      join public.client_assignments
        on client_assignments.staff_profile_id = user_roles.profile_id
       and client_assignments.client_id = client_assessments.client_id
       and client_assignments.ended_at is null
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
  );

create policy "client_assessments_update_draft_active_assignment_admin"
  on public.client_assessments
  for update
  to authenticated
  using (
    finalized_at is null
    and exists (
      select 1
      from public.user_roles
      join public.client_assignments
        on client_assignments.staff_profile_id = user_roles.profile_id
       and client_assignments.client_id = client_assessments.client_id
       and client_assignments.ended_at is null
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
  )
  with check (
    assessment_kind in ('fortnightly', 'monthly')
    and (
      finalized_by_profile_id is null
      or finalized_by_profile_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.user_roles
      join public.client_assignments
        on client_assignments.staff_profile_id = user_roles.profile_id
       and client_assignments.client_id = client_assessments.client_id
       and client_assignments.ended_at is null
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
  );

create policy "assessment_measurements_insert_draft_active_assignment_admin"
  on public.assessment_measurements
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.client_assessments ca
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments assignment
        on assignment.client_id = ca.client_id
       and assignment.staff_profile_id = ur.profile_id
       and assignment.ended_at is null
      where ca.id = assessment_measurements.assessment_id
        and ca.finalized_at is null
    )
  );

create policy "assessment_measurements_update_draft_active_assignment_admin"
  on public.assessment_measurements
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.client_assessments ca
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments assignment
        on assignment.client_id = ca.client_id
       and assignment.staff_profile_id = ur.profile_id
       and assignment.ended_at is null
      where ca.id = assessment_measurements.assessment_id
        and ca.finalized_at is null
    )
  )
  with check (
    exists (
      select 1
      from public.client_assessments ca
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments assignment
        on assignment.client_id = ca.client_id
       and assignment.staff_profile_id = ur.profile_id
       and assignment.ended_at is null
      where ca.id = assessment_measurements.assessment_id
        and ca.finalized_at is null
    )
  );

create policy "assessment_measurements_delete_draft_active_assignment_admin"
  on public.assessment_measurements
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.client_assessments ca
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments assignment
        on assignment.client_id = ca.client_id
       and assignment.staff_profile_id = ur.profile_id
       and assignment.ended_at is null
      where ca.id = assessment_measurements.assessment_id
        and ca.finalized_at is null
    )
  );

create policy "assessment_files_insert_draft_active_assignment_admin"
  on public.assessment_files
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.client_assessments ca
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments assignment
        on assignment.client_id = ca.client_id
       and assignment.staff_profile_id = ur.profile_id
       and assignment.ended_at is null
      where ca.id = assessment_files.assessment_id
        and ca.client_id = assessment_files.client_id
        and ca.finalized_at is null
    )
  );

create policy "assessment_files_delete_draft_active_assignment_admin"
  on public.assessment_files
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.client_assessments ca
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments assignment
        on assignment.client_id = ca.client_id
       and assignment.staff_profile_id = ur.profile_id
       and assignment.ended_at is null
      where ca.id = assessment_files.assessment_id
        and ca.client_id = assessment_files.client_id
        and ca.finalized_at is null
    )
  );
