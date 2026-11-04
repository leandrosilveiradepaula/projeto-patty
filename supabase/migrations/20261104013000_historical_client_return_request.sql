-- MIGR-HIST-05A: audit only. No Auth, Profile, assignment or publication.
-- This record means an admin declared a human review, NOT verified identity.
CREATE TABLE public.historical_client_return_requests (
  request_id uuid PRIMARY KEY,
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE RESTRICT,
  requested_by_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.historical_client_return_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.historical_client_return_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.historical_client_return_requests TO service_role;
GRANT SELECT ON public.clients, public.client_assignments, public.user_roles TO service_role;

-- Only the server role can call this transaction after verifying admin+AAL2.
-- SEC INVOKER preserves explicit grants and does not open a browser API.
CREATE FUNCTION public.register_historical_client_return_request(
  p_request_id uuid,
  p_client_id uuid,
  p_confirmed_client_id uuid,
  p_human_identity_review_declared boolean,
  p_requested_by_profile_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_client record;
  v_existing record;
BEGIN
  IF current_user <> 'service_role'
     OR p_requested_by_profile_id IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM public.user_roles r
       WHERE r.profile_id = p_requested_by_profile_id AND r.role = 'admin'
     )
  THEN
    RAISE EXCEPTION 'Verified administrator required' USING ERRCODE='42501';
  END IF;

  IF p_request_id IS NULL OR p_client_id IS NULL
     OR p_confirmed_client_id IS DISTINCT FROM p_client_id
     OR p_human_identity_review_declared IS DISTINCT FROM true
  THEN
    RAISE EXCEPTION 'Explicit historical Client confirmation required' USING ERRCODE='22023';
  END IF;

  SELECT id, profile_id, status
    INTO v_client
    FROM public.clients
    WHERE id = p_client_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Historical Client not found' USING ERRCODE='23514';
  END IF;

  IF v_client.profile_id IS NOT NULL
     OR v_client.status <> 'inactive'
     OR EXISTS (
       SELECT 1 FROM public.client_assignments a
       WHERE a.client_id = p_client_id AND a.ended_at IS NULL
     )
  THEN
    RAISE EXCEPTION 'Historical Client is ineligible for return request'
      USING ERRCODE='23514';
  END IF;

  SELECT request_id, requested_by_profile_id
    INTO v_existing
    FROM public.historical_client_return_requests
    WHERE client_id = p_client_id;

  IF FOUND THEN
    IF v_existing.request_id = p_request_id
       AND v_existing.requested_by_profile_id = p_requested_by_profile_id
    THEN
      RETURN p_client_id;
    END IF;
    RAISE EXCEPTION 'Return request already recorded'
      USING ERRCODE='23505';
  END IF;

  INSERT INTO public.historical_client_return_requests
    (request_id, client_id, requested_by_profile_id)
  VALUES (p_request_id, p_client_id, p_requested_by_profile_id);
  RETURN p_client_id;
END
$function$;

REVOKE ALL ON FUNCTION public.register_historical_client_return_request(uuid,uuid,uuid,boolean,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_historical_client_return_request(uuid,uuid,uuid,boolean,uuid)
  TO service_role;
