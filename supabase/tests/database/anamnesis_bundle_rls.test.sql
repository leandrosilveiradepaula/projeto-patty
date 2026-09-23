begin;

select plan(49);

select has_table('public', 'client_registration');
select has_table('public', 'anamnesis_forms');
select has_table('public', 'anamnesis_form_versions');
select has_table('public', 'anamnesis_sections');
select has_table('public', 'anamnesis_questions');
select has_table('public', 'anamnesis_submissions');
select has_table('public', 'anamnesis_answers');
select has_table('public', 'anamnesis_reviews');

select ok((select relrowsecurity from pg_class where oid = 'public.client_registration'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.anamnesis_forms'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.anamnesis_form_versions'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.anamnesis_sections'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.anamnesis_questions'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.anamnesis_submissions'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.anamnesis_answers'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.anamnesis_reviews'::regclass));

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'client-a@example.test', '{}'),
  ('10000000-0000-0000-0000-000000000002', 'client-b@example.test', '{}'),
  ('10000000-0000-0000-0000-000000000003', 'unlinked@example.test', '{}'),
  ('10000000-0000-0000-0000-000000000004', 'admin@example.test', '{}'),
  ('10000000-0000-0000-0000-000000000005', 'admin-unassigned@example.test', '{}');

insert into public.profiles (id, display_name)
select id, 'Synthetic ' || id::text from auth.users where email like '%@example.test';

insert into public.user_roles (profile_id, role)
values
  ('10000000-0000-0000-0000-000000000001', 'client'),
  ('10000000-0000-0000-0000-000000000002', 'client'),
  ('10000000-0000-0000-0000-000000000004', 'admin'),
  ('10000000-0000-0000-0000-000000000005', 'admin');

insert into public.clients (id, profile_id)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002');

insert into public.client_assignments (client_id, staff_profile_id)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004');

insert into public.client_registration (client_id, city)
values
  ('20000000-0000-0000-0000-000000000001', 'A'),
  ('20000000-0000-0000-0000-000000000002', 'B');

select throws_ok(
  $$insert into public.client_registration (client_id) values ('20000000-0000-0000-0000-000000000001')$$,
  '23505', null, 'registration is one-to-one'
);
select throws_ok(
  $$insert into public.client_registration (client_id) values ('30000000-0000-0000-0000-000000000001')$$,
  '23503', null, 'registration requires client FK'
);

insert into public.anamnesis_forms (id, form_key)
values ('30000000-0000-0000-0000-000000000001', 'synthetic-form');
insert into public.anamnesis_form_versions (id, form_id, version_number, published_at)
values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 1, now()),
  ('31000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 2, now());
insert into public.anamnesis_sections (id, form_version_id, section_key, title, display_order)
values
  ('32000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', 'section', 'Version 1', 1),
  ('32000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', 'section', 'Version 2', 1);
insert into public.anamnesis_questions (id, form_version_id, section_id, question_key, label, display_order, answer_type)
values
  ('33000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', 'question', 'Question v1', 1, 'text'),
  ('33000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', '32000000-0000-0000-0000-000000000002', 'question', 'Question v2', 1, 'text');
insert into public.anamnesis_submissions (id, client_id, form_version_id)
values
  ('34000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001'),
  ('34000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002');
insert into public.anamnesis_answers (submission_id, form_version_id, question_id, answer_value)
values
  ('34000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', '"A"'),
  ('34000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000002', '"B"');
select throws_ok(
  $$insert into public.anamnesis_answers (submission_id, form_version_id, question_id, answer_value) values ('34000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000002', '"wrong version"')$$,
  '23503', null, 'answer cannot use question from another version'
);
update public.anamnesis_submissions set submitted_at = now();
select throws_ok(
  $$update public.anamnesis_answers set answer_value = '"changed"' where submission_id = '34000000-0000-0000-0000-000000000001'$$,
  '55000', null, 'submitted answer is immutable'
);
select throws_ok(
  $$update public.anamnesis_form_versions set version_number = 3 where id = '31000000-0000-0000-0000-000000000001'$$,
  '55000', null, 'version with submission is immutable'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.client_registration), 1::bigint, 'A reads registration A');
select is((select count(*) from public.anamnesis_submissions), 1::bigint, 'A reads submission A');
select is((select count(*) from public.anamnesis_answers), 1::bigint, 'A reads answer A');
select is((select count(*) from public.anamnesis_reviews), 0::bigint, 'A cannot read reviews');
select throws_ok(
  $$update public.anamnesis_questions set label = 'client mutation' where id = '33000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'client cannot modify definitions'
);
select throws_ok(
  $insert into public.anamnesis_answers (submission_id, form_version_id, question_id, answer_value) values ('34000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001', '"client write"')$,
  '42501', null, 'client cannot modify submitted answers'
);

