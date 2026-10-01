-- PROPOSAL V2 ONLY.
-- Companion pgTAP proposal for METHOD_CONFIGURATION_FOUNDATION_MIGRATION_PROPOSAL_V2.sql.
-- Keep outside supabase/tests/database until the migration receives an official filename.

begin;

select no_plan();

select has_table('public', 'method_configuration_templates');
select has_table('public', 'method_configuration_versions');
select has_table('public', 'client_method_configuration_override_versions');
select has_table('public', 'method_configuration_snapshot_sets');
select has_table('public', 'method_configuration_snapshots');
select has_table('public', 'method_configuration_snapshot_overrides');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.method_configuration_templates'::regclass),
  'method configuration templates have RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.method_configuration_versions'::regclass),
  'method configuration versions have RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.client_method_configuration_override_versions'::regclass),
  'client overrides have RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.method_configuration_snapshot_sets'::regclass),
  'snapshot sets have RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.method_configuration_snapshots'::regclass),
  'snapshots have RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.method_configuration_snapshot_overrides'::regclass),
  'snapshot overrides have RLS'
);

select ok(
  not has_table_privilege('anon', 'public.method_configuration_templates', 'SELECT'),
  'anon has no template access'
);
select ok(
  has_table_privilege('authenticated', 'public.method_configuration_templates', 'SELECT'),
  'authenticated has explicit template SELECT grant before RLS'
);
select ok(
  not has_table_privilege('authenticated', 'public.method_configuration_templates', 'INSERT'),
  'authenticated has no direct template INSERT'
);
select ok(
  not has_table_privilege('authenticated', 'public.client_method_configuration_override_versions', 'INSERT'),
  'authenticated has no direct override INSERT'
);
select ok(
  has_table_privilege('service_role', 'public.method_configuration_templates', 'INSERT'),
  'service role has explicit template INSERT for controlled server boundary'
);
select ok(
  has_table_privilege('service_role', 'public.method_configuration_versions', 'UPDATE'),
  'service role has explicit version UPDATE for controlled lifecycle'
);
select ok(
  has_table_privilege('service_role', 'public.method_configuration_snapshot_sets', 'INSERT'),
  'service role has explicit snapshot INSERT'
);
select ok(
  not has_table_privilege('service_role', 'public.method_configuration_snapshot_sets', 'DELETE'),
  'service role has no snapshot DELETE'
);
select ok(
  has_table_privilege('service_role', 'public.method_configuration_snapshot_overrides', 'INSERT'),
  'service role has explicit snapshot override INSERT'
);
select ok(
  not has_table_privilege('service_role', 'public.method_configuration_snapshot_overrides', 'DELETE'),
  'service role has no snapshot override DELETE'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('b1000000-0000-0000-0000-000000000001', 'config-admin-assigned@example.test', '{}'),
  ('b1000000-0000-0000-0000-000000000002', 'config-admin-unassigned@example.test', '{}'),
  ('b1000000-0000-0000-0000-000000000003', 'config-admin-ended@example.test', '{}'),
  ('b1000000-0000-0000-0000-000000000004', 'config-client-a@example.test', '{}'),
  ('b1000000-0000-0000-0000-000000000005', 'config-client-b@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('b1000000-0000-0000-0000-000000000001', 'Config Assigned Admin'),
  ('b1000000-0000-0000-0000-000000000002', 'Config Unassigned Admin'),
  ('b1000000-0000-0000-0000-000000000003', 'Config Ended Admin'),
  ('b1000000-0000-0000-0000-000000000004', 'Config Client A'),
  ('b1000000-0000-0000-0000-000000000005', 'Config Client B');

insert into public.user_roles (profile_id, role)
values
  ('b1000000-0000-0000-0000-000000000001', 'admin'),
  ('b1000000-0000-0000-0000-000000000002', 'admin'),
  ('b1000000-0000-0000-0000-000000000003', 'admin'),
  ('b1000000-0000-0000-0000-000000000004', 'client'),
  ('b1000000-0000-0000-0000-000000000005', 'client');

insert into public.clients (id, profile_id)
values
  ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004'),
  ('b2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005');

insert into public.client_assignments (client_id, staff_profile_id, ended_at)
values
  ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', null),
  ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', now());

insert into public.protocols (id, client_id)
values
  ('b3000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001'),
  ('b3000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002');

insert into public.protocol_versions (
  id,
  protocol_id,
  client_id,
  version_number,
  created_by_profile_id
)
values
  (
    'b4000000-0000-0000-0000-000000000001',
    'b3000000-0000-0000-0000-000000000001',
    'b2000000-0000-0000-0000-000000000001',
    1,
    'b1000000-0000-0000-0000-000000000001'
  ),
  (
    'b4000000-0000-0000-0000-000000000002',
    'b3000000-0000-0000-0000-000000000002',
    'b2000000-0000-0000-0000-000000000002',
    1,
    'b1000000-0000-0000-0000-000000000001'
  );

insert into public.method_configuration_templates (
  id,
  template_key,
  domain_key,
  config_schema_key,
  display_name,
  created_by_profile_id
)
values (
  'b5000000-0000-0000-0000-000000000001',
  'nutrition.dose.protein',
  'nutrition',
  'scalar_parameter_v1',
  'Dose de proteína',
  'b1000000-0000-0000-0000-000000000001'
);

insert into public.method_configuration_versions (
  id,
  template_id,
  version_number,
  schema_version,
  configuration,
  source_kind,
  created_by_profile_id,
  activated_at,
  activated_by_profile_id
)
values (
  'b6000000-0000-0000-0000-000000000001',
  'b5000000-0000-0000-0000-000000000001',
  1,
  1,
  '{"value":15,"unit":"g_per_dose"}'::jsonb,
  'runtime_baseline',
  'b1000000-0000-0000-0000-000000000001',
  now(),
  'b1000000-0000-0000-0000-000000000001'
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
values (
  'b7000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  'b5000000-0000-0000-0000-000000000001',
  'b6000000-0000-0000-0000-000000000001',
  1,
  '{"value":16}'::jsonb,
  'b1000000-0000-0000-0000-000000000001',
  now(),
  'b1000000-0000-0000-0000-000000000001',
  'synthetic override'
);

insert into public.method_configuration_snapshot_sets (
  id,
  client_id,
  engine_contract_version,
  created_by_profile_id
)
values (
  'b8000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  1,
  'b1000000-0000-0000-0000-000000000001'
);

insert into public.method_configuration_snapshots (
  id,
  snapshot_set_id,
  client_id,
  template_id,
  template_version_id,
  template_key,
  input_values,
  resolved_configuration,
  result_values
)
values (
  'b9000000-0000-0000-0000-000000000001',
  'b8000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  'b5000000-0000-0000-0000-000000000001',
  'b6000000-0000-0000-0000-000000000001',
  'nutrition.dose.protein',
  '{}'::jsonb,
  '{"value":16,"unit":"g_per_dose"}'::jsonb,
  '{"grams_per_dose":16}'::jsonb
);

insert into public.method_configuration_snapshot_overrides (
  snapshot_id,
  client_id,
  template_id,
  template_version_id,
  override_version_id,
  precedence
)
values (
  'b9000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  'b5000000-0000-0000-0000-000000000001',
  'b6000000-0000-0000-0000-000000000001',
  'b7000000-0000-0000-0000-000000000001',
  1
);

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'b1000000-0000-0000-0000-000000000004',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"b1000000-0000-0000-0000-000000000004","aal":"aal1","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.method_configuration_templates),
  0::bigint,
  'client has no direct access to global templates'
);
select is(
  (select count(*) from public.client_method_configuration_override_versions),
  0::bigint,
  'client has no direct access to overrides'
);
select is(
  (select count(*) from public.method_configuration_snapshot_sets),
  0::bigint,
  'client has no generic snapshot access'
);

select set_config(
  'request.jwt.claim.sub',
  'b1000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"b1000000-0000-0000-0000-000000000001","aal":"aal1","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.method_configuration_templates),
  0::bigint,
  'admin aal1 cannot read templates'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"b1000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.method_configuration_templates),
  1::bigint,
  'assigned admin aal2 reads global template'
);
select is(
  (select count(*) from public.client_method_configuration_override_versions),
  1::bigint,
  'assigned admin aal2 reads assigned client override'
);
select is(
  (select count(*) from public.method_configuration_snapshot_sets),
  1::bigint,
  'assigned admin aal2 reads assigned client snapshot set'
);
select is(
  (select count(*) from public.method_configuration_snapshots),
  1::bigint,
  'assigned admin aal2 reads assigned client snapshot'
);
select is(
  (select count(*) from public.method_configuration_snapshot_overrides),
  1::bigint,
  'assigned admin aal2 reads applied override chain'
);

select set_config(
  'request.jwt.claim.sub',
  'b1000000-0000-0000-0000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"b1000000-0000-0000-0000-000000000002","aal":"aal2","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.method_configuration_templates),
  1::bigint,
  'unassigned admin aal2 may read global templates'
);
select is(
  (select count(*) from public.client_method_configuration_override_versions),
  0::bigint,
  'unassigned admin cannot read client override'
);
select is(
  (select count(*) from public.method_configuration_snapshot_sets),
  0::bigint,
  'unassigned admin cannot read client snapshots'
);
select is(
  (select count(*) from public.method_configuration_snapshot_overrides),
  0::bigint,
  'unassigned admin cannot read snapshot override chain'
);

select set_config(
  'request.jwt.claim.sub',
  'b1000000-0000-0000-0000-000000000003',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"b1000000-0000-0000-0000-000000000003","aal":"aal2","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.client_method_configuration_override_versions),
  0::bigint,
  'ended assignment grants no current override access'
);

select throws_ok(
  $$insert into public.method_configuration_templates (
      template_key,
      domain_key,
      config_schema_key,
      display_name,
      created_by_profile_id
    ) values (
      'forbidden.direct.write',
      'test',
      'test_v1',
      'Forbidden',
      'b1000000-0000-0000-0000-000000000003'
    )$$,
  '42501',
  null,
  'authenticated browser cannot write templates directly'
);

reset role;

select throws_ok(
  $$insert into public.method_configuration_templates (
      template_key,
      domain_key,
      config_schema_key,
      display_name,
      created_by_profile_id
    ) values (
      '   ',
      'nutrition',
      'scalar_v1',
      'Blank key',
      'b1000000-0000-0000-0000-000000000001'
    )$$,
  '23514',
  null,
  'blank template key is rejected'
);

select throws_ok(
  $$insert into public.method_configuration_versions (
      template_id,
      version_number,
      schema_version,
      configuration,
      source_kind,
      created_by_profile_id
    ) values (
      'b5000000-0000-0000-0000-000000000001',
      2,
      1,
      '[]'::jsonb,
      'runtime_baseline',
      'b1000000-0000-0000-0000-000000000001'
    )$$,
  '23514',
  null,
  'configuration must be a JSON object'
);

select throws_ok(
  $$insert into public.method_configuration_versions (
      template_id,
      version_number,
      schema_version,
      configuration,
      source_kind,
      created_by_profile_id,
      activated_at,
      activated_by_profile_id
    ) values (
      'b5000000-0000-0000-0000-000000000001',
      2,
      1,
      '{"value":17,"unit":"g_per_dose"}'::jsonb,
      'patty',
      'b1000000-0000-0000-0000-000000000001',
      now(),
      'b1000000-0000-0000-0000-000000000001'
    )$$,
  '23505',
  null,
  'only one active template version is allowed'
);

select throws_ok(
  $$update public.method_configuration_versions
    set configuration = '{"value":99}'::jsonb
    where id = 'b6000000-0000-0000-0000-000000000001'$$,
  '55000',
  null,
  'active template version content is immutable'
);

select throws_ok(
  $$update public.method_configuration_versions
    set activated_at = null,
        activated_by_profile_id = null
    where id = 'b6000000-0000-0000-0000-000000000001'$$,
  '55000',
  null,
  'active template version cannot be unactivated'
);

select throws_ok(
  $$insert into public.client_method_configuration_override_versions (
      client_id,
      template_id,
      based_on_template_version_id,
      version_number,
      override_configuration,
      protocol_version_id,
      created_by_profile_id
    ) values (
      'b2000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      'b6000000-0000-0000-0000-000000000001',
      2,
      '{"value":18}'::jsonb,
      'b4000000-0000-0000-0000-000000000002',
      'b1000000-0000-0000-0000-000000000001'
    )$$,
  '23503',
  null,
  'protocol override cannot reference a protocol version from another client'
);

select throws_ok(
  $$insert into public.client_method_configuration_override_versions (
      client_id,
      template_id,
      based_on_template_version_id,
      version_number,
      override_configuration,
      created_by_profile_id,
      activated_at,
      activated_by_profile_id
    ) values (
      'b2000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      'b6000000-0000-0000-0000-000000000001',
      2,
      '{"value":18}'::jsonb,
      'b1000000-0000-0000-0000-000000000001',
      now(),
      'b1000000-0000-0000-0000-000000000001'
    )$$,
  '23505',
  null,
  'only one active client-level override is allowed per template'
);

select throws_ok(
  $$insert into public.method_configuration_snapshots (
      snapshot_set_id,
      client_id,
      template_id,
      template_version_id,
      template_key,
      input_values,
      resolved_configuration,
      result_values
    ) values (
      'b8000000-0000-0000-0000-000000000001',
      'b2000000-0000-0000-0000-000000000001',
      'b5000000-0000-0000-0000-000000000001',
      'b6000000-0000-0000-0000-000000000001',
      'nutrition.dose.carbohydrate',
      '{}'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb
    )$$,
  '23503',
  null,
  'snapshot template key must match template identity'
);

select throws_ok(
  $$update public.method_configuration_snapshot_sets
    set engine_contract_version = 2
    where id = 'b8000000-0000-0000-0000-000000000001'$$,
  '55000',
  null,
  'snapshot set is immutable'
);

select throws_ok(
  $delete from public.method_configuration_snapshots
    where id = 'b9000000-0000-0000-0000-000000000001'$,
  '55000',
  null,
  'snapshot item cannot be deleted'
);

select throws_ok(
  $update public.method_configuration_snapshot_overrides
    set precedence = 2
    where snapshot_id = 'b9000000-0000-0000-0000-000000000001'$,
  '55000',
  null,
  'snapshot override chain is immutable'
);

select * from finish();
rollback;
