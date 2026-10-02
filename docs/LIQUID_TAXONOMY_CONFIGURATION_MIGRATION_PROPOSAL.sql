-- PROPOSAL ONLY — NOT A MIGRATION.
-- Materialize only through an official Supabase CLI migration.
-- This preserves the two historical liquid-kind codes and deliberately
-- does not define any minimum pure-water ratio.

insert into public.method_configuration_templates (
  template_key, domain_key, config_schema_key, display_name, description,
  created_by_kind, created_by_profile_id
)
values (
  'hydration.liquid_taxonomy',
  'hydration',
  'liquid_taxonomy_v1',
  'Taxonomia de líquidos',
  'Catálogo versionado dos tipos de líquido elegíveis no check-in.',
  'system',
  null
);

insert into public.method_configuration_versions (
  template_id, version_number, schema_version, configuration,
  source_kind, source_reference, created_by_kind, created_by_profile_id,
  activated_at, activated_by_profile_id
)
select
  t.id, 1, 1,
  '{"kinds":[{"key":"water","label":"Água pura","hydrationClass":"pure_water"},{"key":"zero_calorie_other","label":"Outro líquido zero calorias","hydrationClass":"zero_calorie_other"}]}'::jsonb,
  'system_baseline',
  'confirmed-liquid-taxonomy-baseline-2026-10-02',
  'system',
  null,
  now(),
  null
from public.method_configuration_templates t
where t.template_key='hydration.liquid_taxonomy';
