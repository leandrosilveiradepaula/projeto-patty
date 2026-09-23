begin;

select plan(12);

select is(
  (
    select count(*)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'current_user_admin_mfa_satisfied'
  ),
  1::bigint,
  'admin MFA helper exists'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and policyname = 'admin_mfa_aal2_required'
  ),
  45::bigint,
  'all protected public tables have restrictive admin MFA policy'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'storage_objects_admin_mfa_aal2_required'
      and permissive = 'RESTRICTIVE'
  ),
  1::bigint,
  'storage objects has restrictive admin MFA policy'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.current_user_admin_mfa_satisfied()',
    'EXECUTE'
  ),
  'anon cannot execute admin MFA helper'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.current_user_admin_mfa_satisfied()',
    'EXECUTE'
  ),
  'authenticated can execute admin MFA helper'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('a1000000-0000-0000-0000-000000000001', 'mfa-admin@example.test', '{}'),
  ('a1000000-0000-0000-0000-000000000002', 'mfa-client@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('a1000000-0000-0000-0000-000000000001', 'MFA Admin'),
  ('a1000000-0000-0000-0000-000000000002', 'MFA Client');

insert into public.user_roles (profile_id, role)
values
  ('a1000000-0000-0000-0000-000000000001', 'admin'),
  ('a1000000-0000-0000-0000-000000000002', 'client');

insert into public.clients (id, profile_id)
values (
  'a2000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002'
);

insert into public.client_assignments (client_id, staff_profile_id)
values (
  'a2000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000001'
);

set local role authenticated;

select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","aal":"aal1","role":"authenticated"}',
  true
);

select is(
  public.current_user_admin_mfa_satisfied(),
  false,
  'admin aal1 fails MFA helper'
);

select is(
  (select count(*) from public.user_roles),
  1::bigint,
  'admin aal1 can still read own role for MFA routing'
);

select is(
  (
    select count(*)
    from public.clients
    where id = 'a2000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'admin aal1 cannot read assigned client'
);

select is(
  (
    select count(*)
    from public.profiles
    where id = 'a1000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'admin aal1 cannot read own protected profile'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select is(
  public.current_user_admin_mfa_satisfied(),
  true,
  'admin aal2 satisfies MFA helper'
);

select is(
  (
    select count(*)
    from public.clients
    where id = 'a2000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'admin aal2 regains assigned client access'
);

select set_config(
  'request.jwt.claim.sub',
  'a1000000-0000-0000-0000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"a1000000-0000-0000-0000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)
    from public.clients
    where id = 'a2000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'client aal1 keeps own client access'
);

select * from finish();
rollback;
