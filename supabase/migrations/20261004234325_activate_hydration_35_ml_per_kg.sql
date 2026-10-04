-- SaaS migration-history marker.
--
-- This migration version was applied directly to the Projeto Corpo e Mente
-- Supabase project on 2026-10-04 before repository reconciliation. The SaaS
-- operation used the already-provisioned admin profile as the audit actor.
--
-- That actor-dependent operation must not be replayed on a fresh database,
-- because migrations cannot depend on real environment data. The portable,
-- idempotent transition is implemented immediately afterwards in:
--
--   20261004235059_allow_system_config_retirement_and_reconcile_hydration_35.sql
--
-- Keeping this version as a replay-safe marker preserves migration-history
-- alignment without creating a synthetic admin or modifying historical rows
-- during local reset.

do $$
begin
  if not exists (
    select 1
    from public.method_configuration_templates t
    join public.method_configuration_versions v
      on v.template_id = t.id
    where t.template_key = 'hydration.daily_target'
      and v.version_number = 1
      and (v.configuration #>> '{parameters,daily_ml_per_kg,value}')::numeric = 60
      and v.activated_at is not null
      and v.retired_at is null
  ) then
    raise exception 'hydration migration marker expected active v1 at 60 mL/kg'
      using errcode = 'P0001';
  end if;
end
$$;
