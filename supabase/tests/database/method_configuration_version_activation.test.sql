-- pgTAP coverage for atomic admin-driven method configuration version changes.
-- Uses synthetic identities only.

begin;

select no_plan();

insert into auth.users (id, email, raw_user_meta_data)
values
  ('d1000000-0000-0000-0000-000000000001', 'config-admin@example.test', '{}'),
  ('d1000000-0000-0000-0000-000000000002', 'config-client@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('d1000000-0000-0000-0000-000000000001', 'Config Admin'),
  ('d1000000-0000-0000-0000-000000000002', 'Config Client');

insert into public.user_roles (profile_id, role)
values
  ('d1000000-0000-0000-0000-000000000001', 'admin'),
  ('d1000000-0000-0000-0000-000000000002', 'client');

select ok(
  not has_function_privilege(
    'authenticated',
    'public.activate_method_configuration_version_server(uuid,uuid,jsonb,text,uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute the internal configuration activation boundary'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.activate_method_configuration_version_server(uuid,uuid,jsonb,text,uuid)',
    'EXECUTE'
  ),
  'service role can execute the internal configuration activation boundary'
);

select isnt(
  public.activate_method_configuration_version_server(
    (
      select id
      from public.method_configuration_templates
      where template_key = 'nutrition.dose.protein'
    ),
    (
      select v.id
      from public.method_configuration_versions v
      join public.method_configuration_templates t on t.id = v.template_id
      where t.template_key = 'nutrition.dose.protein'
        and v.activated_at is not null
        and v.retired_at is null
    ),
    '{"value":16,"unit":"g_per_dose"}'::jsonb,
    'pgtap-version-update',
    'd1000000-0000-0000-0000-000000000001'
  ),
  null::uuid,
  'admin-driven activation returns the new version id'
);

select is(
  (
    select count(*)
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.dose.protein'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  1::bigint,
  'exactly one protein-dose version remains active'
);

select is(
  (
    select v.configuration
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.dose.protein'
      and v.version_number = 2
      and v.activated_at is not null
      and v.retired_at is null
  ),
  '{"value":16,"unit":"g_per_dose"}'::jsonb,
  'new version contains the requested validated configuration'
);

select is(
  (
    select v.created_by_profile_id
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.dose.protein'
      and v.version_number = 2
  ),
  'd1000000-0000-0000-0000-000000000001'::uuid,
  'new version preserves the admin actor'
);

select ok(
  exists (
    select 1
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'nutrition.dose.protein'
      and v.version_number = 1
      and v.retired_at is not null
      and v.retired_by_profile_id = 'd1000000-0000-0000-0000-000000000001'
  ),
  'previous active version is retired with the same actor'
);

select throws_ok(
  $sql$
    select public.activate_method_configuration_version_server(
      (
        select id
        from public.method_configuration_templates
        where template_key = 'nutrition.dose.protein'
      ),
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'nutrition.dose.protein'
          and v.version_number = 1
      ),
      '{"value":17,"unit":"g_per_dose"}'::jsonb,
      'stale-write',
      'd1000000-0000-0000-0000-000000000001'
    )
  $sql$,
  '40001',
  null,
  'stale active-version id is rejected'
);

select throws_ok(
  $sql$
    select public.activate_method_configuration_version_server(
      (
        select id
        from public.method_configuration_templates
        where template_key = 'nutrition.dose.protein'
      ),
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'nutrition.dose.protein'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '{"value":17,"unit":"g_per_dose"}'::jsonb,
      'non-admin-write',
      'd1000000-0000-0000-0000-000000000002'
    )
  $sql$,
  '42501',
  null,
  'non-admin actor is rejected'
);

select throws_ok(
  $sql$
    select public.activate_method_configuration_version_server(
      (
        select id
        from public.method_configuration_templates
        where template_key = 'nutrition.dose.protein'
      ),
      (
        select v.id
        from public.method_configuration_versions v
        join public.method_configuration_templates t on t.id = v.template_id
        where t.template_key = 'nutrition.dose.protein'
          and v.activated_at is not null
          and v.retired_at is null
      ),
      '[]'::jsonb,
      'invalid-json-shape',
      'd1000000-0000-0000-0000-000000000001'
    )
  $sql$,
  '22023',
  null,
  'non-object configuration is rejected'
);

select * from finish();
rollback;
