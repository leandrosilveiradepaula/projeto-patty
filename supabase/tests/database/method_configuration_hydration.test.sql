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
      and v.retired_at is not null
  ),
  60::numeric,
  'hydration v1 preserves the historical 60 ml per kg baseline after retirement'
);

select is(
  (
    select (v.configuration #>> '{parameters,daily_ml_per_kg,value}')::numeric
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'hydration.daily_target'
      and v.version_number = 2
      and v.activated_at is not null
      and v.retired_at is null
  ),
  35::numeric,
  'hydration v2 is the active professional baseline at 35 ml per kg'
);

select is(
  (
    select count(*)
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'hydration.daily_target'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  1::bigint,
  'hydration has exactly one active configuration version'
);

select is(
  (
    select v.configuration #>> '{outputs,target_ml,expression,op}'
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'hydration.daily_target'
      and v.version_number = 2
  ),
  'round'::text,
  'hydration rounding remains explicit in active configuration'
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



select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_hydration_target_from_method_snapshot(uuid,uuid,numeric,uuid,jsonb,jsonb,integer,uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute the privileged hydration persistence boundary'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.create_hydration_target_from_method_snapshot(uuid,uuid,numeric,uuid,jsonb,jsonb,integer,uuid)',
    'EXECUTE'
  ),
  'service role can execute the controlled hydration persistence boundary'
);

insert into public.client_method_configuration_override_versions (
  id,
  client_id,
  template_id,
  based_on_template_version_id,
  version_number,
  override_configuration,
  created_by_profile_id,
  activated_at,
  activated_by_profile_id,
  reason
)
select
  'c5000000-0000-0000-0000-000000000001',
  'c2000000-0000-0000-0000-000000000001',
  t.id,
  v.id,
  1,
  '{"parameters":{"daily_ml_per_kg":{"value":55,"unit":"ml_per_kg"}}}'::jsonb,
  'c1000000-0000-0000-0000-000000000001',
  now(),
  'c1000000-0000-0000-0000-000000000001',
  'synthetic hydration override'
from public.method_configuration_templates t
join public.method_configuration_versions v on v.template_id = t.id
where t.template_key = 'hydration.daily_target'
  and v.version_number = 2;

select throws_ok(
  $sql$
    select public.create_hydration_target_from_method_snapshot(
      'c2000000-0000-0000-0000-000000000001',
      'c1000000-0000-0000-0000-000000000002',
      80,
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'hydration.daily_target'
          and v.version_number = 2
      ),
      '{
        "inputs":{"weight_kg":{"unit":"kg"}},
        "parameters":{"daily_ml_per_kg":{"value":35,"unit":"ml_per_kg"}},
        "outputs":{
          "target_ml":{
            "unit":"ml",
            "expression":{
              "op":"round",
              "arg":{
                "op":"multiply",
                "args":[
                  {"op":"input","key":"weight_kg"},
                  {"op":"parameter","key":"daily_ml_per_kg"}
                ]
              }
            }
          }
        }
      }'::jsonb,
      '{"target_ml":{"value":2800,"unit":"ml"}}'::jsonb,
      2800,
      null
    )
  $sql$,
  '42501',
  null,
  'atomic hydration boundary rejects an actor without an active admin assignment'
);

insert into auth.users (id, email, raw_user_meta_data)
values (
  'c1000000-0000-0000-0000-000000000003',
  'hydration-other-client@example.test',
  '{}'
);

insert into public.profiles (id, display_name)
values (
  'c1000000-0000-0000-0000-000000000003',
  'Hydration Other Client'
);

insert into public.user_roles (profile_id, role)
values (
  'c1000000-0000-0000-0000-000000000003',
  'client'
);

insert into public.clients (id, profile_id)
values (
  'c2000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003'
);

insert into public.client_method_configuration_override_versions (
  id,
  client_id,
  template_id,
  based_on_template_version_id,
  version_number,
  override_configuration,
  created_by_profile_id,
  activated_at,
  activated_by_profile_id,
  reason
)
select
  'c5000000-0000-0000-0000-000000000002',
  'c2000000-0000-0000-0000-000000000002',
  t.id,
  v.id,
  1,
  '{"parameters":{"daily_ml_per_kg":{"value":50,"unit":"ml_per_kg"}}}'::jsonb,
  'c1000000-0000-0000-0000-000000000001',
  now(),
  'c1000000-0000-0000-0000-000000000001',
  'synthetic cross-client hydration override'
