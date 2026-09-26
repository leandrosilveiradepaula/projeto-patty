create table public.client_training_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  recorded_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  requested_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  constraint client_training_requests_note_not_blank check (
    note is null or length(trim(note)) > 0
  )
);

create index client_training_requests_client_id_requested_at_idx
  on public.client_training_requests (client_id, requested_at, id);

create index client_training_requests_recorded_by_profile_id_idx
  on public.client_training_requests (recorded_by_profile_id);

create function public.reject_client_training_request_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'client training requests are append-only'
    using errcode = '55000';
end;
$$;

revoke execute on function public.reject_client_training_request_mutation()
  from public, anon, authenticated;

create trigger client_training_requests_immutable
before update or delete on public.client_training_requests
for each row execute function public.reject_client_training_request_mutation();

alter table public.client_training_requests enable row level security;

revoke all on table public.client_training_requests from anon, authenticated;
grant select, insert on table public.client_training_requests to authenticated;

create policy admin_mfa_aal2_required
  on public.client_training_requests
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy "client_training_requests_select_active_assignment_admin_aal2"
  on public.client_training_requests
  for select
  to authenticated
  using (
    coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
    and exists (
      select 1
      from public.user_roles
      join public.client_assignments
        on client_assignments.staff_profile_id = user_roles.profile_id
       and client_assignments.client_id = client_training_requests.client_id
       and client_assignments.ended_at is null
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
  );

create policy "client_training_requests_insert_active_assignment_admin_aal2"
  on public.client_training_requests
  for insert
  to authenticated
  with check (
    recorded_by_profile_id = (select auth.uid())
    and coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
    and exists (
      select 1
      from public.user_roles
      join public.client_assignments
        on client_assignments.staff_profile_id = user_roles.profile_id
       and client_assignments.client_id = client_training_requests.client_id
       and client_assignments.ended_at is null
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
  );
