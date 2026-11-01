-- RBAC-ADMIN-WRITE-02: synthetic pgTAP. Transaction rolled back.
BEGIN;
SELECT no_plan();

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.assessment_measurement_corrections'::regclass),
 'Correction RLS remains enabled');
SELECT ok(EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
 AND tablename='assessment_measurement_corrections'
 AND policyname='admin_mfa_aal2_required' AND permissive='RESTRICTIVE'),
 'Admin MFA restrictive policy remains enabled');
SELECT ok(EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
 AND tablename='assessment_measurement_corrections'
 AND policyname='assessment_measurement_corrections_insert_admin_global_aal2'
 AND cmd='INSERT'),
 'Admin global INSERT policy is present');
SELECT ok(NOT has_table_privilege('authenticated','public.assessment_measurement_corrections','UPDATE')
 AND NOT has_table_privilege('authenticated','public.assessment_measurement_corrections','DELETE')
 AND NOT has_table_privilege('anon','public.assessment_measurement_corrections','INSERT'),
 'Append-only SQL privileges stay intact');
SELECT ok(EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.assessment_measurement_corrections'::regclass
 AND tgname='assessment_measurement_corrections_immutable' AND tgenabled='O'),
 'Historical correction immutability trigger remains enabled');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('a1000000-0000-4000-8000-000000000001','synthetic-correction-admin@example.test','{}'),
 ('a1000000-0000-4000-8000-000000000002','synthetic-correction-client@example.test','{}'),
 ('a1000000-0000-4000-8000-000000000003','synthetic-correction-other@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('a1000000-0000-4000-8000-000000000001','Synthetic AAL2 admin'),
 ('a1000000-0000-4000-8000-000000000002','Synthetic client'),
 ('a1000000-0000-4000-8000-000000000003','Synthetic non-admin');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('a1000000-0000-4000-8000-000000000001','admin'),
 ('a1000000-0000-4000-8000-000000000002','client'),
 ('a1000000-0000-4000-8000-000000000003','client');
INSERT INTO public.clients(id,profile_id,full_name,status) VALUES
 ('a2000000-0000-4000-8000-000000000001',NULL,'Synthetic historical inactive client','inactive');
INSERT INTO public.client_assessments(id,client_id,assessed_at,assessment_kind,created_by_profile_id) VALUES
 ('a3000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',now(),'monthly','a1000000-0000-4000-8000-000000000001'),
 ('a3000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001',now(),'monthly','a1000000-0000-4000-8000-000000000001');
INSERT INTO public.assessment_measurements(id,assessment_id,measurement_key,measurement_value,unit) VALUES
 ('a4000000-0000-4000-8000-000000000001','a3000000-0000-4000-8000-000000000001','peso',73,'kg'),
 ('a4000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000002','peso',74,'kg');
INSERT INTO public.method_configuration_snapshot_sets(
 id,client_id,engine_contract_version,created_by_profile_id) VALUES
 ('a5000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001',1,'a1000000-0000-4000-8000-000000000001');
UPDATE public.client_assessments
 SET method_configuration_snapshot_set_id='a5000000-0000-4000-8000-000000000001',
 finalized_at=now(), finalized_by_profile_id='a1000000-0000-4000-8000-000000000001'
 WHERE id='a3000000-0000-4000-8000-000000000001';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);

SELECT lives_ok($sql$
 INSERT INTO public.assessment_measurement_corrections(
 assessment_measurement_id,corrected_by_profile_id,corrected_measurement_value,corrected_unit,note)
 VALUES ('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',72,'kg','Synthetic professional correction')
$sql$,'AAL2 admin can append correction to historical finalized assessment without assignment');

SELECT is(
 (SELECT count(*) FROM public.assessment_measurement_corrections
  WHERE assessment_measurement_id='a4000000-0000-4000-8000-000000000001'),
 1::bigint,
 'Exactly one correction is recorded for historical measurement');
SELECT is((SELECT measurement_value FROM public.assessment_measurements
 WHERE id='a4000000-0000-4000-8000-000000000001'),73::numeric,
 'Original measurement remains unchanged');

SELECT throws_ok($sql$
 INSERT INTO public.assessment_measurement_corrections(
 assessment_measurement_id,corrected_by_profile_id,corrected_measurement_value,corrected_unit)
 VALUES ('a4000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000001',73,'kg')
$sql$,'23514',NULL,'Draft assessment cannot receive correction');

SELECT throws_ok($sql$
 INSERT INTO public.assessment_measurement_corrections(
 assessment_measurement_id,corrected_by_profile_id,corrected_measurement_value,corrected_unit)
 VALUES ('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003',73,'kg')
$sql$,'23514',NULL,'Admin cannot forge another profile author');

SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.assessment_measurement_corrections(
 assessment_measurement_id,corrected_by_profile_id,corrected_measurement_value,corrected_unit)
 VALUES ('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001',73,'kg')
$sql$,'23514',NULL,'Admin AAL1 is denied');

SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.assessment_measurement_corrections(
 assessment_measurement_id,corrected_by_profile_id,corrected_measurement_value,corrected_unit)
 VALUES ('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002',73,'kg')
$sql$,'23514',NULL,'Client cannot write professional correction');

SELECT set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.assessment_measurement_corrections(
 assessment_measurement_id,corrected_by_profile_id,corrected_measurement_value,corrected_unit)
 VALUES ('a4000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000003',73,'kg')
$sql$,'23514',NULL,'Non-admin authenticated account cannot write correction');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
