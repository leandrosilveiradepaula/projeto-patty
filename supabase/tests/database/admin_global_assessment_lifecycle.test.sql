-- RBAC-ADMIN-ASSESSMENT-01: synthetic-only, rollback after pgTAP.
BEGIN;
SELECT no_plan();

SELECT ok(
 (SELECT COUNT(*) FROM pg_class WHERE oid IN (
  'public.client_assessments'::regclass,'public.assessment_measurements'::regclass,
  'public.assessment_files'::regclass) AND relrowsecurity)=3,
 'All assessment domain tables retain RLS'
);
SELECT ok((SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('client_assessments','assessment_measurements','assessment_files')
 AND policyname='admin_mfa_aal2_required' AND permissive='RESTRICTIVE')=3,
 'Admin MFA restrictive policies remain present');
SELECT ok((SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'
 AND policyname IN (
 'assessment_session_update_draft_only',
 'client_assessments_insert_admin_global_draft_aal2',
 'client_assessments_update_admin_global_draft_aal2',
 'assessment_measurements_insert_admin_global_draft_aal2',
 'assessment_measurements_update_admin_global_draft_aal2',
 'assessment_measurements_delete_admin_global_draft_aal2',
 'assessment_files_insert_admin_global_draft_aal2',
 'assessment_files_delete_admin_global_draft_aal2'
 ))=8,'Every narrow admin draft policy exists');
SELECT ok(
 NOT has_table_privilege('authenticated','public.client_assessments','UPDATE')
 AND has_column_privilege('authenticated','public.client_assessments','assessed_at','UPDATE')
 AND has_column_privilege('authenticated','public.client_assessments','assessment_kind','UPDATE')
 AND NOT has_column_privilege('authenticated','public.client_assessments','finalized_at','UPDATE')
 AND NOT has_column_privilege('authenticated','public.client_assessments','method_configuration_snapshot_set_id','UPDATE')
 AND NOT has_table_privilege('anon','public.client_assessments','UPDATE')
 AND NOT has_table_privilege('anon','public.assessment_files','INSERT'),
 'Only draft metadata columns are writable, never finalization/snapshot or anon');
SELECT ok((SELECT NOT prosecdef FROM pg_proc WHERE oid =
 'public.finalize_assessment_from_method_snapshot(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb)'::regprocedure)
 AND NOT has_function_privilege('authenticated',
 'public.finalize_assessment_from_method_snapshot(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb)','EXECUTE')
 AND has_function_privilege('service_role',
 'public.finalize_assessment_from_method_snapshot(uuid,uuid,uuid,jsonb,jsonb,uuid,jsonb,jsonb)','EXECUTE'),
 'Finalization stays invoker and service-role-only');
SELECT ok((SELECT COUNT(*) FROM pg_trigger WHERE tgrelid IN (
 'public.client_assessments'::regclass,
 'public.assessment_measurements'::regclass,
 'public.assessment_files'::regclass)
 AND NOT tgisinternal AND tgenabled='O')>=2,
 'Lifecycle immutability triggers are retained');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('e7100000-0000-4000-8000-000000000001','assessment-admin@example.test','{}'),
