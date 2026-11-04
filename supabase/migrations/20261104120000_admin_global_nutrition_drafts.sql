-- J4-ADMIN-UNASSIGNED-01: global authenticated administrator may prepare
-- nutrition drafts without a current client_assignment. Approval/publication
-- and immutable reviewed versions are deliberately NOT changed.
-- New additive migration: never modify already applied migrations.
DO $guard$
DECLARE target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'protocols','protocol_versions','meal_plan_versions',
    'meal_plan_variants','meal_plan_cycles','meal_plan_cycle_steps',
    'meals','meal_dose_allocations'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class WHERE oid=('public.'||target_table)::regclass
        AND relrowsecurity
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public'
        AND tablename=target_table AND policyname='admin_mfa_aal2_required'
        AND cmd='ALL' AND permissive='RESTRICTIVE'
        AND 'authenticated'=ANY(roles)
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='public'
        AND tablename=target_table AND policyname='admin_global_select_aal2'
        AND cmd='SELECT' AND 'authenticated'=ANY(roles)
    ) THEN
      RAISE EXCEPTION 'J4 global draft gate: required RLS/MFA/global SELECT missing on %', target_table;
    END IF;
  END LOOP;

  IF has_table_privilege('anon','public.protocols','INSERT')
    OR has_table_privilege('anon','public.protocol_versions','UPDATE')
    OR NOT has_table_privilege('authenticated','public.protocols','INSERT')
    OR NOT has_table_privilege('authenticated','public.protocol_versions','INSERT')
    OR NOT has_table_privilege('authenticated','public.protocol_versions','UPDATE')
    OR NOT has_table_privilege('authenticated','public.meal_plan_versions','INSERT')
    OR NOT EXISTS (
      SELECT 1 FROM pg_proc
      WHERE oid='public.meal_plan_version_is_draft(uuid)'::regprocedure
        AND NOT prosecdef
    )
    OR NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgrelid='public.protocol_versions'::regclass
        AND tgname='protocol_versions_freeze_after_review'
        AND tgenabled='O'
    ) THEN
    RAISE EXCEPTION 'J4 global draft gate: unexpected SQL privileges or missing immutable boundary';
  END IF;
END
$guard$;

-- Protocol root: no professional decision or publication is made here.
CREATE POLICY protocols_insert_admin_global_aal2
  ON public.protocols FOR INSERT TO authenticated
  WITH CHECK (
    coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'
    ))
  );

-- Draft versions: retain creator audit identity and the existing freeze trigger.
-- Creation and in-draft modification only; submission/review stays on the
-- separate existing workflow until its complete global permission gate is tested.
CREATE POLICY protocol_versions_insert_admin_global_draft_aal2
  ON public.protocol_versions FOR INSERT TO authenticated
  WITH CHECK (
    created_by_profile_id=(SELECT auth.uid())
    AND submitted_for_review_at IS NULL
    AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'
    ))
  );

CREATE POLICY protocol_versions_update_admin_global_draft_aal2
  ON public.protocol_versions FOR UPDATE TO authenticated
  USING (
    submitted_for_review_at IS NULL
    AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'
    ))
  )
  WITH CHECK (
    created_by_profile_id=(SELECT auth.uid())
    AND submitted_for_review_at IS NULL
    AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'
    ))
  );

-- A nutrition plan belongs to the exact protocol version and client.
-- Existing composite FKs and the immutable reviewed-version trigger remain.
CREATE POLICY meal_plan_versions_insert_admin_global_draft_aal2
  ON public.meal_plan_versions FOR INSERT TO authenticated
  WITH CHECK (
    coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'
    ))
    AND EXISTS (
      SELECT 1 FROM public.protocol_versions pv
      WHERE pv.id=meal_plan_versions.protocol_version_id
        AND pv.client_id=meal_plan_versions.client_id
        AND pv.submitted_for_review_at IS NULL
    )
  );

-- This helper already guards meal plan variant/cycle/step/meal/dose mutations.
-- Replace ONLY the obsolete assignment requirement with the confirmed
-- admin role + MFA AAL2 requirement. Keep SECURITY INVOKER and draft freeze.
CREATE OR REPLACE FUNCTION public.meal_plan_version_is_draft(p_meal_plan_version_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT
    coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND EXISTS (
      SELECT 1 FROM public.meal_plan_versions mpv
      JOIN public.protocol_versions pv
        ON pv.id=mpv.protocol_version_id
        AND pv.client_id=mpv.client_id
      JOIN public.user_roles ur
        ON ur.profile_id=(SELECT auth.uid()) AND ur.role='admin'
      WHERE mpv.id=p_meal_plan_version_id
        AND pv.submitted_for_review_at IS NULL
    );
$function$;
