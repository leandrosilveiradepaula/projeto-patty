drop policy if exists "anamnesis_answer_corrections_select_active_assignment_admin_aal2"
  on public.anamnesis_answer_corrections;

create policy "anamnesis_answer_corrections_select_active_assignment_admin_aal2"
  on public.anamnesis_answer_corrections
  for select
  to authenticated
  using (
    exists (
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

drop policy if exists "anamnesis_answer_corrections_insert_submitted_active_assignment_admin_aal2"
  on public.anamnesis_answer_corrections;

create policy "anamnesis_answer_corrections_insert_submitted_active_assignment_admin_aal2"
  on public.anamnesis_answer_corrections
  for insert
  to authenticated
  with check (
    corrected_by_profile_id = (select auth.uid())
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
