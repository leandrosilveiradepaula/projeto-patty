-- RBAC-ADMIN-WRITE-03: human, append-only reviews of submitted anamneses.
-- Extends relational admin AAL2 permission without requiring client assignment.
-- Depends on global admin SELECT migration 20261101121000.
-- No changes to original answers, immutable submitted responses or published data.
DO $admin_anamnesis_review_guard$
BEGIN
  IF NOT (SELECT c.relrowsecurity FROM pg_catalog.pg_class c WHERE c.oid='public.anamnesis_reviews'::regclass)
     OR NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_policies
       WHERE schemaname='public' AND tablename='anamnesis_reviews'
         AND policyname='admin_mfa_aal2_required'
         AND permissive='RESTRICTIVE' AND cmd='ALL'
         AND 'authenticated'=ANY(roles)
     )
     OR NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_policies
       WHERE schemaname='public' AND tablename='anamnesis_reviews'
         AND policyname='admin_global_select_aal2' AND cmd='SELECT'
     )
     OR NOT has_table_privilege('authenticated','public.anamnesis_reviews','INSERT')
     OR has_table_privilege('authenticated','public.anamnesis_reviews','UPDATE')
     OR has_table_privilege('authenticated','public.anamnesis_reviews','DELETE')
     OR has_table_privilege('anon','public.anamnesis_reviews','INSERT') THEN
    RAISE EXCEPTION 'Global anamnesis review INSERT: prerequisite RLS/MFA/global read or append-only privileges missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname='public' AND tablename='anamnesis_reviews'
      AND policyname='anamnesis_reviews_insert_admin_global_aal2'
  ) THEN
    RAISE EXCEPTION 'Global anamnesis review INSERT policy already exists';
  END IF;
END
$admin_anamnesis_review_guard$;

CREATE POLICY anamnesis_reviews_insert_admin_global_aal2
ON public.anamnesis_reviews
FOR INSERT TO authenticated
WITH CHECK (
  reviewer_profile_id = (SELECT auth.uid())
  AND coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
  AND (SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.profile_id = (SELECT auth.uid()) AND r.role = 'admin'
  ))
  AND EXISTS (
    SELECT 1 FROM public.anamnesis_submissions s
    WHERE s.id = anamnesis_reviews.submission_id
      AND s.submitted_at IS NOT NULL
  )
);
