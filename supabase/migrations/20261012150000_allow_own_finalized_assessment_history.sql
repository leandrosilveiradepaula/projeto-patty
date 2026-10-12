-- Return only the client's own finalized assessment headers.
-- Do not grant a client SELECT on client_assessments: that table also carries
-- professional actor and method-configuration metadata.
-- The existing effective-measurement RPC remains unchanged.
create function app_private.list_current_client_finalized_assessment_headers()
returns table (
  id uuid,
  assessed_at timestamptz,
  finalized_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select ca.id, ca.assessed_at, ca.finalized_at
  from public.clients c
  join public.client_assessments ca
    on ca.client_id = c.id
   and ca.finalized_at is not null
  where c.profile_id = (select auth.uid())
  order by ca.assessed_at desc, ca.id;
$$;

revoke execute on function app_private.list_current_client_finalized_assessment_headers()
  from public, anon;
grant execute on function app_private.list_current_client_finalized_assessment_headers()
  to authenticated;

-- Public API boundary: invoker wrapper delegates only to the private reader.
create function public.list_current_client_finalized_assessment_headers()
returns table (
  id uuid,
  assessed_at timestamptz,
  finalized_at timestamptz
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select *
  from app_private.list_current_client_finalized_assessment_headers();
$$;

revoke execute on function public.list_current_client_finalized_assessment_headers()
  from public, anon;
grant execute on function public.list_current_client_finalized_assessment_headers()
  to authenticated;
