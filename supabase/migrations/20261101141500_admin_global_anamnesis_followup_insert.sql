-- RBAC-ADMIN-WRITE-04: allow AAL2 administrative append-only work on
-- historical submitted anamneses without an active staff assignment.
-- Depends on 20261101121000_admin_global_read_aal2.sql.
-- Keep source answers, submission records and client-owned records immutable.
DO $admin_anamnesis_followup_guard$
DECLARE
  target_table text;
  expected_trigger text;
BEGIN
  FOR target_table, expected_trigger IN
    SELECT * FROM (VALUES
      ('anamnesis_answer_corrections', 'anamnesis_answer_corrections_immutable'),
      ('anamnesis_clarification_requests', 'anamnesis_clarification_requests_immutable'),
      ('anamnesis_clarification_resolutions', 'anamnesis_clarification_resolutions_immutable')
    ) AS conditions(table_name, trigger_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
      WHERE c.oid = ('public.' || target_table)::regclass
        AND c.relrowsecurity
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies p
      WHERE p.schemaname='public' AND p.tablename=target_table
        AND p.policyname='admin_mfa_aal2_required'
        AND p.permissive='RESTRICTIVE' AND p.cmd='ALL'
        AND 'authenticated'=ANY(p.roles)
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies p
      WHERE p.schemaname='public' AND p.tablename=target_table
        AND p.policyname='admin_global_select_aal2' AND p.cmd='SELECT'
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_trigger t
      WHERE t.tgrelid=('public.' || target_table)::regclass
        AND t.tgname=expected_trigger AND t.tgenabled='O'
    ) OR NOT has_table_privilege('authenticated','public.' || target_table,'INSERT')
       OR has_table_privilege('authenticated','public.' || target_table,'UPDATE')
       OR has_table_privilege('authenticated','public.' || target_table,'DELETE')
       OR has_table_privilege('anon','public.' || target_table,'INSERT') THEN
      RAISE EXCEPTION 'Global anamnesis follow-up prerequisite missing on %', target_table;
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.anamnesis_clarification_resolutions'::regclass
      AND tgname='anamnesis_clarification_resolutions_validate' AND tgenabled='O'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.anamnesis_clarification_requests'::regclass
      AND tgname='anamnesis_clarification_requests_validate' AND tgenabled='O'
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname='public' AND (
      (tablename='anamnesis_answer_corrections' AND policyname='anamnesis_answer_corrections_insert_admin_global_aal2') OR
      (tablename='anamnesis_clarification_requests' AND policyname='anamnesis_clarification_requests_insert_admin_global_aal2') OR
      (tablename='anamnesis_clarification_resolutions' AND policyname='anamnesis_clarification_resolutions_insert_admin_global_aal2')
    )
  ) THEN
    RAISE EXCEPTION 'Anamnesis validation triggers absent or global INSERT policies already exist';
  END IF;
END
$admin_anamnesis_followup_guard$;

CREATE POLICY anamnesis_answer_corrections_insert_admin_global_aal2
ON public.anamnesis_answer_corrections FOR INSERT TO authenticated
WITH CHECK (
  corrected_by_profile_id=(SELECT auth.uid())
  AND coalesce((SELECT auth.jwt() ->> 'aal')='aal2',false)
  AND (SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin'
  ))
  AND EXISTS (
    SELECT 1
    FROM public.anamnesis_answers a
    JOIN public.anamnesis_submissions s ON s.id=a.submission_id
    WHERE a.id=anamnesis_answer_corrections.answer_id
      AND s.submitted_at IS NOT NULL
  )
);

CREATE POLICY anamnesis_clarification_requests_insert_admin_global_aal2
ON public.anamnesis_clarification_requests FOR INSERT TO authenticated
WITH CHECK (
  requested_by_profile_id=(SELECT auth.uid())
  AND coalesce((SELECT auth.jwt() ->> 'aal')='aal2',false)
  AND (SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin'
  ))
  AND EXISTS (
    SELECT 1 FROM public.anamnesis_submissions s
    WHERE s.id=anamnesis_clarification_requests.submission_id
      AND s.submitted_at IS NOT NULL
  )
  AND (
    source_answer_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.anamnesis_answers a
      WHERE a.id=anamnesis_clarification_requests.source_answer_id
        AND a.submission_id=anamnesis_clarification_requests.submission_id
    )
  )
);

-- The existing trigger's assigned-admin check would reject the new role-only
-- path before RLS INSERT. Preserve its assigned-admin branch and add a
-- separately verified AAL2/author branch under invoker privileges.
CREATE OR REPLACE FUNCTION public.validate_anamnesis_clarification_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'pg_catalog'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.anamnesis_clarification_requests r
    JOIN public.anamnesis_submissions s ON s.id=r.submission_id
    JOIN public.user_roles ur
      ON ur.profile_id=new.resolved_by_profile_id AND ur.role='admin'
    WHERE r.id=new.clarification_request_id
      AND s.submitted_at IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.client_assignments ca
          WHERE ca.client_id=s.client_id
            AND ca.staff_profile_id=new.resolved_by_profile_id
            AND ca.ended_at IS NULL
        )
        OR (
          new.resolved_by_profile_id=(SELECT auth.uid())
          AND coalesce((SELECT auth.jwt() ->> 'aal')='aal2',false)
        )
      )
  ) THEN
    RAISE EXCEPTION 'clarification resolution requires authorized admin access'
      USING errcode='23514';
  END IF;
  RETURN new;
END
$function$;

CREATE POLICY anamnesis_clarification_resolutions_insert_admin_global_aal2
ON public.anamnesis_clarification_resolutions FOR INSERT TO authenticated
WITH CHECK (
  resolved_by_profile_id=(SELECT auth.uid())
  AND coalesce((SELECT auth.jwt() ->> 'aal')='aal2',false)
  AND (SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin'
  ))
  AND EXISTS (
    SELECT 1
    FROM public.anamnesis_clarification_requests r
    JOIN public.anamnesis_submissions s ON s.id=r.submission_id
    WHERE r.id=anamnesis_clarification_resolutions.clarification_request_id
      AND s.submitted_at IS NOT NULL
  )
);
