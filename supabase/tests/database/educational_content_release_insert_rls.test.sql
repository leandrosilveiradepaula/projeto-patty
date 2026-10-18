-- J6 regression: the published-version lookup must not re-enter release RLS
-- and must not broaden who may insert/read client-scoped releases.
-- Every row is synthetic; the surrounding transaction is rolled back.
begin;

select plan(26);

select ok(
  to_regprocedure('app_private.educational_content_version_is_published_for_release(uuid)') is not null,
  'private lookup exists'
);
select ok(
  not (select prosecdef from pg_proc
       where oid='app_private.educational_content_version_is_published_for_release(uuid)'::regprocedure),
  'private lookup is SECURITY INVOKER, never definer'
);
select ok(
  not (select prosecdef from pg_proc
       where oid='public.require_published_educational_content_version_for_release()'::regprocedure),
  'release integrity trigger runs as invoker, never definer'
);
select ok(
  not has_function_privilege('anon',
    'app_private.educational_content_version_is_published_for_release(uuid)', 'EXECUTE'),
  'anon cannot call private lookup'
);
select ok(
  has_function_privilege('authenticated',
    'app_private.educational_content_version_is_published_for_release(uuid)', 'EXECUTE'),
  'authenticated may use lookup under existing row-level authorization'
);
select is(
  (select count(*) from pg_policies
   where schemaname='public' and tablename='client_content_releases'
     and policyname='admin_mfa_aal2_required' and permissive='RESTRICTIVE'),
  1::bigint,
  'restrictive admin MFA policy is unchanged'
);
select ok(
  (select with_check like '%educational_content_version_is_published_for_release%'
      and with_check like '%released_by_profile_id%'
      and with_check like '%client_assignments%'
      and with_check like '%ended_at IS NULL%'
   from pg_policies where schemaname='public'
     and tablename='client_content_releases'
     and policyname='client_content_releases_admin_assigned_insert'),
  'insert policy keeps author, published version, admin and current assignment checks'
);
select ok(
  (select relrowsecurity from pg_class
   where oid='public.client_content_releases'::regclass),
  'release table retains RLS'
);

insert into auth.users (id,email,raw_user_meta_data) values
('b6100000-0000-4000-8000-000000000001','j6-rls-staff@example.invalid','{}'),
('b6100000-0000-4000-8000-000000000002','j6-rls-otherstaff@example.invalid','{}'),
('b6100000-0000-4000-8000-000000000003','j6-rls-owner@example.invalid','{}'),
('b6100000-0000-4000-8000-000000000004','j6-rls-outsider@example.invalid','{}');

insert into public.profiles (id,display_name) values
('b6100000-0000-4000-8000-000000000001','J6 synthetic assigned admin'),
('b6100000-0000-4000-8000-000000000002','J6 synthetic unassigned admin'),
('b6100000-0000-4000-8000-000000000003','J6 synthetic owner'),
('b6100000-0000-4000-8000-000000000004','J6 synthetic outsider');

insert into public.user_roles (profile_id,role) values
('b6100000-0000-4000-8000-000000000001','admin'),
('b6100000-0000-4000-8000-000000000002','admin'),
('b6100000-0000-4000-8000-000000000003','client'),
('b6100000-0000-4000-8000-000000000004','client');

insert into public.clients (id,profile_id,status) values
('b6200000-0000-4000-8000-000000000001','b6100000-0000-4000-8000-000000000003','active'),
('b6200000-0000-4000-8000-000000000002','b6100000-0000-4000-8000-000000000004','active');

insert into public.client_assignments (client_id,staff_profile_id) values
('b6200000-0000-4000-8000-000000000001','b6100000-0000-4000-8000-000000000001');

insert into public.educational_contents (id) values
('b6300000-0000-4000-8000-000000000001');

insert into public.educational_content_versions
(id,educational_content_id,version_number,title,display_order,published_at)
values
('b6400000-0000-4000-8000-000000000001','b6300000-0000-4000-8000-000000000001',1,'J6 synthetic published v1',1,null),
('b6400000-0000-4000-8000-000000000002','b6300000-0000-4000-8000-000000000001',2,'J6 synthetic published v2',2,now()),
('b6400000-0000-4000-8000-000000000003','b6300000-0000-4000-8000-000000000001',3,'J6 synthetic draft v3',3,null);

-- Fixture metadata is not a real Blob. Attach to draft, then publish v1.
-- Leave published v2 without an asset to prove the database rejects a
-- direct INSERT even when the caller has elevated database privileges.
insert into public.educational_content_assets
(educational_content_version_id,asset_key,storage_provider,storage_path,content_type,byte_size,sha256_hex)
values
('b6400000-0000-4000-8000-000000000001','primary','vercel_blob',
 'j6-pgtap-nonexistent/v1.pdf','application/pdf',32,repeat('a',64));
update public.educational_content_versions
set published_at=now()
where id='b6400000-0000-4000-8000-000000000001';

select throws_ok(
  $sql$ insert into public.client_content_releases
       (client_id,educational_content_version_id,released_by_profile_id)
       values ('b6200000-0000-4000-8000-000000000001',
               'b6400000-0000-4000-8000-000000000002',
               'b6100000-0000-4000-8000-000000000001') $sql$,
  '23514',null,
  'even privileged direct INSERT cannot release published version without asset'
);

