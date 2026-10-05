insert into public.method_configuration_templates (
  template_key,
  domain_key,
  config_schema_key,
  display_name,
  description,
  created_by_kind,
  created_by_profile_id
)
values (
  'evaluation.assessment_schedule_preferences',
  'evaluation',
  'assessment_schedule_preferences_v1',
  'Preferências de agenda das avaliações',
  'Preferências profissionais de agenda; não criam bloqueio nem data automática.',
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
  '{
    "basic_placement":"approximately_midpoint_between_complete_assessments",
    "complete_preferred_weekdays":[5,6]
  }'::jsonb,
  'system_baseline',
  'confirmed-assessment-schedule-preference-2026-10-04',
  'system',
  null,
  now(),
  null
from public.method_configuration_templates t
where t.template_key = 'evaluation.assessment_schedule_preferences';
