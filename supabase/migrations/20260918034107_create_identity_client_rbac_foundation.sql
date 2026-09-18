create type public.app_role as enum ('admin', 'client');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, role)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles (id) on delete set null,
  status text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_ended_after_started check (
    ended_at is null or started_at is null or ended_at >= started_at
  )
);

create table public.client_assignments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  staff_profile_id uuid not null references public.profiles (id) on delete restrict,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint client_assignments_ended_after_assigned check (
    ended_at is null or ended_at >= assigned_at
  )
);

create unique index client_assignments_one_active_assignment
  on public.client_assignments (client_id, staff_profile_id)
  where ended_at is null;

create index clients_profile_id_idx on public.clients (profile_id);
create index user_roles_profile_id_idx on public.user_roles (profile_id);
create index client_assignments_client_id_idx on public.client_assignments (client_id);
create index client_assignments_staff_profile_id_idx
  on public.client_assignments (staff_profile_id);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.clients enable row level security;
alter table public.client_assignments enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;
revoke all on table public.clients from anon, authenticated;
revoke all on table public.client_assignments from anon, authenticated;
revoke all on type public.app_role from anon, authenticated;

grant usage on schema public to authenticated;
grant usage on type public.app_role to authenticated;
grant select on table public.profiles to authenticated;
grant select on table public.user_roles to authenticated;
grant select on table public.clients to authenticated;
grant select on table public.client_assignments to authenticated;

create policy "profiles_select_own_or_assigned_client"
  on public.profiles
  for select
  to authenticated
  using (
    (select auth.uid()) = id
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
        join public.clients on clients.id = client_assignments.client_id
        where client_assignments.staff_profile_id = (select auth.uid())
          and client_assignments.ended_at is null
          and clients.profile_id = profiles.id
      )
    )
  );

create policy "user_roles_select_own"
  on public.user_roles
  for select
  to authenticated
  using (profile_id = (select auth.uid()));

create policy "clients_select_own_or_active_assignment"
  on public.clients
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
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
        where client_assignments.client_id = clients.id
          and client_assignments.staff_profile_id = (select auth.uid())
          and client_assignments.ended_at is null
      )
    )
  );

create policy "client_assignments_select_own_admin_assignments"
  on public.client_assignments
  for select
  to authenticated
  using (
    staff_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.user_roles
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
  );