from public.method_configuration_templates t
join public.method_configuration_versions v on v.template_id = t.id
where t.template_key = 'hydration.daily_target'
  and v.version_number = 2;

select throws_ok(
  $sql$
    select public.create_hydration_target_from_method_snapshot(
      'c2000000-0000-0000-0000-000000000001',
      'c1000000-0000-0000-0000-000000000001',
      80,
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'hydration.daily_target'
          and v.version_number = 2
      ),
      '{
        "inputs":{"weight_kg":{"unit":"kg"}},
        "parameters":{"daily_ml_per_kg":{"value":50,"unit":"ml_per_kg"}},
        "outputs":{
          "target_ml":{
            "unit":"ml",
            "expression":{
              "op":"round",
              "arg":{
                "op":"multiply",
                "args":[
                  {"op":"input","key":"weight_kg"},
                  {"op":"parameter","key":"daily_ml_per_kg"}
                ]
              }
            }
          }
        }
      }'::jsonb,
      '{"target_ml":{"value":4000,"unit":"ml"}}'::jsonb,
      4000,
      'c5000000-0000-0000-0000-000000000002'
    )
  $sql$,
  '22023',
  null,
  'atomic hydration boundary rejects an override owned by another client'
);

select isnt(
  public.create_hydration_target_from_method_snapshot(
    'c2000000-0000-0000-0000-000000000001',
    'c1000000-0000-0000-0000-000000000001',
    80,
    (
      select v.id
      from public.method_configuration_versions v
      join public.method_configuration_templates t on t.id = v.template_id
      where t.template_key = 'hydration.daily_target'
        and v.version_number = 2
    ),
    '{
      "inputs":{"weight_kg":{"unit":"kg"}},
      "parameters":{"daily_ml_per_kg":{"value":55,"unit":"ml_per_kg"}},
      "outputs":{
        "target_ml":{
          "unit":"ml",
          "expression":{
            "op":"round",
            "arg":{
              "op":"multiply",
              "args":[
                {"op":"input","key":"weight_kg"},
                {"op":"parameter","key":"daily_ml_per_kg"}
              ]
            }
          }
        }
      }
    }'::jsonb,
    '{"target_ml":{"value":4400,"unit":"ml"}}'::jsonb,
    4400,
    'c5000000-0000-0000-0000-000000000001'
  ),
  null::uuid,
  'atomic hydration boundary creates a configured target'
);

select is(
  (
    select resolved_target_ml
    from public.client_hydration_targets
    where client_id = 'c2000000-0000-0000-0000-000000000001'
      and weight_kg = 80
      and method_key = 'method_configuration_snapshot'
  ),
  4400,
  'atomic hydration boundary persists the resolved configured result'
);

select is(
  (
    select count(*)
    from public.method_configuration_snapshots s
    join public.method_configuration_snapshot_sets ss
      on ss.id = s.snapshot_set_id
    where ss.client_id = 'c2000000-0000-0000-0000-000000000001'
      and s.input_values #>> '{weight_kg,value}' = '80'
      and s.resolved_configuration #>> '{parameters,daily_ml_per_kg,value}' = '55'
      and s.result_values #>> '{target_ml,value}' = '4400'
  ),
  1::bigint,
  'atomic hydration boundary preserves inputs, resolved configuration, and results'
);

select is(
  (
    select count(*)
    from public.method_configuration_snapshot_overrides so
    join public.method_configuration_snapshots s on s.id = so.snapshot_id
    where so.override_version_id = 'c5000000-0000-0000-0000-000000000001'
      and s.input_values #>> '{weight_kg,value}' = '80'
      and so.precedence = 1
  ),
  1::bigint,
  'atomic hydration boundary preserves the applied client override'
);

select throws_ok(
  $sql$
    select public.create_hydration_target_from_method_snapshot(
      'c2000000-0000-0000-0000-000000000001',
      'c1000000-0000-0000-0000-000000000001',
      80,
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'hydration.daily_target'
          and v.version_number = 2
      ),
      '{"inputs":{},"parameters":{},"outputs":{}}'::jsonb,
      '{"target_ml":{"value":4401,"unit":"ml"}}'::jsonb,
      4400,
      null
    )
  $sql$,
  '22023',
  null,
  'atomic hydration boundary rejects a result payload that disagrees with resolved target'
);

select * from finish();
rollback;
