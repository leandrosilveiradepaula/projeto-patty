create table public.anamnesis_submissions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  form_version_id uuid not null references public.anamnesis_form_versions (id) on delete restrict,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  constraint anamnesis_submissions_submitted_after_created
    check (submitted_at is null or submitted_at >= created_at),
  unique (id, form_version_id)
);

create table public.anamnesis_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  form_version_id uuid not null,
  question_id uuid not null,
  answer_value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anamnesis_answers_submission_version_fkey
    foreign key (submission_id, form_version_id)
    references public.anamnesis_submissions (id, form_version_id)
    on delete restrict,
  constraint anamnesis_answers_question_version_fkey
    foreign key (question_id, form_version_id)
    references public.anamnesis_questions (id, form_version_id)
    on delete restrict,
  unique (submission_id, question_id)
);

create table public.anamnesis_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.anamnesis_submissions (id) on delete restrict,
  reviewer_profile_id uuid not null references public.profiles (id) on delete restrict,
  note text not null,
  created_at timestamptz not null default now(),
  constraint anamnesis_reviews_note_not_blank check (length(trim(note)) > 0)
);

create index anamnesis_submissions_client_id_idx on public.anamnesis_submissions (client_id);
create index anamnesis_submissions_form_version_id_idx on public.anamnesis_submissions (form_version_id);
create index anamnesis_answers_submission_id_idx on public.anamnesis_answers (submission_id);
create index anamnesis_answers_question_version_idx on public.anamnesis_answers (question_id, form_version_id);
create index anamnesis_reviews_submission_id_idx on public.anamnesis_reviews (submission_id);
create index anamnesis_reviews_reviewer_profile_id_idx on public.anamnesis_reviews (reviewer_profile_id);

create function public.reject_submitted_anamnesis_submission_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.submitted_at is not null then
    raise exception 'submitted anamnesis submissions are immutable'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create function public.reject_submitted_anamnesis_answer_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if exists (
    select 1
    from public.anamnesis_submissions
    where id = case when tg_op = 'DELETE' then old.submission_id else new.submission_id end
      and submitted_at is not null
  ) then
    raise exception 'answers for submitted anamnesis submissions are immutable'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE' and exists (
    select 1
    from public.anamnesis_submissions
    where id = old.submission_id
      and submitted_at is not null
  ) then
    raise exception 'answers for submitted anamnesis submissions are immutable'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create function public.reject_anamnesis_definition_change_when_submitted()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  target_form_version_id uuid;
begin
  if tg_table_name = 'anamnesis_form_versions' then
    target_form_version_id := case when tg_op = 'DELETE' then old.id else new.id end;
  else
    target_form_version_id := case when tg_op = 'DELETE' then old.form_version_id else new.form_version_id end;
  end if;

  if exists (
    select 1
    from public.anamnesis_submissions
    where form_version_id = target_form_version_id
  ) then
    raise exception 'anamnesis definition version with submissions is immutable'
      using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke execute on function public.reject_submitted_anamnesis_submission_mutation()
  from public, anon, authenticated;
revoke execute on function public.reject_submitted_anamnesis_answer_mutation()
  from public, anon, authenticated;
revoke execute on function public.reject_anamnesis_definition_change_when_submitted()
  from public, anon, authenticated;

create trigger anamnesis_submissions_immutable_after_submit
before update or delete on public.anamnesis_submissions
for each row execute function public.reject_submitted_anamnesis_submission_mutation();

create trigger anamnesis_answers_immutable_after_submit
before insert or update or delete on public.anamnesis_answers
for each row execute function public.reject_submitted_anamnesis_answer_mutation();

create trigger anamnesis_form_versions_immutable_after_submission
before update or delete on public.anamnesis_form_versions
for each row execute function public.reject_anamnesis_definition_change_when_submitted();

create trigger anamnesis_sections_immutable_after_submission
before insert or update or delete on public.anamnesis_sections
for each row execute function public.reject_anamnesis_definition_change_when_submitted();

create trigger anamnesis_questions_immutable_after_submission
before insert or update or delete on public.anamnesis_questions
for each row execute function public.reject_anamnesis_definition_change_when_submitted();

alter table public.anamnesis_submissions enable row level security;
alter table public.anamnesis_answers enable row level security;
alter table public.anamnesis_reviews enable row level security;

revoke all on table public.anamnesis_submissions from anon, authenticated;
revoke all on table public.anamnesis_answers from anon, authenticated;
revoke all on table public.anamnesis_reviews from anon, authenticated;
grant select on table public.anamnesis_submissions to authenticated;
grant select on table public.anamnesis_answers to authenticated;
grant select, insert on table public.anamnesis_reviews to authenticated;

create policy "anamnesis_submissions_select_own_or_active_assignment"
  on public.anamnesis_submissions
  for select to authenticated
  using (
    exists (
      select 1 from public.clients
      where clients.id = anamnesis_submissions.client_id
        and clients.profile_id = (select auth.uid())
    )
    or (
      exists (
        select 1 from public.user_roles
        where user_roles.profile_id = (select auth.uid())
          and user_roles.role = 'admin'
      )
      and exists (
        select 1 from public.client_assignments
        where client_assignments.client_id = anamnesis_submissions.client_id
          and client_assignments.staff_profile_id = (select auth.uid())
          and client_assignments.ended_at is null
      )
    )
  );

create policy "anamnesis_answers_select_own_or_active_assignment"
  on public.anamnesis_answers
  for select to authenticated
  using (
    exists (
      select 1
      from public.anamnesis_submissions
      join public.clients on clients.id = anamnesis_submissions.client_id
      where anamnesis_submissions.id = anamnesis_answers.submission_id
        and (
          clients.profile_id = (select auth.uid())
          or (
            exists (
              select 1 from public.user_roles
              where user_roles.profile_id = (select auth.uid())
                and user_roles.role = 'admin'
            )
            and exists (
              select 1 from public.client_assignments
              where client_assignments.client_id = anamnesis_submissions.client_id
                and client_assignments.staff_profile_id = (select auth.uid())
                and client_assignments.ended_at is null
            )
          )
        )
    )
  );

create policy "anamnesis_reviews_select_active_assignment_admin_only"
  on public.anamnesis_reviews
  for select to authenticated
  using (
    exists (
      select 1
      from public.anamnesis_submissions
      join public.client_assignments
        on client_assignments.client_id = anamnesis_submissions.client_id
      join public.user_roles
        on user_roles.profile_id = client_assignments.staff_profile_id
      where anamnesis_submissions.id = anamnesis_reviews.submission_id
        and client_assignments.staff_profile_id = (select auth.uid())
        and client_assignments.ended_at is null
        and user_roles.role = 'admin'
    )
  );

create policy "anamnesis_reviews_insert_active_assignment_admin_only"
  on public.anamnesis_reviews
  for insert to authenticated
  with check (
    reviewer_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.anamnesis_submissions
      join public.client_assignments
        on client_assignments.client_id = anamnesis_submissions.client_id
      join public.user_roles
        on user_roles.profile_id = client_assignments.staff_profile_id
      where anamnesis_submissions.id = anamnesis_reviews.submission_id
        and client_assignments.staff_profile_id = (select auth.uid())
        and client_assignments.ended_at is null
        and user_roles.role = 'admin'
    )
  );
