create index protocol_versions_protocol_client_idx on public.protocol_versions (protocol_id, client_id);
create index protocol_versions_based_on_client_idx on public.protocol_versions (based_on_version_id, client_id);
create index protocol_version_approvals_version_client_idx on public.protocol_version_approvals (protocol_version_id, client_id);
create index protocol_publications_approval_version_client_idx on public.protocol_publications (approval_id, protocol_version_id, client_id);
create index meal_plan_versions_protocol_client_idx on public.meal_plan_versions (protocol_version_id, client_id);
create index meal_plan_variants_plan_client_idx on public.meal_plan_variants (meal_plan_version_id, client_id);
create index meal_plan_cycles_plan_client_idx on public.meal_plan_cycles (meal_plan_version_id, client_id);
create index meal_plan_cycle_steps_cycle_plan_idx on public.meal_plan_cycle_steps (cycle_id, meal_plan_version_id);
create index meal_plan_cycle_steps_variant_plan_idx on public.meal_plan_cycle_steps (variant_id, meal_plan_version_id);

drop policy "protocols_admin_assigned_all" on public.protocols;
drop policy "protocols_client_select_published" on public.protocols;
create policy "protocols_select_assigned_or_published"
  on public.protocols for select to authenticated
  using (
    exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocols.client_id and client_assignments.ended_at is null)
    or exists (select 1 from public.clients join public.protocol_versions on protocol_versions.protocol_id = protocols.id join public.protocol_publications on protocol_publications.protocol_version_id = protocol_versions.id where clients.id = protocols.client_id and clients.profile_id = (select auth.uid()))
  );
create policy "protocols_insert_assigned_admin"
  on public.protocols for insert to authenticated
  with check (exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocols.client_id and client_assignments.ended_at is null));

drop policy "protocol_versions_admin_assigned_all" on public.protocol_versions;
drop policy "protocol_versions_client_select_published" on public.protocol_versions;
create policy "protocol_versions_select_assigned_or_published"
  on public.protocol_versions for select to authenticated
  using (
    exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_versions.client_id and client_assignments.ended_at is null)
    or exists (select 1 from public.clients join public.protocol_publications on protocol_publications.protocol_version_id = protocol_versions.id where clients.id = protocol_versions.client_id and clients.profile_id = (select auth.uid()))
  );
create policy "protocol_versions_insert_assigned_admin"
  on public.protocol_versions for insert to authenticated
  with check (created_by_profile_id = (select auth.uid()) and exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_versions.client_id and client_assignments.ended_at is null));
create policy "protocol_versions_update_assigned_admin"
  on public.protocol_versions for update to authenticated
  using (exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_versions.client_id and client_assignments.ended_at is null))
  with check (created_by_profile_id = (select auth.uid()) and exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_versions.client_id and client_assignments.ended_at is null));

drop policy "protocol_publications_admin_assigned_all" on public.protocol_publications;
drop policy "protocol_publications_client_select_own" on public.protocol_publications;
create policy "protocol_publications_select_assigned_or_own"
  on public.protocol_publications for select to authenticated
  using (
    exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_publications.client_id and client_assignments.ended_at is null)
    or exists (select 1 from public.clients where clients.id = protocol_publications.client_id and clients.profile_id = (select auth.uid()))
  );
create policy "protocol_publications_insert_assigned_admin"
  on public.protocol_publications for insert to authenticated
  with check (published_by_profile_id = (select auth.uid()) and exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_publications.client_id and client_assignments.ended_at is null));

