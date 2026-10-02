-- pgTAP PROPOSAL ONLY.
-- Pair with the official assessment configuration migration after CLI generation.

begin;
select no_plan();

select is(
  (select count(*) from public.method_configuration_templates
   where template_key in (
     'evaluation.assessment_kind_catalog',
     'evaluation.assessment_definition.basic',
     'evaluation.assessment_definition.complete'
   )),
  3::bigint,
  'assessment configuration seeds exactly three templates'
);

select is(
  (select count(*) from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key in (
     'evaluation.assessment_kind_catalog',
     'evaluation.assessment_definition.basic',
     'evaluation.assessment_definition.complete'
   )
   and v.version_number=1 and v.schema_version=1
   and v.source_kind='system_baseline'
   and v.created_by_kind='system'
   and v.activated_at is not null and v.retired_at is null),
  3::bigint,
  'assessment baselines have one active system version'
);

select is(
  (select v.configuration #>> '{entries,0,historicalCode}'
   from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='evaluation.assessment_kind_catalog' and v.retired_at is null),
  'fortnightly',
  'historical basic code is preserved'
);

select is(
  (select v.configuration #>> '{entries,1,historicalCode}'
   from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='evaluation.assessment_kind_catalog' and v.retired_at is null),
  'monthly',
  'historical complete code is preserved'
);

select is(
  (select jsonb_array_length(v.configuration->'requiredMeasurements')
   from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='evaluation.assessment_definition.basic' and v.retired_at is null),
  4,
  'Basic assessment baseline has four required measurements'
);

select is(
  (select jsonb_array_length(v.configuration->'requiredMeasurements')
   from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='evaluation.assessment_definition.complete' and v.retired_at is null),
  9,
  'Complete assessment baseline has nine required measurements'
);

select is(
  (select (v.configuration #>> '{photoRequirement,minimumCount}')::integer
   from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='evaluation.assessment_definition.complete' and v.retired_at is null),
  1,
  'Complete assessment baseline requires at least one linked photo'
);

select is(
  (select count(*) from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key like 'evaluation.assessment_%'
     and (
       v.configuration ? 'cadenceDays'
       or v.configuration ? 'automaticCadenceDays'
       or v.configuration::text like '%anchorDay%'
     )),
  0::bigint,
  'assessment configuration does not invent cadence or month-end anchor rules'
);

select * from finish();
rollback;
