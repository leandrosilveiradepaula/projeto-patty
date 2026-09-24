alter table public.anamnesis_questions
  add column applicability_source_question_id uuid,
  add column applicability_expected_answer jsonb;

alter table public.anamnesis_questions
  add constraint anamnesis_questions_applicability_pair_check
    check (
      (applicability_source_question_id is null and applicability_expected_answer is null)
      or
      (applicability_source_question_id is not null and applicability_expected_answer is not null)
    ),
  add constraint anamnesis_questions_applicability_expected_not_json_null
    check (
      applicability_expected_answer is null
      or applicability_expected_answer <> 'null'::jsonb
    ),
  add constraint anamnesis_questions_applicability_source_not_self
    check (
      applicability_source_question_id is null
      or applicability_source_question_id <> id
    ),
  add constraint anamnesis_questions_applicability_source_version_fkey
    foreign key (applicability_source_question_id, form_version_id)
    references public.anamnesis_questions (id, form_version_id)
    on delete restrict;

create index anamnesis_questions_applicability_source_version_idx
  on public.anamnesis_questions (applicability_source_question_id, form_version_id)
  where applicability_source_question_id is not null;
