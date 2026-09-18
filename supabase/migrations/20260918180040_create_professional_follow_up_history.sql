create table public.professional_follow_ups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  assessment_id uuid,
  author_profile_id uuid not null references public.profiles (id) on delete restrict,
  difficulty text,
  adherence_perception text,
  patty_observation text,
  professional_decision text not null,
  decision_reason text not null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint professional_follow_ups_assessment_client_fkey
    foreign key (assessment_id, client_id)
    references public.client_assessments (id, client_id)
    on delete restrict,
  constraint professional_follow_ups_difficulty_not_blank check (
    difficulty is null or length(trim(difficulty)) > 0
  ),
  constraint professional_follow_ups_adherence_perception_not_blank check (
    adherence_perception is null or length(trim(adherence_perception)) > 0
  ),
  constraint professional_follow_ups_patty_observation_not_blank check (
    patty_observation is null or length(trim(patty_observation)) > 0
  ),
  constraint professional_follow_ups_decision_allowed check (
    professional_decision in ('maintain', 'simplify', 'advance', 'return')
  ),
  constraint professional_follow_ups_decision_reason_not_blank check (
    length(trim(decision_reason)) > 0
  )
);

create index professional_follow_ups_client_id_recorded_at_idx
  on public.professional_follow_ups (client_id, recorded_at);
create index professional_follow_ups_assessment_id_idx
  on public.professional_follow_ups (assessment_id);
create index professional_follow_ups_author_profile_id_idx
  on public.professional_follow_ups (author_profile_id);

alter table public.professional_follow_ups enable row level security;

revoke all on table public.professional_follow_ups from anon, authenticated;
grant select, insert on table public.professional_follow_ups to authenticated;

create policy "professional_follow_ups_select_active_assignment_admin_only"
  on public.professional_follow_ups
  for select to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
    and exists (
      select 1 from public.client_assignments
      where client_assignments.client_id = professional_follow_ups.client_id
        and client_assignments.staff_profile_id = (select auth.uid())
        and client_assignments.ended_at is null
    )
  );

create policy "professional_follow_ups_insert_active_assignment_admin_only"
  on public.professional_follow_ups
  for insert to authenticated
  with check (
    author_profile_id = (select auth.uid())
    and exists (
      select 1 from public.user_roles
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
    and exists (
      select 1 from public.client_assignments
      where client_assignments.client_id = professional_follow_ups.client_id
        and client_assignments.staff_profile_id = (select auth.uid())
        and client_assignments.ended_at is null
    )
  );
