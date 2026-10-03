create function public.validate_weekly_feedback_submission()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  form_definition jsonb;
  question jsonb;
  question_key text;
  input_type text;
  answer_value jsonb;
  numeric_value numeric;
begin
  if new.submitted_at is null or old.submitted_at is not null then
    return new;
  end if;

  select fv.definition
  into form_definition
  from public.weekly_feedback_form_versions fv
  where fv.id = new.form_version_id;

  if form_definition is null then
    raise exception 'weekly feedback form definition unavailable' using errcode = '23514';
  end if;

  for question in
    select value from jsonb_array_elements(form_definition -> 'questions')
  loop
    question_key := question ->> 'key';
    input_type := question ->> 'input_type';
    answer_value := new.answers -> question_key;

    if coalesce((question ->> 'required')::boolean, false) and answer_value is null then
      raise exception 'missing weekly feedback answer: %', question_key using errcode = '23514';
    end if;

    if answer_value is null then
      continue;
    end if;

    if input_type = 'text' then
      if jsonb_typeof(answer_value) <> 'string'
         or length(trim(answer_value #>> '{}')) = 0 then
        raise exception 'invalid weekly feedback text answer: %', question_key using errcode = '23514';
      end if;
    elsif input_type = 'integer' then
      if jsonb_typeof(answer_value) <> 'number'
         or (answer_value #>> '{}') !~ '^[0-9]+$' then
        raise exception 'invalid weekly feedback integer answer: %', question_key using errcode = '23514';
      end if;
    elsif input_type = 'rating_0_10' then
      if jsonb_typeof(answer_value) <> 'number'
         or (answer_value #>> '{}') !~ '^[0-9]+$' then
        raise exception 'invalid weekly feedback rating answer: %', question_key using errcode = '23514';
      end if;
      numeric_value := (answer_value #>> '{}')::numeric;
      if numeric_value < 0 or numeric_value > 10 then
        raise exception 'weekly feedback rating out of range: %', question_key using errcode = '23514';
      end if;
    else
      raise exception 'unsupported weekly feedback input type: %', input_type using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

revoke all on function public.validate_weekly_feedback_submission() from public, anon, authenticated;

create trigger client_weekly_feedbacks_validate_submission
before update on public.client_weekly_feedbacks
for each row execute function public.validate_weekly_feedback_submission();
