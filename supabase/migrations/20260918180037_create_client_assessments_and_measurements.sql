create table public.client_assessments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  assessed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (id, client_id)
);

create table public.assessment_measurements (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.client_assessments (id) on delete restrict,
  measurement_key text not null,
  measurement_value numeric(12, 4) not null,
  unit text not null,
  created_at timestamptz not null default now(),
  constraint assessment_measurements_key_not_blank check (length(trim(measurement_key)) > 0),
  constraint assessment_measurements_unit_not_blank check (length(trim(unit)) > 0),
  unique (assessment_id, measurement_key)
);

create table public.assessment_files (
  assessment_id uuid not null,
  client_id uuid not null,
  client_file_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (assessment_id, client_file_id),
  constraint assessment_files_assessment_client_fkey
    foreign key (assessment_id, client_id)
    references public.client_assessments (id, client_id)
    on delete restrict,
  constraint assessment_files_file_client_fkey
    foreign key (client_file_id, client_id)
    references public.client_files (id, client_id)
    on delete restrict
);

create index client_assessments_client_id_assessed_at_idx
  on public.client_assessments (client_id, assessed_at);
create index assessment_measurements_assessment_id_idx
  on public.assessment_measurements (assessment_id);
create index assessment_files_client_file_id_idx
  on public.assessment_files (client_file_id);

alter table public.client_assessments enable row level security;
alter table public.assessment_measurements enable row level security;
alter table public.assessment_files enable row level security;

revoke all on table public.client_assessments from anon, authenticated;
revoke all on table public.assessment_measurements from anon, authenticated;
revoke all on table public.assessment_files from anon, authenticated;
grant select on table public.client_assessments to authenticated;
grant select on table public.assessment_measurements to authenticated;
grant select on table public.assessment_files to authenticated;

create policy "client_assessments_select_active_assignment_admin_only"
  on public.client_assessments
  for select to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
    and exists (
      select 1 from public.client_assignments
      where client_assignments.client_id = client_assessments.client_id
        and client_assignments.staff_profile_id = (select auth.uid())
        and client_assignments.ended_at is null
    )
  );

create policy "assessment_measurements_select_active_assignment_admin_only"
  on public.assessment_measurements
  for select to authenticated
  using (
    exists (
      select 1
      from public.client_assessments
      join public.user_roles
        on user_roles.profile_id = (select auth.uid())
      join public.client_assignments
        on client_assignments.client_id = client_assessments.client_id
      where client_assessments.id = assessment_measurements.assessment_id
        and user_roles.role = 'admin'
        and client_assignments.staff_profile_id = (select auth.uid())
        and client_assignments.ended_at is null
    )
  );

create policy "assessment_files_select_active_assignment_admin_only"
  on public.assessment_files
  for select to authenticated
  using (
    exists (
      select 1
      from public.client_assessments
      join public.user_roles
        on user_roles.profile_id = (select auth.uid())
      join public.client_assignments
        on client_assignments.client_id = client_assessments.client_id
      where client_assessments.id = assessment_files.assessment_id
        and client_assessments.client_id = assessment_files.client_id
        and user_roles.role = 'admin'
        and client_assignments.staff_profile_id = (select auth.uid())
        and client_assignments.ended_at is null
    )
  );
