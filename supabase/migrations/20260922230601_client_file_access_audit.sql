create table public.client_file_access_events (
  id uuid primary key default gen_random_uuid(),
  requested_file_id uuid not null,
  actor_profile_id uuid not null references public.profiles (id) on delete restrict,
  action text not null,
  authorized boolean not null,
  file_kind public.client_file_kind,
  recorded_at timestamptz not null default now(),
  constraint client_file_access_events_action_allowed check (
    action in ('view', 'download')
  ),
  constraint client_file_access_events_authorization_shape check (
    (
      authorized = true
      and file_kind is not null
      and file_kind in ('exam', 'document')
    )
    or (
      authorized = false
      and file_kind is null
    )
  )
);

create index client_file_access_events_actor_recorded_at_idx
  on public.client_file_access_events (actor_profile_id, recorded_at desc);

create index client_file_access_events_requested_file_id_idx
  on public.client_file_access_events (requested_file_id);

alter table public.client_file_access_events enable row level security;

revoke all on table public.client_file_access_events from anon, authenticated;

grant select on table public.client_file_access_events to authenticated;

grant insert (
  requested_file_id,
  actor_profile_id,
  action,
  authorized,
  file_kind
) on table public.client_file_access_events to authenticated;

create policy "client_file_access_events_select_admin_only"
  on public.client_file_access_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
  );

create policy "client_file_access_events_insert_admin_self"
  on public.client_file_access_events
  for insert
  to authenticated
  with check (
    actor_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.user_roles
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
  );
