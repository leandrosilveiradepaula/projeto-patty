-- pgTAP coverage for the higher-fat protein daily limit template.
-- The baseline is confirmed current behavior, not a permanent runtime constant.

begin;

select no_plan();

select is(
  (
    select count(*)
    from public.method_configuration_templates
    where template_key = 'nutrition.protein.higher_fat_daily_limit'
  ),
  1::bigint,
  'higher-fat protein limit template is seeded'
);

select is(
  (
    select count(*)
    from public.method_configuration_templates
    where template_key = 'nutrition.protein.higher_fat_daily_limit'
      and created_by_kind = 'system'
      and created_by_profile_id is null
  ),
  1::bigint,
  'higher-fat protein template preserves system provenance'
);

select is(
  (
    select count(*)
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.protein.higher_fat_daily_limit'
      and v.version_number = 1
      and v.schema_version = 1
      and v.source_kind = 'system_baseline'
      and v.created_by_kind = 'system'
      and v.created_by_profile_id is null
      and v.activated_at is not null
      and v.activated_by_profile_id is null
      and v.retired_at is null
  ),
  1::bigint,
  'higher-fat protein template version is an active system baseline'
);

select is(
  (
    select (v.configuration #>> '{parameters,higher_fat_ratio,value}')::numeric
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.protein.higher_fat_daily_limit'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  0.5::numeric,
  'higher-fat protein ratio baseline is 0.5'
);

select is(
  (
    select v.configuration #>> '{outputs,max_higher_fat_protein_doses,expression,op}'
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.protein.higher_fat_daily_limit'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  'ceil'::text,
  'rounding-up behavior is stored in configuration'
);

select is(
  (
    select v.configuration #>> '{outputs,max_higher_fat_protein_doses,expression,arg,op}'
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.protein.higher_fat_daily_limit'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  'multiply'::text,
  'higher-fat protein formula uses configured multiplication'
);

select * from finish();
rollback;
