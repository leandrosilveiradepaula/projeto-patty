-- Regression coverage for Batch A method configuration templates.\n\nbegin;

select no_plan();

select is(
  (
    select count(*)
    from public.method_configuration_templates
    where template_key in (
      'nutrition.vegetable_carbohydrate_equivalence',
      'workflow.anamnesis_clarification_reminder'
    )
  ),
  2::bigint,
  'Batch A seeds exactly two templates'
);

select is(
  (
    select count(*)
    from public.method_configuration_templates
    where template_key in (
      'nutrition.vegetable_carbohydrate_equivalence',
      'workflow.anamnesis_clarification_reminder'
    )
      and created_by_kind = 'system'
      and created_by_profile_id is null
  ),
  2::bigint,
  'Batch A templates preserve system provenance'
);

select is(
  (
    select count(*)
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key in (
      'nutrition.vegetable_carbohydrate_equivalence',
      'workflow.anamnesis_clarification_reminder'
    )
      and v.version_number = 1
      and v.schema_version = 1
      and v.source_kind = 'system_baseline'
      and v.created_by_kind = 'system'
      and v.created_by_profile_id is null
      and v.activated_at is not null
      and v.activated_by_profile_id is null
      and v.retired_at is null
  ),
  2::bigint,
  'Batch A versions are active system baselines'
);

select is(
  (
    select t.config_schema_key
    from public.method_configuration_templates t
    where t.template_key = 'nutrition.vegetable_carbohydrate_equivalence'
  ),
  'method_engine_v1',
  'vegetable equivalence uses method_engine_v1'
);

select is(
  (
    select (v.configuration #>> '{parameters,vegetable_doses_per_carbohydrate_dose,value}')::numeric
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.vegetable_carbohydrate_equivalence'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  2::numeric,
  'vegetable equivalence baseline is 2 vegetable doses per carbohydrate dose'
);

select is(
  (
    select v.configuration #>> '{inputs,vegetable_doses,unit}'
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.vegetable_carbohydrate_equivalence'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  'dose',
  'vegetable equivalence input uses dose'
);

select is(
  (
    select v.configuration #>> '{outputs,carbohydrate_dose_equivalent,unit}'
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.vegetable_carbohydrate_equivalence'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  'dose',
  'vegetable equivalence output uses dose'
);

select is(
  (
    select v.configuration #>> '{outputs,carbohydrate_dose_equivalent,expression,op}'
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.vegetable_carbohydrate_equivalence'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  'divide',
  'vegetable equivalence is represented as a division'
);

select is(
  (
    select t.config_schema_key
    from public.method_configuration_templates t
    where t.template_key = 'workflow.anamnesis_clarification_reminder'
  ),
  'scalar_parameter_v1',
  'clarification reminder interval uses scalar_parameter_v1'
);

select is(
  (
    select v.configuration
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'workflow.anamnesis_clarification_reminder'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  '{"value":24,"unit":"hour"}'::jsonb,
  'clarification reminder baseline is 24 hours'
);

select is(
  (
    select count(*)
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.vegetable_carbohydrate_equivalence'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  1::bigint,
  'vegetable equivalence has exactly one active version'
);

select is(
  (
    select count(*)
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'workflow.anamnesis_clarification_reminder'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  1::bigint,
  'clarification reminder has exactly one active version'
);

select * from finish();

rollback;
