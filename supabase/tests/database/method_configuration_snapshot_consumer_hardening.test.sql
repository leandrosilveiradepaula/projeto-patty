-- pgTAP coverage for snapshot consumer hardening.
-- Synthetic data only.

begin;
select no_plan();

select ok(
  not has_table_privilege(
    'authenticated',
    'public.client_liquid_intake_events',
    'INSERT'
  ),
  'authenticated cannot directly insert liquid intake events after snapshot switch'
);

select ok(
  has_column_privilege(
    'authenticated',
    'public.client_assessments',
    'assessed_at',
    'UPDATE'
  ),
  'authenticated can still update assessment draft date'
);

select ok(
  has_column_privilege(
    'authenticated',
    'public.client_assessments',
    'assessment_kind',
    'UPDATE'
  ),
  'authenticated can still update assessment draft kind'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.client_assessments',
    'finalized_at',
    'UPDATE'
  ),
  'authenticated cannot directly finalize assessments'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.client_assessments',
    'finalized_by_profile_id',
    'UPDATE'
  ),
  'authenticated cannot directly set assessment finalization actor'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.client_assessments',
    'method_configuration_snapshot_set_id',
    'UPDATE'
  ),
  'authenticated cannot directly attach an assessment snapshot'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('e1000000-0000-0000-0000-000000000001', 'hardening-admin@example.test', '{}'),
  ('e1000000-0000-0000-0000-000000000002', 'hardening-client@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('e1000000-0000-0000-0000-000000000001', 'Hardening Admin'),
  ('e1000000-0000-0000-0000-000000000002', 'Hardening Client');

insert into public.user_roles (profile_id, role)
values
  ('e1000000-0000-0000-0000-000000000001', 'admin'),
  ('e1000000-0000-0000-0000-000000000002', 'client');

insert into public.clients (id, profile_id, full_name, status)
values (
  'e2000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000002',
  'Snapshot Hardening Client',
  'active'
);

insert into public.client_assignments (client_id, staff_profile_id, ended_at)
values (
  'e2000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001',
  null
);

insert into public.client_assessments (
  id,
  client_id,
  assessed_at,
  assessment_kind,
  created_by_profile_id
)
values (
  'e3000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001',
  now(),
  'fortnightly',
  'e1000000-0000-0000-0000-000000000001'
);

select throws_ok(
  $sql$
    update public.client_assessments
    set
      finalized_at = now(),
      finalized_by_profile_id = 'e1000000-0000-0000-0000-000000000001'
    where id = 'e3000000-0000-0000-0000-000000000001'
  $sql$,
  '23514',
  null,
  'assessment lifecycle refuses a new finalization without a snapshot'
);

select lives_ok(
  $sql$
    update public.client_assessments
    set assessed_at = now() + interval '1 day'
    where id = 'e3000000-0000-0000-0000-000000000001'
  $sql$,
  'draft metadata remains editable'
);

insert into public.method_configuration_snapshot_sets (
  id,
  client_id,
  engine_contract_version,
  created_by_profile_id
)
values (
  'e4000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001',
  1,
  'e1000000-0000-0000-0000-000000000001'
);

select lives_ok(
  $sql$
    update public.client_assessments
    set
      method_configuration_snapshot_set_id =
        'e4000000-0000-0000-0000-000000000001',
      finalized_at = now(),
      finalized_by_profile_id =
        'e1000000-0000-0000-0000-000000000001'
    where id = 'e3000000-0000-0000-0000-000000000001'
  $sql$,
  'assessment lifecycle accepts an atomic finalization with a snapshot'
);

select ok(
  (
    select finalized_at is not null
       and method_configuration_snapshot_set_id =
         'e4000000-0000-0000-0000-000000000001'::uuid
    from public.client_assessments
    where id = 'e3000000-0000-0000-0000-000000000001'
  ),
  'finalized assessment preserves its snapshot reference'
);

select * from finish();
rollback;
