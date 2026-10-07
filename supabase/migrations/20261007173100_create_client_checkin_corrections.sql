create table public.client_liquid_intake_event_corrections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.client_liquid_intake_events (id) on delete restrict,
  corrected_amount_ml integer not null,
  corrected_liquid_kind text not null,
  corrected_recorded_at timestamptz not null,
  corrected_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint client_liquid_intake_event_corrections_amount_positive
    check (corrected_amount_ml > 0),
  constraint client_liquid_intake_event_corrections_kind_not_blank
    check (length(trim(corrected_liquid_kind)) > 0)
);

create table public.client_activity_checkin_event_corrections (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.client_activity_checkin_events (id) on delete restrict,
  corrected_checkin_date date not null,
  corrected_did_activity boolean not null,
  corrected_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create index client_liquid_intake_event_corrections_event_created_idx
  on public.client_liquid_intake_event_corrections (event_id, created_at desc, id desc);

create index client_liquid_intake_event_corrections_author_idx
  on public.client_liquid_intake_event_corrections (corrected_by_profile_id);

create index client_activity_checkin_event_corrections_event_created_idx
  on public.client_activity_checkin_event_corrections (event_id, created_at desc, id desc);

create index client_activity_checkin_event_corrections_author_idx
  on public.client_activity_checkin_event_corrections (corrected_by_profile_id);

create trigger client_liquid_intake_event_corrections_immutable
before update or delete on public.client_liquid_intake_event_corrections
for each row execute function public.reject_client_checkin_history_mutation();

create trigger client_activity_checkin_event_corrections_immutable
before update or delete on public.client_activity_checkin_event_corrections
for each row execute function public.reject_client_checkin_history_mutation();

alter table public.client_liquid_intake_event_corrections enable row level security;
alter table public.client_activity_checkin_event_corrections enable row level security;

revoke all on table public.client_liquid_intake_event_corrections from anon, authenticated;
revoke all on table public.client_activity_checkin_event_corrections from anon, authenticated;

grant select, insert on table public.client_liquid_intake_event_corrections to authenticated;
grant select, insert on table public.client_activity_checkin_event_corrections to authenticated;

create policy admin_mfa_aal2_required
  on public.client_liquid_intake_event_corrections
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy admin_mfa_aal2_required
  on public.client_activity_checkin_event_corrections
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy "client_liquid_intake_event_corrections_select_own_or_active_assignment"
  on public.client_liquid_intake_event_corrections
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_liquid_intake_events event
      join public.clients client on client.id = event.client_id
      where event.id = client_liquid_intake_event_corrections.event_id
        and client.profile_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.client_liquid_intake_events event
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments assignment
        on assignment.client_id = event.client_id
       and assignment.staff_profile_id = ur.profile_id
       and assignment.ended_at is null
      where event.id = client_liquid_intake_event_corrections.event_id
    )
  );

create policy "client_liquid_intake_event_corrections_insert_own_or_active_assignment"
  on public.client_liquid_intake_event_corrections
  for insert
  to authenticated
  with check (
    corrected_by_profile_id = (select auth.uid())
    and (
      exists (
        select 1
        from public.client_liquid_intake_events event
        join public.clients client on client.id = event.client_id
        join public.user_roles ur
          on ur.profile_id = (select auth.uid())
         and ur.role = 'client'
        where event.id = client_liquid_intake_event_corrections.event_id
          and client.profile_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.client_liquid_intake_events event
        join public.user_roles ur
          on ur.profile_id = (select auth.uid())
         and ur.role = 'admin'
        join public.client_assignments assignment
          on assignment.client_id = event.client_id
         and assignment.staff_profile_id = ur.profile_id
         and assignment.ended_at is null
        where event.id = client_liquid_intake_event_corrections.event_id
      )
    )
  );

create policy "client_activity_checkin_event_corrections_select_own_or_active_assignment"
  on public.client_activity_checkin_event_corrections
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_activity_checkin_events event
      join public.clients client on client.id = event.client_id
      where event.id = client_activity_checkin_event_corrections.event_id
        and client.profile_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.client_activity_checkin_events event
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments assignment
        on assignment.client_id = event.client_id
       and assignment.staff_profile_id = ur.profile_id
       and assignment.ended_at is null
      where event.id = client_activity_checkin_event_corrections.event_id
    )
  );

create policy "client_activity_checkin_event_corrections_insert_own_or_active_assignment"
  on public.client_activity_checkin_event_corrections
  for insert
  to authenticated
  with check (
    corrected_by_profile_id = (select auth.uid())
    and (
      exists (
        select 1
        from public.client_activity_checkin_events event
        join public.clients client on client.id = event.client_id
        join public.user_roles ur
          on ur.profile_id = (select auth.uid())
         and ur.role = 'client'
        where event.id = client_activity_checkin_event_corrections.event_id
          and client.profile_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.client_activity_checkin_events event
        join public.user_roles ur
          on ur.profile_id = (select auth.uid())
         and ur.role = 'admin'
        join public.client_assignments assignment
          on assignment.client_id = event.client_id
         and assignment.staff_profile_id = ur.profile_id
         and assignment.ended_at is null
        where event.id = client_activity_checkin_event_corrections.event_id
      )
    )
  );
