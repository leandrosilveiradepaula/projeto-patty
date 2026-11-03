-- MIGR-HIST-04B: internal historical Client registration, never an Auth account.
-- SECURITY INVOKER: executable by service_role ONLY, after a server-side
-- requireRole("admin") verifies the relational role and MFA AAL2.
-- No INSERT/UPDATE/DELETE on clients is granted to authenticated or anon.
-- No Client is associated with ZIP/XLSX, assignment, or Auth in this operation.
CREATE TABLE public.historical_client_registration_requests (
  request_id uuid PRIMARY KEY,
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE RESTRICT,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.historical_client_registration_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.historical_client_registration_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.historical_client_registration_requests TO service_role;

-- The invoker needs ordinary SQL privileges in addition to BYPASSRLS.
-- Limit these explicit grants to the trusted server role; browser roles
-- receive no new privileges. Existing RLS and role checks stay intact.
GRANT SELECT ON public.user_roles TO service_role;
GRANT SELECT, INSERT ON public.clients TO service_role;

CREATE OR REPLACE FUNCTION public.create_historical_client_internal(
  p_request_id uuid,
  p_full_name text,
  p_confirmed_no_existing_client boolean,
  p_created_by_profile_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_name text := btrim(p_full_name);
  v_client_id uuid;
  v_existing record;
BEGIN
  -- Defense in depth: even an unexpected direct RPC call fails closed.
  -- JWT/MFA identity is verified in the Next.js server-only caller BEFORE
  -- obtaining a service-role client; service_role is never sent to browsers.
  IF current_user <> 'service_role'
    OR p_created_by_profile_id IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id = p_created_by_profile_id AND r.role = 'admin'
    )
  THEN
    RAISE EXCEPTION 'Historical registration requires verified administrator' USING ERRCODE='42501';
  END IF;

  IF p_request_id IS NULL OR p_confirmed_no_existing_client IS DISTINCT FROM true
    OR v_name IS NULL OR char_length(v_name) NOT BETWEEN 2 AND 120
  THEN
    RAISE EXCEPTION 'Historical registration requires a valid name and explicit duplicate review' USING ERRCODE='22023';
  END IF;

  -- Serialize historical registrations to prevent concurrent exact-name
  -- collisions within this operation. Name is only a blocking signal, never
  -- a key for assigning real-world identity.
  PERFORM pg_catalog.pg_advisory_xact_lock(120342, 49017);

  SELECT q.client_id, q.created_by_profile_id, c.full_name, c.profile_id, c.status
    INTO v_existing
  FROM public.historical_client_registration_requests q
  JOIN public.clients c ON c.id = q.client_id
  WHERE q.request_id = p_request_id;

  IF FOUND THEN
    IF v_existing.created_by_profile_id = p_created_by_profile_id
      AND v_existing.full_name = v_name
      AND v_existing.profile_id IS NULL
      AND v_existing.status = 'inactive'
    THEN
      RETURN v_existing.client_id;
    END IF;
    RAISE EXCEPTION 'Historical registration request conflict' USING ERRCODE='23505';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.clients c
    WHERE pg_catalog.lower(c.full_name) = pg_catalog.lower(v_name)
  ) THEN
    RAISE EXCEPTION 'Historical registration needs manual collision review' USING ERRCODE='23505';
  END IF;

  INSERT INTO public.clients(full_name, profile_id, status, started_at, ended_at)
    VALUES (v_name, NULL, 'inactive', NULL, NULL)
    RETURNING id INTO v_client_id;
  INSERT INTO public.historical_client_registration_requests
    (request_id, client_id, created_by_profile_id)
    VALUES (p_request_id, v_client_id, p_created_by_profile_id);
  RETURN v_client_id;
END
$function$;

REVOKE ALL ON FUNCTION public.create_historical_client_internal(uuid,text,boolean,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_historical_client_internal(uuid,text,boolean,uuid)
  TO service_role;
