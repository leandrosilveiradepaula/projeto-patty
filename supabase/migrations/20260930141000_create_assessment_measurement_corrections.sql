create table public.assessment_measurement_corrections (
  id uuid primary key default gen_random_uuid(),
  assessment_measurement_id uuid not null
    references public.assessment_measurements (id) on delete restrict,
  corrected_measurement_value numeric(12, 4) not null,
  corrected_unit text not null,
  corrected_by_profile_id uuid not null
    references public.profiles (id) on delete restrict,
  note text,
  created_at timestamptz not null default now(),
  constraint assessment_measurement_corrections_unit_not_blank
    check (length(trim(corrected_unit)) > 0),
  constraint assessment_measurement_corrections_note_not_blank
    check (note is null or length(trim(note)) > 0)
);

create index assessment_measurement_corrections_measurement_created_idx
  on public.assessment_measurement_corrections (
    assessment_measurement_id,
    created_at desc,
    id desc
  );

create index assessment_measurement_corrections_author_idx
  on public.assessment_measurement_corrections (corrected_by_profile_id);

create function public.validate_assessment_measurement_correction()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.assessment_measurements am
    join public.client_assessments ca
      on ca.id = am.assessment_id
    join public.user_roles ur
      on ur.profile_id = new.corrected_by_profile_id
     and ur.role = 'admin'
    join public.client_assignments assignment
      on assignment.client_id = ca.client_id
     and assignment.staff_profile_id = new.corrected_by_profile_id
     and assignment.ended_at is null
    where am.id = new.assessment_measurement_id
      and ca.finalized_at is not null
  ) then
    raise exception 'measurement correction requires finalized accessible assessment'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_assessment_measurement_correction()
  from public, anon, authenticated;

create trigger assessment_measurement_corrections_validate
before insert on public.assessment_measurement_corrections
for each row execute function public.validate_assessment_measurement_correction();

create function public.reject_assessment_measurement_correction_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'assessment measurement corrections are append-only'
    using errcode = '55000';
end;
$$;

revoke execute on function public.reject_assessment_measurement_correction_mutation()
  from public, anon, authenticated;

create trigger assessment_measurement_corrections_immutable
before update or delete on public.assessment_measurement_corrections
for each row execute function public.reject_assessment_measurement_correction_mutation();

alter table public.assessment_measurement_corrections enable row level security;

revoke all on table public.assessment_measurement_corrections
  from anon, authenticated;
grant select, insert on table public.assessment_measurement_corrections
  to authenticated;

create policy admin_mfa_aal2_required
  on public.assessment_measurement_corrections
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy "assessment_measurement_corrections_select_active_assignment_admin"
  on public.assessment_measurement_corrections
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.assessment_measurements am
      join public.client_assessments ca on ca.id = am.assessment_id
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments assignment
        on assignment.client_id = ca.client_id
       and assignment.staff_profile_id = ur.profile_id
       and assignment.ended_at is null
      where am.id = assessment_measurement_corrections.assessment_measurement_id
    )
  );

create policy "assessment_measurement_corrections_insert_active_assignment_admin"
  on public.assessment_measurement_corrections
  for insert
  to authenticated
  with check (
    corrected_by_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.assessment_measurements am
      join public.client_assessments ca on ca.id = am.assessment_id
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments assignment
        on assignment.client_id = ca.client_id
       and assignment.staff_profile_id = ur.profile_id
       and assignment.ended_at is null
      where am.id = assessment_measurement_corrections.assessment_measurement_id
        and ca.finalized_at is not null
    )
  );