('e7100000-0000-4000-8000-000000000002','assessment-client@example.test','{}'),
('e7100000-0000-4000-8000-000000000003','assessment-norole@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
('e7100000-0000-4000-8000-000000000001','Synthetic assessment admin'),
('e7100000-0000-4000-8000-000000000002','Synthetic assessment client'),
('e7100000-0000-4000-8000-000000000003','Synthetic no-role profile');
INSERT INTO public.user_roles(profile_id,role) VALUES
('e7100000-0000-4000-8000-000000000001','admin'),
('e7100000-0000-4000-8000-000000000002','client');
INSERT INTO public.clients(id,full_name,profile_id,status) VALUES
('e7200000-0000-4000-8000-000000000001','Synthetic historical Client no account',NULL,'inactive'),
('e7200000-0000-4000-8000-000000000002','Synthetic active Client','e7100000-0000-4000-8000-000000000002','active');
-- Historical assessment without active assignment.
INSERT INTO public.client_assessments(
 id,client_id,assessed_at,assessment_kind,created_by_profile_id)
VALUES('e7300000-0000-4000-8000-000000000001',
 'e7200000-0000-4000-8000-000000000001',now(),'fortnightly',
 'e7100000-0000-4000-8000-000000000001');
INSERT INTO public.client_assessments(
 id,client_id,assessed_at,assessment_kind,created_by_profile_id,finalized_at,finalized_by_profile_id)
VALUES('e7300000-0000-4000-8000-000000000002',
 'e7200000-0000-4000-8000-000000000001',now()-interval '15 days',
 'fortnightly','e7100000-0000-4000-8000-000000000001',
 now()-interval '14 days','e7100000-0000-4000-8000-000000000001');
INSERT INTO public.client_files(
 id, client_id, file_kind, object_path, original_filename,
 mime_type, byte_size, uploaded_by_profile_id)
VALUES('e7400000-0000-4000-8000-000000000001',
 'e7200000-0000-4000-8000-000000000001','photo',
 'clients/e7200000-0000-4000-8000-000000000001/photo/e7400000-0000-4000-8000-000000000001.jpg',
 'synthetic-photo.jpg','image/jpeg',100,
 'e7100000-0000-4000-8000-000000000001');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e7100000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"e7100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);

SELECT lives_ok($sql$
 INSERT INTO public.client_assessments(client_id,assessed_at,assessment_kind,created_by_profile_id)
 VALUES('e7200000-0000-4000-8000-000000000001',now(),'monthly',
 'e7100000-0000-4000-8000-000000000001')
$sql$, 'Unassigned admin AAL2 can start historical assessment draft');
SELECT lives_ok($sql$
 UPDATE public.client_assessments SET assessed_at=now()-interval '1 day'
 WHERE id='e7300000-0000-4000-8000-000000000001'
$sql$, 'Unassigned admin AAL2 can update historical draft');
SELECT lives_ok($sql$
 INSERT INTO public.assessment_measurements(assessment_id,measurement_key,measurement_value,unit)
 VALUES('e7300000-0000-4000-8000-000000000001','peso',72,'kg')
$sql$, 'Unassigned admin AAL2 can add draft measurement');
SELECT lives_ok($sql$
 UPDATE public.assessment_measurements SET measurement_value=73
 WHERE assessment_id='e7300000-0000-4000-8000-000000000001'
 AND measurement_key='peso'
$sql$, 'Unassigned admin AAL2 can update draft measurement');
SELECT is((SELECT measurement_value FROM public.assessment_measurements
 WHERE assessment_id='e7300000-0000-4000-8000-000000000001'
 AND measurement_key='peso'),73::numeric,'Updated measurement persists under RLS');
SELECT lives_ok($sql$
 INSERT INTO public.assessment_files(assessment_id,client_id,client_file_id)
 VALUES('e7300000-0000-4000-8000-000000000001',
 'e7200000-0000-4000-8000-000000000001',
 'e7400000-0000-4000-8000-000000000001')
$sql$, 'Unassigned admin AAL2 can link same-client photo while draft');
SELECT is((SELECT COUNT(*) FROM public.assessment_files
 WHERE assessment_id='e7300000-0000-4000-8000-000000000001'),
 1::bigint,'Linked photo exists for draft');
SELECT lives_ok($sql$
 DELETE FROM public.assessment_files
 WHERE assessment_id='e7300000-0000-4000-8000-000000000001'
$sql$, 'Unassigned admin AAL2 can unlink draft photo');
SELECT lives_ok($sql$
 DELETE FROM public.assessment_measurements
 WHERE assessment_id='e7300000-0000-4000-8000-000000000001'
 AND measurement_key='peso'
$sql$, 'Unassigned admin AAL2 can remove draft measurement');
SELECT throws_ok($sql$
 INSERT INTO public.client_assessments(client_id,assessed_at,assessment_kind,created_by_profile_id)
 VALUES('e7200000-0000-4000-8000-000000000001',now(),'monthly',
 'e7100000-0000-4000-8000-000000000002')
$sql$,'42501',NULL,'Admin cannot forge assessment draft author');
SELECT throws_ok($sql$
 UPDATE public.client_assessments SET finalized_at=now(),
 finalized_by_profile_id='e7100000-0000-4000-8000-000000000001'
 WHERE id='e7300000-0000-4000-8000-000000000001'
$sql$,'42501',NULL,'Authenticated admin cannot finalize without snapshot RPC');
WITH changed AS (UPDATE public.client_assessments SET assessed_at=now()
  WHERE id='e7300000-0000-4000-8000-000000000002' RETURNING id)
 SELECT is((SELECT count(*) FROM changed),0::bigint,
 'Finalized historical assessment is excluded by draft-only UPDATE RLS');
SELECT throws_ok($sql$
 INSERT INTO public.assessment_measurements(assessment_id,measurement_key,measurement_value,unit)
 VALUES('e7300000-0000-4000-8000-000000000002','peso',71,'kg')
$sql$,'55000',NULL,'No new measurements on finalized assessment');

SELECT set_config('request.jwt.claims','{"sub":"e7100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.client_assessments(client_id,assessed_at,assessment_kind,created_by_profile_id)
 VALUES('e7200000-0000-4000-8000-000000000001',now(),'monthly',
 'e7100000-0000-4000-8000-000000000001')
$sql$,'42501',NULL,'AAL1 admin cannot start draft');
WITH changed AS (UPDATE public.client_assessments SET assessed_at=now()
  WHERE id='e7300000-0000-4000-8000-000000000001' RETURNING id)
 SELECT is((SELECT count(*) FROM changed),0::bigint,
 'AAL1 admin cannot update draft under RLS');

SELECT set_config('request.jwt.claim.sub','e7100000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"e7100000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.client_assessments(client_id,assessed_at,assessment_kind,created_by_profile_id)
 VALUES('e7200000-0000-4000-8000-000000000001',now(),'monthly',
 'e7100000-0000-4000-8000-000000000002')
$sql$,'42501',NULL,'Client cannot insert another Client assessment');
WITH changed AS (UPDATE public.client_assessments SET assessed_at=now()
  WHERE id='e7300000-0000-4000-8000-000000000001' RETURNING id)
 SELECT is((SELECT count(*) FROM changed),0::bigint,
 'Client cannot update another Client professional draft');

SELECT set_config('request.jwt.claim.sub','e7100000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"e7100000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.client_assessments(client_id,assessed_at,assessment_kind,created_by_profile_id)
 VALUES('e7200000-0000-4000-8000-000000000001',now(),'monthly',
 'e7100000-0000-4000-8000-000000000003')
$sql$,'42501',NULL,'Non-admin without role cannot insert assessment');

RESET ROLE;
-- The privileged service-role RPC retains its original snapshot, readiness,
-- and draft immutability checks. Revalidated actor must be admin, even without
-- a historical assignment. The Client does not receive publication.
INSERT INTO public.assessment_measurements(assessment_id,measurement_key,measurement_value,unit)
VALUES
 ('e7300000-0000-4000-8000-000000000001','peso',72,'kg'),
 ('e7300000-0000-4000-8000-000000000001','cintura',75,'cm'),
 ('e7300000-0000-4000-8000-000000000001','abdomen',80,'cm'),
 ('e7300000-0000-4000-8000-000000000001','quadril',95,'cm');
SELECT throws_ok($sql$
 SELECT public.finalize_assessment_from_method_snapshot(
  'e7300000-0000-4000-8000-000000000001',
  'e7100000-0000-4000-8000-000000000002',
  (SELECT v.id FROM public.method_configuration_versions v
   JOIN public.method_configuration_templates t ON t.id=v.template_id
   WHERE t.template_key='evaluation.assessment_kind_catalog' AND v.retired_at IS NULL),
  (SELECT v.configuration FROM public.method_configuration_versions v
   JOIN public.method_configuration_templates t ON t.id=v.template_id
   WHERE t.template_key='evaluation.assessment_kind_catalog' AND v.retired_at IS NULL),
  '{"historical_code":"fortnightly","semantic_key":"basic","label":"Básica"}'::jsonb,
  (SELECT v.id FROM public.method_configuration_versions v
   JOIN public.method_configuration_templates t ON t.id=v.template_id
   WHERE t.template_key='evaluation.assessment_definition.basic' AND v.retired_at IS NULL),
  (SELECT v.configuration FROM public.method_configuration_versions v
   JOIN public.method_configuration_templates t ON t.id=v.template_id
   WHERE t.template_key='evaluation.assessment_definition.basic' AND v.retired_at IS NULL),
  '{"kind_key":"basic","can_finalize":true}'::jsonb
 )
$sql$,'42501',NULL,'Service-only finalization rejects a forged non-admin actor');

SELECT isnt(public.finalize_assessment_from_method_snapshot(
  'e7300000-0000-4000-8000-000000000001',
  'e7100000-0000-4000-8000-000000000001',
  (SELECT v.id FROM public.method_configuration_versions v
   JOIN public.method_configuration_templates t ON t.id=v.template_id
   WHERE t.template_key='evaluation.assessment_kind_catalog' AND v.retired_at IS NULL),
  (SELECT v.configuration FROM public.method_configuration_versions v
   JOIN public.method_configuration_templates t ON t.id=v.template_id
   WHERE t.template_key='evaluation.assessment_kind_catalog' AND v.retired_at IS NULL),
  '{"historical_code":"fortnightly","semantic_key":"basic","label":"Básica"}'::jsonb,
  (SELECT v.id FROM public.method_configuration_versions v
   JOIN public.method_configuration_templates t ON t.id=v.template_id
   WHERE t.template_key='evaluation.assessment_definition.basic' AND v.retired_at IS NULL),
  (SELECT v.configuration FROM public.method_configuration_versions v
   JOIN public.method_configuration_templates t ON t.id=v.template_id
   WHERE t.template_key='evaluation.assessment_definition.basic' AND v.retired_at IS NULL),
  '{"kind_key":"basic","can_finalize":true}'::jsonb
 ),null::uuid,'Service-only finalization accepts verified admin without assignment after readiness checks');
SELECT ok((SELECT finalized_at IS NOT NULL AND finalized_by_profile_id =
 'e7100000-0000-4000-8000-000000000001'::uuid
 AND method_configuration_snapshot_set_id IS NOT NULL FROM public.client_assessments
 WHERE id='e7300000-0000-4000-8000-000000000001'),
 'Snapshot and finalizing administrator retained after privileged finalization');
SELECT is((SELECT COUNT(*) FROM public.method_configuration_snapshots s
 JOIN public.client_assessments a ON a.method_configuration_snapshot_set_id=s.snapshot_set_id
 WHERE a.id='e7300000-0000-4000-8000-000000000001'),2::bigint,
 'Exactly two immutable versioned method snapshots persist');
SELECT * FROM finish();
ROLLBACK;
