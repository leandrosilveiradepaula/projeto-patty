create function public.current_user_admin_mfa_satisfied()
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select
    not exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
    or coalesce((select auth.jwt() ->> 'aal') = 'aal2', false);
$$;

revoke execute on function public.current_user_admin_mfa_satisfied()
  from public, anon;
grant execute on function public.current_user_admin_mfa_satisfied()
  to authenticated;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'ai_draft_versions',
    'ai_execution_failure_responses',
    'ai_execution_outputs',
    'ai_execution_sources',
    'ai_executions',
    'ai_hypotheses',
    'ai_prompt_versions',
    'anamnesis_answers',
    'anamnesis_form_versions',
    'anamnesis_forms',
    'anamnesis_questions',
    'anamnesis_reviews',
    'anamnesis_sections',
    'anamnesis_submissions',
    'assessment_files',
    'assessment_measurements',
    'client_assessments',
    'client_assignments',
    'client_content_progress',
    'client_content_releases',
    'client_file_access_events',
    'client_file_upload_sessions',
    'client_files',
    'client_registration',
    'clients',
    'educational_content_versions',
    'educational_contents',
    'exercise_versions',
    'exercises',
    'food_equivalent_catalog_versions',
    'food_equivalent_catalogs',
    'food_equivalent_groups',
    'food_equivalent_items',
    'meal_dose_allocations',
    'meal_plan_cycle_steps',
    'meal_plan_cycles',
    'meal_plan_variants',
    'meal_plan_versions',
    'meals',
    'professional_follow_ups',
    'protocol_publications',
    'protocol_version_approvals',
    'protocol_versions',
    'protocols'
  ]
  loop
    execute format(
      'create policy admin_mfa_aal2_required on public.%I as restrictive for all to authenticated using ((select public.current_user_admin_mfa_satisfied())) with check ((select public.current_user_admin_mfa_satisfied()))',
      target_table
    );
  end loop;
end;
$$;

create policy profiles_admin_mfa_aal2_required
  on public.profiles
  as restrictive
  for all
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.current_user_admin_mfa_satisfied())
  )
  with check (
    id = (select auth.uid())
    or (select public.current_user_admin_mfa_satisfied())
  );

create policy storage_objects_admin_mfa_aal2_required
  on storage.objects
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));
