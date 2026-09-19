begin;

select plan(21);

select has_table('public', 'educational_contents');
select has_table('public', 'educational_content_versions');
select has_table('public', 'client_content_releases');
select has_table('public', 'client_content_progress');
select ok((select relrowsecurity from pg_class where oid = 'public.educational_contents'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.educational_content_versions'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.client_content_releases'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.client_content_progress'::regclass));

insert into auth.users (id, email, raw_user_meta_data)
values
  ('91000000-0000-0000-0000-000000000001', 'content-client-a@example.test', '{}'),
  ('91000000-0000-0000-0000-000000000002', 'content-client-b@example.test', '{}'),
  ('91000000-0000-0000-0000-000000000003', 'content-admin-global@example.test', '{}'),
  ('91000000-0000-0000-0000-000000000004', 'content-admin-assigned@example.test', '{}'),
  ('91000000-0000-0000-0000-000000000005', 'content-admin-unassigned@example.test', '{}');
insert into public.profiles (id, display_name)
select id, 'Synthetic ' || id::text from auth.users where email like 'content-%@example.test';
insert into public.user_roles (profile_id, role)
values
  ('91000000-0000-0000-0000-000000000001', 'client'),
  ('91000000-0000-0000-0000-000000000002', 'client'),
  ('91000000-0000-0000-0000-000000000003', 'admin'),
  ('91000000-0000-0000-0000-000000000004', 'admin'),
  ('91000000-0000-0000-0000-000000000005', 'admin');
insert into public.clients (id, profile_id)
values
  ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000001'),
  ('92000000-0000-0000-0000-000000000002', '91000000-0000-0000-0000-000000000002');
insert into public.client_assignments (client_id, staff_profile_id)
values ('92000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000004');

insert into public.educational_contents (id) values ('93000000-0000-0000-0000-000000000001');
insert into public.educational_content_versions (id, educational_content_id, version_number, title, display_order, published_at)
values
  ('94000000-0000-0000-0000-000000000001', '93000000-0000-0000-0000-000000000001', 1, 'Synthetic v1', 1, now()),
  ('94000000-0000-0000-0000-000000000002', '93000000-0000-0000-0000-000000000001', 2, 'Synthetic v2', 2, now());
select is((select count(*) from public.educational_content_versions), 2::bigint, 'content versions coexist');
select throws_ok($$update public.educational_content_versions set title = 'changed' where id = '94000000-0000-0000-0000-000000000001'$$, '55000', null, 'published content version is immutable');

insert into public.client_content_releases (id, client_id, educational_content_version_id, released_by_profile_id)
values ('95000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', '94000000-0000-0000-0000-000000000001', '91000000-0000-0000-0000-000000000004');
insert into public.client_content_progress (client_content_release_id, client_id, first_opened_at)
values ('95000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.educational_content_versions), 1::bigint, 'client A reads only released version');
select is((select count(*) from public.client_content_releases), 1::bigint, 'client A reads own release');
with attempted_update as (
  update public.client_content_progress
  set completed_at = now()
  where client_content_release_id = '95000000-0000-0000-0000-000000000001'
  returning client_content_release_id
)
select is((select count(*) from attempted_update), 0::bigint, 'client cannot update progress');
select is((select completed_at is null from public.client_content_progress where client_content_release_id = '95000000-0000-0000-0000-000000000001'), true, 'client progress remains unchanged without a confirmed write rule');
select throws_ok($$insert into public.educational_contents default values$$, '42501', null, 'client cannot create educational content');

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.educational_content_versions), 0::bigint, 'client B cannot read A release');
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.educational_content_versions), 2::bigint, 'global admin manages educational definitions');
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.client_content_releases), 1::bigint, 'assigned admin reads releases for A');
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.client_content_releases), 0::bigint, 'unassigned admin cannot read releases for A');

reset role;
set local role anon;
select throws_ok($$select * from public.educational_contents$$, '42501', null, 'anon cannot read educational content');
select throws_ok($$select * from public.client_content_releases$$, '42501', null, 'anon cannot read releases');

select * from finish();
rollback;
