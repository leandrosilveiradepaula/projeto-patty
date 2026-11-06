-- MIGR-HIST-11B. Original historical assessment evidence, not a current
-- client_assessment or client-submitted value. Separate dated snapshots.
-- Requires the private original XLSX bucket introduced by 09A.
CREATE TABLE public.historical_assessment_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  source_id text NOT NULL CHECK (source_id ~ '^source_[0-9]{4}$'),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  layout_signature_sha256 text NOT NULL CHECK (layout_signature_sha256 ~ '^[a-f0-9]{64}$'),
  assessed_on date NOT NULL,
  proposal_sha256 text NOT NULL CHECK (proposal_sha256 ~ '^[a-f0-9]{64}$'),
  storage_path text NOT NULL CHECK (
    storage_path = batch_id::text || '/' || source_id || '/' || source_sha256 || '.xlsx'
  ),
  original_measurements jsonb NOT NULL CHECK (
    jsonb_typeof(original_measurements) = 'array'
    AND jsonb_array_length(original_measurements) BETWEEN 1 AND 40
  ),
  mapping_snapshot jsonb NOT NULL CHECK (
    jsonb_typeof(mapping_snapshot) = 'array'
    AND jsonb_array_length(mapping_snapshot) = jsonb_array_length(original_measurements)
  ),
  confirmed_identity boolean NOT NULL CHECK (confirmed_identity IS TRUE),
  confirmed_mapping boolean NOT NULL CHECK (confirmed_mapping IS TRUE),
  confirmed_custody boolean NOT NULL CHECK (confirmed_custody IS TRUE),
  imported_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'staged_private' CHECK (state = 'staged_private'),
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, source_id, assessed_on),
  FOREIGN KEY (batch_id, source_id)
    REFERENCES public.historical_initial_load_sources(batch_id, source_id) ON DELETE RESTRICT
);
CREATE INDEX historical_assessment_imports_client_idx
  ON public.historical_assessment_imports(client_id, assessed_on DESC, imported_at DESC);
ALTER TABLE public.historical_assessment_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.historical_assessment_imports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.historical_assessment_imports TO authenticated;
GRANT SELECT, INSERT ON public.historical_assessment_imports TO service_role;
GRANT SELECT ON public.historical_initial_load_sources TO service_role;
GRANT SELECT ON storage.objects TO service_role;
CREATE POLICY historical_assessment_imports_admin_read_aal2
  ON public.historical_assessment_imports FOR SELECT TO authenticated
  USING (
    coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
    AND EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id = (SELECT auth.uid()) AND r.role = 'admin'
    )
  );
