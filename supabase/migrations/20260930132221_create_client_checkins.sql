create table public.client_hydration_targets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  weight_kg numeric(6,2) not null,
  target_ml integer generated always as (round(weight_kg * 60)::integer) stored,
  method_key text not null default 'patty_60_ml_per_kg',
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint client_hydration_targets_weight_positive check (weight_kg > 0),
  constraint client_hydration_targets_method_key_check check (
    method_key = 'patty_60_ml_per_kg'
  )
);

create table public.client_liquid_intake_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  recorded_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  amount_ml integer not null,
  liquid_kind text not null,
  recorded_at timestamptz not null default now(),
  constraint client_liquid_intake_events_amount_positive check (amount_ml > 0),
  constraint client_liquid_intake_events_kind_check check (
    liquid_kind in ('water', 'zero_calorie_other')
  )
);

create table public.client_activity_checkin_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  recorded_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  checkin_date date not null default current_date,
  did_activity boolean not null,
  recorded_at timestamptz not null default now()
);

create index client_hydration_targets_client_created_idx
  on public.client_hydration_targets (client_id, created_at desc, id desc);

create index client_liquid_intake_events_client_recorded_idx
  on public.client_liquid_intake_events (client_id, recorded_at desc, id desc);

create index client_activity_checkin_events_client_date_recorded_idx
  on public.client_activity_checkin_events (
    client_id,
    checkin_date desc,
    recorded_at desc,
    id desc
  );

create function public.reject_client_checkin_history_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'client check-in history is append-only'
    using errcode = '55000';
end;
$$;

revoke execute on function public.reject_client_checkin_history_mutation()
  from public, anon, authenticated;

create trigger client_hydration_targets_immutable
before update or delete on public.client_hydration_targets
for each row execute function public.reject_client_checkin_history_mutation();

create trigger client_liquid_intake_events_immutable
before update or delete on public.client_liquid_intake_events
for each row execute function public.reject_client_checkin_history_mutation();

create trigger client_activity_checkin_events_immutable
before update or delete on public.client_activity_checkin_events
for each row execute function public.reject_client_checkin_history_mutation();

alter table public.client_hydration_targets enable row level security;
alter table public.client_liquid_intake_events enable row level security;
alter table public.client_activity_checkin_events enable row level security;

revoke all on table public.client_hydration_targets from anon, authenticated;
revoke all on table public.client_liquid_intake_events from anon, authenticated;
revoke all on table public.client_activity_checkin_events from anon, authenticated;

grant select, insert on table public.client_hydration_targets to authenticated;
grant select, insert on table public.client_liquid_intake_events to authenticated;
grant select, insert on table public.client_activity_checkin_events to authenticated;

create policy admin_mfa_aal2_required
  on public.client_hydration_targets
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy admin_mfa_aal2_required
  on public.client_liquid_intake_events
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy admin_mfa_aal2_required
  on public.client_activity_checkin_events
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy "client_hydration_targets_select_own_or_active_assignment"
  on public.client_hydration_targets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_hydration_targets.client_id
        and c.profile_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_hydration_targets.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy "client_hydration_targets_insert_active_assignment_admin"
  on public.client_hydration_targets
  for insert
  to authenticated
  with check (
    created_by_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_hydration_targets.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy "client_liquid_intake_events_select_own_or_active_assignment"
  on public.client_liquid_intake_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_liquid_intake_events.client_id
        and c.profile_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_liquid_intake_events.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy "client_liquid_intake_events_insert_client_self"
  on public.client_liquid_intake_events
  for insert
  to authenticated
  with check (
    recorded_by_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'client'
    )
    and exists (
      select 1
      from public.clients c
      where c.id = client_liquid_intake_events.client_id
        and c.profile_id = (select auth.uid())
    )
  );

create policy "client_activity_checkin_events_select_own_or_active_assignment"
  on public.client_activity_checkin_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_activity_checkin_events.client_id
        and c.profile_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_activity_checkin_events.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy "client_activity_checkin_events_insert_client_self"
  on public.client_activity_checkin_events
  for insert
  to authenticated
  with check (
    recorded_by_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'client'
    )
    and exists (
      select 1
      from public.clients c
      where c.id = client_activity_checkin_events.client_id
        and c.profile_id = (select auth.uid())
    )
  );
