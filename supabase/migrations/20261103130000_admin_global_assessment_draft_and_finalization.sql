-- RBAC-ADMIN-ASSESSMENT-01: draft lifecycle for all authorized administrators.
-- Additive, no change to applied migrations. Based on the verified
-- 20261002224033 finalize_assessment_from_method_snapshot function; only its
-- assignment authorization branch is replaced. All snapshot validation,
-- minimum measurements/photos, atomic writes and immutable finalized rows stay.
-- The app server checks requireRole("admin") MFA AAL2 and exact actor before
-- invoking the service_role-only SECURITY INVOKER finalization RPC.
-- Direct authenticated mutations remain RLS-constrained to drafts only.
DO $guard$
DECLARE v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['client_assessments','assessment_measurements','assessment_files'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class c
      WHERE c.oid = ('public.'||v_table)::regclass AND c.relrowsecurity
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies p
      WHERE p.schemaname='public' AND p.tablename=v_table
        AND p.policyname='admin_mfa_aal2_required'
        AND p.permissive='RESTRICTIVE' AND p.cmd='ALL'
        AND 'authenticated'=ANY(p.roles)
    ) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_policies p
      WHERE p.schemaname='public' AND p.tablename=v_table
        AND p.policyname='admin_global_select_aal2' AND p.cmd='SELECT'
    ) THEN
      RAISE EXCEPTION 'Assessment global write blocked: missing RLS/MFA/global SELECT on %',v_table;
    END IF;
  END LOOP;

  IF NOT has_table_privilege('authenticated','public.client_assessments','INSERT')
     OR has_table_privilege('authenticated','public.client_assessments','UPDATE')
     OR NOT has_column_privilege('authenticated','public.client_assessments','assessed_at','UPDATE')
     OR NOT has_column_privilege('authenticated','public.client_assessments','assessment_kind','UPDATE')
     OR has_column_privilege('authenticated','public.client_assessments','finalized_at','UPDATE')
     OR has_column_privilege('authenticated','public.client_assessments','finalized_by_profile_id','UPDATE')
     OR has_column_privilege('authenticated','public.client_assessments','method_configuration_snapshot_set_id','UPDATE')
     OR NOT has_table_privilege('authenticated','public.assessment_measurements','INSERT')
     OR NOT has_table_privilege('authenticated','public.assessment_measurements','UPDATE')
     OR NOT has_table_privilege('authenticated','public.assessment_measurements','DELETE')
     OR NOT has_table_privilege('authenticated','public.assessment_files','INSERT')
     OR NOT has_table_privilege('authenticated','public.assessment_files','DELETE')
     OR has_table_privilege('anon','public.client_assessments','INSERT')
     OR has_table_privilege('anon','public.client_assessments','UPDATE') THEN
    RAISE EXCEPTION 'Assessment global write blocked: unexpected SQL grants';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid='public.client_assessments'::regclass
      AND tgname='client_assessments_lifecycle_guard' AND tgenabled='O'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    WHERE p.oid='public.finalize_assessment_from_method_snapshot(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb)'::regprocedure
      AND NOT p.prosecdef
  ) OR has_function_privilege(
    'authenticated',
    'public.finalize_assessment_from_method_snapshot(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb)',
    'EXECUTE'
  ) OR NOT has_function_privilege(
    'service_role',
    'public.finalize_assessment_from_method_snapshot(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb)',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Assessment global write blocked: immutable trigger/RPC permissions missing';
  END IF;
END
$guard$;

-- Do not grant table-wide UPDATE. The existing snapshot consumer hardening
-- deliberately grants UPDATE only to assessed_at and assessment_kind,
-- and denies direct writes to finalized_at/actor/snapshot. Preserve that.
-- Prevent ALL direct browser/session finalization or forged snapshot links,
-- including via the older assignment-based permissive UPDATE policy.
-- Service-role snapshot RPC still works because it bypasses authenticated RLS.
CREATE POLICY assessment_session_update_draft_only
  ON public.client_assessments
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (finalized_at IS NULL)
  WITH CHECK (
    finalized_at IS NULL
    AND finalized_by_profile_id IS NULL
    AND method_configuration_snapshot_set_id IS NULL
  );

CREATE POLICY client_assessments_insert_admin_global_draft_aal2
  ON public.client_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by_profile_id=(SELECT auth.uid())
    AND finalized_at IS NULL
    AND finalized_by_profile_id IS NULL
    AND method_configuration_snapshot_set_id IS NULL
    AND assessment_kind IN ('fortnightly','monthly')
    AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS(SELECT 1 FROM public.user_roles r
       WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
  );

CREATE POLICY client_assessments_update_admin_global_draft_aal2
  ON public.client_assessments
  FOR UPDATE TO authenticated
  USING (
    finalized_at IS NULL
    AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS(SELECT 1 FROM public.user_roles r
       WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
  )
  WITH CHECK (
    finalized_at IS NULL
    AND finalized_by_profile_id IS NULL
    AND method_configuration_snapshot_set_id IS NULL
    AND assessment_kind IN ('fortnightly','monthly')
    AND coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS(SELECT 1 FROM public.user_roles r
       WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
  );

CREATE POLICY assessment_measurements_insert_admin_global_draft_aal2
  ON public.assessment_measurements
  FOR INSERT TO authenticated
  WITH CHECK (
    coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS(SELECT 1 FROM public.user_roles r
       WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
    AND EXISTS(
      SELECT 1 FROM public.client_assessments a
      WHERE a.id=assessment_measurements.assessment_id
        AND a.finalized_at IS NULL
    )
  );

CREATE POLICY assessment_measurements_update_admin_global_draft_aal2
  ON public.assessment_measurements
  FOR UPDATE TO authenticated
  USING (
    coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS(SELECT 1 FROM public.user_roles r
       WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
    AND EXISTS(
      SELECT 1 FROM public.client_assessments a
      WHERE a.id=assessment_measurements.assessment_id
        AND a.finalized_at IS NULL
    )
  )
  WITH CHECK (
    coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS(SELECT 1 FROM public.user_roles r
       WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
    AND EXISTS(
      SELECT 1 FROM public.client_assessments a
      WHERE a.id=assessment_measurements.assessment_id
        AND a.finalized_at IS NULL
    )
  );

CREATE POLICY assessment_measurements_delete_admin_global_draft_aal2
  ON public.assessment_measurements
  FOR DELETE TO authenticated
  USING (
    coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS(SELECT 1 FROM public.user_roles r
       WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
    AND EXISTS(
      SELECT 1 FROM public.client_assessments a
      WHERE a.id=assessment_measurements.assessment_id
        AND a.finalized_at IS NULL
    )
  );

CREATE POLICY assessment_files_insert_admin_global_draft_aal2
  ON public.assessment_files
  FOR INSERT TO authenticated
  WITH CHECK (
    coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS(SELECT 1 FROM public.user_roles r
       WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
    AND EXISTS(
      SELECT 1 FROM public.client_assessments a
      WHERE a.id=assessment_files.assessment_id
        AND a.client_id=assessment_files.client_id
        AND a.finalized_at IS NULL
    )
    AND EXISTS(
      SELECT 1 FROM public.client_files f
      WHERE f.id=assessment_files.client_file_id
        AND f.client_id=assessment_files.client_id
        AND f.file_kind='photo'
    )
  );

CREATE POLICY assessment_files_delete_admin_global_draft_aal2
  ON public.assessment_files
  FOR DELETE TO authenticated
  USING (
    coalesce((SELECT auth.jwt()->>'aal')='aal2',false)
    AND (SELECT EXISTS(SELECT 1 FROM public.user_roles r
       WHERE r.profile_id=(SELECT auth.uid()) AND r.role='admin'))
    AND EXISTS(
      SELECT 1 FROM public.client_assessments a
      WHERE a.id=assessment_files.assessment_id
        AND a.client_id=assessment_files.client_id
        AND a.finalized_at IS NULL
    )
  );

-- Rebuild the existing SECURITY INVOKER function with the one authorization
-- branch changed. Never broaden EXECUTE to authenticated/anon.

create or replace function public.finalize_assessment_from_method_snapshot(
  p_assessment_id uuid,
  p_finalized_by_profile_id uuid,
  p_catalog_template_version_id uuid,
  p_catalog_configuration jsonb,
  p_catalog_result_values jsonb,
  p_definition_template_version_id uuid,
  p_definition_configuration jsonb,
  p_definition_result_values jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_assessment public.client_assessments%rowtype;
  v_catalog_template_id uuid;
  v_catalog_template_key text;
  v_catalog_stored_configuration jsonb;
  v_definition_template_id uuid;
  v_definition_template_key text;
  v_definition_stored_configuration jsonb;
  v_snapshot_set_id uuid;
  v_catalog_historical_code text;
  v_catalog_semantic_key text;
  v_definition_kind_key text;
  v_can_finalize boolean;
  v_minimum_photo_count integer;
begin
  select *
  into v_assessment
  from public.client_assessments
  where id = p_assessment_id
  for update;

  if not found then
    raise exception 'assessment not found'
      using errcode = '22023';
  end if;

  if v_assessment.finalized_at is not null then
    raise exception 'assessment is already finalized'
      using errcode = '55000';
  end if;

  if v_assessment.method_configuration_snapshot_set_id is not null then
    raise exception 'draft assessment already has a method snapshot'
      using errcode = '55000';
  end if;

  -- The caller is a verified AAL2 administrator in the server-only
  -- boundary. This service-role-only RPC verifies the relational role again;
  -- a historical/ended assignment must not block authorized finalization.
  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = p_finalized_by_profile_id
      and ur.role = 'admin'
  ) then
    raise exception 'administrator role required for assessment finalization'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_catalog_configuration) is distinct from 'object'
     or jsonb_typeof(p_catalog_result_values) is distinct from 'object'
     or jsonb_typeof(p_definition_configuration) is distinct from 'object'
     or jsonb_typeof(p_definition_result_values) is distinct from 'object' then
    raise exception 'assessment snapshot payloads must be objects'
      using errcode = '22023';
  end if;

  select v.template_id, t.template_key, v.configuration
  into
    v_catalog_template_id,
    v_catalog_template_key,
    v_catalog_stored_configuration
  from public.method_configuration_versions v
  join public.method_configuration_templates t on t.id = v.template_id
  where v.id = p_catalog_template_version_id
    and v.activated_at is not null
    and v.retired_at is null;

  if not found
     or v_catalog_template_key <> 'evaluation.assessment_kind_catalog' then
    raise exception 'active assessment kind catalog version is required'
      using errcode = '22023';
  end if;

  select v.template_id, t.template_key, v.configuration
  into
    v_definition_template_id,
    v_definition_template_key,
    v_definition_stored_configuration
  from public.method_configuration_versions v
  join public.method_configuration_templates t on t.id = v.template_id
  where v.id = p_definition_template_version_id
    and v.activated_at is not null
    and v.retired_at is null;

  if not found
     or v_definition_template_key not in (
       'evaluation.assessment_definition.basic',
       'evaluation.assessment_definition.complete'
     ) then
    raise exception 'active assessment definition version is required'
      using errcode = '22023';
  end if;

  if p_catalog_configuration is distinct from v_catalog_stored_configuration then
    raise exception 'catalog snapshot configuration must match active version'
      using errcode = '22023';
  end if;

  if p_definition_configuration is distinct from v_definition_stored_configuration then
    raise exception 'definition snapshot configuration must match active version'
      using errcode = '22023';
  end if;

  v_catalog_historical_code :=
    p_catalog_result_values #>> '{historical_code}';
  v_catalog_semantic_key :=
    p_catalog_result_values #>> '{semantic_key}';
  v_definition_kind_key :=
    p_definition_result_values #>> '{kind_key}';

  begin
    v_can_finalize :=
      (p_definition_result_values #>> '{can_finalize}')::boolean;
  exception
    when others then
      raise exception 'assessment definition result must include boolean can_finalize'
        using errcode = '22023';
  end;

  if v_catalog_historical_code is distinct from v_assessment.assessment_kind then
    raise exception 'assessment kind does not match catalog snapshot result'
      using errcode = '22023';
  end if;

  if v_catalog_semantic_key is null
     or v_definition_kind_key is distinct from v_catalog_semantic_key then
    raise exception 'assessment definition does not match catalog semantic kind'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(v_catalog_stored_configuration->'entries') entry
    where entry->>'historicalCode' = v_catalog_historical_code
      and entry->>'semanticKey' = v_catalog_semantic_key
  ) then
    raise exception 'assessment catalog result is not present in active configuration'
      using errcode = '22023';
  end if;

  if v_definition_stored_configuration->>'kindKey'
     is distinct from v_definition_kind_key then
    raise exception 'assessment definition result kind does not match active configuration'
      using errcode = '22023';
  end if;

  if v_definition_template_key is distinct from
       'evaluation.assessment_definition.' || v_catalog_semantic_key then
    raise exception 'assessment definition template does not match semantic kind'
      using errcode = '22023';
  end if;

  if v_can_finalize is distinct from true then
    raise exception 'assessment configuration does not permit finalization'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_definition_stored_configuration->'requiredMeasurements')
     is distinct from 'array' then
    raise exception 'active assessment definition must contain requiredMeasurements'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(
      v_definition_stored_configuration->'requiredMeasurements'
    ) requirement
    where not exists (
      select 1
      from public.assessment_measurements measurement
      where measurement.assessment_id = v_assessment.id
        and measurement.measurement_key = requirement->>'key'
    )
  ) then
    raise exception 'assessment is missing required measurements'
      using errcode = '22023';
  end if;

  if jsonb_typeof(v_definition_stored_configuration->'photoRequirement') = 'object' then
    begin
      v_minimum_photo_count :=
        (v_definition_stored_configuration #>> '{photoRequirement,minimumCount}')::integer;
    exception
      when others then
        raise exception 'assessment photo requirement must contain an integer minimumCount'
          using errcode = '22023';
    end;

    if v_minimum_photo_count < 1 then
      raise exception 'assessment photo minimum must be positive'
        using errcode = '22023';
    end if;

    if (
      select count(*)
      from public.assessment_files assessment_file
      where assessment_file.assessment_id = v_assessment.id
    ) < v_minimum_photo_count then
      raise exception 'assessment is missing required photos'
        using errcode = '22023';
    end if;
  end if;

  insert into public.method_configuration_snapshot_sets (
    client_id,
    engine_contract_version,
    created_by_profile_id
  )
  values (
    v_assessment.client_id,
    1,
    p_finalized_by_profile_id
  )
  returning id into v_snapshot_set_id;

  insert into public.method_configuration_snapshots (
    snapshot_set_id,
    client_id,
    template_id,
    template_version_id,
    template_key,
    input_values,
    resolved_configuration,
    result_values
  )
  values
    (
      v_snapshot_set_id,
      v_assessment.client_id,
      v_catalog_template_id,
      p_catalog_template_version_id,
      v_catalog_template_key,
      jsonb_build_object(
        'assessment_kind',
        v_assessment.assessment_kind
      ),
      p_catalog_configuration,
      p_catalog_result_values
    ),
    (
      v_snapshot_set_id,
      v_assessment.client_id,
      v_definition_template_id,
      p_definition_template_version_id,
      v_definition_template_key,
      jsonb_build_object(
        'assessment_id',
        v_assessment.id
      ),
      p_definition_configuration,
      p_definition_result_values
    );

  update public.client_assessments
  set
    method_configuration_snapshot_set_id = v_snapshot_set_id,
    finalized_by_profile_id = p_finalized_by_profile_id,
    finalized_at = now()
  where id = v_assessment.id
    and finalized_at is null;

  if not found then
    raise exception 'assessment finalization lost its draft state'
      using errcode = '55000';
  end if;

  return v_snapshot_set_id;
end;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_assessment_from_method_snapshot(
  uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_assessment_from_method_snapshot(
  uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb
) TO service_role;
