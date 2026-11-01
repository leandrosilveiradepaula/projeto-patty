-- RBAC-ADMIN-WRITE-01 / DEC-ADMIN-GLOBAL-01.
-- Extend only append-only professional follow-up INSERT to an admin with MFA AAL2.
-- Preserve ownership, immutable history, and the existing active-assignment
-- policy. Do not grant UPDATE/DELETE or alter publications/assessments.
-- Depends on 20261101121000_admin_global_read_aal2.sql.
DO $admin_professional_follow_up$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    WHERE c.oid = 'public.professional_follow_ups'::regclass
      AND c.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'professional_follow_ups'
      AND policyname = 'admin_mfa_aal2_required'
      AND permissive = 'RESTRICTIVE' AND cmd = 'ALL'
      AND 'authenticated' = ANY(roles)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'professional_follow_ups'
      AND policyname = 'admin_global_select_aal2'
      AND cmd = 'SELECT'
  ) THEN
    RAISE EXCEPTION 'Professional follow-up global INSERT blocked: RLS/MFA/global read prerequisite missing';
  END IF;

  IF NOT has_table_privilege('authenticated', 'public.professional_follow_ups', 'INSERT')
     OR has_table_privilege('authenticated', 'public.professional_follow_ups', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.professional_follow_ups', 'DELETE') THEN
    RAISE EXCEPTION 'Professional follow-up global INSERT blocked: unexpected table privileges';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger t
    WHERE t.tgrelid = 'public.professional_follow_ups'::regclass
      AND t.tgname = 'professional_follow_ups_finalized_assessment_guard'
      AND t.tgenabled = 'O'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint c
    WHERE c.conrelid = 'public.professional_follow_ups'::regclass
      AND c.conname = 'professional_follow_ups_assessment_client_fkey'
  ) THEN
    RAISE EXCEPTION 'Professional follow-up global INSERT blocked: finalized/relationship guards missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename = 'professional_follow_ups'
      AND policyname = 'professional_follow_ups_insert_admin_global_aal2'
  ) THEN
    RAISE EXCEPTION 'Professional follow-up global INSERT policy already exists';
  END IF;
END
$admin_professional_follow_up$;

CREATE POLICY professional_follow_ups_insert_admin_global_aal2
  ON public.professional_follow_ups
  FOR INSERT TO authenticated
  WITH CHECK (
    author_profile_id = (SELECT auth.uid())
    AND coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
    AND (SELECT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id = (SELECT auth.uid())
        AND r.role = 'admin'
    ))
    AND assessment_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.client_assessments a
      WHERE a.id = professional_follow_ups.assessment_id
        AND a.client_id = professional_follow_ups.client_id
        AND a.finalized_at IS NOT NULL
    )
  );
