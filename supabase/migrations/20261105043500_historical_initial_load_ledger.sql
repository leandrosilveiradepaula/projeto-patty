-- MIGR-HIST-08B. Initial-load inventory ledger ONLY. NO clinical answers,
-- originals, file paths, client creation, activation, uploads or publication.
-- One server-only, transactional, idempotent manifest registration.
-- The metadata is an UNVERIFIED CENSUS, never a clinical/identity approval.

CREATE TABLE public.historical_initial_load_batches (
  id uuid PRIMARY KEY,
  manifest_sha256 text NOT NULL CHECK (manifest_sha256 ~ '^[a-f0-9]{64}$'),
  manifest_metadata jsonb NOT NULL CHECK (jsonb_typeof(manifest_metadata) = 'array'),
  source_count integer NOT NULL CHECK (source_count BETWEEN 1 AND 1200),
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status = 'pending_review'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.historical_initial_load_sources (
  batch_id uuid NOT NULL REFERENCES public.historical_initial_load_batches(id) ON DELETE RESTRICT,
  source_id text NOT NULL CHECK (source_id ~ '^source_[0-9]{4}$'),
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  kind text NOT NULL CHECK (kind IN ('xlsx', 'photo')),
  state text NOT NULL CHECK (state IN (
    'blocked', 'duplicate_binary', 'pending_human_association',
    'pending_backend_identity_verification'
  )),
  reason text CHECK (reason IS NULL OR reason IN (
    'unsupported_or_invalid', 'duplicate_binary', 'ambiguous_association'
  )),
  layout_signature_sha256 text
    CHECK (layout_signature_sha256 IS NULL OR layout_signature_sha256 ~ '^[a-f0-9]{64}$'),
  worksheet_count integer CHECK (worksheet_count IS NULL OR worksheet_count BETWEEN 1 AND 64),
  photo_type text CHECK (photo_type IS NULL OR photo_type IN ('jpeg', 'png')),
  proposed_client_id uuid REFERENCES public.clients(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id, source_id),
  CHECK ((kind = 'xlsx' AND photo_type IS NULL) OR
         (kind = 'photo' AND layout_signature_sha256 IS NULL AND worksheet_count IS NULL)),
  CHECK ((state = 'pending_backend_identity_verification') =
         (proposed_client_id IS NOT NULL))
);
CREATE INDEX historical_initial_load_sources_client_proposal_idx
  ON public.historical_initial_load_sources(proposed_client_id)
  WHERE proposed_client_id IS NOT NULL;
CREATE INDEX historical_initial_load_sources_layout_idx
  ON public.historical_initial_load_sources(layout_signature_sha256)
  WHERE layout_signature_sha256 IS NOT NULL;

ALTER TABLE public.historical_initial_load_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_initial_load_sources ENABLE ROW LEVEL SECURITY;

-- Do not allow any browser to mutate audit evidence, even with admin AAL2.
REVOKE ALL ON public.historical_initial_load_batches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.historical_initial_load_sources FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.historical_initial_load_batches,
  public.historical_initial_load_sources TO authenticated;
GRANT SELECT, INSERT ON public.historical_initial_load_batches,
  public.historical_initial_load_sources TO service_role;

-- No permissive client-owner policies: admin global access with MFA ONLY.
CREATE POLICY historical_initial_load_batches_admin_read_aal2
  ON public.historical_initial_load_batches FOR SELECT TO authenticated
  USING (
    coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
    AND EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id = (SELECT auth.uid()) AND r.role = 'admin'
    )
  );
CREATE POLICY historical_initial_load_sources_admin_read_aal2
  ON public.historical_initial_load_sources FOR SELECT TO authenticated
  USING (
    coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
    AND EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id = (SELECT auth.uid()) AND r.role = 'admin'
    )
  );

