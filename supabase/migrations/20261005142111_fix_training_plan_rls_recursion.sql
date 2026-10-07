drop policy if exists client_training_plans_select_assigned_admin_or_own_published
  on public.client_training_plans;

create policy client_training_plans_select_assigned_admin_or_own
  on public.client_training_plans
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_training_plans.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
    or exists (
      select 1
      from public.clients c
      where c.id = client_training_plans.client_id
        and c.profile_id = (select auth.uid())
    )
  );
