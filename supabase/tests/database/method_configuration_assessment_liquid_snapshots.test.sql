-- pgTAP coverage for assessment/liquid method snapshots.
-- Synthetic data only.

begin;
select no_plan();

select has_column(
  'public',
  'client_assessments',
  'method_configuration_snapshot_set_id',
  'assessments can reference a method configuration snapshot set'
);

select has_column(
  'public',
  'client_liquid_intake_events',
  'method_configuration_snapshot_set_id',
  'liquid intake events can reference a method configuration snapshot set'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.finalize_assessment_from_method_snapshot(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb)',
    'EXECUTE'
  ),
  'authenticated cannot execute assessment snapshot persistence boundary'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.finalize_assessment_from_method_snapshot(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb)',
    'EXECUTE'
  ),
  'service role can execute assessment snapshot persistence boundary'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_liquid_intake_event_from_method_snapshot(uuid,uuid,integer,text,uuid,jsonb,jsonb)',
    'EXECUTE'
  ),
  'authenticated cannot execute liquid snapshot persistence boundary'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.create_liquid_intake_event_from_method_snapshot(uuid,uuid,integer,text,uuid,jsonb,jsonb)',
    'EXECUTE'
  ),
  'service role can execute liquid snapshot persistence boundary'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('d1000000-0000-0000-0000-000000000001', 'snapshot-admin@example.test', '{}'),
  ('d1000000-0000-0000-0000-000000000002', 'snapshot-client@example.test', '{}'),
  ('d1000000-0000-0000-0000-000000000003', 'snapshot-other-client@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('d1000000-0000-0000-0000-000000000001', 'Snapshot Admin'),
  ('d1000000-0000-0000-0000-000000000002', 'Snapshot Client'),
  ('d1000000-0000-0000-0000-000000000003', 'Snapshot Other Client');

insert into public.user_roles (profile_id, role)
values
  ('d1000000-0000-0000-0000-000000000001', 'admin'),
  ('d1000000-0000-0000-0000-000000000002', 'client'),
  ('d1000000-0000-0000-0000-000000000003', 'client');

insert into public.clients (id, profile_id, full_name, status)
values
  ('d2000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 'Snapshot Client A', 'active'),
  ('d2000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000003', 'Snapshot Client B', 'active');

insert into public.client_assignments (client_id, staff_profile_id, ended_at)
values (
  'd2000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000001',
  null
);

-- Legacy/history compatibility: existing final rows and old liquid events may
-- remain without a snapshot.
insert into public.client_assessments (
  id,
  client_id,
  assessed_at,
  assessment_kind,
  finalized_at
)
values (
  'd3000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001',
  now() - interval '30 days',
  'fortnightly',
  now() - interval '29 days'
);

select is(
  (
    select method_configuration_snapshot_set_id
    from public.client_assessments
    where id = 'd3000000-0000-0000-0000-000000000001'
  ),
  null::uuid,
  'legacy finalized assessment remains readable without a snapshot'
);

insert into public.client_liquid_intake_events (
  id,
  client_id,
  recorded_by_profile_id,
  amount_ml,
  liquid_kind
)
values (
  'd4000000-0000-0000-0000-000000000001',
  'd2000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002',
  300,
  'water'
);

select is(
  (
    select method_configuration_snapshot_set_id
    from public.client_liquid_intake_events
    where id = 'd4000000-0000-0000-0000-000000000001'
  ),
  null::uuid,
  'legacy liquid event remains readable without a snapshot'
);

insert into public.client_assessments (
  id,
  client_id,
  assessed_at,
  assessment_kind,
  created_by_profile_id
)
values (
  'd3000000-0000-0000-0000-000000000002',
  'd2000000-0000-0000-0000-000000000001',
  now(),
  'fortnightly',
  'd1000000-0000-0000-0000-000000000001'
);

select throws_ok(
  $sql$
    select public.finalize_assessment_from_method_snapshot(
      'd3000000-0000-0000-0000-000000000002',
      'd1000000-0000-0000-0000-000000000003',
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'evaluation.assessment_kind_catalog'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      (
        select v.configuration
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'evaluation.assessment_kind_catalog'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '{"historical_code":"fortnightly","semantic_key":"basic","label":"Básica"}'::jsonb,
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'evaluation.assessment_definition.basic'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      (
        select v.configuration
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'evaluation.assessment_definition.basic'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '{"kind_key":"basic","can_finalize":true}'::jsonb
    )
  $sql$,
  '42501',
  null,
  'assessment snapshot boundary rejects an actor without active assignment'
);

select throws_ok(
  $sql$
    select public.finalize_assessment_from_method_snapshot(
      'd3000000-0000-0000-0000-000000000002',
      'd1000000-0000-0000-0000-000000000001',
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'evaluation.assessment_kind_catalog'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '{"entries":[]}'::jsonb,
      '{"historical_code":"fortnightly","semantic_key":"basic","label":"Básica"}'::jsonb,
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'evaluation.assessment_definition.basic'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      (
        select v.configuration
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'evaluation.assessment_definition.basic'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '{"kind_key":"basic","can_finalize":true}'::jsonb
    )
  $sql$,
  '22023',
  null,
  'assessment snapshot boundary rejects configuration that differs from active version'
);

select throws_ok(
  $sql$
    select public.finalize_assessment_from_method_snapshot(
      'd3000000-0000-0000-0000-000000000002',
      'd1000000-0000-0000-0000-000000000001',
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'evaluation.assessment_kind_catalog'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      (
        select v.configuration
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'evaluation.assessment_kind_catalog'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '{"historical_code":"fortnightly","semantic_key":"basic","label":"Básica"}'::jsonb,
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'evaluation.assessment_definition.basic'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      (
        select v.configuration
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'evaluation.assessment_definition.basic'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '{"kind_key":"basic","can_finalize":false}'::jsonb
    )
  $sql$,
  '22023',
  null,
  'assessment snapshot boundary refuses a non-ready result'
);

insert into public.assessment_measurements (
  assessment_id,
  measurement_key,
  measurement_value,
  unit
)
values
  ('d3000000-0000-0000-0000-000000000002', 'peso', 70, 'kg'),
  ('d3000000-0000-0000-0000-000000000002', 'cintura', 75, 'cm'),
  ('d3000000-0000-0000-0000-000000000002', 'abdomen', 80, 'cm'),
  ('d3000000-0000-0000-0000-000000000002', 'quadril', 95, 'cm');

select isnt(
  public.finalize_assessment_from_method_snapshot(
    'd3000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000001',
    (
      select v.id
      from public.method_configuration_versions v
      join public.method_configuration_templates t on t.id = v.template_id
      where t.template_key = 'evaluation.assessment_kind_catalog'
        and v.activated_at is not null
        and v.retired_at is null
    ),
    (
      select v.configuration
      from public.method_configuration_versions v
      join public.method_configuration_templates t on t.id = v.template_id
      where t.template_key = 'evaluation.assessment_kind_catalog'
        and v.activated_at is not null
        and v.retired_at is null
    ),
    '{"historical_code":"fortnightly","semantic_key":"basic","label":"Básica"}'::jsonb,
    (
      select v.id
      from public.method_configuration_versions v
      join public.method_configuration_templates t on t.id = v.template_id
      where t.template_key = 'evaluation.assessment_definition.basic'
        and v.activated_at is not null
        and v.retired_at is null
    ),
    (
      select v.configuration
      from public.method_configuration_versions v
      join public.method_configuration_templates t on t.id = v.template_id
      where t.template_key = 'evaluation.assessment_definition.basic'
        and v.activated_at is not null
        and v.retired_at is null
    ),
    '{"kind_key":"basic","can_finalize":true}'::jsonb
  ),
  null::uuid,
  'assessment snapshot boundary finalizes a ready draft'
);

select is(
  (
    select count(*)
    from public.method_configuration_snapshots s
    join public.client_assessments a
      on a.method_configuration_snapshot_set_id = s.snapshot_set_id
    where a.id = 'd3000000-0000-0000-0000-000000000002'
      and s.template_key in (
        'evaluation.assessment_kind_catalog',
        'evaluation.assessment_definition.basic'
      )
  ),
  2::bigint,
  'assessment finalization preserves catalog and definition snapshots'
);

select ok(
  (
    select finalized_at is not null
       and finalized_by_profile_id = 'd1000000-0000-0000-0000-000000000001'
       and method_configuration_snapshot_set_id is not null
    from public.client_assessments
    where id = 'd3000000-0000-0000-0000-000000000002'
  ),
  'assessment finalization links the snapshot set and finalization actor'
);

select throws_ok(
  $sql$
    select public.create_liquid_intake_event_from_method_snapshot(
      'd2000000-0000-0000-0000-000000000001',
      'd1000000-0000-0000-0000-000000000003',
      250,
      'water',
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'hydration.liquid_taxonomy'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      (
        select v.configuration
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'hydration.liquid_taxonomy'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '{"liquid_kind":"water","hydration_class":"pure_water"}'::jsonb
    )
  $sql$,
  '42501',
  null,
  'liquid snapshot boundary rejects an actor who does not own the client'
);

select throws_ok(
  $sql$
    select public.create_liquid_intake_event_from_method_snapshot(
      'd2000000-0000-0000-0000-000000000001',
      'd1000000-0000-0000-0000-000000000002',
      250,
      'water',
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'hydration.liquid_taxonomy'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '{"kinds":[]}'::jsonb,
      '{"liquid_kind":"water","hydration_class":"pure_water"}'::jsonb
    )
  $sql$,
  '22023',
  null,
  'liquid snapshot boundary rejects configuration that differs from active version'
);

select throws_ok(
  $sql$
    select public.create_liquid_intake_event_from_method_snapshot(
      'd2000000-0000-0000-0000-000000000001',
      'd1000000-0000-0000-0000-000000000002',
      250,
      'juice',
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'hydration.liquid_taxonomy'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      (
        select v.configuration
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'hydration.liquid_taxonomy'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '{"liquid_kind":"juice"}'::jsonb
    )
  $sql$,
  '22023',
  null,
  'liquid snapshot boundary rejects a kind absent from the active taxonomy'
);

select throws_ok(
  $sql$
    select public.create_liquid_intake_event_from_method_snapshot(
      'd2000000-0000-0000-0000-000000000001',
      'd1000000-0000-0000-0000-000000000002',
      250,
      'water',
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'hydration.liquid_taxonomy'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      (
        select v.configuration
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'hydration.liquid_taxonomy'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '{"liquid_kind":"water","hydration_class":"zero_calorie_other"}'::jsonb
    )
  $sql$,
  '22023',
  null,
  'liquid snapshot boundary rejects a hydration class that disagrees with active taxonomy'
);

select isnt(
  public.create_liquid_intake_event_from_method_snapshot(
    'd2000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000002',
    450,
    'water',
    (
      select v.id
      from public.method_configuration_versions v
      join public.method_configuration_templates t on t.id = v.template_id
      where t.template_key = 'hydration.liquid_taxonomy'
        and v.activated_at is not null
        and v.retired_at is null
    ),
    (
      select v.configuration
      from public.method_configuration_versions v
      join public.method_configuration_templates t on t.id = v.template_id
      where t.template_key = 'hydration.liquid_taxonomy'
        and v.activated_at is not null
        and v.retired_at is null
    ),
    '{"liquid_kind":"water","hydration_class":"pure_water"}'::jsonb
  ),
  null::uuid,
  'liquid snapshot boundary creates an event with a configuration snapshot'
);

select is(
  (
    select count(*)
    from public.client_liquid_intake_events e
    join public.method_configuration_snapshots s
      on s.snapshot_set_id = e.method_configuration_snapshot_set_id
    where e.client_id = 'd2000000-0000-0000-0000-000000000001'
      and e.amount_ml = 450
      and e.liquid_kind = 'water'
      and s.template_key = 'hydration.liquid_taxonomy'
      and s.result_values #>> '{liquid_kind}' = 'water'
  ),
  1::bigint,
  'liquid event preserves the selected taxonomy version and result'
);

select * from finish();
rollback;
