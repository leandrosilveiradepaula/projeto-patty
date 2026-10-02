-- pgTAP PROPOSAL ONLY.
-- Pair with the official Carb Cycle migration after Supabase CLI creates it.

begin;
select no_plan();

select is(
  (select count(*) from public.method_configuration_templates
   where template_key in ('nutrition.carb_cycle.phase_1','nutrition.carb_cycle.phase_2','nutrition.carb_cycle.phase_3')),
  3::bigint,
  'exactly the three confirmed Carb Cycle phase templates exist'
);

select is(
  (select count(*) from public.method_configuration_templates
   where template_key like 'nutrition.carb_cycle.phase_%'
     and template_key not in ('nutrition.carb_cycle.phase_1','nutrition.carb_cycle.phase_2','nutrition.carb_cycle.phase_3')),
  0::bigint,
  'no unconfirmed Carb Cycle phase is seeded'
);

select is(
  (select count(*) from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key in ('nutrition.carb_cycle.phase_1','nutrition.carb_cycle.phase_2','nutrition.carb_cycle.phase_3')
     and t.config_schema_key='carb_cycle_v1'
     and v.version_number=1
     and v.schema_version=1
     and v.source_kind='system_baseline'
     and v.created_by_kind='system'
     and v.activated_at is not null
     and v.retired_at is null),
  3::bigint,
  'all confirmed Carb Cycle baselines have one active system version'
);

select is(
  (select (v.configuration #>> '{steps,0,carbohydratePerKg,value}')::numeric
   from public.method_configuration_versions v join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='nutrition.carb_cycle.phase_1' and v.retired_at is null),
  1.55::numeric,
  'phase 1 Low 1 carbohydrate coefficient is preserved'
);

select is(
  (select (v.configuration #>> '{steps,2,carbohydratePerKg,value}')::numeric
   from public.method_configuration_versions v join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='nutrition.carb_cycle.phase_2' and v.retired_at is null),
  3.5::numeric,
  'phase 2 High carbohydrate coefficient is preserved'
);

select is(
  (select (v.configuration #>> '{steps,0,carbohydratePerKg,value}')::numeric
   from public.method_configuration_versions v join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key='nutrition.carb_cycle.phase_3' and v.retired_at is null),
  0.95::numeric,
  'phase 3 Low 1 carbohydrate coefficient is preserved'
);

select is(
  (select count(*) from public.method_configuration_versions v
   join public.method_configuration_templates t on t.id=v.template_id
   where t.template_key in ('nutrition.carb_cycle.phase_1','nutrition.carb_cycle.phase_2','nutrition.carb_cycle.phase_3')
     and (v.configuration::text like '%phase_4%' or v.configuration::text like '%phase_5%' or v.configuration::text like '%phase_6%')),
  0::bigint,
  'configuration does not infer phases 4, 5 or 6'
);

select * from finish();
rollback;