-- No browser write, no UPDATE/DELETE and no client visibility.
CREATE FUNCTION public.stage_historical_assessment_source(
  p_batch_id uuid, p_source_id text, p_client_id uuid,
  p_source_sha256 text, p_layout_signature_sha256 text,
  p_assessed_on date, p_proposal_sha256 text, p_storage_path text,
  p_mapping_snapshot jsonb, p_original_measurements jsonb,
  p_actor_profile_id uuid, p_confirmed_identity boolean,
  p_confirmed_mapping boolean, p_confirmed_custody boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $function$
DECLARE
  v_source record;
  v_found record;
  v_measurement jsonb;
  v_map jsonb;
  v_key text;
  v_cells text[] := ARRAY[]::text[];
  v_keys text[] := ARRAY[]::text[];
  v_index integer;
  v_id uuid;
BEGIN
  IF current_user <> 'service_role'
     OR p_actor_profile_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.user_roles r
       WHERE r.profile_id=p_actor_profile_id AND r.role='admin')
     OR p_confirmed_identity IS DISTINCT FROM true
     OR p_confirmed_mapping IS DISTINCT FROM true
     OR p_confirmed_custody IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Verified administrator and independent decisions required'
       USING ERRCODE='42501'; END IF;
  IF p_batch_id IS NULL OR p_client_id IS NULL OR p_assessed_on IS NULL
     OR p_source_id IS NULL OR p_source_id !~ '^source_[0-9]{4}$'
     OR p_source_sha256 IS NULL OR p_source_sha256 !~ '^[a-f0-9]{64}$'
     OR p_layout_signature_sha256 IS NULL
     OR p_layout_signature_sha256 !~ '^[a-f0-9]{64}$'
     OR p_proposal_sha256 IS NULL OR p_proposal_sha256 !~ '^[a-f0-9]{64}$'
     OR p_storage_path IS DISTINCT FROM
        (p_batch_id::text || '/' || p_source_id || '/' || p_source_sha256 || '.xlsx')
     OR p_original_measurements IS NULL
     OR jsonb_typeof(p_original_measurements) IS DISTINCT FROM 'array'
     OR p_mapping_snapshot IS NULL OR jsonb_typeof(p_mapping_snapshot) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_original_measurements) NOT BETWEEN 1 AND 40
     OR jsonb_array_length(p_mapping_snapshot) <> jsonb_array_length(p_original_measurements)
  THEN RAISE EXCEPTION 'Invalid historical assessment evidence'
       USING ERRCODE='22023'; END IF;

  SELECT kind,state,proposed_client_id,source_sha256,layout_signature_sha256
    INTO v_source FROM public.historical_initial_load_sources
    WHERE batch_id=p_batch_id AND source_id=p_source_id;
  IF NOT FOUND OR v_source.kind <> 'xlsx'
     OR v_source.state <> 'pending_backend_identity_verification'
     OR v_source.proposed_client_id IS DISTINCT FROM p_client_id
     OR v_source.source_sha256 IS DISTINCT FROM p_source_sha256
     OR v_source.layout_signature_sha256 IS DISTINCT FROM p_layout_signature_sha256
  THEN RAISE EXCEPTION 'Historical source/client association not verified'
       USING ERRCODE='23503'; END IF;

  -- Verify all mapping and numeric representations inside the transaction.
  -- The original bytes and numeric interpretations are NOT silently converted
  -- to approved clinical measurements.
  FOR v_index IN 0..jsonb_array_length(p_original_measurements)-1 LOOP
    v_measurement := p_original_measurements->v_index;
    v_map := p_mapping_snapshot->v_index;
    IF jsonb_typeof(v_measurement) IS DISTINCT FROM 'object'
      OR jsonb_typeof(v_map) IS DISTINCT FROM 'object'
      OR (SELECT count(*) FROM jsonb_object_keys(v_measurement)) <> 8
      OR (SELECT count(*) FROM jsonb_object_keys(v_map)) <> 5
      OR NOT (v_measurement ?& ARRAY['sheet_index','column_index','row_index',
        'measurement_key','unit','raw_type','raw_value','numeric_value'])
      OR NOT (v_map ?& ARRAY['sheet_index','column_index','row_index','measurement_key','unit'])
      OR (v_measurement - 'raw_type' - 'raw_value' - 'numeric_value') <> v_map
      OR jsonb_typeof(v_map->'sheet_index') <> 'number'
      OR jsonb_typeof(v_map->'column_index') <> 'number'
      OR jsonb_typeof(v_map->'row_index') <> 'number'
      OR (v_map->>'sheet_index') !~ '^(0|[1-9][0-9]?)$'
      OR (v_map->>'column_index') !~ '^[1-9][0-9]{0,4}$'
      OR (v_map->>'row_index') !~ '^[1-9][0-9]{0,6}$'
      OR (v_map->>'sheet_index')::int >= 64
      OR (v_map->>'column_index')::int > 16384
      OR (v_map->>'row_index')::int > 9999999
      OR jsonb_typeof(v_map->'measurement_key') <> 'string'
      OR (v_map->>'measurement_key') !~ '^[a-z][a-z0-9_]{1,119}$'
      OR jsonb_typeof(v_map->'unit') <> 'string'
      OR (v_map->>'unit') !~ '^[A-Za-z][A-Za-z0-9_%/.-]{0,39}$'
      OR (v_measurement->>'raw_type') NOT IN ('n','s','str','inlineStr')
      OR jsonb_typeof(v_measurement->'raw_value') <> 'string'
      OR char_length(v_measurement->>'raw_value') NOT BETWEEN 1 AND 100
      OR (v_measurement->>'raw_value') !~ '^[+-]?([0-9]+([.,][0-9]+)?|[.,][0-9]+)$'
      OR jsonb_typeof(v_measurement->'numeric_value') <> 'string'
      OR (v_measurement->>'numeric_value') !~ '^[+-]?([0-9]+([.][0-9]+)?|[.][0-9]+)$'
    THEN RAISE EXCEPTION 'Invalid original measurement snapshot'
         USING ERRCODE='22023'; END IF;
    IF (replace(v_measurement->>'raw_value', ',', '.'))::numeric
      <> (v_measurement->>'numeric_value')::numeric
    THEN RAISE EXCEPTION 'Numeric interpretation does not match original'
         USING ERRCODE='22023'; END IF;
    v_key := (v_map->>'sheet_index') || ':' || (v_map->>'column_index')
      || ':' || (v_map->>'row_index');
    IF v_key = ANY(v_cells) OR (v_map->>'measurement_key') = ANY(v_keys)
    THEN RAISE EXCEPTION 'Duplicate measurement/cell' USING ERRCODE='23505'; END IF;
    v_cells := array_append(v_cells,v_key);
    v_keys := array_append(v_keys,v_map->>'measurement_key');
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM storage.objects s
    WHERE s.bucket_id='historical-originals-private' AND s.name=p_storage_path
  ) THEN RAISE EXCEPTION 'Historical source original absent' USING ERRCODE='23503'; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_batch_id::text || ':' || p_source_id || ':' || p_assessed_on::text)
  );
  SELECT * INTO v_found FROM public.historical_assessment_imports
    WHERE batch_id=p_batch_id AND source_id=p_source_id AND assessed_on=p_assessed_on;
  IF FOUND THEN
    IF v_found.client_id=p_client_id
      AND v_found.source_sha256=p_source_sha256
      AND v_found.layout_signature_sha256=p_layout_signature_sha256
      AND v_found.proposal_sha256=p_proposal_sha256
      AND v_found.storage_path=p_storage_path
      AND v_found.mapping_snapshot=p_mapping_snapshot
      AND v_found.original_measurements=p_original_measurements
    THEN RETURN v_found.id; END IF;
    RAISE EXCEPTION 'Conflicting historical assessment replay' USING ERRCODE='23505';
  END IF;
  INSERT INTO public.historical_assessment_imports (
    batch_id,source_id,client_id,source_sha256,layout_signature_sha256,
    assessed_on,proposal_sha256,storage_path,mapping_snapshot,
    original_measurements,imported_by_profile_id,
    confirmed_identity,confirmed_mapping,confirmed_custody
  ) VALUES (
    p_batch_id,p_source_id,p_client_id,p_source_sha256,p_layout_signature_sha256,
    p_assessed_on,p_proposal_sha256,p_storage_path,p_mapping_snapshot,
    p_original_measurements,p_actor_profile_id,true,true,true
  ) RETURNING id INTO v_id;
  RETURN v_id;
END $function$;
REVOKE ALL ON FUNCTION public.stage_historical_assessment_source(
  uuid,text,uuid,text,text,date,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stage_historical_assessment_source(
  uuid,text,uuid,text,text,date,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean
) TO service_role;
