-- PROPOSAL ONLY. NOT AN OFFICIAL MIGRATION.
-- Do not place this in supabase/migrations while earlier production migrations
-- are still pending. Generate an official filename with Supabase CLI only when
-- the migration queue is ready.
--
-- Purpose:
-- seed versioned assessment definitions without changing historical
-- assessment_kind codes or operational finalization yet.

insert into public.method_configuration_templates (
  template_key,
  domain_key,
  config_schema_key,
  display_name,
  description,
  created_by_kind,
  created_by_profile_id
)
values
  (
    'assessment.basic',
    'assessment',
    'assessment_definition_v1',
    'Avaliação Básica',
    'Definição versionada dos itens obrigatórios da Avaliação Básica.',
    'system',
    null
  ),
  (
    'assessment.complete',
    'assessment',
    'assessment_definition_v1',
    'Avaliação Completa',
    'Definição versionada dos itens obrigatórios da Avaliação Completa.',
    'system',
    null
  );

insert into public.method_configuration_versions (
  template_id,
  version_number,
  schema_version,
  configuration,
  source_kind,
  source_reference,
  created_by_kind,
  created_by_profile_id,
  activated_at,
  activated_by_profile_id
)
select
  t.id,
  1,
  1,
  case t.template_key
    when 'assessment.basic' then
      '{
        "kindKey": "basic",
        "requiredMeasurements": [
          {"key":"peso","label":"Peso","aliases":["weight"]},
          {"key":"cintura","label":"Cintura","aliases":["waist"]},
          {"key":"abdomen","label":"Abdômen","aliases":["abdominal","abdômen"]},
          {"key":"quadril","label":"Quadril","aliases":["hip"]}
        ],
        "photoRequirement": null
      }'::jsonb
    when 'assessment.complete' then
      '{
        "kindKey": "complete",
        "requiredMeasurements": [
          {"key":"peso","label":"Peso","aliases":["weight"]},
          {"key":"cintura","label":"Cintura","aliases":["waist"]},
          {"key":"abdomen","label":"Abdômen","aliases":["abdominal","abdômen"]},
          {"key":"coxa","label":"Coxa direita","aliases":["thigh"]},
          {"key":"biceps","label":"Bíceps direito","aliases":[]},
          {"key":"torax","label":"Busto/peito","aliases":["bust","busto","chest","peito"]},
          {"key":"quadril","label":"Quadril","aliases":["hip"]},
          {"key":"ombros","label":"Ombros","aliases":["ombro"]},
          {"key":"panturrilhas","label":"Panturrilha direita","aliases":["panturrilha"]}
        ],
        "photoRequirement": {
          "label": "Foto vinculada",
          "minimumCount": 1
        }
      }'::jsonb
    else null
  end,
  'system_baseline',
  'confirmed-current-template-2026-10-02',
  'system',
  null,
  now(),
  null
from public.method_configuration_templates t
where t.template_key in ('assessment.basic', 'assessment.complete');

-- Deliberately not included:
-- - changing assessment_kind CHECK values;
-- - mapping cadence to dates;
-- - automatic creation/finalization;
-- - unit constraints not yet formally confirmed;
-- - migration of existing assessment rows;
-- - runtime switch or snapshots.
