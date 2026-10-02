-- pgTAP PROPOSAL ONLY.
-- Pair with the official liquid-taxonomy migration after CLI generation.

begin;
select no_plan();

select is(
  (select count(*) from public.method_configuration_templates
   where template_key='hydration.liquid_taxonomy'
     and domain_key='hydration'
     and config_schema_key='liquid_taxonomy_v1'
     and created_by_kind='system'),
  1::bigint,
  'liquid taxonomy system template exists'
);

select is(
  (select count(*) from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='hydration.liquid_taxonomy'
     and v.version_number=1
     and v.schema_version=1
     and v.source_kind='system_baseline'
     and v.created_by_kind='system'
     and v.activated_at is not null
     and v.retired_at is null),
  1::bigint,
  'liquid taxonomy has one active baseline version'
);

select is(
  (select jsonb_array_length(v.configuration->'kinds')
   from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='hydration.liquid_taxonomy' and v.retired_at is null),
  2,
  'baseline preserves exactly the two current historical liquid kinds'
);

select is(
  (select v.configuration #>> '{kinds,0,key}'
   from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='hydration.liquid_taxonomy' and v.retired_at is null),
  'water',
  'historical water key is preserved'
);

select is(
  (select v.configuration #>> '{kinds,1,key}'
   from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='hydration.liquid_taxonomy' and v.retired_at is null),
  'zero_calorie_other',
  'historical zero-calorie-other key is preserved'
);

select is(
  (select count(*) from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='hydration.liquid_taxonomy'
     and (v.configuration::text ilike '%ratio%' or v.configuration::text ilike '%minimum%water%')),
  0::bigint,
  'taxonomy does not invent a minimum pure-water ratio'
);

select * from finish();
rollback;
