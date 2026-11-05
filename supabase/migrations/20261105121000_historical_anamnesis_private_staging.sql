-- MIGR-HIST-09A: historical Anamnesis is separate from client-submitted
-- anamnesis_submissions. All content is private professional evidence.
-- This migration does not publish or activate any Client record.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('historical-originals-private', 'historical-originals-private', false,
        20971520, ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
ON CONFLICT (id) DO NOTHING;
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'historical-originals-private'
      AND public IS FALSE AND file_size_limit = 20971520
  ) THEN
    RAISE EXCEPTION 'Historical originals bucket is not private and bounded';
  END IF;
END $guard$;
-- A restrictive rule protects this bucket even if other broad permissive
-- storage policies are introduced later. service_role bypasses RLS in the
-- server-only trusted path.
CREATE POLICY historical_originals_never_browser ON storage.objects
  AS RESTRICTIVE FOR ALL TO public
  USING (bucket_id <> 'historical-originals-private')
  WITH CHECK (bucket_id <> 'historical-originals-private');
-- Never create public URLs or client releases for this bucket.

CREATE TABLE public.historical_anamnesis_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  source_id text NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  layout_signature_sha256 text NOT NULL CHECK (layout_signature_sha256 ~ '^[a-f0-9]{64}$'),
  form_version_id uuid NOT NULL REFERENCES public.anamnesis_form_versions(id) ON DELETE RESTRICT,
  proposal_sha256 text NOT NULL CHECK (proposal_sha256 ~ '^[a-f0-9]{64}$'),
  storage_path text NOT NULL UNIQUE,
  -- Original answers, unchanged and unnormalized; do not expose via client APIs.
  original_answers jsonb NOT NULL,
  mapping_snapshot jsonb NOT NULL,
  confirmed_identity boolean NOT NULL CHECK (confirmed_identity IS TRUE),
  confirmed_mapping boolean NOT NULL CHECK (confirmed_mapping IS TRUE),
  confirmed_custody boolean NOT NULL CHECK (confirmed_custody IS TRUE),
  imported_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'staged_private' CHECK (state = 'staged_private'),
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, source_id),
  FOREIGN KEY (batch_id, source_id)
    REFERENCES public.historical_initial_load_sources(batch_id, source_id)
    ON DELETE RESTRICT,
  CHECK (jsonb_typeof(original_answers) = 'array' AND jsonb_array_length(original_answers) BETWEEN 1 AND 64),
  CHECK (jsonb_typeof(mapping_snapshot) = 'array' AND jsonb_array_length(mapping_snapshot) = jsonb_array_length(original_answers)),
  CHECK (storage_path = batch_id::text || '/' || source_id || '/' || source_sha256 || '.xlsx')
);
CREATE INDEX historical_anamnesis_imports_client_idx
 ON public.historical_anamnesis_imports(client_id, imported_at DESC);

ALTER TABLE public.historical_anamnesis_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.historical_anamnesis_imports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.historical_anamnesis_imports TO authenticated;
GRANT SELECT, INSERT ON public.historical_anamnesis_imports TO service_role;
GRANT SELECT ON public.historical_initial_load_sources TO service_role;
GRANT SELECT ON public.historical_initial_load_batches TO service_role;
GRANT SELECT ON public.anamnesis_questions, public.anamnesis_form_versions TO service_role;

CREATE POLICY historical_anamnesis_imports_admin_read_aal2
 ON public.historical_anamnesis_imports FOR SELECT TO authenticated
 USING (
   coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
   AND EXISTS (
     SELECT 1 FROM public.user_roles r
     WHERE r.profile_id = (SELECT auth.uid()) AND r.role = 'admin'
   )
 );
