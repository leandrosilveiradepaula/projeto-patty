-- RBAC-ADMIN-WRITE-04, exclusively synthetic data. The transaction rolls back.
BEGIN;
SELECT no_plan();

SELECT ok(
  (SELECT bool_and(c.relrowsecurity)
   FROM pg_class c
   WHERE c.oid IN (
     'public.anamnesis_answer_corrections'::regclass,
     'public.anamnesis_clarification_requests'::regclass,
     'public.anamnesis_clarification_resolutions'::regclass)),
  'RLS remains enabled for all three append-only tables'
);
SELECT is(
 (SELECT count(*) FROM pg_policies
  WHERE schemaname='public'
   AND tablename IN ('anamnesis_answer_corrections','anamnesis_clarification_requests','anamnesis_clarification_resolutions')
   AND policyname='admin_mfa_aal2_required' AND permissive='RESTRICTIVE'),
 3::bigint,'Restrictive MFA policies preserved for all three tables'
);
SELECT is(
 (SELECT count(*) FROM pg_policies
  WHERE schemaname='public'
   AND policyname IN (
    'anamnesis_answer_corrections_insert_admin_global_aal2',
    'anamnesis_clarification_requests_insert_admin_global_aal2',
    'anamnesis_clarification_resolutions_insert_admin_global_aal2')
   AND cmd='INSERT'),
 3::bigint,'Three narrowly scoped INSERT policies installed'
);
SELECT ok(
  NOT has_table_privilege('authenticated','public.anamnesis_answer_corrections','UPDATE') AND
  NOT has_table_privilege('authenticated','public.anamnesis_answer_corrections','DELETE') AND
  NOT has_table_privilege('authenticated','public.anamnesis_clarification_requests','UPDATE') AND
  NOT has_table_privilege('authenticated','public.anamnesis_clarification_requests','DELETE') AND
  NOT has_table_privilege('authenticated','public.anamnesis_clarification_resolutions','UPDATE') AND
  NOT has_table_privilege('authenticated','public.anamnesis_clarification_resolutions','DELETE') AND
  NOT has_table_privilege('anon','public.anamnesis_clarification_requests','INSERT') AND
  NOT has_table_privilege('anon','public.anamnesis_clarification_resolutions','INSERT') AND
  NOT has_table_privilege('anon','public.anamnesis_answer_corrections','INSERT'),
  'No UPDATE, DELETE or anon INSERT was granted'
);

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('c1000000-0000-4000-8000-000000000001','synthetic-history-admin@example.test','{}'),
 ('c1000000-0000-4000-8000-000000000002','synthetic-history-client@example.test','{}'),
 ('c1000000-0000-4000-8000-000000000003','synthetic-history-nonadmin@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('c1000000-0000-4000-8000-000000000001','Synthetic history admin'),
 ('c1000000-0000-4000-8000-000000000002','Synthetic history client'),
 ('c1000000-0000-4000-8000-000000000003','Synthetic history non-admin');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('c1000000-0000-4000-8000-000000000001','admin'),
 ('c1000000-0000-4000-8000-000000000002','client'),
 ('c1000000-0000-4000-8000-000000000003','client');
INSERT INTO public.clients(id,profile_id,full_name,status) VALUES
 ('c2000000-0000-4000-8000-000000000001',NULL,'Synthetic historical client without account','inactive'),
 ('c2000000-0000-4000-8000-000000000002',NULL,'Synthetic draft client without account','inactive'),
 ('c2000000-0000-4000-8000-000000000003',NULL,'Synthetic separate submitted client','inactive');
INSERT INTO public.anamnesis_forms(id,form_key) VALUES
 ('c3000000-0000-4000-8000-000000000001','synthetic_historical_clarification');
INSERT INTO public.anamnesis_form_versions(id,form_id,version_number,published_at) VALUES
 ('c4000000-0000-4000-8000-000000000001','c3000000-0000-4000-8000-000000000001',1,now());
INSERT INTO public.anamnesis_sections(id,form_version_id,section_key,title,display_order) VALUES
 ('c4500000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','synthetic','Synthetic section',1);
INSERT INTO public.anamnesis_questions(
 id,form_version_id,section_id,question_key,label,display_order,answer_type,required) VALUES
 ('c4600000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001',
  'c4500000-0000-4000-8000-000000000001','synthetic_text','Synthetic question',1,'text',false);
INSERT INTO public.anamnesis_submissions(id,client_id,form_version_id,created_at) VALUES
 ('c5000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001',now()-interval '2 minutes'),
 ('c5000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000002','c4000000-0000-4000-8000-000000000001',now()-interval '2 minutes'),
 ('c5000000-0000-4000-8000-000000000003','c2000000-0000-4000-8000-000000000003','c4000000-0000-4000-8000-000000000001',now()-interval '2 minutes');
INSERT INTO public.anamnesis_answers(id,submission_id,form_version_id,question_id,answer_value) VALUES
 ('c6000000-0000-4000-8000-000000000001','c5000000-0000-4000-8000-000000000001','c4000000-0000-4000-8000-000000000001','c4600000-0000-4000-8000-000000000001','"original"'::jsonb),
 ('c6000000-0000-4000-8000-000000000002','c5000000-0000-4000-8000-000000000002','c4000000-0000-4000-8000-000000000001','c4600000-0000-4000-8000-000000000001','"unsubmitted"'::jsonb),
 ('c6000000-0000-4000-8000-000000000003','c5000000-0000-4000-8000-000000000003','c4000000-0000-4000-8000-000000000001','c4600000-0000-4000-8000-000000000001','"other"'::jsonb);
UPDATE public.anamnesis_submissions SET submitted_at=now()
 WHERE id IN (
 'c5000000-0000-4000-8000-000000000001',
 'c5000000-0000-4000-8000-000000000003');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT lives_ok($sql$
 INSERT INTO public.anamnesis_answer_corrections(answer_id,corrected_answer_value,corrected_by_profile_id)
 VALUES ('c6000000-0000-4000-8000-000000000001','"corrected"'::jsonb,
  'c1000000-0000-4000-8000-000000000001')
$sql$,'Admin AAL2 without assignment can append correction to submitted answer');

SELECT is((SELECT answer_value FROM public.anamnesis_answers
 WHERE id='c6000000-0000-4000-8000-000000000001'),
 '"original"'::jsonb,'Original answer remains unchanged');
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_answer_corrections(answer_id,corrected_answer_value,corrected_by_profile_id)
 VALUES ('c6000000-0000-4000-8000-000000000002','"draft correction"'::jsonb,
  'c1000000-0000-4000-8000-000000000001')
$sql$,'42501',NULL,'Cannot correct draft answer');
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_answer_corrections(answer_id,corrected_answer_value,corrected_by_profile_id)
 VALUES ('c6000000-0000-4000-8000-000000000001','"forged"'::jsonb,
  'c1000000-0000-4000-8000-000000000003')
