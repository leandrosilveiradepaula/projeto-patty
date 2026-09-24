grant update (submitted_at)
  on table public.anamnesis_submissions
  to authenticated;

create policy "anamnesis_submissions_update_own_draft_for_final_submit"
  on public.anamnesis_submissions
  for update
  to authenticated
  using (
    submitted_at is null
    and exists (
      select 1
      from public.clients
      where clients.id = anamnesis_submissions.client_id
        and clients.profile_id = (select auth.uid())
    )
  )
  with check (
    submitted_at is not null
    and exists (
      select 1
      from public.clients
      where clients.id = anamnesis_submissions.client_id
        and clients.profile_id = (select auth.uid())
    )
  );

create function public.validate_anamnesis_submission_before_final_submit()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  total_question_count integer;
  resolved_question_count integer;
  has_invalid_required_answer boolean;
begin
  if old.submitted_at is not null or new.submitted_at is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.anamnesis_form_versions
    where anamnesis_form_versions.id = new.form_version_id
      and anamnesis_form_versions.published_at is not null
  ) then
    raise exception 'anamnesis form version is not published'
      using errcode = '23514';
  end if;

  select count(*)
    into total_question_count
  from public.anamnesis_questions
  where anamnesis_questions.form_version_id = new.form_version_id;

  if total_question_count = 0 then
    raise exception 'anamnesis form version has no questions'
      using errcode = '23514';
  end if;

  with recursive question_state as (
    select
      q.id,
      q.required,
      q.answer_type,
      q.options,
      q.applicability_source_question_id,
      q.applicability_expected_answer,
      true as applicable
    from public.anamnesis_questions q
    where q.form_version_id = new.form_version_id
      and q.applicability_source_question_id is null

    union all

    select
      child.id,
      child.required,
      child.answer_type,
      child.options,
      child.applicability_source_question_id,
      child.applicability_expected_answer,
      parent.applicable
        and exists (
          select 1
          from public.anamnesis_answers source_answer
          where source_answer.submission_id = new.id
            and source_answer.question_id = parent.id
            and source_answer.answer_value = child.applicability_expected_answer
        ) as applicable
    from public.anamnesis_questions child
    join question_state parent
      on parent.id = child.applicability_source_question_id
    where child.form_version_id = new.form_version_id
  )
  select count(*)
    into resolved_question_count
  from question_state;

  if resolved_question_count <> total_question_count then
    raise exception 'anamnesis applicability graph is invalid'
      using errcode = '23514';
  end if;

  with recursive question_state as (
    select
      q.id,
      q.required,
      q.answer_type,
      q.options,
      q.applicability_source_question_id,
      q.applicability_expected_answer,
      true as applicable
    from public.anamnesis_questions q
    where q.form_version_id = new.form_version_id
      and q.applicability_source_question_id is null

    union all

    select
      child.id,
      child.required,
      child.answer_type,
      child.options,
      child.applicability_source_question_id,
      child.applicability_expected_answer,
      parent.applicable
        and exists (
          select 1
          from public.anamnesis_answers source_answer
          where source_answer.submission_id = new.id
            and source_answer.question_id = parent.id
            and source_answer.answer_value = child.applicability_expected_answer
        ) as applicable
    from public.anamnesis_questions child
    join question_state parent
      on parent.id = child.applicability_source_question_id
    where child.form_version_id = new.form_version_id
  )
  select exists (
    select 1
    from question_state q
    where q.applicable
      and q.required
      and not (
        case q.answer_type
          when 'text' then exists (
            select 1
            from public.anamnesis_answers a
            where a.submission_id = new.id
              and a.question_id = q.id
              and jsonb_typeof(a.answer_value) = 'string'
              and length(trim(a.answer_value #>> '{}')) > 0
          )
          when 'single_choice' then
            q.options is not null
            and jsonb_typeof(q.options) = 'array'
            and jsonb_array_length(q.options) > 0
            and not exists (
              select 1
              from jsonb_array_elements(q.options) option_value
              where jsonb_typeof(option_value) <> 'string'
            )
            and exists (
              select 1
              from public.anamnesis_answers a
              where a.submission_id = new.id
                and a.question_id = q.id
                and jsonb_typeof(a.answer_value) = 'string'
                and q.options @> jsonb_build_array(a.answer_value)
            )
          else false
        end
      )
  )
    into has_invalid_required_answer;

  if has_invalid_required_answer then
    raise exception 'anamnesis submission has missing or invalid required answers'
      using errcode = '23514';
  end if;

  new.submitted_at := statement_timestamp();
  return new;
end;
$$;

revoke execute on function public.validate_anamnesis_submission_before_final_submit()
  from public, anon, authenticated;

create trigger anamnesis_submissions_validate_final_submit
before update of submitted_at on public.anamnesis_submissions
for each row execute function public.validate_anamnesis_submission_before_final_submit();
