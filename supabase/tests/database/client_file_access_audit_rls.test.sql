begin;

select plan(15);

select has_table('public', 'client_file_access_events');

select ok(
  (select relrowsecurity
   from pg_class
   where oid = 'public.client_file_access_events'::regclass),
  'client_file_access_events has RLS enabled'
);

select is(
  (select count(*) from pg_policies
   where schemaname = 'public'
     and tablename = 'client_file_access_events'
     and policyname = 'client_file_access_events_select_admin_only'),
  1::bigint,
  'admin-only audit select policy exists'
);

select is(
  (select count(*) from pg_policies
   where schemaname = 'public'
     and tablename = 'client_file_access_events'
     and policyname = 'client_file_access_events_insert_admin_self'),
  1::bigint,
  'admin self-insert audit policy exists'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('51000000-0000-0000-0000-000000000001', 'audit-client@example.test', '{}'),
  ('51000000-0000-0000-0000-000000000002', 'audit-admin@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('51000000-0000-0000-0000-000000000001', 'Synthetic audit client'),
  ('51000000-0000-0000-0000-000000000002', 'Synthetic audit admin');

insert into public.user_roles (profile_id, role)
values
  ('51000000-0000-0000-0000-000000000001', 'client'),
  ('51000000-0000-0000-0000-000000000002', 'admin');

select throws_ok(
  $$insert into public.client_file_access_events (
      requested_file_id,
      actor_profile_id,
      action,
      authorized,
      file_kind
    )
    values (
      '52000000-0000-0000-0000-000000000001',
      '51000000-0000-0000-0000-000000000002',
      'download',
      true,
      null
    )$$,
  '23514',
  null,
  'authorized event requires exam or document file kind'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$insert into public.client_file_access_events (
      requested_file_id,
      actor_profile_id,
      action,
      authorized,
      file_kind
    )
    values (
      '52000000-0000-0000-0000-000000000002',
      '51000000-0000-0000-0000-000000000001',
      'download',
      false,
      null
    )$$,
  '42501',
  null,
  'client cannot create audit event'
);

select is(
  (select count(*) from public.client_file_access_events),
  0::bigint,
  'client cannot read audit events'
);

select set_config('request.jwt.claim.sub', '51000000-0000-0000-0000-000000000002', true);

select lives_ok(
  $$insert into public.client_file_access_events (
      requested_file_id,
      actor_profile_id,
      action,
      authorized,
      file_kind
    )
    values (
      '52000000-0000-0000-0000-000000000003',
      '51000000-0000-0000-0000-000000000002',
      'download',
      false,
      null
    )$$,
  'admin can record denied audit event'
);

select lives_ok(
  $$insert into public.client_file_access_events (
      requested_file_id,
      actor_profile_id,
      action,
      authorized,
      file_kind
    )
    values (
      '52000000-0000-0000-0000-000000000004',
      '51000000-0000-0000-0000-000000000002',
      'download',
      true,
      'exam'
    )$$,
  'admin can record authorized exam download'
);

select is(
  (select count(*) from public.client_file_access_events),
  2::bigint,
  'admin can read audit events'
);

select throws_ok(
  $$insert into public.client_file_access_events (
      requested_file_id,
      actor_profile_id,
      action,
      authorized,
      file_kind
    )
    values (
      '52000000-0000-0000-0000-000000000005',
      '51000000-0000-0000-0000-000000000001',
      'download',
      false,
      null
    )$$,
  '42501',
  null,
  'admin cannot forge another actor identity'
);

select throws_ok(
  $$update public.client_file_access_events set authorized = false$$,
  '42501',
  null,
  'authenticated role cannot update audit history'
);

select throws_ok(
  $$delete from public.client_file_access_events$$,
  '42501',
  null,
  'authenticated role cannot delete audit history'
);

reset role;
set local role anon;

select throws_ok(
  $$select * from public.client_file_access_events$$,
  '42501',
  null,
  'anon cannot read audit history'
);

select throws_ok(
  $$insert into public.client_file_access_events (
      requested_file_id,
      actor_profile_id,
      action,
      authorized,
      file_kind
    )
    values (
      '52000000-0000-0000-0000-000000000006',
      '51000000-0000-0000-0000-000000000002',
      'download',
      false,
      null
    )$$,
  '42501',
  null,
  'anon cannot create audit events'
);

select * from finish();
rollback;