$sql$,'42501',NULL,'Correction author cannot be forged');

SELECT lives_ok($sql$
 INSERT INTO public.anamnesis_clarification_requests(
 id,submission_id,source_answer_id,requested_by_profile_id,request_text)
 VALUES ('c7000000-0000-4000-8000-000000000001',
 'c5000000-0000-4000-8000-000000000001',
 'c6000000-0000-4000-8000-000000000001',
 'c1000000-0000-4000-8000-000000000001','Synthetic clarification needed')
$sql$,'Admin AAL2 without assignment may request clarification on submitted anamnesis');

SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_clarification_requests(
 submission_id,requested_by_profile_id,request_text)
 VALUES ('c5000000-0000-4000-8000-000000000002',
 'c1000000-0000-4000-8000-000000000001','Draft request')
$sql$,'55000',NULL,'Draft anamnesis cannot receive clarification request');
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_clarification_requests(
 submission_id,source_answer_id,requested_by_profile_id,request_text)
 VALUES ('c5000000-0000-4000-8000-000000000001',
 'c6000000-0000-4000-8000-000000000003',
 'c1000000-0000-4000-8000-000000000001','Wrong submission')
$sql$,'23514',NULL,'Source answer must belong to same submission');
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_clarification_requests(
 submission_id,requested_by_profile_id,request_text)
 VALUES ('c5000000-0000-4000-8000-000000000001',
 'c1000000-0000-4000-8000-000000000003','Forged request')
$sql$,'42501',NULL,'Clarification requester cannot be forged');

SELECT lives_ok($sql$
 INSERT INTO public.anamnesis_clarification_resolutions(
 clarification_request_id,resolved_by_profile_id)
 VALUES ('c7000000-0000-4000-8000-000000000001',
 'c1000000-0000-4000-8000-000000000001')
$sql$,'Admin AAL2 without assignment can resolve historical clarification');

SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_clarification_resolutions(
 clarification_request_id,resolved_by_profile_id)
 VALUES ('c7000000-0000-4000-8000-000000000001',
 'c1000000-0000-4000-8000-000000000001')
$sql$,'23505',NULL,'Clarification resolution is unique and append-only');

SELECT set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_answer_corrections(answer_id,corrected_answer_value,corrected_by_profile_id)
 VALUES ('c6000000-0000-4000-8000-000000000001','"aal1"'::jsonb,'c1000000-0000-4000-8000-000000000001')
$sql$,'42501',NULL,'Admin AAL1 cannot correct an answer');
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_clarification_requests(submission_id,requested_by_profile_id,request_text)
 VALUES ('c5000000-0000-4000-8000-000000000001',
 'c1000000-0000-4000-8000-000000000001','AAL1 denied')
$sql$,'55000',NULL,'Admin AAL1 cannot request clarification');

SELECT set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_answer_corrections(answer_id,corrected_answer_value,corrected_by_profile_id)
 VALUES ('c6000000-0000-4000-8000-000000000001','"client"'::jsonb,
 'c1000000-0000-4000-8000-000000000002')
$sql$,'42501',NULL,'Client cannot append professional correction');
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_clarification_requests(submission_id,requested_by_profile_id,request_text)
 VALUES ('c5000000-0000-4000-8000-000000000001',
 'c1000000-0000-4000-8000-000000000002','Client denied')
$sql$,'55000',NULL,'Client cannot create professional clarification request');
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_clarification_resolutions(clarification_request_id,resolved_by_profile_id)
 VALUES ('c7000000-0000-4000-8000-000000000001',
 'c1000000-0000-4000-8000-000000000002')
$sql$,'23514',NULL,'Client cannot resolve professional clarification');

SELECT set_config('request.jwt.claim.sub','c1000000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_clarification_resolutions(clarification_request_id,resolved_by_profile_id)
 VALUES ('c7000000-0000-4000-8000-000000000001',
 'c1000000-0000-4000-8000-000000000003')
$sql$,'23514',NULL,'Nonadmin AAL2 cannot resolve clarification');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