-- For defense in depth, no browser INSERT/UPDATE/DELETE policies.
-- RPC is invoker-only and restricted to server-side service_role.
CREATE FUNCTION public.stage_historical_anamnesis_source(
  p_batch_id uuid,
  p_source_id text,
  p_client_id uuid,
  p_source_sha256 text,
  p_layout_signature_sha256 text,
  p_form_version_id uuid,
  p_proposal_sha256 text,
  p_storage_path text,
  p_mapping_snapshot jsonb,
  p_original_answers jsonb,
  p_actor_profile_id uuid,
  p_confirmed_identity boolean,
  p_confirmed_mapping boolean,
  p_confirmed_custody boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $function$
DECLARE
  v_source record;
  v_found record;
  v_answer jsonb;
  v_map jsonb;
  v_question record;
  v_key text;
  v_seen_questions uuid[] := ARRAY[]::uuid[];
  v_seen_cells text[] := ARRAY[]::text[];
  v_id uuid;
  v_index integer;
BEGIN
  IF current_user <> 'service_role'
    OR NOT EXISTS (SELECT 1 FROM public.user_roles r
        WHERE r.profile_id = p_actor_profile_id AND r.role = 'admin')
    OR p_confirmed_identity IS DISTINCT FROM true
    OR p_confirmed_mapping IS DISTINCT FROM true
    OR p_confirmed_custody IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Verified administrator and explicit decisions required'
    USING ERRCODE='42501'; END IF;
  IF p_source_id IS NULL OR p_source_id !~ '^source_[0-9]{4}$'
     OR p_source_sha256 !~ '^[a-f0-9]{64}$'
     OR p_layout_signature_sha256 !~ '^[a-f0-9]{64}$'
     OR p_proposal_sha256 !~ '^[a-f0-9]{64}$'
     OR p_storage_path IS DISTINCT FROM (
        p_batch_id::text || '/' || p_source_id || '/' || p_source_sha256 || '.xlsx')
     OR jsonb_typeof(p_original_answers) IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_mapping_snapshot) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_original_answers) NOT BETWEEN 1 AND 64
     OR jsonb_array_length(p_mapping_snapshot) <> jsonb_array_length(p_original_answers)
  THEN RAISE EXCEPTION 'Invalid historical source' USING ERRCODE='22023'; END IF;

  -- A proposal in the inventory is NOT proof of identity. The server records
  -- the administrator's explicit attestation after checking the real source.
  SELECT source_sha256, layout_signature_sha256, kind, state, proposed_client_id
  INTO v_source
  FROM public.historical_initial_load_sources
  WHERE batch_id = p_batch_id AND source_id = p_source_id;
  IF NOT FOUND OR v_source.kind <> 'xlsx'
    OR v_source.state <> 'pending_backend_identity_verification'
    OR v_source.proposed_client_id IS DISTINCT FROM p_client_id
    OR v_source.source_sha256 IS DISTINCT FROM p_source_sha256
    OR v_source.layout_signature_sha256 IS DISTINCT FROM p_layout_signature_sha256
  THEN RAISE EXCEPTION 'Historical ledger source not eligible' USING ERRCODE='23503'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.anamnesis_form_versions v
    WHERE v.id=p_form_version_id AND v.published_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'Published Anamnesis version required' USING ERRCODE='22023'; END IF;

  FOR v_index IN 0..jsonb_array_length(p_original_answers)-1 LOOP
    v_answer := p_original_answers->v_index;
    v_map := p_mapping_snapshot->v_index;
    IF jsonb_typeof(v_answer) <> 'object' OR jsonb_typeof(v_map) <> 'object'
      OR (SELECT count(*) FROM jsonb_object_keys(v_answer)) <> 6
      OR (SELECT count(*) FROM jsonb_object_keys(v_map)) <> 4
      OR NOT (v_answer ?& ARRAY['question_id','sheet_index','column_index','row_index','raw_value','raw_type'])
      OR NOT (v_map ?& ARRAY['question_id','sheet_index','column_index','row_index'])
      OR jsonb_typeof(v_answer->'raw_value') <> 'string'
      OR char_length(v_answer->>'raw_value') NOT BETWEEN 1 AND 4096
      OR (v_answer->>'raw_type') NOT IN ('s','n','str','b','d','inlineStr')
      OR NOT (v_answer - 'raw_value' - 'raw_type' = v_map)
    THEN RAISE EXCEPTION 'Invalid answer snapshot' USING ERRCODE='22023'; END IF;
    BEGIN
      SELECT id, question_key, answer_type, options INTO v_question
      FROM public.anamnesis_questions
      WHERE id = (v_map->>'question_id')::uuid AND form_version_id = p_form_version_id;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid question' USING ERRCODE='22023';
    END;
    IF NOT FOUND OR v_question.question_key='consent_acceptance'
      OR v_question.answer_type NOT IN ('text', 'single_choice')
    THEN RAISE EXCEPTION 'Historical answer type not permitted' USING ERRCODE='22023'; END IF;
    IF v_question.answer_type='single_choice'
      AND NOT (v_question.options ? (v_answer->>'raw_value'))
    THEN RAISE EXCEPTION 'Historical answer option unknown' USING ERRCODE='22023'; END IF;
    IF v_question.id = ANY(v_seen_questions)
    THEN RAISE EXCEPTION 'Duplicate historical question' USING ERRCODE='23505'; END IF;
    v_seen_questions := array_append(v_seen_questions, v_question.id);
    v_key := (v_map->>'sheet_index') || ':' ||
      (v_map->>'column_index') || ':' || (v_map->>'row_index');
    IF v_key = ANY(v_seen_cells)
    THEN RAISE EXCEPTION 'Duplicate historical cell' USING ERRCODE='23505'; END IF;
    v_seen_cells := array_append(v_seen_cells,v_key);
    IF jsonb_typeof(v_map->'sheet_index') <> 'number'
       OR jsonb_typeof(v_map->'column_index') <> 'number'
       OR jsonb_typeof(v_map->'row_index') <> 'number'
       OR (v_map->>'sheet_index') !~ '^(0|[1-9][0-9]?)$'
       OR (v_map->>'column_index') !~ '^[1-9][0-9]{0,4}$'
       OR (v_map->>'row_index') !~ '^[1-9][0-9]{0,6}$'
       OR (v_map->>'sheet_index')::int >= 64
       OR (v_map->>'column_index')::int > 16384
       OR (v_map->>'row_index')::int > 9999999
    THEN RAISE EXCEPTION 'Invalid cell coordinates' USING ERRCODE='22023'; END IF;
  END LOOP;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_batch_id::text || ':' || p_source_id));
  SELECT * INTO v_found FROM public.historical_anamnesis_imports
    WHERE batch_id=p_batch_id AND source_id=p_source_id;
  IF FOUND THEN
    IF v_found.client_id=p_client_id AND v_found.source_sha256=p_source_sha256
      AND v_found.layout_signature_sha256=p_layout_signature_sha256
      AND v_found.form_version_id=p_form_version_id
      AND v_found.proposal_sha256=p_proposal_sha256
      AND v_found.mapping_snapshot=p_mapping_snapshot
      AND v_found.original_answers=p_original_answers
      AND v_found.storage_path=p_storage_path
      AND v_found.imported_by_profile_id=p_actor_profile_id
    THEN RETURN v_found.id; END IF;
    RAISE EXCEPTION 'Historical source replay conflict' USING ERRCODE='23505';
  END IF;

  INSERT INTO public.historical_anamnesis_imports(
    batch_id,source_id,client_id,source_sha256,layout_signature_sha256,
    form_version_id,proposal_sha256,storage_path,mapping_snapshot,original_answers,
    imported_by_profile_id,confirmed_identity,confirmed_mapping,confirmed_custody
  ) VALUES (
    p_batch_id,p_source_id,p_client_id,p_source_sha256,p_layout_signature_sha256,
    p_form_version_id,p_proposal_sha256,p_storage_path,p_mapping_snapshot,p_original_answers,
    p_actor_profile_id,true,true,true
  ) RETURNING id INTO v_id;
  RETURN v_id;
END
$function$;
REVOKE ALL ON FUNCTION public.stage_historical_anamnesis_source(
 uuid,text,uuid,text,text,uuid,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stage_historical_anamnesis_source(
 uuid,text,uuid,text,text,uuid,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean)
 TO service_role;
