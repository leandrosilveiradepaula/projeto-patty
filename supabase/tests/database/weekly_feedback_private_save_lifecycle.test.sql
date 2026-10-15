-- Local-only transaction fixtures. No real health responses or production writes.
-- Exercises the actual RLS/invoker boundary from publication -> request ->
-- partial save -> CAS conflict -> definitive submit -> admin history.
begin;
select plan(25);

select has_function('public', 'save_client_weekly_feedback_if_unchanged', array['uuid','uuid','jsonb','jsonb','boolean']);
select ok(
  not has_function_privilege('anon', 'public.save_client_weekly_feedback_if_unchanged(uuid,uuid,jsonb,jsonb,boolean)', 'EXECUTE'),
  'anonymous caller cannot invoke weekly feedback write'
);
select ok(
  has_function_privilege('authenticated', 'public.save_client_weekly_feedback_if_unchanged(uuid,uuid,jsonb,jsonb,boolean)', 'EXECUTE'),
  'authenticated caller can invoke RLS-scoped weekly feedback write'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.save_client_weekly_feedback_if_unchanged(uuid,uuid,jsonb,jsonb,boolean)'::regprocedure),
  false,
  'feedback write runs as invoker, never database owner'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('f1100000-0000-0000-0000-000000000001', 'j2-admin@example.test', '{}'),
  ('f1100000-0000-0000-0000-000000000002', 'j2-client-a@example.test', '{}'),
  ('f1100000-0000-0000-0000-000000000003', 'j2-client-b@example.test', '{}'),
  ('f1100000-0000-0000-0000-000000000004', 'j2-admin-unassigned@example.test', '{}');
insert into public.profiles (id, display_name)
values
  ('f1100000-0000-0000-0000-000000000001', 'Synthetic J2 Admin'),
  ('f1100000-0000-0000-0000-000000000002', 'Synthetic J2 Client A'),
  ('f1100000-0000-0000-0000-000000000003', 'Synthetic J2 Client B'),
  ('f1100000-0000-0000-0000-000000000004', 'Synthetic J2 Unassigned Admin');
insert into public.user_roles (profile_id, role)
values
  ('f1100000-0000-0000-0000-000000000001', 'admin'),
  ('f1100000-0000-0000-0000-000000000002', 'client'),
  ('f1100000-0000-0000-0000-000000000003', 'client'),
  ('f1100000-0000-0000-0000-000000000004', 'admin');
insert into public.clients (id, profile_id, full_name, status)
values
  ('f1200000-0000-0000-0000-000000000001', 'f1100000-0000-0000-0000-000000000002', 'Synthetic Client A', 'active'),
  ('f1200000-0000-0000-0000-000000000002', 'f1100000-0000-0000-0000-000000000003', 'Synthetic Client B', 'active');
insert into public.client_assignments (client_id, staff_profile_id)
values ('f1200000-0000-0000-0000-000000000001', 'f1100000-0000-0000-0000-000000000001');

-- Published version is needed for eligibility. This is a local-only synthetic
-- scenario, not a clinical decision or real approval in production.
insert into public.protocols (id, client_id)
values ('f1300000-0000-0000-0000-000000000001', 'f1200000-0000-0000-0000-000000000001');
insert into public.protocol_versions
  (id, protocol_id, client_id, version_number, created_by_profile_id, submitted_for_review_at)
values
  ('f1400000-0000-0000-0000-000000000001',
   'f1300000-0000-0000-0000-000000000001',
   'f1200000-0000-0000-0000-000000000001',
   1, 'f1100000-0000-0000-0000-000000000001', now());
insert into public.protocol_version_approvals
  (id, protocol_version_id, client_id, approved_by_profile_id)
values
  ('f1500000-0000-0000-0000-000000000001',
   'f1400000-0000-0000-0000-000000000001',
   'f1200000-0000-0000-0000-000000000001',
   'f1100000-0000-0000-0000-000000000001');
insert into public.protocol_publications
  (protocol_version_id, client_id, approval_id, published_by_profile_id)
values
  ('f1400000-0000-0000-0000-000000000001',
   'f1200000-0000-0000-0000-000000000001',
   'f1500000-0000-0000-0000-000000000001',
   'f1100000-0000-0000-0000-000000000001');

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"f1100000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',true);
select lives_ok(
  $sql$
    insert into public.client_weekly_feedbacks (
      id,client_id,form_version_id,period_start,period_end,requested_by_profile_id
    ) values (
      'f1600000-0000-0000-0000-000000000001',
      'f1200000-0000-0000-0000-000000000001',
      (select id from public.weekly_feedback_form_versions where version_number=1),
      date '2026-10-05',date '2026-10-11',
      'f1100000-0000-0000-0000-000000000001'
    )
  $sql$,
  'professional requests feedback after publishing first protocol'
);

select is((select count(*) from public.client_weekly_feedbacks), 1::bigint, 'professional reads the requested client-scoped feedback');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"f1100000-0000-0000-0000-000000000002","aal":"aal1","role":"authenticated"}',true);

