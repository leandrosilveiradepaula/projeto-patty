-- pgTAP coverage for the first versioned professional method templates.
-- Values below are the confirmed current template baseline, not permanent code constants.

begin;

select no_plan();

select is(
  (
    select count(*)
    from public.method_configuration_templates
    where template_key in (
      'nutrition.dose.protein',
      'nutrition.dose.carbohydrate',
      'nutrition.dose.fat',
      'nutrition.recognition.macros'
    )
  ),
  4::bigint,
  'four initial method templates are seeded'
);

select is(
  (
    select count(*)
    from public.method_configuration_templates
    where template_key in (
      'nutrition.dose.protein',
      'nutrition.dose.carbohydrate',
      'nutrition.dose.fat',
      'nutrition.recognition.macros'
    )
      and created_by_kind = 'system'
      and created_by_profile_id is null
  ),
  4::bigint,
  'initial templates preserve system provenance without impersonating a profile'
);

select is(
  (
    select count(*)
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key in (
      'nutrition.dose.protein',
      'nutrition.dose.carbohydrate',
      'nutrition.dose.fat',
      'nutrition.recognition.macros'
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
  4::bigint,
  'initial template versions are active system baselines'
);

select is(
  (
    select v.configuration
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.dose.protein'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  '{"value":15,"unit":"g_per_dose"}'::jsonb,
  'protein dose baseline is 15 g per dose'
);

select is(
  (
    select v.configuration
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.dose.carbohydrate'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  '{"value":12,"unit":"g_per_dose"}'::jsonb,
  'carbohydrate dose baseline is 12 g per dose'
);

select is(
  (
    select v.configuration
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.dose.fat'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  '{"value":6,"unit":"g_per_dose"}'::jsonb,
  'fat dose baseline is 6 g per dose'
);

select is(
  (
    select (v.configuration #>> '{parameters,protein_per_kg,value}')::numeric
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.recognition.macros'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  2::numeric,
  'Recognition protein baseline is 2 g/kg'
);

select is(
  (
    select (v.configuration #>> '{parameters,carbohydrate_per_kg,value}')::numeric
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.recognition.macros'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  2::numeric,
  'Recognition carbohydrate baseline is 2 g/kg'
);

select is(
  (
    select (v.configuration #>> '{parameters,fat_daily,value}')::numeric
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.recognition.macros'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  50::numeric,
  'Recognition fat baseline is 50 g/day'
);

select throws_ok(
  $sql$insert into public.method_configuration_templates (
      template_key,
      domain_key,
      config_schema_key,
      display_name,
      created_by_kind,
      created_by_profile_id
    ) values (
      'test.invalid.profile.creator',
      'test',
      'scalar_parameter_v1',
      'Invalid profile creator',
      'profile',
      null
    )$sql$,
  '23514',
  null,
  'profile-created template requires a profile id'
);

select throws_ok(
  $sql$insert into public.method_configuration_versions (
      template_id,
      version_number,
      schema_version,
      configuration,
      source_kind,
      created_by_kind,
      created_by_profile_id,
      activated_at
    )
    select
      t.id,
      99,
      1,
      '{"value":1,"unit":"g_per_dose"}'::jsonb,
      'patty',
      'system',
      null,
      now()
    from public.method_configuration_templates t
    where t.template_key = 'nutrition.dose.protein'$sql$,
  '23514',
  null,
  'system-created version is restricted to system_baseline provenance'
);

select throws_ok(
  $sql$insert into public.method_configuration_versions (
      template_id,
      version_number,
      schema_version,
      configuration,
      source_kind,
      created_by_kind,
      created_by_profile_id
    )
    select
      t.id,
      100,
      1,
      '{"value":1,"unit":"g_per_dose"}'::jsonb,
      'system_baseline',
      'profile',
      'b1000000-0000-0000-0000-000000000001'::uuid
    from public.method_configuration_templates t
    where t.template_key = 'nutrition.dose.protein'$sql$,
  '23514',
  null,
  'profile-created version cannot claim system_baseline provenance'
);

select * from finish();
rollback;
