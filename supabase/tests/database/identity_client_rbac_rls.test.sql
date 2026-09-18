begin;

select plan(41);

select has_table('public', 'profiles');
select has_table('public', 'user_roles');
select has_table('public', 'clients');
select has_table('public', 'client_assignments');
select col_is_pk('public', 'profiles', 'id');
select col_is_pk('public', 'clients', 'id');
select has_index('public', 'clients', 'clients_profile_id_idx');
select has_index('public', 'client_assignments', 'client_assignments_client_id_idx');
select has_index('public', 'client_assignments', 'client_assignments_staff_profile_id_idx');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'profiles has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.user_roles'::regclass), 'user_roles has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.clients'::regclass), 'clients has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.client_assignments'::regclass), 'client_assignments has RLS enabled');

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'client-a@example.test', '{}'),
  ('10000000-0000-0000-0000-000000000002', 'client-b@example.test', '{}'),
  ('10000000-0000-0000-0000-000000000003', 'unassigned@example.test', '{}'),
  ('10000000-0000-0000-0000-000000000004', 'patty-admin@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('10000000-0000-0000-0000-000000000001', 'Synthetic Client A'),
  ('10000000-0000-0000-0000-000000000002', 'Synthetic Client B'),
  ('10000000-0000-0000-0000-000000000003', 'Synthetic Unassigned User'),
  ('10000000-0000-0000-0000-000000000004', 'Synthetic Admin');

insert into public.user_roles (profile_id, role)
values
  ('10000000-0000-0000-0000-000000000001', 'client'),
  ('10000000-0000-0000-0000-000000000002', 'client'),
  ('10000000-0000-0000-0000-000000000004', 'admin');

insert into public.clients (id, profile_id)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002');

insert into public.client_assignments (client_id, staff_profile_id, assigned_at)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', now()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', now() - interval '2 days');

update public.client_assignments
set ended_at = now() - interval '1 day'
where client_id = '20000000-0000-0000-0000-000000000002';

select throws_ok(
  $$ insert into public.clients (profile_id) values ('30000000-0000-0000-0000-000000000001') $$,
  '23503', null, 'clients reject a nonexistent profile'
);
select throws_ok(
  $$ insert into public.client_assignments (client_id, staff_profile_id) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004') $$,
  '23505', null, 'only one active assignment per client and staff member is allowed'
);
select throws_ok(
  $$ insert into public.client_assignments (client_id, staff_profile_id, assigned_at, ended_at) values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', now(), now() - interval '1 day') $$,
  '23514', null, 'assignments reject an end before their start'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.clients), 1::bigint, 'client A reads only client A');
select is((select count(*) from public.clients where id = '20000000-0000-0000-0000-000000000002'), 0::bigint, 'client A cannot read client B');
select is((select count(*) from public.profiles), 1::bigint, 'client A reads only its profile');
select is((select count(*) from public.user_roles), 1::bigint, 'client A reads only its role');
select is((select count(*) from public.client_assignments), 0::bigint, 'client A cannot read assignments');
select throws_ok(
  $$ insert into public.user_roles (profile_id, role) values ('10000000-0000-0000-0000-000000000001', 'admin') $$,
  '42501', null, 'client A cannot create roles'
);
select throws_ok(
  $$ update public.user_roles set role = 'admin' where profile_id = '10000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'client A cannot update roles'
);
select throws_ok(
  $$ delete from public.user_roles where profile_id = '10000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'client A cannot delete roles'
);
select throws_ok(
  $$ update public.clients set profile_id = '10000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'client A cannot reassign a client'
);
select throws_ok(
  $$ insert into public.client_assignments (client_id, staff_profile_id) values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'client A cannot create assignments'
);
select throws_ok(
  $$ update public.client_assignments set ended_at = now() where client_id = '20000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'client A cannot update assignments'
);
select throws_ok(
  $$ delete from public.client_assignments where client_id = '20000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'client A cannot delete assignments'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.clients), 1::bigint, 'client B reads only client B');
select is((select count(*) from public.clients where id = '20000000-0000-0000-0000-000000000001'), 0::bigint, 'client B cannot read client A');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.clients), 0::bigint, 'unassigned authenticated user cannot read clients');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.clients), 1::bigint, 'assigned admin reads only assigned client A');
select is((select count(*) from public.clients where id = '20000000-0000-0000-0000-000000000002'), 0::bigint, 'ended assignment grants no access to client B');
select is((select count(*) from public.client_assignments), 2::bigint, 'admin reads its assignment history');
select is((select count(*) from public.profiles), 2::bigint, 'assigned admin reads its profile and client A profile');

reset role;
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon has no profiles grant');
select throws_ok($$ select * from public.clients $$, '42501', null, 'anon has no clients grant');
select throws_ok($$ select * from public.user_roles $$, '42501', null, 'anon has no user roles grant');
select throws_ok($$ select * from public.client_assignments $$, '42501', null, 'anon has no assignments grant');

reset role;
delete from auth.users where id = '10000000-0000-0000-0000-000000000001';
select is((select count(*) from public.clients where id = '20000000-0000-0000-0000-000000000001'), 1::bigint, 'removing an auth identity preserves the client record');
select is((select profile_id is null from public.clients where id = '20000000-0000-0000-0000-000000000001'), true, 'removing an auth identity clears the optional client profile link');

select * from finish();
rollback;
