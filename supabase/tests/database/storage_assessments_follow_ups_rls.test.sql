begin;

select plan(41);

select has_table('public', 'client_files');
select has_table('public', 'client_assessments');
select has_table('public', 'assessment_measurements');
select has_table('public', 'assessment_files');
select has_table('public', 'professional_follow_ups');

select ok((select relrowsecurity from pg_class where oid = 'public.client_files'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.client_assessments'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.assessment_measurements'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.assessment_files'::regclass));
select ok((select relrowsecurity from pg_class where oid = 'public.professional_follow_ups'::regclass));

select is(
  (select count(*) from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname = 'client_private_storage_objects_select_own_or_active_assignment'),
  1::bigint,
  'private Storage select policy exists'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('41000000-0000-0000-0000-000000000001', 'storage-client-a@example.test', '{}'),
  ('41000000-0000-0000-0000-000000000002', 'storage-client-b@example.test', '{}'),
  ('41000000-0000-0000-0000-000000000003', 'storage-admin@example.test', '{}'),
  ('41000000-0000-0000-0000-000000000004', 'storage-admin-unassigned@example.test', '{}');

insert into public.profiles (id, display_name)
select id, 'Synthetic ' || id::text
from auth.users
where email like 'storage-%@example.test';

insert into public.user_roles (profile_id, role)
values
  ('41000000-0000-0000-0000-000000000001', 'client'),
  ('41000000-0000-0000-0000-000000000002', 'client'),
  ('41000000-0000-0000-0000-000000000003', 'admin'),
  ('41000000-0000-0000-0000-000000000004', 'admin');

insert into public.clients (id, profile_id)
values
  ('42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001'),
  ('42000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000002');

insert into public.client_assignments (id, client_id, staff_profile_id)
values
  ('43000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000003');

insert into public.client_files (id, client_id, file_kind, object_path, original_filename, mime_type, byte_size)
values
  ('44000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 'photo', 'clients/42000000-0000-0000-0000-000000000001/photo/44000000-0000-0000-0000-000000000001.jpg', 'synthetic-a.jpg', 'image/jpeg', 100),
  ('44000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'document', 'clients/42000000-0000-0000-0000-000000000002/document/44000000-0000-0000-0000-000000000002.pdf', 'synthetic-b.pdf', 'application/pdf', 200);

select throws_ok(
  $$insert into public.client_files (client_id, file_kind, object_path) values ('42000000-0000-0000-0000-000000000001', 'photo', 'clients/42000000-0000-0000-0000-000000000002/photo/44000000-0000-0000-0000-000000000001.jpg')$$,
  '23514', null, 'file path must use its own client namespace'
);
select throws_ok(
  $$insert into public.client_files (client_id, file_kind, object_path) values ('42000000-0000-0000-0000-000000000001', 'photo', 'clients/42000000-0000-0000-0000-000000000001/photo/44000000-0000-0000-0000-000000000001.jpg')$$,
  '23505', null, 'duplicate bucket and path are rejected'
);

insert into public.client_assessments (id, client_id, assessed_at)
values
  ('45000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', '2026-09-01T09:00:00Z'),
  ('45000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', '2026-09-15T09:00:00Z'),
  ('45000000-0000-0000-0000-000000000003', '42000000-0000-0000-0000-000000000002', '2026-09-02T09:00:00Z');

insert into public.assessment_measurements (assessment_id, measurement_key, measurement_value, unit)
values
  ('45000000-0000-0000-0000-000000000001', 'synthetic_measurement', 72.1250, 'synthetic-unit'),
  ('45000000-0000-0000-0000-000000000002', 'synthetic_measurement', 71.8750, 'synthetic-unit');

insert into public.assessment_files (assessment_id, client_id, client_file_id)
values ('45000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000001');

select is((select count(*) from public.client_assessments where client_id = '42000000-0000-0000-0000-000000000001'), 2::bigint, 'two historical assessments coexist');
select is((select measurement_value from public.assessment_measurements where assessment_id = '45000000-0000-0000-0000-000000000001'), 72.1250::numeric, 'measurement decimal is preserved');
select is((select count(*) from public.client_assessments where client_id = '42000000-0000-0000-0000-000000000001' and assessed_at < '2026-09-15T09:00:00Z'), 1::bigint, 'temporal comparison query can find prior assessment');
select throws_ok(
  $$insert into public.assessment_files (assessment_id, client_id, client_file_id) values ('45000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', '44000000-0000-0000-0000-000000000002')$$,
  '23503', null, 'assessment cannot link a file owned by another client'
);

insert into public.professional_follow_ups (id, client_id, assessment_id, author_profile_id, difficulty, adherence_perception, patty_observation, professional_decision, decision_reason, recorded_at)
values
  ('46000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000003', 'synthetic difficulty one', 'synthetic perception one', 'synthetic internal note one', 'maintain', 'synthetic reason one', '2026-09-01T10:00:00Z'),
  ('46000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000001', '45000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000003', 'synthetic difficulty two', 'synthetic perception two', 'synthetic internal note two', 'advance', 'synthetic reason two', '2026-09-15T10:00:00Z');

select is((select count(*) from public.professional_follow_ups where client_id = '42000000-0000-0000-0000-000000000001'), 2::bigint, 'follow-up history is append-only by model');
select throws_ok(
  $$insert into public.professional_follow_ups (client_id, author_profile_id, professional_decision, decision_reason) values ('42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000003', 'other', 'synthetic reason')$$,
  '23514', null, 'unconfirmed professional decision is rejected'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000001', true);
select is((select count(*) from public.client_files), 1::bigint, 'client A reads file metadata A only');
select is((select count(*) from public.client_files where client_id = '42000000-0000-0000-0000-000000000002'), 0::bigint, 'client A cannot read file metadata B');
select is((select count(*) from public.client_assessments), 0::bigint, 'client A cannot read assessments while visibility is open');
select is((select count(*) from public.professional_follow_ups), 0::bigint, 'client A cannot read internal follow-ups');

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000002', true);
select is((select count(*) from public.client_files), 1::bigint, 'client B reads file metadata B only');
select is((select count(*) from public.client_files where client_id = '42000000-0000-0000-0000-000000000001'), 0::bigint, 'client B cannot read file metadata A');

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.client_files), 1::bigint, 'assigned admin reads file metadata A');
select is((select count(*) from public.client_assessments), 2::bigint, 'assigned admin reads assessments A');
select is((select count(*) from public.assessment_measurements), 2::bigint, 'assigned admin reads measurements A');
select is((select count(*) from public.assessment_files), 1::bigint, 'assigned admin reads assessment files A');
select is((select count(*) from public.professional_follow_ups), 2::bigint, 'assigned admin reads follow-ups A');
insert into public.professional_follow_ups (client_id, author_profile_id, professional_decision, decision_reason)
values ('42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000003', 'simplify', 'synthetic RLS insert');
select is((select count(*) from public.professional_follow_ups), 3::bigint, 'assigned admin can append own follow-up');

select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000004', true);
select is((select count(*) from public.client_files), 0::bigint, 'unassigned admin cannot read file metadata');
select is((select count(*) from public.client_assessments), 0::bigint, 'unassigned admin cannot read assessments');
select is((select count(*) from public.professional_follow_ups), 0::bigint, 'unassigned admin cannot read follow-ups');
select throws_ok(
  $$insert into public.professional_follow_ups (client_id, author_profile_id, professional_decision, decision_reason) values ('42000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000004', 'return', 'synthetic denied insert')$$,
  '42501', null, 'unassigned admin cannot append follow-up'
);

reset role;
update public.client_assignments
set ended_at = now()
where id = '43000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-0000-0000-000000000003', true);
select is((select count(*) from public.client_files), 0::bigint, 'ended assignment removes file access');
select is((select count(*) from public.client_assessments), 0::bigint, 'ended assignment removes assessment access');
select is((select count(*) from public.professional_follow_ups), 0::bigint, 'ended assignment removes follow-up access');

reset role;
set local role anon;
select throws_ok($$select * from public.client_files$$, '42501', null, 'anon cannot read file metadata');
select throws_ok($$select * from public.client_assessments$$, '42501', null, 'anon cannot read assessments');
select throws_ok($$select * from public.professional_follow_ups$$, '42501', null, 'anon cannot read follow-ups');

select * from finish();
rollback;
