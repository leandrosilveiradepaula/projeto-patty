create table public.anamnesis_clarification_resolutions (
  id uuid primary key default gen_random_uuid(),
  clarification_request_id uuid not null unique
    references public.anamnesis_clarification_requests (id) on delete restrict,
  resolved_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  resolved_at timestamptz not null default now()
);

create index anamnesis_clarification_resolutions_resolver_idx
  on public.anamnesis_clarification_resolutions (resolved_by_profile_id);

create function public.validate_anamnesis_clarification_resolution()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.anamnesis_clarification_requests r
    join public.anamnesis_submissions s on s.id = r.submission_id
    join public.client_assignments ca
      on ca.client_id = s.client_id
     and ca.staff_profile_id = new.resolved_by_profile_id
     and ca.ended_at is null
    join public.user_roles ur
      on ur.profile_id = new.resolved_by_profile_id
     and ur.role = 'admin'
    where r.id = new.clarification_request_id
      and s.submitted_at is not null
  ) then
    raise exception 'clarification resolution requires active assigned admin access'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_anamnesis_clarification_resolution()
  from public, anon, authenticated;

create trigger anamnesis_clarification_resolutions_validate
before insert on public.anamnesis_clarification_resolutions
for each row execute function public.validate_anamnesis_clarification_resolution();

create trigger anamnesis_clarification_resolutions_immutable
before update or delete on public.anamnesis_clarification_resolutions
for each row execute function public.reject_anamnesis_clarification_mutation();

alter table public.anamnesis_clarification_resolutions enable row level security;

revoke all on table public.anamnesis_clarification_resolutions from anon, authenticated;
grant select, insert on table public.anamnesis_clarification_resolutions to authenticated;

create policy admin_mfa_aal2_required
  on public.anamnesis_clarification_resolutions
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy "anamnesis_clarification_resolutions_select_own_or_active_assignment"
  on public.anamnesis_clarification_resolutions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.anamnesis_clarification_requests r
      join public.anamnesis_submissions s on s.id = r.submission_id
      join public.clients c on c.id = s.client_id
      where r.id = anamnesis_clarification_resolutions.clarification_request_id
        and (
          c.profile_id = (select auth.uid())
          or exists (
            select 1
            from public.user_roles ur
            join public.client_assignments ca
              on ca.staff_profile_id = ur.profile_id
             and ca.client_id = s.client_id
             and ca.ended_at is null
            where ur.profile_id = (select auth.uid())
              and ur.role = 'admin'
          )
        )
    )
  );

create policy "anamnesis_clarification_resolutions_insert_active_assignment_admin"
  on public.anamnesis_clarification_resolutions
  for insert
  to authenticated
  with check (
    resolved_by_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.anamnesis_clarification_requests r
      join public.anamnesis_submissions s on s.id = r.submission_id
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments ca
        on ca.client_id = s.client_id
       and ca.staff_profile_id = (select auth.uid())
       and ca.ended_at is null
      where r.id = anamnesis_clarification_resolutions.clarification_request_id
        and s.submitted_at is not null
    )
  );