set local role authenticated;
select set_config('request.jwt.claim.sub','b6100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims',
  '{"sub":"b6100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);

select ok(
  app_private.educational_content_version_is_published_for_release(
    'b6400000-0000-4000-8000-000000000001'),
  'admin AAL2 sees published v1 through invoker helper'
);
select ok(
  not app_private.educational_content_version_is_published_for_release(
    'b6400000-0000-4000-8000-000000000003'),
  'draft v3 is never eligible via lookup'
);
select throws_ok(
  $sql$ insert into public.client_content_releases
       (client_id,educational_content_version_id,released_by_profile_id)
       values ('b6200000-0000-4000-8000-000000000001',
               'b6400000-0000-4000-8000-000000000002',
               'b6100000-0000-4000-8000-000000000001') $sql$,
  '23514',null,
  'assigned admin AAL2 cannot bypass asset requirement by direct INSERT'
);
select lives_ok(
  $sql$ insert into public.client_content_releases
       (client_id,educational_content_version_id,released_by_profile_id)
       values ('b6200000-0000-4000-8000-000000000001',
               'b6400000-0000-4000-8000-000000000001',
               'b6100000-0000-4000-8000-000000000001') $sql$,
  'assigned admin AAL2 can insert published version without policy recursion'
);
select is(
  (select count(*) from public.client_content_releases
   where client_id='b6200000-0000-4000-8000-000000000001'),
  1::bigint,
  'exactly one release was written'
);
select throws_ok(
  $sql$ insert into public.client_content_releases
       (client_id,educational_content_version_id,released_by_profile_id)
       values ('b6200000-0000-4000-8000-000000000001',
               'b6400000-0000-4000-8000-000000000001',
               'b6100000-0000-4000-8000-000000000001') $sql$,
  '23505',null,
  'duplicate release of exact version remains forbidden'
);

select set_config('request.jwt.claim.sub','b6100000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims',
  '{"sub":"b6100000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
select throws_ok(
  $sql$ insert into public.client_content_releases
       (client_id,educational_content_version_id,released_by_profile_id)
       values ('b6200000-0000-4000-8000-000000000001',
               'b6400000-0000-4000-8000-000000000002',
               'b6100000-0000-4000-8000-000000000002') $sql$,
  '42501',null,
  'unassigned admin cannot release to this client'
);

-- BEFORE INSERT published-version trigger runs as the caller before the
-- INSERT WITH CHECK. AAL1 cannot SELECT the protected version, so the
-- unchanged trigger raises 23514 before the release INSERT policy executes.
select set_config('request.jwt.claim.sub','b6100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims',
  '{"sub":"b6100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
select throws_ok(
  $sql$ insert into public.client_content_releases
       (client_id,educational_content_version_id,released_by_profile_id)
       values ('b6200000-0000-4000-8000-000000000001',
               'b6400000-0000-4000-8000-000000000002',
               'b6100000-0000-4000-8000-000000000001') $sql$,
  '23514',null,
  'assigned admin without MFA AAL2 cannot release (invoker trigger cannot see version)'
);

select set_config('request.jwt.claim.sub','b6100000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims',
  '{"sub":"b6100000-0000-4000-8000-000000000003","aal":"aal1","role":"authenticated"}',true);
select throws_ok(
  $sql$ insert into public.client_content_releases
       (client_id,educational_content_version_id,released_by_profile_id)
       values ('b6200000-0000-4000-8000-000000000001',
               'b6400000-0000-4000-8000-000000000002',
               'b6100000-0000-4000-8000-000000000003') $sql$,
  '23514',null,
  'client cannot self-release a version that is not released to client'
);
select is(
  (select count(*) from public.client_content_releases
    where client_id='b6200000-0000-4000-8000-000000000001'),
  1::bigint,
  'client reads own manually released content'
);

select set_config('request.jwt.claim.sub','b6100000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claims',
  '{"sub":"b6100000-0000-4000-8000-000000000004","aal":"aal1","role":"authenticated"}',true);
select is(
  (select count(*) from public.client_content_releases),
  0::bigint,
  'unrelated client cannot read other client release'
);

select set_config('request.jwt.claim.sub','b6100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims',
  '{"sub":"b6100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select throws_ok(
  $sql$ insert into public.client_content_releases
       (client_id,educational_content_version_id,released_by_profile_id)
       values ('b6200000-0000-4000-8000-000000000001',
               'b6400000-0000-4000-8000-000000000002',
               'b6100000-0000-4000-8000-000000000002') $sql$,
  '42501',null,
  'assigned admin cannot impersonate releasing profile'
);
select throws_ok(
  $sql$ insert into public.client_content_releases
       (client_id,educational_content_version_id,released_by_profile_id)
       values ('b6200000-0000-4000-8000-000000000001',
               'b6400000-0000-4000-8000-000000000003',
               'b6100000-0000-4000-8000-000000000001') $sql$,
  '23514',null,
  'draft version cannot be released even by assigned admin AAL2'
);

reset role;
update public.client_assignments
set ended_at=now()
where client_id='b6200000-0000-4000-8000-000000000001'
  and staff_profile_id='b6100000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','b6100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims',
  '{"sub":"b6100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
select throws_ok(
  $sql$ insert into public.client_content_releases
       (client_id,educational_content_version_id,released_by_profile_id)
       values ('b6200000-0000-4000-8000-000000000001',
               'b6400000-0000-4000-8000-000000000002',
               'b6100000-0000-4000-8000-000000000001') $sql$,
  '42501',null,
  'ended assignment cannot release a later version'
);
select is(
  (select count(*) from public.client_content_releases),
  0::bigint,
  'ended assignment no longer exposes prior client release to admin'
);

select set_config('request.jwt.claim.sub','b6100000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims',
  '{"sub":"b6100000-0000-4000-8000-000000000003","aal":"aal1","role":"authenticated"}',true);
select is(
  (select count(*) from public.client_content_releases),
  1::bigint,
  'client retains previously released version after professional assignment ends'
);

reset role;
set local role anon;
select throws_ok(
  $sql$select id from public.client_content_releases$sql$,
  '42501',null,
  'anon cannot list private releases'
);

reset role;
select * from finish();
rollback;
