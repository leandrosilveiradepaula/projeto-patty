-- MIGR-HIST-10A. Append-only evidence of historical photo -> Client association.
-- Reuses the existing private client-private bucket and client_files entity.
-- Does NOT create a public release, an Auth identity, or a new assessment.
CREATE TABLE public.historical_photo_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL,
  source_id text NOT NULL CHECK (source_id ~ '^source_[0-9]{4}$'),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  source_sha256 text NOT NULL CHECK (source_sha256 ~ '^[a-f0-9]{64}$'),
  client_file_id uuid NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png')),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 10485760),
  confirmed_identity boolean NOT NULL CHECK (confirmed_identity IS TRUE),
  confirmed_photo boolean NOT NULL CHECK (confirmed_photo IS TRUE),
  confirmed_custody boolean NOT NULL CHECK (confirmed_custody IS TRUE),
  imported_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  state text NOT NULL DEFAULT 'staged_private' CHECK (state = 'staged_private'),
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, source_id),
  FOREIGN KEY (batch_id, source_id)
    REFERENCES public.historical_initial_load_sources(batch_id, source_id) ON DELETE RESTRICT,
  FOREIGN KEY (client_file_id, client_id)
    REFERENCES public.client_files(id, client_id) ON DELETE RESTRICT
);
CREATE INDEX historical_photo_imports_client_idx
 ON public.historical_photo_imports(client_id, imported_at DESC);
ALTER TABLE public.historical_photo_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.historical_photo_imports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.historical_photo_imports TO authenticated;
GRANT SELECT, INSERT ON public.historical_photo_imports TO service_role;
GRANT SELECT, INSERT ON public.client_files TO service_role;
GRANT SELECT ON public.historical_initial_load_sources TO service_role;
GRANT SELECT ON storage.objects TO service_role;
CREATE POLICY historical_photo_imports_admin_read_aal2
 ON public.historical_photo_imports FOR SELECT TO authenticated
 USING (
   coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false)
   AND EXISTS (
     SELECT 1 FROM public.user_roles r
      WHERE r.profile_id = (SELECT auth.uid()) AND r.role = 'admin'
   )
 );
-- No browser INSERT/UPDATE/DELETE policies; no direct client visibility.
-- Server validates each byte and verifies the private object before RPC.
CREATE FUNCTION public.stage_historical_photo_source(
  p_batch_id uuid, p_source_id text, p_client_id uuid,
  p_source_sha256 text, p_client_file_id uuid, p_mime_type text,
  p_byte_size integer, p_actor_profile_id uuid,
  p_confirmed_identity boolean, p_confirmed_photo boolean,
  p_confirmed_custody boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog
AS $function$
DECLARE
  v_source record;
  v_found record;
  v_file record;
  v_path text;
  v_extension text;
  v_id uuid;
BEGIN
  IF current_user <> 'service_role'
    OR p_confirmed_identity IS DISTINCT FROM true
    OR p_confirmed_photo IS DISTINCT FROM true
    OR p_confirmed_custody IS DISTINCT FROM true
    OR p_actor_profile_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id = p_actor_profile_id AND r.role = 'admin'
    )
  THEN RAISE EXCEPTION 'Verified administrator and independent decisions required'
       USING ERRCODE='42501'; END IF;
  IF p_batch_id IS NULL OR p_source_id IS NULL OR p_source_id !~ '^source_[0-9]{4}$'
    OR p_client_id IS NULL OR p_source_sha256 IS NULL
    OR p_source_sha256 !~ '^[a-f0-9]{64}$'
    OR p_client_file_id IS NULL
    OR p_mime_type NOT IN ('image/jpeg','image/png')
    OR p_byte_size NOT BETWEEN 1 AND 10485760
  THEN RAISE EXCEPTION 'Invalid historical photo request' USING ERRCODE='22023'; END IF;
  v_extension := CASE p_mime_type WHEN 'image/jpeg' THEN 'jpg' ELSE 'png' END;
  v_path := 'clients/' || p_client_id::text || '/photo/' ||
             p_client_file_id::text || '.' || v_extension;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_batch_id::text || ':' || p_source_id)
  );
  SELECT kind, state, proposed_client_id, source_sha256, photo_type
    INTO v_source FROM public.historical_initial_load_sources
    WHERE batch_id = p_batch_id AND source_id = p_source_id;
  IF NOT FOUND OR v_source.kind <> 'photo'
    OR v_source.state <> 'pending_backend_identity_verification'
    OR v_source.proposed_client_id IS DISTINCT FROM p_client_id
    OR v_source.source_sha256 IS DISTINCT FROM p_source_sha256
    OR v_source.photo_type IS DISTINCT FROM
      (CASE p_mime_type WHEN 'image/jpeg' THEN 'jpeg' ELSE 'png' END)
  THEN RAISE EXCEPTION 'Historical photo ledger source is not eligible'
       USING ERRCODE='23503'; END IF;
  SELECT * INTO v_found FROM public.historical_photo_imports
    WHERE batch_id=p_batch_id AND source_id=p_source_id;
  IF FOUND THEN
    IF v_found.client_id=p_client_id AND v_found.source_sha256=p_source_sha256
      AND v_found.client_file_id=p_client_file_id AND v_found.mime_type=p_mime_type
      AND v_found.byte_size=p_byte_size
      AND EXISTS (
        SELECT 1 FROM public.client_files f
        WHERE f.id=p_client_file_id AND f.client_id=p_client_id
          AND f.file_kind='photo' AND f.object_path=v_path
          AND f.client_visible_at IS NULL
          AND f.client_visibility_set_by_profile_id IS NULL
      )
    THEN RETURN v_found.id; END IF;
    RAISE EXCEPTION 'Conflicting historical photo replay' USING ERRCODE='23505';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects o
    WHERE o.bucket_id='client-private' AND o.name=v_path
  ) THEN RAISE EXCEPTION 'Private historical photo is absent' USING ERRCODE='23503'; END IF;
  SELECT * INTO v_file FROM public.client_files
    WHERE id=p_client_file_id OR (bucket_id='client-private' AND object_path=v_path);
  IF FOUND THEN
    RAISE EXCEPTION 'Historical photo file identifier already claimed' USING ERRCODE='23505';
  END IF;
  INSERT INTO public.client_files (
    id, client_id, file_kind, bucket_id, object_path, original_filename,
    mime_type, byte_size, uploaded_by_profile_id,
    client_visible_at, client_visibility_set_by_profile_id
  ) VALUES (
    p_client_file_id, p_client_id, 'photo', 'client-private', v_path, NULL,
    p_mime_type, p_byte_size, p_actor_profile_id, NULL, NULL
  );
  INSERT INTO public.historical_photo_imports (
    batch_id, source_id, client_id, source_sha256, client_file_id,
    mime_type, byte_size, confirmed_identity, confirmed_photo,
    confirmed_custody, imported_by_profile_id
  ) VALUES (
    p_batch_id, p_source_id, p_client_id, p_source_sha256, p_client_file_id,
    p_mime_type, p_byte_size, true, true, true, p_actor_profile_id
  ) RETURNING id INTO v_id;
  RETURN v_id;
END
$function$;
REVOKE ALL ON FUNCTION public.stage_historical_photo_source(
 uuid,text,uuid,text,uuid,text,integer,uuid,boolean,boolean,boolean
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.stage_historical_photo_source(
 uuid,text,uuid,text,uuid,text,integer,uuid,boolean,boolean,boolean
) TO service_role;
