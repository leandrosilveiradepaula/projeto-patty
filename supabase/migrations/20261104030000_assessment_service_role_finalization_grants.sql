-- J3-HIST-UI-01: make the server-only assessment finalization contract
-- reproducible under local Supabase auto_expose_new_tables=false.
-- Hosted production already has these service_role grants (metadata verified).
-- The RPC remains SECURITY INVOKER and executable exclusively by service_role.
-- No privilege, policy or release is granted to anon/authenticated.
DO $verify$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = 'public.finalize_assessment_from_method_snapshot(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb)'::regprocedure
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
    RAISE EXCEPTION 'Assessment finalization grants blocked: unsafe RPC boundary';
  END IF;
END
$verify$;

GRANT SELECT, UPDATE ON public.client_assessments TO service_role;
GRANT SELECT ON public.user_roles, public.assessment_measurements,
  public.assessment_files, public.method_configuration_versions,
  public.method_configuration_templates TO service_role;
GRANT SELECT, INSERT ON public.method_configuration_snapshot_sets,
  public.method_configuration_snapshots TO service_role;
