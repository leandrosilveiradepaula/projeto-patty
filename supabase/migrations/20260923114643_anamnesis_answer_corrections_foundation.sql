create table public.anamnesis_answer_corrections (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.anamnesis_answers (id) on delete restrict,
  corrected_answer_value jsonb not null,
  corrected_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index anamnesis_answer_corrections_answer_id_idx
  on public.anamnesis_answer_corrections (answer_id, created_at, id);

create index anamnesis_answer_corrections_corrected_by_profile_id_idx
  on public.anamnesis_answer_corrections (corrected_by_profile_id);

create function public.reject_anamnesis_answer_correction_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'anamnesis answer corrections are append-only'
    using errcode = '55000';
end;
$$;

revoke execute on function public.reject_anamnesis_answer_correction_mutation()
  from public, anon, authenticated;

create trigger anamnesis_answer_corrections_immutable
before update or delete on public.anamnesis_answer_corrections
for each row execute function public.reject_anamnesis_answer_correction_mutation();

alter table public.anamnesis_answer_corrections enable row level security;

revoke all on table public.anamnesis_answer_corrections from anon, authenticated;
grant select, insert on table public.anamnesis_answer_corrections to authenticated;

create policy "anamnesis_answer_corrections_select_active_assignment_admin_aal2"
  on public.anamnesis_answer_corrections
  for select
  to authenticated
  using (
    coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
    and exists (
      select 1
      from public.anamnesis_answers
      join public.anamnesis_submissions
        on anamnesis_submissions.id = anamnesis_answers.submission_id
      join public.user_roles
        on user_roles.profile_id = (select auth.uid())
      join public.client_assignments
        on client_assignments.client_id = anamnesis_submissions.client_id
       and client_assignments.staff_profile_id = user_roles.profile_id
       and client_assignments.ended_at is null
      where anamnesis_answers.id = anamnesis_answer_corrections.answer_id
        and user_roles.role = 'admin'
    )
  );

create policy "anamnesis_answer_corrections_insert_submitted_active_assignment_admin_aal2"
  on public.anamnesis_answer_corrections
  for insert
  to authenticated
  with check (
    corrected_by_profile_id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
    and exists (
      select 1
      from public.anamnesis_answers
      join public.anamnesis_submissions
        on anamnesis_submissions.id = anamnesis_answers.submission_id
      join public.user_roles
        on user_roles.profile_id = (select auth.uid())
      join public.client_assignments
        on client_assignments.client_id = anamnesis_submissions.client_id
       and client_assignments.staff_profile_id = user_roles.profile_id
       and client_assignments.ended_at is null
      where anamnesis_answers.id = anamnesis_answer_corrections.answer_id
        and anamnesis_submissions.submitted_at is not null
        and user_roles.role = 'admin'
    )
  );
