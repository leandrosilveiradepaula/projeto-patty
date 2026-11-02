-- RBAC-ADMIN-WRITE-05: allow audited admin AAL2 check-in corrections without assignment.
-- The existing client-owner and assigned-admin policies are preserved.
-- No existing migration, source event, grant, or UPDATE/DELETE rule is changed.
DO $guard$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'client_liquid_intake_event_corrections',
    'client_activity_checkin_event_corrections'
  ] LOOP
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = format('public.%I', target)::regclass)
       OR NOT EXISTS (
         SELECT 1 FROM pg_policies
         WHERE schemaname = 'public' AND tablename = target
           AND policyname = 'admin_mfa_aal2_required'
           AND permissive = 'RESTRICTIVE' AND cmd = 'ALL'
       )
       OR NOT EXISTS (
         SELECT 1 FROM pg_policies
         WHERE schemaname = 'public' AND tablename = target
           AND policyname = 'admin_global_select_aal2' AND cmd = 'SELECT'
       )
       OR NOT EXISTS (
         SELECT 1 FROM pg_trigger
         WHERE tgrelid = format('public.%I', target)::regclass
           AND tgname = target || '_immutable' AND tgenabled = 'O'
       )
       OR NOT has_table_privilege('authenticated', format('public.%I', target), 'INSERT')
       OR has_table_privilege('authenticated', format('public.%I', target), 'UPDATE')
       OR has_table_privilege('authenticated', format('public.%I', target), 'DELETE')
       OR has_table_privilege('anon', format('public.%I', target), 'INSERT')
       OR EXISTS (
         SELECT 1 FROM pg_policies
         WHERE schemaname = 'public' AND tablename = target
           AND policyname = target || '_insert_admin_global_aal2'
       ) THEN
      RAISE EXCEPTION 'Admin check-in correction guard failed for %', target;
    END IF;
  END LOOP;
END
$guard$;

CREATE POLICY client_liquid_intake_event_corrections_insert_admin_global_aal2
ON public.client_liquid_intake_event_corrections
FOR INSERT TO authenticated
WITH CHECK (
  corrected_by_profile_id = (SELECT auth.uid())
  AND coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.profile_id = (SELECT auth.uid()) AND ur.role = 'admin'
  )
  AND EXISTS (
    SELECT 1 FROM public.client_liquid_intake_events event
    WHERE event.id = client_liquid_intake_event_corrections.event_id
  )
);

CREATE POLICY client_activity_checkin_event_corrections_insert_admin_global_aal2
ON public.client_activity_checkin_event_corrections
FOR INSERT TO authenticated
WITH CHECK (
  corrected_by_profile_id = (SELECT auth.uid())
  AND coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.profile_id = (SELECT auth.uid()) AND ur.role = 'admin'
  )
  AND EXISTS (
    SELECT 1 FROM public.client_activity_checkin_events event
    WHERE event.id = client_activity_checkin_event_corrections.event_id
  )
);
