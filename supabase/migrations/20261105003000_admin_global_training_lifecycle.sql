-- J5-ADMIN-GLOBAL-TRAINING-01. New migration only; never alter applied history.
-- Admin role AAL2 works without assignments. Client-scoped invariants stay.
DO $guard$
DECLARE name text;
BEGIN
  FOREACH name IN ARRAY ARRAY['client_training_requests','client_training_plans',
    'client_training_plan_versions','client_training_plan_items'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_class c
       WHERE c.oid=('public.'||name)::regclass AND c.relrowsecurity)
    OR NOT EXISTS (SELECT 1 FROM pg_policies p WHERE
       p.schemaname='public' AND p.tablename=name
       AND p.policyname='admin_mfa_aal2_required'
       AND p.permissive='RESTRICTIVE' AND p.cmd='ALL')
    OR NOT EXISTS (SELECT 1 FROM pg_policies p WHERE
       p.schemaname='public' AND p.tablename=name
       AND p.policyname='admin_global_select_aal2' AND p.cmd='SELECT')
    THEN RAISE EXCEPTION 'J5 missing required RLS/MFA/global SELECT on %',name;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE
      oid='public.create_client_training_plan_draft(uuid,text,text)'::regprocedure
      AND NOT prosecdef)
  OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE
      tgrelid='public.client_training_plan_versions'::regclass
      AND tgname='client_training_plan_versions_lifecycle' AND tgenabled='O')
  OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE
      tgrelid='public.client_training_plan_items'::regclass
      AND tgname='client_training_plan_items_mutation_guard' AND tgenabled='O')
  OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE
      tgrelid='public.client_training_requests'::regclass
      AND tgname='client_training_requests_immutable' AND tgenabled='O')
  THEN RAISE EXCEPTION 'J5 immutable lifecycle prerequisites missing';
  END IF;
END $guard$;

