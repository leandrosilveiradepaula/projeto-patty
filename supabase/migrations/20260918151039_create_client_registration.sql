create table public.client_registration (
  client_id uuid primary key references public.clients (id) on delete restrict,
  city text,
  phone text,
  contact_email text,
  instagram text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_registration enable row level security;

revoke all on table public.client_registration from anon, authenticated;
grant select on table public.client_registration to authenticated;

create policy "client_registration_select_own_or_active_assignment"
  on public.client_registration
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients
      where clients.id = client_registration.client_id
        and clients.profile_id = (select auth.uid())
    )
    or (
      exists (
        select 1
        from public.user_roles
        where user_roles.profile_id = (select auth.uid())
          and user_roles.role = 'admin'
      )
      and exists (
        select 1
        from public.client_assignments
        where client_assignments.client_id = client_registration.client_id
          and client_assignments.staff_profile_id = (select auth.uid())
          and client_assignments.ended_at is null
      )
    )
  );
