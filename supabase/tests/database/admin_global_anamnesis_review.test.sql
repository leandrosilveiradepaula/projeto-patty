-- RBAC-ADMIN-WRITE-03. Synthetic-only pgTAP; transaction rolls back.
BEGIN;
SELECT no_plan();

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.anamnesis_reviews'::regclass),
  'Anamnesis review RLS remains enabled');
SELECT ok(EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
 AND tablename='anamnesis_reviews'
 AND policyname='admin_mfa_aal2_required' AND permissive='RESTRICTIVE'),
  'Admin MFA restriction remains installed');
SELECT ok(EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
 AND tablename='anamnesis_reviews'
 AND policyname='anamnesis_reviews_insert_admin_global_aal2'
 AND cmd='INSERT'),
  'Admin global review insert policy exists');
SELECT ok(NOT has_table_privilege('authenticated','public.anamnesis_reviews','UPDATE')
 AND NOT has_table_privilege('authenticated','public.anamnesis_reviews','DELETE')
 AND NOT has_table_privilege('anon','public.anamnesis_reviews','INSERT'),
  'Human reviews stay append-only and inaccessible to anon writers');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('b1000000-0000-4000-8000-000000000001','synthetic-anamnesis-admin@example.test','{}'),
 ('b1000000-0000-4000-8000-000000000002','synthetic-anamnesis-client@example.test','{}'),
 ('b1000000-0000-4000-8000-000000000003','synthetic-anamnesis-no-admin@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('b1000000-0000-4000-8000-000000000001','Synthetic admin'),
 ('b1000000-0000-4000-8000-000000000002','Synthetic client'),
 ('b1000000-0000-4000-8000-000000000003','Synthetic other');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('b1000000-0000-4000-8000-000000000001','admin'),
 ('b1000000-0000-4000-8000-000000000002','client'),
 ('b1000000-0000-4000-8000-000000000003','client');
INSERT INTO public.clients(id,profile_id,full_name,status) VALUES
 ('b2000000-0000-4000-8000-000000000001',NULL,'Synthetic historical inactive client','inactive');
INSERT INTO public.anamnesis_forms(id,form_key) VALUES
 ('b3000000-0000-4000-8000-000000000001','synthetic_admin_global_review');
INSERT INTO public.anamnesis_form_versions(id,form_id,version_number,published_at) VALUES
 ('b4000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001',1,now());
INSERT INTO public.anamnesis_submissions(id,client_id,form_version_id,created_at,submitted_at) VALUES
 ('b5000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',now()-interval '1 minute',now()),
 ('b5000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001',now(),NULL);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);

SELECT lives_ok($sql$
 INSERT INTO public.anamnesis_reviews(submission_id,reviewer_profile_id,note)
 VALUES('b5000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Synthetic human review')
$sql$,'AAL2 admin without assignment can append review to submitted historical anamnesis');

SELECT is(
 (SELECT count(*) FROM public.anamnesis_reviews
  WHERE submission_id='b5000000-0000-4000-8000-000000000001'),
 1::bigint,
 'Review appended to historical submission exactly once');
SELECT is(
 (SELECT reviewer_profile_id FROM public.anamnesis_reviews
  WHERE submission_id='b5000000-0000-4000-8000-000000000001'),
 'b1000000-0000-4000-8000-000000000001'::uuid,
 'Human reviewer identity preserved');

SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_reviews(submission_id,reviewer_profile_id,note)
 VALUES('b5000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','Draft not submitted')
$sql$,'42501',NULL,'Draft anamnesis cannot be reviewed');

SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_reviews(submission_id,reviewer_profile_id,note)
 VALUES('b5000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000003','Forged reviewer')
$sql$,'42501',NULL,'Admin cannot forge reviewer identity');

SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_reviews(submission_id,reviewer_profile_id,note)
 VALUES('b5000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','MFA missing')
$sql$,'42501',NULL,'Admin AAL1 cannot append human review');

SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_reviews(submission_id,reviewer_profile_id,note)
 VALUES('b5000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','Unauthorized client')
$sql$,'42501',NULL,'Client cannot append professional anamnesis review');

SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.anamnesis_reviews(submission_id,reviewer_profile_id,note)
 VALUES('b5000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000003','Other role')
$sql$,'42501',NULL,'Non-admin AAL2 cannot append professional review');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
