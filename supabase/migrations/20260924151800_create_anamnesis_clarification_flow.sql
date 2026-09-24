create table public.anamnesis_clarification_requests (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.anamnesis_submissions (id) on delete restrict,
  source_answer_id uuid references public.anamnesis_answers (id) on delete restrict,
  requested_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  request_text text not null,
  created_at timestamptz not null default now(),
  constraint anamnesis_clarification_requests_text_not_blank
    check (length(trim(request_text)) > 0)
);

create table public.anamnesis_clarification_responses (
  id uuid primary key default gen_random_uuid(),
  clarification_request_id uuid not null references public.anamnesis_clarification_requests (id) on delete restrict,
  responder_profile_id uuid not null references public.profiles (id) on delete restrict,
  response_text text not null,
  created_at timestamptz not null default now(),
  constraint anamnesis_clarification_responses_text_not_blank
    check (length(trim(response_text)) > 0)
);

create index anamnesis_clarification_requests_submission_created_idx
  on public.anamnesis_clarification_requests (submission_id, created_at, id);
create index anamnesis_clarification_requests_source_answer_idx
  on public.anamnesis_clarification_requests (source_answer_id)
  where source_answer_id is not null;
create index anamnesis_clarification_requests_requester_idx
  on public.anamnesis_clarification_requests (requested_by_profile_id);
create index anamnesis_clarification_responses_request_created_idx
  on public.anamnesis_clarification_responses (clarification_request_id, created_at, id);
create index anamnesis_clarification_responses_responder_idx
  on public.anamnesis_clarification_responses (responder_profile_id);

create function public.validate_anamnesis_clarification_request()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1 from public.anamnesis_submissions s
    where s.id = new.submission_id
      and s.submitted_at is not null
  ) then
    raise exception 'clarification requests require a submitted anamnesis'
      using errcode = '55000';
  end if;

  if new.source_answer_id is not null
     and not exists (
       select 1 from public.anamnesis_answers a
       where a.id = new.source_answer_id
         and a.submission_id = new.submission_id
     ) then
    raise exception 'clarification source answer must belong to the same submission'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.validate_anamnesis_clarification_response()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.anamnesis_clarification_requests r
    join public.anamnesis_submissions s on s.id = r.submission_id
    join public.clients c on c.id = s.client_id
    where r.id = new.clarification_request_id
      and c.profile_id = new.responder_profile_id
      and s.submitted_at is not null
  ) then
    raise exception 'clarification response author must own the submitted anamnesis'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.reject_anamnesis_clarification_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'anamnesis clarifications are append-only'
    using errcode = '55000';
end;
$$;

revoke execute on function public.validate_anamnesis_clarification_request()
  from public, anon, authenticated;
revoke execute on function public.validate_anamnesis_clarification_response()
  from public, anon, authenticated;
revoke execute on function public.reject_anamnesis_clarification_mutation()
  from public, anon, authenticated;

create trigger anamnesis_clarification_requests_validate
before insert on public.anamnesis_clarification_requests
for each row execute function public.validate_anamnesis_clarification_request();

create trigger anamnesis_clarification_responses_validate
before insert on public.anamnesis_clarification_responses
for each row execute function public.validate_anamnesis_clarification_response();

create trigger anamnesis_clarification_requests_immutable
before update or delete on public.anamnesis_clarification_requests
for each row execute function public.reject_anamnesis_clarification_mutation();

create trigger anamnesis_clarification_responses_immutable
before update or delete on public.anamnesis_clarification_responses
for each row execute function public.reject_anamnesis_clarification_mutation();

alter table public.anamnesis_clarification_requests enable row level security;
alter table public.anamnesis_clarification_responses enable row level security;

revoke all on table public.anamnesis_clarification_requests from anon, authenticated;
revoke all on table public.anamnesis_clarification_responses from anon, authenticated;
grant select, insert on table public.anamnesis_clarification_requests to authenticated;
grant select, insert on table public.anamnesis_clarification_responses to authenticated;

create policy admin_mfa_aal2_required
  on public.anamnesis_clarification_requests
  as restrictive for all to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy admin_mfa_aal2_required
  on public.anamnesis_clarification_responses
  as restrictive for all to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy "anamnesis_clarification_requests_select_own_or_active_assignment"
  on public.anamnesis_clarification_requests
  for select to authenticated
  using (
    exists (
      select 1
      from public.anamnesis_submissions s
      join public.clients c on c.id = s.client_id
      where s.id = anamnesis_clarification_requests.submission_id
        and (
          c.profile_id = (select auth.uid())
          or (
            exists (
              select 1 from public.user_roles ur
              where ur.profile_id = (select auth.uid()) and ur.role = 'admin'
            )
            and exists (
              select 1 from public.client_assignments ca
              where ca.client_id = s.client_id
                and ca.staff_profile_id = (select auth.uid())
                and ca.ended_at is null
            )
          )
        )
    )
  );

create policy "anamnesis_clarification_requests_insert_active_assignment_admin"
  on public.anamnesis_clarification_requests
  for insert to authenticated
  with check (
    requested_by_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.anamnesis_submissions s
      join public.user_roles ur
        on ur.profile_id = (select auth.uid()) and ur.role = 'admin'
      join public.client_assignments ca
        on ca.client_id = s.client_id
       and ca.staff_profile_id = (select auth.uid())
       and ca.ended_at is null
      where s.id = anamnesis_clarification_requests.submission_id
        and s.submitted_at is not null
    )
  );

create policy "anamnesis_clarification_responses_select_own_or_active_assignment"
  on public.anamnesis_clarification_responses
  for select to authenticated
  using (
    exists (
      select 1
      from public.anamnesis_clarification_requests r
      join public.anamnesis_submissions s on s.id = r.submission_id
      join public.clients c on c.id = s.client_id
      where r.id = anamnesis_clarification_responses.clarification_request_id
        and (
          c.profile_id = (select auth.uid())
          or (
            exists (
              select 1 from public.user_roles ur
              where ur.profile_id = (select auth.uid()) and ur.role = 'admin'
            )
            and exists (
              select 1 from public.client_assignments ca
              where ca.client_id = s.client_id
                and ca.staff_profile_id = (select auth.uid())
                and ca.ended_at is null
            )
          )
        )
    )
  );

create policy "anamnesis_clarification_responses_insert_own_client"
  on public.anamnesis_clarification_responses
  for insert to authenticated
  with check (
    responder_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.anamnesis_clarification_requests r
      join public.anamnesis_submissions s on s.id = r.submission_id
      join public.clients c on c.id = s.client_id
      where r.id = anamnesis_clarification_responses.clarification_request_id
        and c.profile_id = (select auth.uid())
        and s.submitted_at is not null
    )
  );
