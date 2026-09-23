begin;

select plan(12);

select is(
  (
    select count(*)
    from information_schema.tables
    where table_schema='public'
      and table_name='anamnesis_answer_corrections'
  ),
  1::bigint,
  'answer corrections table exists'
);

select is(
  (
    select count(*)
    from pg_trigger
    where tgrelid='public.anamnesis_answer_corrections'::regclass
      and tgname='anamnesis_answer_corrections_immutable'
      and not tgisinternal
  ),
  1::bigint,
  'answer corrections are protected by immutability trigger'
);

insert into auth.users (id,email,raw_user_meta_data)
values
  ('b1000000-0000-0000-0000-000000000001','corr-admin@example.test','{}'),
  ('b1000000-0000-0000-0000-000000000002','corr-client@example.test','{}');

insert into public.profiles (id,display_name)
values
  ('b1000000-0000-0000-0000-000000000001','Correction Admin'),
  ('b1000000-0000-0000-0000-000000000002','Correction Client');

insert into public.user_roles (profile_id,role)
values
  ('b1000000-0000-0000-0000-000000000001','admin'),
  ('b1000000-0000-0000-0000-000000000002','client');

insert into public.clients (id,profile_id)
values (
  'b2000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000002'
);

insert into public.client_assignments (client_id,staff_profile_id)
values (
  'b2000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001'
);

insert into public.anamnesis_forms (id,form_key)
values ('b3000000-0000-0000-0000-000000000001','correction-test-form');

insert into public.anamnesis_form_versions (id,form_id,version_number,published_at)
values (
  'b4000000-0000-0000-0000-000000000001',
  'b3000000-0000-0000-0000-000000000001',
  1,
  now()
);

insert into public.anamnesis_sections (id,form_version_id,section_key,title,display_order)
values (
  'b5000000-0000-0000-0000-000000000001',
  'b4000000-0000-0000-0000-000000000001',
  'correction',
  'Correction',
  1
);

insert into public.anamnesis_questions
  (id,form_version_id,section_id,question_key,label,display_order,answer_type,required)
values (
  'b6000000-0000-0000-0000-000000000001',
  'b4000000-0000-0000-0000-000000000001',
  'b5000000-0000-0000-0000-000000000001',
  'q1',
  'Question',
  1,
  'text',
  true
);

insert into public.anamnesis_submissions (id,client_id,form_version_id)
values (
  'b7000000-0000-0000-0000-000000000001',
  'b2000000-0000-0000-0000-000000000001',
  'b4000000-0000-0000-0000-000000000001'
);

insert into public.anamnesis_answers (id,submission_id,form_version_id,question_id,answer_value)
values (
  'b8000000-0000-0000-0000-000000000001',
  'b7000000-0000-0000-0000-000000000001',
  'b4000000-0000-0000-0000-000000000001',
  'b6000000-0000-0000-0000-000000000001',
  '"original"'::jsonb
);

update public.anamnesis_submissions
set submitted_at=now()
where id='b7000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','b1000000-0000-0000-0000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"b1000000-0000-0000-0000-000000000001","aal":"aal1","role":"authenticated"}',true);

select throws_ok(
  $$insert into public.anamnesis_answer_corrections
      (answer_id,corrected_answer_value,corrected_by_profile_id)
    values
      ('b8000000-0000-0000-0000-000000000001','"blocked"'::jsonb,'b1000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'admin aal1 cannot create correction'
);

select set_config('request.jwt.claims','{"sub":"b1000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',true);

insert into public.anamnesis_answer_corrections
  (id,answer_id,corrected_answer_value,corrected_by_profile_id)
values
  ('b9000000-0000-0000-0000-000000000001','b8000000-0000-0000-0000-000000000001','"first correction"'::jsonb,'b1000000-0000-0000-0000-000000000001'),
  ('b9000000-0000-0000-0000-000000000002','b8000000-0000-0000-0000-000000000001','"second correction"'::jsonb,'b1000000-0000-0000-0000-000000000001');

select is(
  (select count(*) from public.anamnesis_answer_corrections),
  2::bigint,
  'multiple corrections preserve history'
);

select is(
  (
    select answer_value #>> '{}'
    from public.anamnesis_answers
    where id='b8000000-0000-0000-0000-000000000001'
  ),
  'original',
  'original answer remains unchanged'
);

select throws_ok(
  $$update public.anamnesis_answer_corrections
    set corrected_answer_value='"mutated"'::jsonb
    where id='b9000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'authenticated role has no update privilege'
);

select throws_ok(
  $$delete from public.anamnesis_answer_corrections
    where id='b9000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'authenticated role has no delete privilege'
);

select set_config('request.jwt.claim.sub','b1000000-0000-0000-0000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"b1000000-0000-0000-0000-000000000002","aal":"aal1","role":"authenticated"}',true);

select is(
  (select count(*) from public.anamnesis_answer_corrections),
  0::bigint,
  'client cannot read Patty corrections'
);

select throws_ok(
  $$insert into public.anamnesis_answer_corrections
      (answer_id,corrected_answer_value,corrected_by_profile_id)
    values
      ('b8000000-0000-0000-0000-000000000001','"client correction"'::jsonb,'b1000000-0000-0000-0000-000000000002')$$,
  '42501',
  null,
  'client cannot create correction'
);

reset role;

select throws_ok(
  $$update public.anamnesis_answer_corrections
    set corrected_answer_value='"owner mutation"'::jsonb
    where id='b9000000-0000-0000-0000-000000000001'$$,
  '55000',
  'anamnesis answer corrections are append-only',
  'immutability trigger blocks privileged update'
);

select throws_ok(
  $$delete from public.anamnesis_answer_corrections
    where id='b9000000-0000-0000-0000-000000000001'$$,
  '55000',
  'anamnesis answer corrections are append-only',
  'immutability trigger blocks privileged delete'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname='public'
      and tablename='anamnesis_answer_corrections'
      and policyname='admin_mfa_aal2_required'
      and permissive='RESTRICTIVE'
  ),
  1::bigint,
  'corrections inherit restrictive admin MFA policy'
);

select is(
  (
    select count(*)
    from pg_policies
    where schemaname='public'
      and tablename='anamnesis_answer_corrections'
      and (
        coalesce(qual,'') ilike '%auth.jwt()%'
        or coalesce(with_check,'') ilike '%auth.jwt()%'
      )
  ),
  0::bigint,
  'correction policies rely on restrictive MFA policy without redundant direct auth.jwt checks'
);

select * from finish();
rollback;
