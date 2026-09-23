create unique index anamnesis_submissions_one_draft_per_client_version_idx
  on public.anamnesis_submissions (client_id, form_version_id)
  where submitted_at is null;

grant insert (client_id, form_version_id)
  on table public.anamnesis_submissions
  to authenticated;

grant insert (submission_id, form_version_id, question_id, answer_value)
  on table public.anamnesis_answers
  to authenticated;

grant update (answer_value)
  on table public.anamnesis_answers
  to authenticated;

create policy "anamnesis_submissions_insert_own_draft_for_published_version"
  on public.anamnesis_submissions
  for insert
  to authenticated
  with check (
    submitted_at is null
    and exists (
      select 1
      from public.clients
      where clients.id = anamnesis_submissions.client_id
        and clients.profile_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.anamnesis_form_versions
      where anamnesis_form_versions.id = anamnesis_submissions.form_version_id
        and anamnesis_form_versions.published_at is not null
    )
  );

create policy "anamnesis_answers_insert_own_draft"
  on public.anamnesis_answers
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.anamnesis_submissions
      join public.clients
        on clients.id = anamnesis_submissions.client_id
      where anamnesis_submissions.id = anamnesis_answers.submission_id
        and anamnesis_submissions.form_version_id = anamnesis_answers.form_version_id
        and anamnesis_submissions.submitted_at is null
        and clients.profile_id = (select auth.uid())
    )
  );

create policy "anamnesis_answers_update_own_draft"
  on public.anamnesis_answers
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.anamnesis_submissions
      join public.clients
        on clients.id = anamnesis_submissions.client_id
      where anamnesis_submissions.id = anamnesis_answers.submission_id
        and anamnesis_submissions.form_version_id = anamnesis_answers.form_version_id
        and anamnesis_submissions.submitted_at is null
        and clients.profile_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.anamnesis_submissions
      join public.clients
        on clients.id = anamnesis_submissions.client_id
      where anamnesis_submissions.id = anamnesis_answers.submission_id
        and anamnesis_submissions.form_version_id = anamnesis_answers.form_version_id
        and anamnesis_submissions.submitted_at is null
        and clients.profile_id = (select auth.uid())
    )
  );
