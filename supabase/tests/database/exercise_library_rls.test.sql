begin;

select plan(10);

select has_table('public', 'exercises');
select has_table('public', 'exercise_versions');
select ok((select relrowsecurity from pg_class where oid = 'public.exercises'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.exercise_versions'::regclass));

insert into auth.users (id, email, raw_user_meta_data)
values
  ('96000000-0000-0000-0000-000000000001', 'exercise-client@example.test', '{}'),
  ('96000000-0000-0000-0000-000000000002', 'exercise-admin@example.test', '{}');
insert into public.profiles (id, display_name)
select id, 'Synthetic ' || id::text from auth.users where email like 'exercise-%@example.test';
insert into public.user_roles (profile_id, role)
values
  ('96000000-0000-0000-0000-000000000001', 'client'),
  ('96000000-0000-0000-0000-000000000002', 'admin');
insert into public.exercises (id) values ('97000000-0000-0000-0000-000000000001');
insert into public.exercise_versions (id, exercise_id, version_number, name, published_at)
values
  ('98000000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', 1, 'Synthetic exercise v1', now()),
  ('98000000-0000-0000-0000-000000000002', '97000000-0000-0000-0000-000000000001', 2, 'Synthetic exercise v2', now());
select is((select count(*) from public.exercise_versions), 2::bigint, 'exercise versions coexist');
select throws_ok($$update public.exercise_versions set name = 'changed' where id = '98000000-0000-0000-0000-000000000001'$$, '55000', null, 'published exercise version is immutable');

set local role authenticated;
select set_config('request.jwt.claim.sub', '96000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.exercise_versions), 0::bigint, 'client cannot browse exercise library');
select throws_ok($$insert into public.exercises default values$$, '42501', null, 'client cannot create exercise');
select set_config('request.jwt.claim.sub', '96000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.exercise_versions), 2::bigint, 'global admin manages exercise library');

reset role;
set local role anon;
select throws_ok($$select * from public.exercise_versions$$, '42501', null, 'anon cannot read exercises');

select * from finish();
rollback;
