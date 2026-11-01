-- RBAC-ADMIN-WRITE-02: appended corrections on finalized assessments, even
-- when an admin AAL2 has no active client assignment.
-- Depends on global SELECT RLS from 20261101121000.
-- Existing UPDATE/DELETE protections and source measurements are untouched.
DO $guard$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.assessment_measurement_corrections'::regclass)
     OR NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'assessment_measurement_corrections'
         AND policyname = 'admin_mfa_aal2_required'
         AND permissive = 'RESTRICTIVE'
         AND cmd = 'ALL'
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename = 'assessment_measurement_corrections'
         AND policyname = 'admin_global_select_aal2'
         AND cmd = 'SELECT'
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = 'public.assessment_measurement_corrections'::regclass
         AND tgname = 'assessment_measurement_corrections_immutable'
         AND tgenabled = 'O'
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid = 'public.assessment_measurement_corrections'::regclass
         AND tgname = 'assessment_measurement_corrections_validate'
         AND tgenabled = 'O'
     )
     OR NOT has_table_privilege('authenticated', 'public.assessment_measurement_corrections', 'INSERT')
     OR has_table_privilege('authenticated', 'public.assessment_measurement_corrections', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.assessment_measurement_corrections', 'DELETE')
     OR has_table_privilege('anon', 'public.assessment_measurement_corrections', 'INSERT') THEN
    RAISE EXCEPTION 'Admin historical measurement correction guard: RLS/MFA/immutability/global read prerequisite missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='assessment_measurement_corrections'
      AND policyname='assessment_measurement_corrections_insert_admin_global_aal2'
  ) THEN
    RAISE EXCEPTION 'Admin historical measurement correction policy already exists';
  END IF;
END
$guard$;

-- Preserve the existing assigned-professional branch so previously permitted
-- administrative/synthetic writes do not regress; add an unassigned branch
-- that can only match the actor's own authenticated admin AAL2 session.
CREATE OR REPLACE FUNCTION public.validate_assessment_measurement_correction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.assessment_measurements am
    JOIN public.client_assessments ca ON ca.id = am.assessment_id
    JOIN public.user_roles ur
      ON ur.profile_id = new.corrected_by_profile_id AND ur.role = 'admin'
    WHERE am.id = new.assessment_measurement_id
      AND ca.finalized_at IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.client_assignments assignment
          WHERE assignment.client_id = ca.client_id
            AND assignment.staff_profile_id = new.corrected_by_profile_id
            AND assignment.ended_at IS NULL
        )
        OR (
          new.corrected_by_profile_id = (SELECT auth.uid())
          AND coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
        )
      )
  ) THEN
    RAISE EXCEPTION 'measurement correction requires finalized accessible assessment'
      USING errcode = '23514';
  END IF;
  RETURN new;
END
$function$;

CREATE POLICY assessment_measurement_corrections_insert_admin_global_aal2
ON public.assessment_measurement_corrections
FOR INSERT TO authenticated
WITH CHECK (
  corrected_by_profile_id = (SELECT auth.uid())
  AND coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
  AND (SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.profile_id = (SELECT auth.uid()) AND ur.role = 'admin'
  ))
  AND EXISTS (
    SELECT 1
    FROM public.assessment_measurements am
    JOIN public.client_assessments ca ON ca.id = am.assessment_id
    WHERE am.id = assessment_measurement_corrections.assessment_measurement_id
      AND ca.finalized_at IS NOT NULL
  )
);
