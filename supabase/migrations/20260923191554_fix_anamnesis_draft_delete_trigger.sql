create or replace function public.reject_submitted_anamnesis_submission_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.submitted_at is not null then
    raise exception 'submitted anamnesis submissions are immutable'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;