select is((select count(*) from public.client_weekly_feedbacks), 1::bigint, 'client reads only own pending request');
select is(
  (select count(*) from public.save_client_weekly_feedback_if_unchanged(
    'f1200000-0000-0000-0000-000000000001',
    'f1600000-0000-0000-0000-000000000001',
    '{}'::jsonb,'{"q01":0,"q03":"rascunho sintetico"}'::jsonb,false
  )),
  1::bigint,
  'client can save an incomplete draft without sending it'
);
select is(
  (select answers from public.client_weekly_feedbacks where id='f1600000-0000-0000-0000-000000000001'),
  '{"q01":0,"q03":"rascunho sintetico"}'::jsonb,
  'saved draft is persisted and retains valid numeric zero'
);
select is(
  (select submitted_at is null from public.client_weekly_feedbacks where id='f1600000-0000-0000-0000-000000000001'),
  true,
  'draft save does not submit the feedback'
);
select is(
  (select count(*) from public.save_client_weekly_feedback_if_unchanged(
    'f1200000-0000-0000-0000-000000000001',
    'f1600000-0000-0000-0000-000000000001',
    '{}'::jsonb,'{"q01":5}'::jsonb,false
  )),
  0::bigint,
  'stale draft comparison fails without overwriting newer answers'
);
select is(
  (select answers from public.client_weekly_feedbacks where id='f1600000-0000-0000-0000-000000000001'),
  '{"q01":0,"q03":"rascunho sintetico"}'::jsonb,
  'a conflict leaves saved draft unchanged'
);
select is(
  (select count(*) from public.save_client_weekly_feedback_if_unchanged(
    'f1200000-0000-0000-0000-000000000002',
    'f1600000-0000-0000-0000-000000000001',
    '{"q01":0,"q03":"rascunho sintetico"}'::jsonb,'{}'::jsonb,false
  )),
  0::bigint,
  'spoofing another client id returns no mutation'
);
-- A malformed/incomplete final submission must not convert a valid draft
-- into submitted history: the existing database trigger remains authoritative.
select throws_ok(
  $sql$
    select * from public.save_client_weekly_feedback_if_unchanged(
      'f1200000-0000-0000-0000-000000000001',
      'f1600000-0000-0000-0000-000000000001',
      '{"q01":0,"q03":"rascunho sintetico"}'::jsonb,
      '{"q01":0,"q03":"rascunho sintetico"}'::jsonb,
      true
    )
  $sql$,
  '23514',null,
  'incomplete weekly feedback cannot be submitted by calling RPC directly'
);
select is(
  (select submitted_at is null and answers = '{"q01":0,"q03":"rascunho sintetico"}'::jsonb
   from public.client_weekly_feedbacks
   where id='f1600000-0000-0000-0000-000000000001'),
  true,
  'rejected submission preserves the original unsent draft'
);
select is(
  (select count(*) from public.save_client_weekly_feedback_if_unchanged(
    'f1200000-0000-0000-0000-000000000001',
    'f1600000-0000-0000-0000-000000000001',
    '{"q01":0,"q03":"rascunho sintetico"}'::jsonb,
    jsonb_build_object(
      'q01',0,'q02',1,'q03','nao','q04','nao','q05','nao',
      'q06','nao','q07','nao','q08','nao se aplica','q09','nao',
      'q10','nao','q11','nao','q12','sim','q13','1',
      'q14','nao se aplica','q15','nao se aplica','q16','nao se aplica',
      'q17',7,'q18','sem dificuldade','q19','bem',
      'q20','em casa','q21','em casa'
    ),
    true
  )),
  1::bigint,
  'valid synthetic 21-answer submission succeeds exactly once'
);
select ok(
  (select submitted_at is not null from public.client_weekly_feedbacks where id='f1600000-0000-0000-0000-000000000001'),
  'the submitted timestamp is persisted'
);
select is(
  (select count(*) from public.client_weekly_feedbacks feedback,
          lateral jsonb_object_keys(feedback.answers) as answer(key)
   where feedback.id='f1600000-0000-0000-0000-000000000001'),
  21::bigint,
  'definitive submission persists all 21 original synthetic answers'
);
select is(
  (select count(*) from public.save_client_weekly_feedback_if_unchanged(
    'f1200000-0000-0000-0000-000000000001',
    'f1600000-0000-0000-0000-000000000001',
    '{}'::jsonb,'{}'::jsonb,false
  )),
  0::bigint,
  'submitted feedback cannot be reopened or overwritten through RPC'
);
select is(
  (select count(*) from public.client_weekly_feedbacks where submitted_at is not null),
  1::bigint,
  'client can read the immutable submitted feedback in history'
);

select set_config('request.jwt.claim.sub','f1100000-0000-0000-0000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"f1100000-0000-0000-0000-000000000003","aal":"aal1","role":"authenticated"}',true);
select is((select count(*) from public.client_weekly_feedbacks),0::bigint,'another client cannot read the submitted feedback');
select is(
  (select count(*) from public.save_client_weekly_feedback_if_unchanged(
    'f1200000-0000-0000-0000-000000000001',
    'f1600000-0000-0000-0000-000000000001',
    '{}'::jsonb,'{}'::jsonb,false
  )),
  0::bigint,
  'another client cannot modify the submitted feedback'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1100000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"f1100000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',true);
select is(
  (select count(*) from public.client_weekly_feedbacks where submitted_at is not null),
  1::bigint,
  'assigned professional reads the submitted client answers'
);
select set_config('request.jwt.claim.sub','f1100000-0000-0000-0000-000000000004',true);
select set_config('request.jwt.claims','{"sub":"f1100000-0000-0000-0000-000000000004","aal":"aal2","role":"authenticated"}',true);
select is(
  (select count(*) from public.client_weekly_feedbacks where submitted_at is not null),
  0::bigint,
  'unassigned professional cannot read submitted answers despite admin MFA'
);
reset role;
set local role anon;
select throws_ok(
  $sql$ select * from public.save_client_weekly_feedback_if_unchanged(
    'f1200000-0000-0000-0000-000000000001',
    'f1600000-0000-0000-0000-000000000001',
    '{}'::jsonb,'{}'::jsonb,false
  ) $sql$,'42501',null,
  'anonymous cannot call the private write RPC'
);
reset role;

select * from finish();
rollback;
