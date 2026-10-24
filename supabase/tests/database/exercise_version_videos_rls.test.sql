begin;

select plan(22);

select has_table('public', 'exercise_version_videos');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.exercise_version_videos'::regclass),
  'exercise version videos have RLS enabled'
);
select ok(
  has_table_privilege('authenticated', 'public.exercise_version_videos', 'SELECT'),
  'authenticated has the explicit SELECT grant required for RLS policies'
);
select ok(
  not has_table_privilege('anon', 'public.exercise_version_videos', 'SELECT'),
  'anonymous callers have no video-table SELECT grant'
);
select ok(
  not has_table_privilege('authenticated', 'public.exercise_version_videos', 'TRUNCATE'),
  'authenticated callers have no destructive TRUNCATE privilege'
);
select ok(
  not exists (
    select 1 from pg_proc
    where oid = 'public.reject_published_exercise_version_video_mutation()'::regprocedure
      and prosecdef
  ),
  'published-video immutability trigger is not SECURITY DEFINER'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.reject_published_exercise_version_video_mutation()'::regprocedure,
    'EXECUTE'
  ),
  'the immutability trigger function is not executable by anonymous callers'
);
select ok(
  not exists (
    select 1
    from pg_depend dependency
    join pg_proc routine on routine.oid = dependency.objid
    where dependency.refobjid = 'public.exercise_version_videos'::regclass
      and routine.prosecdef
  ),
  'no SECURITY DEFINER routine depends on the private video table'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('b5000000-0000-0000-0000-000000000001', 'j5-video-admin@example.test', '{}'),
  ('b5000000-0000-0000-0000-000000000002', 'j5-video-owner@example.test', '{}'),
  ('b5000000-0000-0000-0000-000000000003', 'j5-video-foreign@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('b5000000-0000-0000-0000-000000000001', 'J5 Video Admin'),
  ('b5000000-0000-0000-0000-000000000002', 'J5 Video Owner'),
  ('b5000000-0000-0000-0000-000000000003', 'J5 Video Foreign');

insert into public.user_roles (profile_id, role)
values
  ('b5000000-0000-0000-0000-000000000001', 'admin'),
  ('b5000000-0000-0000-0000-000000000002', 'client'),
  ('b5000000-0000-0000-0000-000000000003', 'client');

insert into public.clients (id, profile_id, status)
values
  ('b6000000-0000-0000-0000-000000000001', 'b5000000-0000-0000-0000-000000000002', 'inactive'),
  ('b6000000-0000-0000-0000-000000000002', 'b5000000-0000-0000-0000-000000000003', 'inactive');

insert into public.exercises (id)
values
  ('b7000000-0000-0000-0000-000000000001'),
  ('b7000000-0000-0000-0000-000000000002'),
  ('b7000000-0000-0000-0000-000000000003');

-- The two videos are registered while their exact exercise versions are drafts.
-- One becomes part of the owner's published training; the other is merely
-- published in the global catalog and must remain inaccessible to every client.
insert into public.exercise_versions (id, exercise_id, version_number, name)
values
  ('b8000000-0000-0000-0000-000000000001', 'b7000000-0000-0000-0000-000000000001', 1, 'J5 video linked'),
  ('b8000000-0000-0000-0000-000000000002', 'b7000000-0000-0000-0000-000000000002', 1, 'J5 video unlinked'),
  ('b8000000-0000-0000-0000-000000000003', 'b7000000-0000-0000-0000-000000000003', 1, 'J5 no video');

insert into public.exercise_version_videos (
  id, exercise_version_id, storage_path, content_type, byte_size, sha256_hex, verified_at
)
values
  (
    'b9000000-0000-0000-0000-000000000001',
    'b8000000-0000-0000-0000-000000000001',
    'exercise-videos/b9000000-0000-4000-8000-000000000001.mp4',
    'video/mp4', 128, repeat('a', 64), now()
  ),
  (
    'b9000000-0000-0000-0000-000000000002',
    'b8000000-0000-0000-0000-000000000002',
    'exercise-videos/b9000000-0000-4000-8000-000000000002.mp4',
    'video/mp4', 256, repeat('b', 64), now()
  );

select throws_ok(
  $$insert into public.exercise_version_videos (
      exercise_version_id, storage_path, content_type, byte_size, sha256_hex, verified_at
    ) values (
      'b8000000-0000-0000-0000-000000000003',
      'exercise-videos/b9000000-0000-4000-8000-000000000003.mp4',
      'video/webm', 1, repeat('c', 64), now()
    )$$,
  '23514',
  null,
  'only MP4 metadata can be recorded as an exercise video'
);

update public.exercise_versions set published_at = now()
where id in (
  'b8000000-0000-0000-0000-000000000001',
  'b8000000-0000-0000-0000-000000000002',
  'b8000000-0000-0000-0000-000000000003'
);

insert into public.client_training_plans (id, client_id)
values ('ba000000-0000-0000-0000-000000000001', 'b6000000-0000-0000-0000-000000000001');

insert into public.client_training_plan_versions (
  id, training_plan_id, version_number, title, created_by_profile_id,
  reviewed_at, reviewed_by_profile_id, published_at, published_by_profile_id
)
values
  (
    'bb000000-0000-0000-0000-000000000001', 'ba000000-0000-0000-0000-000000000001', 1,
    'J5 published video training', 'b5000000-0000-0000-0000-000000000001',
    now() - interval '1 minute', 'b5000000-0000-0000-0000-000000000001', now(), 'b5000000-0000-0000-0000-000000000001'
  ),
  (
    'bb000000-0000-0000-0000-000000000002', 'ba000000-0000-0000-0000-000000000001', 2,
    'J5 draft video training', 'b5000000-0000-0000-0000-000000000001',
    null, null, null, null
  );

insert into public.client_training_plan_items (
  training_plan_version_id, position, exercise_version_id, exercise_name, sets_text, repetitions_text
)
values
  ('bb000000-0000-0000-0000-000000000001', 1, 'b8000000-0000-0000-0000-000000000001', 'J5 linked exercise', '1', '1'),
  ('bb000000-0000-0000-0000-000000000001', 2, 'b8000000-0000-0000-0000-000000000003', 'J5 no-video exercise', '1', '1'),
  ('bb000000-0000-0000-0000-000000000002', 1, 'b8000000-0000-0000-0000-000000000002', 'J5 draft-only video exercise', '1', '1');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"b5000000-0000-0000-0000-000000000002","aal":"aal1","role":"authenticated"}', true);
select is((select count(*) from public.exercise_versions), 0::bigint, 'client cannot browse the global exercise catalog');
select is(
  (select array_agg(id order by id) from public.exercise_version_videos),
  array['b9000000-0000-0000-0000-000000000001'::uuid],
  'client receives only the video for the exact exercise version in a published own training'
);
select is(
  (select count(*) from public.exercise_version_videos where id = 'b9000000-0000-0000-0000-000000000002'),
  0::bigint,
  'global exercise publication alone and a draft training item do not release a video'
);
select is(
  (select count(*) from public.client_training_plan_items),
  2::bigint,
  'a published training item without a video remains available'
);
select throws_ok(
  $$insert into public.exercise_version_videos (
      exercise_version_id, storage_path, content_type, byte_size, sha256_hex, verified_at
    ) values (
      'b8000000-0000-0000-0000-000000000003',
      'exercise-videos/b9000000-0000-4000-8000-000000000004.mp4',
      'video/mp4', 1, repeat('d', 64), now()
    )$$,
  '42501', null, 'client cannot directly register a private exercise video'
);
select is(
  (
    with attempted as (
      update public.exercise_version_videos
      set byte_size = 999
      where id = 'b9000000-0000-0000-0000-000000000001'
      returning id
    ) select count(*) from attempted
  ),
  0::bigint,
  'client cannot alter a video visible through a published training'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"b5000000-0000-0000-0000-000000000003","aal":"aal1","role":"authenticated"}', true);
select is((select count(*) from public.exercise_version_videos), 0::bigint, 'another client receives no video authorization');
select is(
  (select count(*) from public.exercise_version_videos where id = 'b9000000-0000-0000-0000-000000000001'),
  0::bigint,
  'knowing the owner video UUID does not authorize another client'
);

reset role;
set local role anon;
select throws_ok(
  $$select * from public.exercise_version_videos$$,
  '42501', null, 'anonymous callers cannot read exercise videos'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"b5000000-0000-0000-0000-000000000001","aal":"aal1","role":"authenticated"}', true);
select is((select count(*) from public.exercise_version_videos), 0::bigint, 'admin at AAL1 cannot access exercise videos');
select set_config('request.jwt.claims', '{"sub":"b5000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}', true);
select is((select count(*) from public.exercise_version_videos), 2::bigint, 'assigned admin at AAL2 can inspect recorded exercise videos');

reset role;
select throws_ok(
  $$update public.exercise_version_videos set byte_size = 999 where id = 'b9000000-0000-0000-0000-000000000001'$$,
  '55000', 'exercise video for a published version is immutable', 'published video metadata cannot be changed silently'
);
select throws_ok(
  $$delete from public.exercise_version_videos where id = 'b9000000-0000-0000-0000-000000000001'$$,
  '55000', 'exercise video for a published version is immutable', 'published video cannot be removed and replaced silently'
);

select * from finish();
rollback;
