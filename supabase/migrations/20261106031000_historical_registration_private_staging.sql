-- MIGR-HIST-12A: historical contact fields are NOT current registration,
-- login credentials, legal consent, client activation, or an Anamnesis.
-- Depends on the private-originals bucket from MIGR-HIST-09A.
CREATE TABLE public.historical_registration_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  source_id text NOT NULL CHECK (source_id ~ '^source_[0-9]{4}$'),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  layout_signature_sha256 text NOT NULL CHECK (layout_signature_sha256 ~ '^[a-f0-9]{64}$'),
  proposal_sha256 text NOT NULL CHECK (proposal_sha256 ~ '^[a-f0-9]{64}$'),
  storage_path text NOT NULL CHECK (
    storage_path = batch_id::text || '/' || source_id || '/' || source_sha256 || '.xlsx'
  ),
  mapping_snapshot jsonb NOT NULL,
  original_fields jsonb NOT NULL,
  confirmed_identity boolean NOT NULL CHECK (confirmed_identity IS TRUE),
  confirmed_mapping boolean NOT NULL CHECK (confirmed_mapping IS TRUE),
  confirmed_custody boolean NOT NULL CHECK (confirmed_custody IS TRUE),
  imported_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'staged_private' CHECK (state = 'staged_private'),
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(batch_id, source_id),
  FOREIGN KEY(batch_id, source_id)
    REFERENCES public.historical_initial_load_sources(batch_id, source_id) ON DELETE RESTRICT,
  CHECK (
    jsonb_typeof(original_fields) = 'array'
    AND jsonb_array_length(original_fields) BETWEEN 1 AND 4
    AND jsonb_typeof(mapping_snapshot) = 'array'
    AND jsonb_array_length(mapping_snapshot) = jsonb_array_length(original_fields)
  )
);
CREATE INDEX historical_registration_imports_client_idx
 ON public.historical_registration_imports(client_id, imported_at DESC);
ALTER TABLE public.historical_registration_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.historical_registration_imports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.historical_registration_imports TO authenticated;
GRANT SELECT, INSERT ON public.historical_registration_imports TO service_role;
GRANT SELECT ON public.historical_initial_load_sources TO service_role;
GRANT SELECT ON storage.objects TO service_role;
CREATE POLICY historical_registration_imports_admin_read_aal2
 ON public.historical_registration_imports FOR SELECT TO authenticated
 USING (
   coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
   AND EXISTS (
     SELECT 1 FROM public.user_roles r WHERE r.profile_id = (SELECT auth.uid())
       AND r.role='admin'
   )
 );

