create schema if not exists app_private;
grant usage on schema app_private to authenticated;

drop function if exists public.list_current_client_finalized_assessment_measurements();

create function app_private.list_current_client_finalized_assessment_measurements()
returns table (
  assessment_id uuid,
  assessed_at timestamptz,
  assessment_kind text,
  measurement_key text,
  measurement_value numeric,
  unit text
)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select
    ca.id as assessment_id,
    ca.assessed_at,
    ca.assessment_kind,
    am.measurement_key,
    coalesce(latest.corrected_measurement_value, am.measurement_value) as measurement_value,
    coalesce(latest.corrected_unit, am.unit) as unit
  from public.clients c
  join public.client_assessments ca
    on ca.client_id = c.id
   and ca.finalized_at is not null
  join public.assessment_measurements am
    on am.assessment_id = ca.id
  left join lateral (
    select
      correction.corrected_measurement_value,
      correction.corrected_unit
    from public.assessment_measurement_corrections correction
    where correction.assessment_measurement_id = am.id
    order by correction.created_at desc, correction.id desc
    limit 1
  ) latest on true
  where c.profile_id = (select auth.uid())
  order by ca.assessed_at desc, ca.id, am.created_at, am.id;
$$;

revoke execute on function app_private.list_current_client_finalized_assessment_measurements()
  from public, anon;
grant execute on function app_private.list_current_client_finalized_assessment_measurements()
  to authenticated;

create function public.list_current_client_finalized_assessment_measurements()
returns table (
  assessment_id uuid,
  assessed_at timestamptz,
  assessment_kind text,
  measurement_key text,
  measurement_value numeric,
  unit text
)
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select *
  from app_private.list_current_client_finalized_assessment_measurements();
$$;

revoke execute on function public.list_current_client_finalized_assessment_measurements()
  from public, anon;
grant execute on function public.list_current_client_finalized_assessment_measurements()
  to authenticated;
