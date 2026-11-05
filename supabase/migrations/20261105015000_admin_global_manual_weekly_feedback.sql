-- J2-ADMIN-MANUAL-FEEDBACK-01: authorized manual request without assignment.
-- New migration only. Never modify previous migrations or scheduled generator.
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='client_weekly_feedbacks'
      AND policyname='admin_mfa_aal2_required'
      AND permissive='RESTRICTIVE'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='client_weekly_feedbacks'
      AND policyname='admin_global_select_aal2'
      AND cmd='SELECT'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid='public.client_weekly_feedbacks'::regclass
      AND tgname='client_weekly_feedbacks_lifecycle' AND tgenabled='O'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid='public.client_weekly_feedbacks'::regclass
      AND conname='client_weekly_feedbacks_schedule_source_consistent'
  ) THEN
    RAISE EXCEPTION 'J2 requires existing MFA, admin global read, request lifecycle and schedule integrity';
  END IF;
END $guard$;

-- Only explicit manual requests from an authorized admin, at AAL2,
-- for the original client and a published form/protocol version.
CREATE POLICY client_weekly_feedbacks_insert_admin_global_manual_aal2
ON public.client_weekly_feedbacks FOR INSERT TO authenticated
WITH CHECK (
  request_source = 'manual'
  AND schedule_configuration_version_id IS NULL
  AND requested_by_profile_id = (SELECT auth.uid())
  AND coalesce((SELECT auth.jwt()->>'aal') = 'aal2',false)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin'
  )
  AND EXISTS (
    SELECT 1 FROM public.weekly_feedback_form_versions fv
    WHERE fv.id=client_weekly_feedbacks.form_version_id
      AND fv.published_at IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM public.protocol_publications pp
    WHERE pp.client_id=client_weekly_feedbacks.client_id
  )
);

-- Restrict ALL authenticated inserts including existing assignment policy.
-- A historical/inactive Client may retain old feedbacks but not receive new ones.
-- This does not alter scheduled generation by privileged invoker/cron.
CREATE POLICY client_weekly_feedbacks_manual_active_profile_only
ON public.client_weekly_feedbacks AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id=client_weekly_feedbacks.client_id
      AND c.status='active'
      AND c.profile_id IS NOT NULL
  )
);
