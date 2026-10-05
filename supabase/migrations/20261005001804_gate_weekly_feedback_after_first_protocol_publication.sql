drop policy if exists client_weekly_feedbacks_insert_active_assignment_admin
  on public.client_weekly_feedbacks;

create policy client_weekly_feedbacks_insert_active_assignment_admin
  on public.client_weekly_feedbacks
  for insert
  to authenticated
  with check (
    requested_by_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_weekly_feedbacks.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
    and exists (
      select 1
      from public.weekly_feedback_form_versions fv
      where fv.id = client_weekly_feedbacks.form_version_id
        and fv.published_at is not null
    )
    and exists (
      select 1
      from public.protocol_publications pp
      where pp.client_id = client_weekly_feedbacks.client_id
    )
  );
