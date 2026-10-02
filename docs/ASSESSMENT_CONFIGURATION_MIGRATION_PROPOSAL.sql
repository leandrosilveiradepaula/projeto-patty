-- PROPOSAL ONLY — NOT A MIGRATION.
-- Materialize only through an official Supabase CLI migration.
-- Scope: historical assessment-kind catalog and confirmed Basic/Complete
-- definitions. No cadence/calendar rule is represented here.

insert into public.method_configuration_templates (
  template_key, domain_key, config_schema_key, display_name, description,
  created_by_kind, created_by_profile_id
)
values
  ('evaluation.assessment_kind_catalog','evaluation','assessment_kind_catalog_v1','Catálogo de tipos de avaliação','Compatibilidade versionada entre códigos históricos e tipos semânticos.','system',null),
  ('evaluation.assessment_definition.basic','evaluation','assessment_definition_v1','Definição da Avaliação Básica','Campos obrigatórios confirmados da Avaliação Básica.','system',null),
  ('evaluation.assessment_definition.complete','evaluation','assessment_definition_v1','Definição da Avaliação Completa','Campos obrigatórios confirmados e requisito de foto da Avaliação Completa.','system',null);

insert into public.method_configuration_versions (
  template_id, version_number, schema_version, configuration,
  source_kind, source_reference, created_by_kind, created_by_profile_id,
  activated_at, activated_by_profile_id
)
select t.id,1,1,
  case t.template_key
    when 'evaluation.assessment_kind_catalog' then
      '{"entries":[{"historicalCode":"fortnightly","semanticKey":"basic","label":"Básica"},{"historicalCode":"monthly","semanticKey":"complete","label":"Completa"}]}'::jsonb
    when 'evaluation.assessment_definition.basic' then
      '{"kindKey":"basic","requiredMeasurements":[{"key":"peso","label":"Peso","aliases":["weight"]},{"key":"cintura","label":"Cintura","aliases":["waist"]},{"key":"abdomen","label":"Abdômen","aliases":["abdominal","abdômen"]},{"key":"quadril","label":"Quadril","aliases":["hip"]}],"photoRequirement":null}'::jsonb
    when 'evaluation.assessment_definition.complete' then
      '{"kindKey":"complete","requiredMeasurements":[{"key":"peso","label":"Peso","aliases":["weight"]},{"key":"cintura","label":"Cintura","aliases":["waist"]},{"key":"abdomen","label":"Abdômen","aliases":["abdominal","abdômen"]},{"key":"coxa","label":"Coxa direita","aliases":["thigh"]},{"key":"biceps","label":"Bíceps direito","aliases":[]},{"key":"torax","label":"Busto/peito","aliases":["bust","busto","chest","peito"]},{"key":"quadril","label":"Quadril","aliases":["hip"]},{"key":"ombros","label":"Ombros","aliases":["ombro"]},{"key":"panturrilhas","label":"Panturrilha direita","aliases":["panturrilha"]}],"photoRequirement":{"label":"Foto vinculada","minimumCount":1}}'::jsonb
  end,
  'system_baseline','confirmed-assessment-baseline-2026-10-02','system',null,now(),null
from public.method_configuration_templates t
where t.template_key in (
  'evaluation.assessment_kind_catalog',
  'evaluation.assessment_definition.basic',
  'evaluation.assessment_definition.complete'
);