reset role;

insert into public.anamnesis_form_versions (id, form_id, version_number, published_at)
values ('31000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 3, now());
insert into public.anamnesis_sections (id, form_version_id, section_key, title, display_order)
values ('32000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000003', 'draft-section', 'Draft version', 1);
insert into public.anamnesis_questions (id, form_version_id, section_id, question_key, label, display_order, answer_type, required)
values ('33000000-0000-0000-0000-000000000003', '31000000-0000-0000-0000-000000000003', '32000000-0000-0000-0000-000000000003', 'draft-question', 'Draft question', 1, 'text', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

insert into public.anamnesis_submissions (client_id, form_version_id)
values ('20000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000003');

select is(
  (select count(*) from public.anamnesis_submissions where form_version_id = '31000000-0000-0000-0000-000000000003'),
  1::bigint,
  'client creates own draft for published version'
);

select throws_ok(
  $insert into public.anamnesis_submissions (client_id, form_version_id) values ('20000000-0000-0000-0000-000000000002', '31000000-0000-0000-0000-000000000003')$,
  '42501', null, 'client cannot create draft for another client'
);

select throws_ok(
  $insert into public.anamnesis_submissions (client_id, form_version_id) values ('20000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-000000000003')$,
  '23505', null, 'client has at most one active draft per form version'
);

insert into public.anamnesis_answers (submission_id, form_version_id, question_id, answer_value)
select id, form_version_id, '33000000-0000-0000-0000-000000000003', '"draft answer"'
from public.anamnesis_submissions
where client_id = '20000000-0000-0000-0000-000000000001'
  and form_version_id = '31000000-0000-0000-0000-000000000003';

select is(
  (
    select answer_value #>> '{}'
    from public.anamnesis_answers
    where question_id = '33000000-0000-0000-0000-000000000003'
  ),
  'draft answer',
  'client inserts answer in own draft'
);

update public.anamnesis_answers
set answer_value = '"updated draft answer"'
where question_id = '33000000-0000-0000-0000-000000000003';

select is(
  (
    select answer_value #>> '{}'
    from public.anamnesis_answers
    where question_id = '33000000-0000-0000-0000-000000000003'
  ),
  'updated draft answer',
  'client updates answer value in own draft'
);

select ok(
  not has_column_privilege('authenticated', 'public.anamnesis_submissions', 'submitted_at', 'INSERT'),
  'client cannot set submitted_at when creating draft'
);

select ok(
  not has_column_privilege('authenticated', 'public.anamnesis_submissions', 'submitted_at', 'UPDATE'),
  'client cannot submit draft yet'
);

select ok(
  not has_column_privilege('authenticated', 'public.anamnesis_answers', 'question_id', 'UPDATE'),
  'client cannot move answer to another question'
);

select ok(
  has_column_privilege('authenticated', 'public.anamnesis_answers', 'answer_value', 'UPDATE'),
  'client can update answer_value while RLS permits'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is(
  (
    select count(*)
    from public.anamnesis_submissions
    where form_version_id = '31000000-0000-0000-0000-000000000003'
  ),
  0::bigint,
  'other client cannot read draft'
);

select is(
  (
    select count(*)
    from public.anamnesis_answers
    where question_id = '33000000-0000-0000-0000-000000000003'
  ),
  0::bigint,
  'other client cannot read draft answers'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.anamnesis_submissions), 1::bigint, 'B reads submission B');
select is((select count(*) from public.anamnesis_submissions where id = '34000000-0000-0000-0000-000000000001'), 0::bigint, 'B cannot read submission A');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.anamnesis_submissions), 0::bigint, 'unlinked user cannot read submissions');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.anamnesis_submissions), 1::bigint, 'assigned admin reads assigned submission');
insert into public.anamnesis_reviews (submission_id, reviewer_profile_id, note)
values ('34000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Synthetic review');
select is((select count(*) from public.anamnesis_reviews), 1::bigint, 'assigned admin reads review');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select is((select count(*) from public.anamnesis_submissions), 0::bigint, 'unassigned admin cannot read submissions');
select is((select count(*) from public.anamnesis_reviews), 0::bigint, 'unassigned admin cannot read reviews');

reset role;
set local role anon;
select throws_ok($$select * from public.client_registration$$, '42501', null, 'anon cannot read registration');
select throws_ok($$select * from public.anamnesis_form_versions$$, '42501', null, 'anon cannot read definitions');
select throws_ok($$select * from public.anamnesis_submissions$$, '42501', null, 'anon cannot read submissions');
select throws_ok($$select * from public.anamnesis_reviews$$, '42501', null, 'anon cannot read reviews');

select * from finish();
rollback;