drop policy "meal_plan_versions_admin_assigned_draft_all" on public.meal_plan_versions;
drop policy "meal_plan_versions_admin_assigned_select" on public.meal_plan_versions;
drop policy "meal_plan_versions_client_select_published" on public.meal_plan_versions;
create policy "meal_plan_versions_select_assigned_or_published"
  on public.meal_plan_versions for select to authenticated
  using (exists (select 1 from public.protocol_versions pv join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin' join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null where pv.id = meal_plan_versions.protocol_version_id and pv.client_id = meal_plan_versions.client_id) or exists (select 1 from public.protocol_versions pv join public.protocol_publications pp on pp.protocol_version_id = pv.id join public.clients c on c.id = pv.client_id where pv.id = meal_plan_versions.protocol_version_id and c.profile_id = (select auth.uid())));
create policy "meal_plan_versions_insert_assigned_draft" on public.meal_plan_versions for insert to authenticated with check (exists (select 1 from public.protocol_versions pv join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin' join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null where pv.id = meal_plan_versions.protocol_version_id and pv.client_id = meal_plan_versions.client_id and pv.submitted_for_review_at is null));
create policy "meal_plan_versions_update_assigned_draft" on public.meal_plan_versions for update to authenticated using (public.meal_plan_version_is_draft(id)) with check (public.meal_plan_version_is_draft(id));
create policy "meal_plan_versions_delete_assigned_draft" on public.meal_plan_versions for delete to authenticated using (public.meal_plan_version_is_draft(id));

drop policy "meal_plan_variants_admin_assigned_draft_all" on public.meal_plan_variants;
drop policy "meal_plan_variants_admin_assigned_select" on public.meal_plan_variants;
drop policy "meal_plan_variants_client_select_published" on public.meal_plan_variants;
create policy "meal_plan_variants_select_assigned_or_published" on public.meal_plan_variants for select to authenticated using (exists (select 1 from public.meal_plan_versions mp join public.protocol_versions pv on pv.id = mp.protocol_version_id join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin' join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null where mp.id = meal_plan_variants.meal_plan_version_id) or public.meal_plan_version_is_published_for_current_client(meal_plan_version_id));
create policy "meal_plan_variants_insert_assigned_draft" on public.meal_plan_variants for insert to authenticated with check (public.meal_plan_version_is_draft(meal_plan_version_id));
create policy "meal_plan_variants_update_assigned_draft" on public.meal_plan_variants for update to authenticated using (public.meal_plan_version_is_draft(meal_plan_version_id)) with check (public.meal_plan_version_is_draft(meal_plan_version_id));
create policy "meal_plan_variants_delete_assigned_draft" on public.meal_plan_variants for delete to authenticated using (public.meal_plan_version_is_draft(meal_plan_version_id));

drop policy "meal_plan_cycles_admin_assigned_draft_all" on public.meal_plan_cycles;
drop policy "meal_plan_cycles_admin_assigned_select" on public.meal_plan_cycles;
drop policy "meal_plan_cycles_client_select_published" on public.meal_plan_cycles;
create policy "meal_plan_cycles_select_assigned_or_published" on public.meal_plan_cycles for select to authenticated using (exists (select 1 from public.meal_plan_versions mp join public.protocol_versions pv on pv.id = mp.protocol_version_id join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin' join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null where mp.id = meal_plan_cycles.meal_plan_version_id) or public.meal_plan_version_is_published_for_current_client(meal_plan_version_id));
create policy "meal_plan_cycles_insert_assigned_draft" on public.meal_plan_cycles for insert to authenticated with check (public.meal_plan_version_is_draft(meal_plan_version_id));
create policy "meal_plan_cycles_update_assigned_draft" on public.meal_plan_cycles for update to authenticated using (public.meal_plan_version_is_draft(meal_plan_version_id)) with check (public.meal_plan_version_is_draft(meal_plan_version_id));
create policy "meal_plan_cycles_delete_assigned_draft" on public.meal_plan_cycles for delete to authenticated using (public.meal_plan_version_is_draft(meal_plan_version_id));

drop policy "meal_plan_cycle_steps_admin_assigned_draft_all" on public.meal_plan_cycle_steps;
drop policy "meal_plan_cycle_steps_admin_assigned_select" on public.meal_plan_cycle_steps;
drop policy "meal_plan_cycle_steps_client_select_published" on public.meal_plan_cycle_steps;
create policy "meal_plan_cycle_steps_select_assigned_or_published" on public.meal_plan_cycle_steps for select to authenticated using (exists (select 1 from public.meal_plan_versions mp join public.protocol_versions pv on pv.id = mp.protocol_version_id join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin' join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null where mp.id = meal_plan_cycle_steps.meal_plan_version_id) or public.meal_plan_version_is_published_for_current_client(meal_plan_version_id));
create policy "meal_plan_cycle_steps_insert_assigned_draft" on public.meal_plan_cycle_steps for insert to authenticated with check (public.meal_plan_version_is_draft(meal_plan_version_id));
create policy "meal_plan_cycle_steps_update_assigned_draft" on public.meal_plan_cycle_steps for update to authenticated using (public.meal_plan_version_is_draft(meal_plan_version_id)) with check (public.meal_plan_version_is_draft(meal_plan_version_id));
create policy "meal_plan_cycle_steps_delete_assigned_draft" on public.meal_plan_cycle_steps for delete to authenticated using (public.meal_plan_version_is_draft(meal_plan_version_id));

drop policy "meals_admin_assigned_draft_all" on public.meals;
drop policy "meals_admin_assigned_select" on public.meals;
drop policy "meals_client_select_published" on public.meals;
create policy "meals_select_assigned_or_published" on public.meals for select to authenticated using (exists (select 1 from public.meal_plan_variants v join public.meal_plan_versions mp on mp.id = v.meal_plan_version_id join public.protocol_versions pv on pv.id = mp.protocol_version_id join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin' join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null where v.id = meals.meal_plan_variant_id) or exists (select 1 from public.meal_plan_variants v where v.id = meals.meal_plan_variant_id and public.meal_plan_version_is_published_for_current_client(v.meal_plan_version_id)));
create policy "meals_insert_assigned_draft" on public.meals for insert to authenticated with check (exists (select 1 from public.meal_plan_variants v where v.id = meals.meal_plan_variant_id and public.meal_plan_version_is_draft(v.meal_plan_version_id)));
create policy "meals_update_assigned_draft" on public.meals for update to authenticated using (exists (select 1 from public.meal_plan_variants v where v.id = meals.meal_plan_variant_id and public.meal_plan_version_is_draft(v.meal_plan_version_id))) with check (exists (select 1 from public.meal_plan_variants v where v.id = meals.meal_plan_variant_id and public.meal_plan_version_is_draft(v.meal_plan_version_id)));
create policy "meals_delete_assigned_draft" on public.meals for delete to authenticated using (exists (select 1 from public.meal_plan_variants v where v.id = meals.meal_plan_variant_id and public.meal_plan_version_is_draft(v.meal_plan_version_id)));

drop policy "meal_doses_admin_assigned_draft_all" on public.meal_dose_allocations;
drop policy "meal_doses_admin_assigned_select" on public.meal_dose_allocations;
drop policy "meal_doses_client_select_published" on public.meal_dose_allocations;
create policy "meal_doses_select_assigned_or_published" on public.meal_dose_allocations for select to authenticated using (exists (select 1 from public.meals m join public.meal_plan_variants v on v.id = m.meal_plan_variant_id join public.meal_plan_versions mp on mp.id = v.meal_plan_version_id join public.protocol_versions pv on pv.id = mp.protocol_version_id join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin' join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null where m.id = meal_dose_allocations.meal_id) or exists (select 1 from public.meals m join public.meal_plan_variants v on v.id = m.meal_plan_variant_id where m.id = meal_dose_allocations.meal_id and public.meal_plan_version_is_published_for_current_client(v.meal_plan_version_id)));
create policy "meal_doses_insert_assigned_draft" on public.meal_dose_allocations for insert to authenticated with check (exists (select 1 from public.meals m join public.meal_plan_variants v on v.id = m.meal_plan_variant_id where m.id = meal_dose_allocations.meal_id and public.meal_plan_version_is_draft(v.meal_plan_version_id)));
create policy "meal_doses_update_assigned_draft" on public.meal_dose_allocations for update to authenticated using (exists (select 1 from public.meals m join public.meal_plan_variants v on v.id = m.meal_plan_variant_id where m.id = meal_dose_allocations.meal_id and public.meal_plan_version_is_draft(v.meal_plan_version_id))) with check (exists (select 1 from public.meals m join public.meal_plan_variants v on v.id = m.meal_plan_variant_id where m.id = meal_dose_allocations.meal_id and public.meal_plan_version_is_draft(v.meal_plan_version_id)));
create policy "meal_doses_delete_assigned_draft" on public.meal_dose_allocations for delete to authenticated using (exists (select 1 from public.meals m join public.meal_plan_variants v on v.id = m.meal_plan_variant_id where m.id = meal_dose_allocations.meal_id and public.meal_plan_version_is_draft(v.meal_plan_version_id)));
