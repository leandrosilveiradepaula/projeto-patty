-- RBAC-ADMIN-READ-01 / DEC-ADMIN-GLOBAL-01.
-- Grant SELECT to a verified, MFA-authenticated relational admin for existing
-- application tables. This does NOT grant any INSERT/UPDATE/DELETE privileges,
-- modify user_roles, or weaken existing client ownership / restrictive MFA.
--
-- Deliberately static allowlist: new tables require independent authorization
-- review. Existing migrations are never changed.
DO $admin_global_read$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'ai_draft_versions',
    'ai_execution_failure_responses',
    'ai_execution_outputs',
    'ai_execution_sources',
    'ai_executions',
    'ai_finding_actions',
    'ai_hypotheses',
    'ai_prompt_versions',
    'anamnesis_answer_corrections',
    'anamnesis_answers',
    'anamnesis_clarification_requests',
    'anamnesis_clarification_resolutions',
    'anamnesis_clarification_responses',
    'anamnesis_form_versions',
    'anamnesis_forms',
    'anamnesis_questions',
    'anamnesis_reviews',
    'anamnesis_sections',
    'anamnesis_submissions',
    'assessment_files',
    'assessment_measurement_corrections',
    'assessment_measurements',
    'client_activity_checkin_event_corrections',
    'client_activity_checkin_events',
    'client_assessments',
    'client_assignments',
    'client_content_progress',
    'client_content_releases',
    'client_file_access_events',
    'client_file_upload_sessions',
    'client_files',
    'client_hydration_targets',
    'client_liquid_intake_event_corrections',
    'client_liquid_intake_events',
    'client_method_configuration_override_versions',
    'client_notification_delivery_attempts',
    'client_notification_events',
    'client_notification_preference_versions',
    'client_registration',
    'client_training_plan_items',
    'client_training_plan_versions',
    'client_training_plans',
    'client_training_requests',
    'client_weekly_feedbacks',
    'clients',
    'educational_content_assets',
    'educational_content_versions',
    'educational_contents',
    'exercise_version_videos',
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
    'method_configuration_snapshot_overrides',
    'method_configuration_snapshot_sets',
    'method_configuration_snapshots',
    'method_configuration_templates',
    'method_configuration_versions',
    'professional_follow_ups',
    'profiles',
    'protocol_publications',
    'protocol_version_approvals',
    'protocol_versions',
    'protocols',
    'weekly_feedback_form_versions'
  ]::text[]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = target_table
        AND c.relkind IN ('r', 'p')
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'admin global SELECT: table % missing or RLS disabled', target_table;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = target_table
        AND p.policyname = 'admin_mfa_aal2_required'
        AND p.permissive = 'RESTRICTIVE'
        AND p.cmd = 'ALL'
        AND 'authenticated' = ANY(p.roles)
    ) THEN
      RAISE EXCEPTION 'admin global SELECT: MFA restrictive policy missing for %', target_table;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = target_table
        AND p.policyname = 'admin_global_select_aal2'
    ) THEN
      RAISE EXCEPTION 'admin global SELECT: policy already exists on %', target_table;
    END IF;

    EXECUTE pg_catalog.format(
      'CREATE POLICY admin_global_select_aal2 ON public.%I FOR SELECT TO authenticated
       USING (
         (SELECT EXISTS (
           SELECT 1 FROM public.user_roles AS r
           WHERE r.profile_id = (SELECT auth.uid())
             AND r.role = ''admin''
         ))
         AND coalesce((SELECT auth.jwt() ->> ''aal'') = ''aal2'', false)
       )',
      target_table
    );
  END LOOP;
END
$admin_global_read$;