-- An invoker-only atomic insert with narrow privileges, never a client update.
CREATE FUNCTION public.stage_historical_registration_source(
 p_batch_id uuid, p_source_id text, p_client_id uuid,
 p_source_sha256 text, p_layout_signature_sha256 text,
 p_proposal_sha256 text, p_storage_path text,
 p_mapping_snapshot jsonb, p_original_fields jsonb,
 p_actor_profile_id uuid, p_confirmed_identity boolean,
 p_confirmed_mapping boolean, p_confirmed_custody boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $function$
DECLARE
 v_source record;
 v_prior record;
 v_original jsonb;
 v_map jsonb;
 v_cell text;
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
 THEN RAISE EXCEPTION 'Verified administrator and three attestations required'
    USING ERRCODE='42501'; END IF;
 IF p_batch_id IS NULL OR p_client_id IS NULL
    OR p_source_id IS NULL OR p_source_id !~ '^source_[0-9]{4}$'
    OR p_source_sha256 IS NULL OR p_source_sha256 !~ '^[a-f0-9]{64}$'
    OR p_layout_signature_sha256 IS NULL
    OR p_layout_signature_sha256 !~ '^[a-f0-9]{64}$'
    OR p_proposal_sha256 IS NULL OR p_proposal_sha256 !~ '^[a-f0-9]{64}$'
    OR p_storage_path IS DISTINCT FROM
       (p_batch_id::text || '/' || p_source_id || '/' || p_source_sha256 || '.xlsx')
    OR jsonb_typeof(p_mapping_snapshot) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_original_fields) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_original_fields) NOT BETWEEN 1 AND 4
    OR jsonb_array_length(p_mapping_snapshot) <> jsonb_array_length(p_original_fields)
 THEN RAISE EXCEPTION 'Invalid historical registration payload' USING ERRCODE='22023'; END IF;

 SELECT kind,state,proposed_client_id,source_sha256,layout_signature_sha256
 INTO v_source FROM public.historical_initial_load_sources
 WHERE batch_id=p_batch_id AND source_id=p_source_id;
 IF NOT FOUND OR v_source.kind <> 'xlsx'
    OR v_source.state <> 'pending_backend_identity_verification'
    OR v_source.proposed_client_id IS DISTINCT FROM p_client_id
    OR v_source.source_sha256 IS DISTINCT FROM p_source_sha256
    OR v_source.layout_signature_sha256 IS DISTINCT FROM p_layout_signature_sha256
 THEN RAISE EXCEPTION 'Historical identity/ledger conflict' USING ERRCODE='23503'; END IF;

 FOR v_index IN 0..jsonb_array_length(p_original_fields)-1 LOOP
   v_original := p_original_fields->v_index;
   v_map := p_mapping_snapshot->v_index;
   IF jsonb_typeof(v_original) IS DISTINCT FROM 'object'
      OR jsonb_typeof(v_map) IS DISTINCT FROM 'object'
      OR (SELECT count(*) FROM jsonb_object_keys(v_original)) <> 6
      OR (SELECT count(*) FROM jsonb_object_keys(v_map)) <> 4
      OR NOT (v_original ?& ARRAY['sheet_index','column_index','row_index','field_key','raw_type','raw_value'])
      OR NOT (v_map ?& ARRAY['sheet_index','column_index','row_index','field_key'])
      OR v_original - 'raw_value' - 'raw_type' <> v_map
      OR jsonb_typeof(v_map->'sheet_index') <> 'number'
      OR jsonb_typeof(v_map->'column_index') <> 'number'
      OR jsonb_typeof(v_map->'row_index') <> 'number'
      OR (v_map->>'sheet_index') !~ '^(0|[1-9][0-9]?)$'
      OR (v_map->>'column_index') !~ '^[1-9][0-9]{0,4}$'
      OR (v_map->>'row_index') !~ '^[1-9][0-9]{0,6}$'
      OR (v_map->>'sheet_index')::int > 63
      OR (v_map->>'column_index')::int > 16384
      OR (v_map->>'row_index')::int > 9999999
      OR jsonb_typeof(v_map->'field_key') <> 'string'
      OR (v_map->>'field_key') NOT IN ('city','phone','contact_email','instagram')
      OR jsonb_typeof(v_original->'raw_value') <> 'string'
      OR char_length(v_original->>'raw_value') NOT BETWEEN 1 AND 4096
      OR (v_original->>'raw_type') NOT IN ('s','n','str','inlineStr')
   THEN RAISE EXCEPTION 'Invalid original cadastral cell' USING ERRCODE='22023'; END IF;
   v_cell := (v_map->>'sheet_index') || ':' || (v_map->>'column_index') || ':'
     || (v_map->>'row_index');
   IF v_cell=ANY(v_cells) OR (v_map->>'field_key')=ANY(v_keys)
   THEN RAISE EXCEPTION 'Duplicate cadastral cell/target' USING ERRCODE='23505'; END IF;
   v_cells := array_append(v_cells,v_cell);
   v_keys := array_append(v_keys,v_map->>'field_key');
 END LOOP;
 IF NOT EXISTS (
   SELECT 1 FROM storage.objects o
   WHERE o.bucket_id='historical-originals-private' AND o.name=p_storage_path
 ) THEN RAISE EXCEPTION 'Original Excel not present in private storage' USING ERRCODE='23503'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtext(p_batch_id::text || ':' || p_source_id || ':historical-registration')
 );
 SELECT * INTO v_prior FROM public.historical_registration_imports
 WHERE batch_id=p_batch_id AND source_id=p_source_id;
 IF FOUND THEN
   IF v_prior.client_id=p_client_id AND v_prior.source_sha256=p_source_sha256
     AND v_prior.layout_signature_sha256=p_layout_signature_sha256
     AND v_prior.proposal_sha256=p_proposal_sha256
     AND v_prior.storage_path=p_storage_path
     AND v_prior.mapping_snapshot=p_mapping_snapshot
     AND v_prior.original_fields=p_original_fields
   THEN RETURN v_prior.id; END IF;
   RAISE EXCEPTION 'Conflicting historical registration replay' USING ERRCODE='23505';
 END IF;
 INSERT INTO public.historical_registration_imports(
  batch_id,source_id,client_id,source_sha256,layout_signature_sha256,
  proposal_sha256,storage_path,mapping_snapshot,original_fields,
  confirmed_identity,confirmed_mapping,confirmed_custody,imported_by_profile_id
 ) VALUES (
  p_batch_id,p_source_id,p_client_id,p_source_sha256,p_layout_signature_sha256,
  p_proposal_sha256,p_storage_path,p_mapping_snapshot,p_original_fields,
  true,true,true,p_actor_profile_id
 ) RETURNING id INTO v_id;
 RETURN v_id;
END $function$;
REVOKE ALL ON FUNCTION public.stage_historical_registration_source(
 uuid,text,uuid,text,text,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean
) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.stage_historical_registration_source(
 uuid,text,uuid,text,text,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean
) TO service_role;