CREATE POLICY client_training_requests_insert_admin_global_aal2
ON public.client_training_requests FOR INSERT TO authenticated WITH CHECK (
  recorded_by_profile_id=(SELECT auth.uid())
  AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
  AND EXISTS (SELECT 1 FROM public.user_roles ur
      WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin')
  AND EXISTS (SELECT 1 FROM public.clients c
      WHERE c.id=client_training_requests.client_id)
);

CREATE POLICY client_training_plans_insert_admin_global_after_request_aal2
ON public.client_training_plans FOR INSERT TO authenticated WITH CHECK (
  coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
  AND EXISTS (SELECT 1 FROM public.user_roles ur
      WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin')
  AND EXISTS (SELECT 1 FROM public.client_training_requests r
      WHERE r.client_id=client_training_plans.client_id)
);

CREATE POLICY client_training_plan_versions_insert_admin_global_aal2
ON public.client_training_plan_versions FOR INSERT TO authenticated WITH CHECK (
  created_by_profile_id=(SELECT auth.uid())
  AND reviewed_at IS NULL AND reviewed_by_profile_id IS NULL
  AND published_at IS NULL AND published_by_profile_id IS NULL
  AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
  AND EXISTS (SELECT 1 FROM public.user_roles ur
      WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin')
  AND EXISTS (SELECT 1 FROM public.client_training_plans p
      WHERE p.id=client_training_plan_versions.training_plan_id)
);

CREATE POLICY client_training_plan_versions_update_admin_global_aal2
ON public.client_training_plan_versions FOR UPDATE TO authenticated
USING (
  published_at IS NULL
  AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
  AND EXISTS (SELECT 1 FROM public.user_roles ur
      WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin')
)
WITH CHECK (
  -- The reviewer can differ from the publisher. The transition trigger below
  -- binds the correct actor to EACH action without rewriting old authorship.
  (published_by_profile_id IS NULL OR published_by_profile_id=(SELECT auth.uid()))
  AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
  AND EXISTS (SELECT 1 FROM public.user_roles ur
      WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin')
);

-- This restriction also applies to legacy assignment-based permissive UPDATE.
-- An inactive or no-Profile Client may have an internally reviewed draft only.
CREATE POLICY client_training_versions_publish_to_active_client_only
ON public.client_training_plan_versions AS RESTRICTIVE FOR UPDATE TO authenticated
WITH CHECK (
  published_at IS NULL
  OR EXISTS (
    SELECT 1 FROM public.client_training_plans p
    JOIN public.clients c ON c.id=p.client_id
    WHERE p.id=client_training_plan_versions.training_plan_id
      AND c.status='active' AND c.profile_id IS NOT NULL
  )
);

CREATE POLICY client_training_plan_items_insert_admin_global_draft_aal2
ON public.client_training_plan_items FOR INSERT TO authenticated WITH CHECK (
  coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
  AND EXISTS (SELECT 1 FROM public.user_roles ur
      WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin')
  AND EXISTS (SELECT 1 FROM public.client_training_plan_versions v
      WHERE v.id=client_training_plan_items.training_plan_version_id
        AND v.reviewed_at IS NULL AND v.published_at IS NULL)
);
CREATE POLICY client_training_plan_items_update_admin_global_draft_aal2
ON public.client_training_plan_items FOR UPDATE TO authenticated
USING (
  coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
  AND EXISTS (SELECT 1 FROM public.user_roles ur
      WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin')
  AND EXISTS (SELECT 1 FROM public.client_training_plan_versions v
      WHERE v.id=client_training_plan_items.training_plan_version_id
        AND v.reviewed_at IS NULL AND v.published_at IS NULL)
)
WITH CHECK (
  coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
  AND EXISTS (SELECT 1 FROM public.user_roles ur
      WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin')
  AND EXISTS (SELECT 1 FROM public.client_training_plan_versions v
      WHERE v.id=client_training_plan_items.training_plan_version_id
        AND v.reviewed_at IS NULL AND v.published_at IS NULL)
);
CREATE POLICY client_training_plan_items_delete_admin_global_draft_aal2
ON public.client_training_plan_items FOR DELETE TO authenticated USING (
  coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
  AND EXISTS (SELECT 1 FROM public.user_roles ur
      WHERE ur.profile_id=(SELECT auth.uid()) AND ur.role='admin')
  AND EXISTS (SELECT 1 FROM public.client_training_plan_versions v
      WHERE v.id=client_training_plan_items.training_plan_version_id
        AND v.reviewed_at IS NULL AND v.published_at IS NULL)
);

-- Every authorized administrator may finish another administrator's reviewed
-- plan, without forging who reviewed it or combining review and publication.
-- Actor checks apply to real authenticated Data API sessions; trusted
-- migration/test seed owners lack an auth.uid(), but must still respect the
-- no-combined-transition invariant. No browser role receives privileged access.
-- Existing immutable-version and item triggers remain installed and active.
CREATE FUNCTION public.enforce_training_review_publish_actor()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog
AS $actor$
BEGIN
  IF OLD.reviewed_at IS NULL AND NEW.reviewed_at IS NOT NULL THEN
    IF NEW.published_at IS NOT NULL THEN
      RAISE EXCEPTION 'review and publication are distinct human decisions'
        USING errcode='55000';
    END IF;
    IF current_user = 'authenticated'
       AND NEW.reviewed_by_profile_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'review actor must match verified identity'
        USING errcode='42501';
    END IF;
  END IF;
  IF OLD.published_at IS NULL AND NEW.published_at IS NOT NULL
      AND current_user = 'authenticated'
      AND NEW.published_by_profile_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'publication actor must match verified identity'
      USING errcode='42501';
  END IF;
  RETURN NEW;
END
$actor$;

CREATE TRIGGER client_training_review_publish_actor
BEFORE UPDATE ON public.client_training_plan_versions FOR EACH ROW
EXECUTE FUNCTION public.enforce_training_review_publish_actor();

REVOKE ALL ON FUNCTION public.enforce_training_review_publish_actor()
FROM PUBLIC, anon, authenticated;

-- Keep concurrency lock, strict prior request and one-open-draft contract.
-- SECURITY INVOKER remains mandatory. Replace ONLY obsolete assignment gate.
create or replace function public.create_client_training_plan_draft(
  p_client_id uuid,
  p_title text,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_plan_id uuid;
  v_version_number integer;
  v_version_id uuid;
begin
  if p_title is null or char_length(trim(p_title)) not between 1 and 160 then
    raise exception 'training plan title is required'
      using errcode = '22023';
  end if;

  if p_notes is not null
     and (char_length(trim(p_notes)) = 0 or char_length(trim(p_notes)) > 4000) then
    raise exception 'training plan notes are invalid'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.user_roles ur
    join public.clients c on c.id = p_client_id
    where ur.profile_id = (select auth.uid()) and ur.role = 'admin'
  ) then
    raise exception 'authorized admin and client are required'
      using errcode = '42501';
  end if;

  if not (select public.current_user_admin_mfa_satisfied()) then
    raise exception 'admin MFA AAL2 is required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.client_training_requests r
    where r.client_id = p_client_id
  ) then
    raise exception 'training request is required before prescription'
      using errcode = '23514';
  end if;

  -- Serialize drafts for the same client without acquiring a row-level
  -- lock on client_training_plans, which requires UPDATE on that table.
  -- A transaction-scoped advisory lock is released automatically on commit
  -- or rollback; possible hash collisions only serialize extra clients.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('client_training_plan_draft'),
    pg_catalog.hashtext(p_client_id::text)
  );

  insert into public.client_training_plans (client_id)
  values (p_client_id)
  on conflict (client_id) do nothing;

  select p.id
  into v_plan_id
  from public.client_training_plans p
  where p.client_id = p_client_id;

  if exists (
    select 1
    from public.client_training_plan_versions v
    where v.training_plan_id = v_plan_id
      and v.published_at is null
  ) then
    raise exception 'an open training plan draft already exists'
      using errcode = '23505';
  end if;

  select coalesce(max(v.version_number), 0) + 1
  into v_version_number
  from public.client_training_plan_versions v
  where v.training_plan_id = v_plan_id;

  insert into public.client_training_plan_versions (
    training_plan_id,
    version_number,
    title,
    notes,
    created_by_profile_id
  )
  values (
    v_plan_id,
    v_version_number,
    trim(p_title),
    nullif(trim(p_notes), ''),
    (select auth.uid())
  )
  returning id into v_version_id;

  return v_version_id;
end
$$;

