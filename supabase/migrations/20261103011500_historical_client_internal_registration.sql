-- MIGR-HIST-04: Internal historical Client registration, never an Auth account.
-- SECURITY INVOKER: the caller must be an authenticated relational admin with AAL2.
-- Direct INSERT/UPDATE/DELETE on clients remains ungranted to authenticated/anon.
-- The request UUID is the idempotency key. The ledger is not a client record.
CREATE TABLE public.historical_client_registration_requests (
  request_id uuid PRIMARY KEY,
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE RESTRICT,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.historical_client_registration_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.historical_client_registration_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.historical_client_registration_requests TO service_role;

CREATE OR REPLACE FUNCTION public.create_historical_client_internal(
  p_request_id uuid,
  p_full_name text,
  p_confirmed_no_existing_client boolean
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_name text := btrim(p_full_name);
  v_client_id uuid;
  v_existing record;
BEGIN
  IF v_actor IS NULL
    OR coalesce((SELECT auth.jwt() ->> 'aal') = 'aal2', false) IS NOT TRUE
    OR NOT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.profile_id = v_actor AND r.role = 'admin'
    )
  THEN
    RAISE EXCEPTION 'Historical registration requires admin AAL2' USING ERRCODE='42501';
  END IF;
  IF p_request_id IS NULL OR p_confirmed_no_existing_client IS DISTINCT FROM true
    OR v_name IS NULL OR char_length(v_name) NOT BETWEEN 2 AND 120
  THEN
    RAISE EXCEPTION 'Historical registration requires a valid name and explicit duplicate review' USING ERRCODE='22023';
  END IF;

  -- Serialize all historical registrations so concurrent requests cannot bypass
  -- the exact-name collision check. Names are only a blocking signal, never identity keys.
  PERFORM pg_catalog.pg_advisory_xact_lock(120342, 49017);

  SELECT q.client_id, q.created_by_profile_id, c.full_name, c.profile_id, c.status
    INTO v_existing
  FROM public.historical_client_registration_requests q
  JOIN public.clients c ON c.id = q.client_id
  WHERE q.request_id = p_request_id;

  IF FOUND THEN
    IF v_existing.created_by_profile_id = v_actor
      AND v_existing.full_name = v_name
      AND v_existing.profile_id IS NULL
      AND v_existing.status = 'inactive'
    THEN
      RETURN v_existing.client_id;
    END IF;
    RAISE EXCEPTION 'Historical registration request conflict' USING ERRCODE='23505';
  END IF;

  -- Fail closed on exact case-insensitive name collision. Distinct people may
  -- share a name; resolution must be human, not automatic deduplication.
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
    VALUES (p_request_id, v_client_id, v_actor);
  RETURN v_client_id;
END
$function$;

REVOKE ALL ON FUNCTION public.create_historical_client_internal(uuid,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_historical_client_internal(uuid,text,boolean) TO authenticated;
-- SECURITY INVOKER requires INSERT privilege, which is intentionally absent.
-- Do not grant table INSERT: use a server-only service-role RPC after verifying
-- human identity at the server boundary. Until then the function fails closed.
