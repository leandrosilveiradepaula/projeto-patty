drop policy if exists "client_training_requests_select_active_assignment_admin_aal2"
  on public.client_training_requests;

create policy "client_training_requests_select_active_assignment_admin_aal2"
  on public.client_training_requests
  for select
  to authenticated
  using (
    exists (
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

drop policy if exists "client_training_requests_insert_active_assignment_admin_aal2"
  on public.client_training_requests;

create policy "client_training_requests_insert_active_assignment_admin_aal2"
  on public.client_training_requests
  for insert
  to authenticated
  with check (
    recorded_by_profile_id = (select auth.uid())
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