-- No UPDATE or DELETE grants, no UPDATE/DELETE policies, no auto-approval.
-- SECURITY INVOKER + service_role-only EXECUTE. Caller must first verify
-- relational admin and MFA AAL2 using requireRole("admin") on the server.
-- It accepts only metadata; original Excel/photographs remain elsewhere.
CREATE FUNCTION public.register_historical_initial_load_manifest(
  p_batch_id uuid,
  p_manifest_sha256 text,
  p_sources jsonb,
  p_created_by_profile_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_source jsonb;
  v_existing record;
  v_source_id text;
  v_hash text;
  v_kind text;
  v_state text;
  v_reason text;
  v_layout text;
  v_worksheets integer;
  v_photo_type text;
  v_client_id uuid;
BEGIN
  IF current_user <> 'service_role'
    OR p_created_by_profile_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id = p_created_by_profile_id AND r.role = 'admin'
    )
  THEN
    RAISE EXCEPTION 'Verified administrator required' USING ERRCODE='42501';
  END IF;

  IF p_batch_id IS NULL OR p_manifest_sha256 IS NULL
    OR p_manifest_sha256 !~ '^[a-f0-9]{64}$'
    OR p_sources IS NULL OR jsonb_typeof(p_sources) IS DISTINCT FROM 'array'
  THEN
    RAISE EXCEPTION 'Invalid initial load manifest' USING ERRCODE='22023';
  END IF;
  IF jsonb_array_length(p_sources) NOT BETWEEN 1 AND 1200 THEN
    RAISE EXCEPTION 'Invalid initial load source count' USING ERRCODE='22023';
  END IF;

  -- Validate the FULL manifest before inserting anything. Fields are allowlisted
  -- to exclude source names/paths/emails/health data from database audit rows.
  FOR v_source IN SELECT value FROM jsonb_array_elements(p_sources) LOOP
    IF jsonb_typeof(v_source) IS DISTINCT FROM 'object'
       OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(v_source) AS key
         WHERE key NOT IN (
           'source_id', 'sha256', 'kind', 'state', 'reason',
           'layout_signature_sha256', 'worksheet_count', 'photo_type', 'client_id'
         )
       )
       OR NOT (v_source ?& ARRAY['source_id', 'sha256', 'kind', 'state'])
    THEN
      RAISE EXCEPTION 'Invalid initial load source metadata' USING ERRCODE='22023';
    END IF;

    v_source_id := v_source->>'source_id';
    v_hash := v_source->>'sha256';
    v_kind := v_source->>'kind';
    v_state := v_source->>'state';
    v_reason := v_source->>'reason';
    v_layout := v_source->>'layout_signature_sha256';
    v_photo_type := v_source->>'photo_type';

    IF v_source_id IS NULL OR v_source_id !~ '^source_[0-9]{4}$'
       OR v_hash IS NULL OR v_hash !~ '^[a-f0-9]{64}$'
       OR v_kind NOT IN ('xlsx', 'photo')
       OR v_state NOT IN ('blocked', 'duplicate_binary',
         'pending_human_association', 'pending_backend_identity_verification')
       OR (v_reason IS NOT NULL AND v_reason NOT IN (
         'unsupported_or_invalid', 'duplicate_binary', 'ambiguous_association'))
       OR (v_layout IS NOT NULL AND v_layout !~ '^[a-f0-9]{64}$')
       OR (v_photo_type IS NOT NULL AND v_photo_type NOT IN ('png', 'jpeg'))
       OR (v_kind = 'photo' AND (v_layout IS NOT NULL OR v_source ? 'worksheet_count'))
       OR (v_kind = 'xlsx' AND v_photo_type IS NOT NULL)
    THEN
      RAISE EXCEPTION 'Invalid initial load source fields' USING ERRCODE='22023';
    END IF;

    -- Untrusted claims cannot be treated as identity checks.
    IF v_source ? 'client_id' THEN
      IF v_source->>'client_id' IS NULL
        OR (v_source->>'client_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        OR v_state <> 'pending_backend_identity_verification' THEN
        RAISE EXCEPTION 'Invalid initial load Client proposal' USING ERRCODE='22023';
      END IF;
    ELSIF v_state = 'pending_backend_identity_verification' THEN
      RAISE EXCEPTION 'Client proposal required' USING ERRCODE='22023';
    END IF;

    IF v_source ? 'worksheet_count' THEN
      IF jsonb_typeof(v_source->'worksheet_count') IS DISTINCT FROM 'number'
         OR (v_source->>'worksheet_count') !~ '^[0-9]{1,2}$'
      THEN
        RAISE EXCEPTION 'Invalid worksheet count' USING ERRCODE='22023';
      END IF;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM (
      SELECT item->>'source_id' id, count(*) AS n
      FROM jsonb_array_elements(p_sources) item
      GROUP BY item->>'source_id'
    ) duplicates WHERE duplicates.n > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate source identifier' USING ERRCODE='23505';
  END IF;

  -- Single transaction, serialized for the same batch UUID.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_batch_id::text));
  SELECT manifest_sha256, manifest_metadata, created_by_profile_id, source_count
    INTO v_existing
    FROM public.historical_initial_load_batches
    WHERE id = p_batch_id
    FOR UPDATE;
  IF FOUND THEN
    IF v_existing.manifest_sha256 = p_manifest_sha256
       AND v_existing.manifest_metadata = p_sources
       AND v_existing.created_by_profile_id = p_created_by_profile_id
       AND v_existing.source_count = jsonb_array_length(p_sources) THEN
      RETURN p_batch_id;
    END IF;
    RAISE EXCEPTION 'Initial load batch conflict' USING ERRCODE='23505';
  END IF;

  INSERT INTO public.historical_initial_load_batches (
    id, manifest_sha256, manifest_metadata, source_count, created_by_profile_id
  ) VALUES (
    p_batch_id, p_manifest_sha256, p_sources,
    jsonb_array_length(p_sources), p_created_by_profile_id
  );

  FOR v_source IN SELECT value FROM jsonb_array_elements(p_sources) LOOP
    v_client_id := NULL;
    IF v_source ? 'client_id' THEN
      v_client_id := (v_source->>'client_id')::uuid;
    END IF;
    v_worksheets := NULL;
    IF v_source ? 'worksheet_count' THEN
      v_worksheets := (v_source->>'worksheet_count')::integer;
    END IF;
    INSERT INTO public.historical_initial_load_sources (
      batch_id, source_id, source_sha256, kind, state, reason,
      layout_signature_sha256, worksheet_count, photo_type, proposed_client_id
    ) VALUES (
      p_batch_id, v_source->>'source_id', v_source->>'sha256',
      v_source->>'kind', v_source->>'state', v_source->>'reason',
      v_source->>'layout_signature_sha256', v_worksheets,
      v_source->>'photo_type', v_client_id
    );
  END LOOP;
  RETURN p_batch_id;
END
$function$;

REVOKE ALL ON FUNCTION public.register_historical_initial_load_manifest(uuid,text,jsonb,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_historical_initial_load_manifest(uuid,text,jsonb,uuid)
  TO service_role;
