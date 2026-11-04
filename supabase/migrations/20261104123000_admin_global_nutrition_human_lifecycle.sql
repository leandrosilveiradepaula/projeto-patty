-- J4-ADMIN-HUMAN-LIFECYCLE-01: explicit admin AAL2 human transitions.
-- Distinct operations: submit/freeze -> approve -> publish.
-- No automatic transitions; no change to historic files, client access or Auth.
DO $gate$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'protocol_versions','protocol_version_approvals','protocol_publications','clients'
  ] LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_class c
      WHERE c.oid=('public.'||t)::regclass AND c.relrowsecurity)
      OR NOT EXISTS(SELECT 1 FROM pg_policies p WHERE p.schemaname='public'
        AND p.tablename=t AND p.policyname='admin_mfa_aal2_required'
        AND p.cmd='ALL' AND p.permissive='RESTRICTIVE')
      OR NOT EXISTS(SELECT 1 FROM pg_policies p WHERE p.schemaname='public'
        AND p.tablename=t AND p.policyname='admin_global_select_aal2'
        AND p.cmd='SELECT')
    THEN RAISE EXCEPTION 'J4 human lifecycle blocked: RLS/MFA/global read missing on %', t;
    END IF;
  END LOOP;

  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE
      tgrelid='public.protocol_versions'::regclass
      AND tgname='protocol_versions_freeze_after_review' AND tgenabled='O')
     OR NOT EXISTS(SELECT 1 FROM pg_trigger WHERE
      tgrelid='public.protocol_version_approvals'::regclass
      AND tgname='protocol_approvals_require_submitted_version' AND tgenabled='O')
     OR NOT has_table_privilege('authenticated','public.protocol_versions','UPDATE')
     OR NOT has_table_privilege('authenticated','public.protocol_version_approvals','INSERT')
     OR NOT has_table_privilege('authenticated','public.protocol_publications','INSERT')
     OR has_table_privilege('anon','public.protocol_publications','INSERT')
  THEN RAISE EXCEPTION 'J4 human lifecycle blocked: prerequisite trigger/grant missing';
  END IF;
END $gate$;

-- Prevent simultaneous unreviewed content edits and review submission via
-- a direct REST UPDATE. Only the review timestamp may change in this transition.
CREATE FUNCTION public.require_protocol_review_transition_only()
RETURNS trigger LANGUAGE plpgsql
SET search_path = pg_catalog
AS $fn$
BEGIN
  IF old.submitted_for_review_at IS NULL
    AND new.submitted_for_review_at IS NOT NULL
    AND (to_jsonb(new) - 'submitted_for_review_at')
      IS DISTINCT FROM (to_jsonb(old) - 'submitted_for_review_at')
  THEN
    RAISE EXCEPTION 'submit only the existing protocol version' USING errcode='55000';
  END IF;
  RETURN new;
END $fn$;

CREATE TRIGGER protocol_versions_submit_transition_only
BEFORE UPDATE ON public.protocol_versions FOR EACH ROW
EXECUTE FUNCTION public.require_protocol_review_transition_only();

REVOKE ALL ON FUNCTION public.require_protocol_review_transition_only() FROM PUBLIC, anon, authenticated;

CREATE POLICY protocol_versions_submit_admin_global_aal2
  ON public.protocol_versions FOR UPDATE TO authenticated
  USING (
    submitted_for_review_at IS NULL
    AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
  )
  WITH CHECK (
    submitted_for_review_at IS NOT NULL
    AND created_by_profile_id=(SELECT auth.uid())
    AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
  );

-- Professional approval is a separate human request, never a side effect of
-- submission. Same-client linkage and uniqueness remain enforced by FKs.
CREATE POLICY protocol_approvals_insert_admin_global_aal2
  ON public.protocol_version_approvals FOR INSERT TO authenticated
  WITH CHECK (
    approved_by_profile_id=(SELECT auth.uid())
    AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
    AND EXISTS (
      SELECT 1 FROM public.protocol_versions pv
      WHERE pv.id=protocol_version_approvals.protocol_version_id
        AND pv.client_id=protocol_version_approvals.client_id
        AND pv.submitted_for_review_at IS NOT NULL)
  );

-- Publishing is a third, explicit human decision. Historical/inactive Clients
-- cannot receive client-visible material until return/visibility is resolved.
-- This restriction does not prohibit keeping drafts or approved internal work.
CREATE POLICY protocol_publications_insert_admin_global_active_aal2
  ON public.protocol_publications FOR INSERT TO authenticated
  WITH CHECK (
    published_by_profile_id=(SELECT auth.uid())
    AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id=protocol_publications.client_id
        AND c.status='active' AND c.profile_id IS NOT NULL)
    AND EXISTS (
      SELECT 1 FROM public.protocol_version_approvals a
      WHERE a.id=protocol_publications.approval_id
        AND a.client_id=protocol_publications.client_id
        AND a.protocol_version_id=protocol_publications.protocol_version_id)
  );

-- Global admin policy restricts historical/inactive release, while legacy
-- assigned publication policy remains; restrict ANY publication for inactive
-- clients regardless of which permissive policy grants the INSERT.
CREATE POLICY protocol_publications_active_client_only
  ON public.protocol_publications AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS(SELECT 1 FROM public.clients c
      WHERE c.id=protocol_publications.client_id
        AND c.status='active' AND c.profile_id IS NOT NULL)
  );
