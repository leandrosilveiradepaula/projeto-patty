-- pgTAP coverage for hydration configuration compatibility.
-- Uses synthetic data only.

begin;

select no_plan();

select is(
  (
    select count(*)
    from public.method_configuration_templates
    where template_key = 'hydration.daily_target'
      and domain_key = 'hydration'
      and config_schema_key = 'method_engine_v1'
      and created_by_kind = 'system'
      and created_by_profile_id is null
  ),
  1::bigint,
  'hydration daily target template is seeded with system provenance'
);

select is(
  (
    select (v.configuration #>> '{parameters,daily_ml_per_kg,value}')::numeric
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'hydration.daily_target'
      and v.version_number = 1
      and v.activated_at is not null
      and v.retired_at is null
  ),
  60::numeric,
  'hydration baseline is 60 ml per kg'
);

select is(
  (
    select v.configuration #>> '{outputs,target_ml,expression,op}'
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'hydration.daily_target'
      and v.version_number = 1
  ),
  'round'::text,
  'hydration rounding remains explicit in configuration'
);

select has_column(
  'public',
  'client_hydration_targets',
  'method_configuration_snapshot_set_id',
  'hydration targets can reference a method configuration snapshot set'
);

select has_column(
  'public',
  'client_hydration_targets',
  'resolved_target_ml',
  'hydration targets can store a resolved configured target'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('c1000000-0000-0000-0000-000000000001', 'hydration-admin@example.test', '{}'),
  ('c1000000-0000-0000-0000-000000000002', 'hydration-client@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('c1000000-0000-0000-0000-000000000001', 'Hydration Admin'),
  ('c1000000-0000-0000-0000-000000000002', 'Hydration Client');

insert into public.user_roles (profile_id, role)
values
  ('c1000000-0000-0000-0000-000000000001', 'admin'),
  ('c1000000-0000-0000-0000-000000000002', 'client');

insert into public.clients (id, profile_id)
values (
  'c2000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002'
);

insert into public.client_assignments (client_id, staff_profile_id, ended_at)
values (
  'c2000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  null
);

insert into public.client_hydration_targets (
  id,
  client_id,
  weight_kg,
  created_by_profile_id
)
values (
  'c3000000-0000-0000-0000-000000000001',
  'c2000000-0000-0000-0000-000000000001',
  60,
  'c1000000-0000-0000-0000-000000000001'
);

select is(
  (
    select target_ml
    from public.client_hydration_targets
    where id = 'c3000000-0000-0000-0000-000000000001'
  ),
  3600,
  'legacy hydration target behavior remains readable'
);

select is(
  (
    select method_key
    from public.client_hydration_targets
    where id = 'c3000000-0000-0000-0000-000000000001'
  ),
  'patty_60_ml_per_kg'::text,
  'legacy hydration target keeps the historical method key'
);

insert into public.method_configuration_snapshot_sets (
  id,
  client_id,
  engine_contract_version,
  created_by_profile_id
)
values (
  'c4000000-0000-0000-0000-000000000001',
  'c2000000-0000-0000-0000-000000000001',
  1,
  'c1000000-0000-0000-0000-000000000001'
);

insert into public.client_hydration_targets (
  id,
  client_id,
  weight_kg,
  method_key,
  method_configuration_snapshot_set_id,
  resolved_target_ml,
  created_by_profile_id
)
values (
  'c3000000-0000-0000-0000-000000000002',
  'c2000000-0000-0000-0000-000000000001',
  70,
  'method_configuration_snapshot',
  'c4000000-0000-0000-0000-000000000001',
  3850,
  'c1000000-0000-0000-0000-000000000001'
);

select is(
  (
    select resolved_target_ml
    from public.client_hydration_targets
    where id = 'c3000000-0000-0000-0000-000000000002'
  ),
  3850,
  'configured hydration target stores the resolved snapshot result separately'
);

select is(
  (
    select method_configuration_snapshot_set_id
    from public.client_hydration_targets
    where id = 'c3000000-0000-0000-0000-000000000002'
  ),
  'c4000000-0000-0000-0000-000000000001'::uuid,
  'configured hydration target references its snapshot set'
);

select throws_ok(
  $sql$
    insert into public.client_hydration_targets (
      client_id,
      weight_kg,
      method_key,
      resolved_target_ml,
      created_by_profile_id
    )
    values (
      'c2000000-0000-0000-0000-000000000001',
      70,
      'method_configuration_snapshot',
      3850,
      'c1000000-0000-0000-0000-000000000001'
    )
  $sql$,
  '23514',
  null,
  'configured hydration target cannot omit the snapshot set'
);

select throws_ok(
  $sql$
    insert into public.client_hydration_targets (
      client_id,
      weight_kg,
      method_key,
      resolved_target_ml,
      created_by_profile_id
    )
    values (
      'c2000000-0000-0000-0000-000000000001',
      60,
      'patty_60_ml_per_kg',
      3600,
      'c1000000-0000-0000-0000-000000000001'
    )
  $sql$,
  '23514',
  null,
  'legacy hydration mode cannot masquerade as a configured snapshot'
);

select throws_ok(
  $sql$
    insert into public.client_hydration_targets (
      client_id,
      weight_kg,
      method_key,
      method_configuration_snapshot_set_id,
      resolved_target_ml,
      created_by_profile_id
    )
    values (
      'c2000000-0000-0000-0000-000000000001',
      70,
      'method_configuration_snapshot',
      'c4000000-0000-0000-0000-000000000001',
      0,
      'c1000000-0000-0000-0000-000000000001'
    )
  $sql$,
  '23514',
  null,
  'configured hydration target must remain positive'
);

select * from finish();
rollback;
