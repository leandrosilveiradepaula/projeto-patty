-- Synthetic-only pgTAP; rolled back. Never put health data in CI.
BEGIN;
SELECT no_plan();
SELECT ok((SELECT relrowsecurity FROM pg_class
 WHERE oid='public.historical_anamnesis_imports'::regclass),
 'Historical answers always have RLS enabled');
SELECT ok((SELECT public IS FALSE FROM storage.buckets
 WHERE id='historical-originals-private'),
 'Historical Excel original bucket is private');
SELECT ok(EXISTS(
 SELECT 1 FROM pg_policies WHERE schemaname='storage'
  AND tablename='objects' AND policyname='historical_originals_never_browser'
  AND permissive='RESTRICTIVE'),
 'Private original bucket has mandatory browser denial');
SELECT ok(
 NOT has_table_privilege('anon','public.historical_anamnesis_imports','SELECT')
 AND NOT has_table_privilege('authenticated','public.historical_anamnesis_imports','INSERT')
 AND NOT has_table_privilege('authenticated','public.historical_anamnesis_imports','UPDATE')
 AND NOT has_table_privilege('authenticated','public.historical_anamnesis_imports','DELETE'),
 'No anon data access or direct browser mutations');
SELECT ok(
 NOT has_function_privilege('anon','public.stage_historical_anamnesis_source(uuid,text,uuid,text,text,uuid,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean)','EXECUTE')
 AND NOT has_function_privilege('authenticated','public.stage_historical_anamnesis_source(uuid,text,uuid,text,text,uuid,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean)','EXECUTE')
 AND has_function_privilege('service_role','public.stage_historical_anamnesis_source(uuid,text,uuid,text,text,uuid,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean)','EXECUTE'),
 'Only server-side role can execute staging RPC');
SELECT is((SELECT count(*) FROM pg_policies WHERE schemaname='public'
 AND tablename='historical_anamnesis_imports' AND cmd <> 'SELECT'),0::bigint,
 'No browser INSERT/UPDATE/DELETE RLS policies');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('f1100000-0000-4000-8000-000000000001','history-admin@example.test','{}'),
 ('f1100000-0000-4000-8000-000000000002','history-client@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('f1100000-0000-4000-8000-000000000001','Synthetic history admin'),
 ('f1100000-0000-4000-8000-000000000002','Synthetic history client');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('f1100000-0000-4000-8000-000000000001','admin'),
 ('f1100000-0000-4000-8000-000000000002','client');
INSERT INTO public.clients(id,profile_id,full_name,status) VALUES
 ('f1200000-0000-4000-8000-000000000001',NULL,'Synthetic archived','inactive');

INSERT INTO public.anamnesis_forms(id,form_key)
 VALUES ('f1300000-0000-4000-8000-000000000001','synthetic_legacy_mapping_form');
INSERT INTO public.anamnesis_form_versions(id,form_id,version_number,published_at)
 VALUES ('f1400000-0000-4000-8000-000000000001',
 'f1300000-0000-4000-8000-000000000001',1,now());
INSERT INTO public.anamnesis_sections(id,form_version_id,section_key,title,display_order)
 VALUES ('f1500000-0000-4000-8000-000000000001',
 'f1400000-0000-4000-8000-000000000001','synthetic','Synthetic',1);
INSERT INTO public.anamnesis_questions(id,form_version_id,section_id,question_key,
 label,answer_type,display_order,required) VALUES
 ('f1600000-0000-4000-8000-000000000001',
 'f1400000-0000-4000-8000-000000000001',
 'f1500000-0000-4000-8000-000000000001',
 'historical_test','Synthetic question','text',1,false);
INSERT INTO public.historical_initial_load_batches (
 id,manifest_sha256,manifest_metadata,source_count,created_by_profile_id
) VALUES (
 'f1700000-0000-4000-8000-000000000001',repeat('f',64),
 '[]'::jsonb,1,'f1100000-0000-4000-8000-000000000001');
INSERT INTO public.historical_initial_load_sources (
 batch_id,source_id,source_sha256,kind,state,layout_signature_sha256,
 worksheet_count,proposed_client_id
) VALUES (
 'f1700000-0000-4000-8000-000000000001','source_0001',repeat('a',64),
 'xlsx','pending_backend_identity_verification',repeat('b',64),1,
 'f1200000-0000-4000-8000-000000000001');

-- A service-only RPC can stage one explicit, immutable original answer.
SET LOCAL ROLE service_role;
SELECT lives_ok($q$
 SELECT public.stage_historical_anamnesis_source(
 'f1700000-0000-4000-8000-000000000001','source_0001',
 'f1200000-0000-4000-8000-000000000001',
 repeat('a',64),repeat('b',64),
 'f1400000-0000-4000-8000-000000000001',
 repeat('c',64),
 'f1700000-0000-4000-8000-000000000001/source_0001/' || repeat('a',64) || '.xlsx',
 '[{"question_id":"f1600000-0000-4000-8000-000000000001","sheet_index":0,"column_index":1,"row_index":2}]'::jsonb,
 '[{"question_id":"f1600000-0000-4000-8000-000000000001","sheet_index":0,"column_index":1,"row_index":2,"raw_type":"str","raw_value":"SYNTHETIC_ANSWER"}]'::jsonb,
 'f1100000-0000-4000-8000-000000000001',true,true,true)
 $q$, 'Approved-in-test synthetic staging succeeds');
SELECT is((SELECT count(*) FROM public.historical_anamnesis_imports
 WHERE batch_id='f1700000-0000-4000-8000-000000000001'),1::bigint,
 'Exactly one staged historical source exists');
SELECT lives_ok($q$
 SELECT public.stage_historical_anamnesis_source(
 'f1700000-0000-4000-8000-000000000001','source_0001',
 'f1200000-0000-4000-8000-000000000001',
 repeat('a',64),repeat('b',64),'f1400000-0000-4000-8000-000000000001',
 repeat('c',64),
 'f1700000-0000-4000-8000-000000000001/source_0001/' || repeat('a',64) || '.xlsx',
 '[{"question_id":"f1600000-0000-4000-8000-000000000001","sheet_index":0,"column_index":1,"row_index":2}]'::jsonb,
 '[{"question_id":"f1600000-0000-4000-8000-000000000001","sheet_index":0,"column_index":1,"row_index":2,"raw_type":"str","raw_value":"SYNTHETIC_ANSWER"}]'::jsonb,
 'f1100000-0000-4000-8000-000000000001',true,true,true)
 $q$, 'Identical import replays idempotently');
SELECT is((SELECT count(*) FROM public.historical_anamnesis_imports
 WHERE batch_id='f1700000-0000-4000-8000-000000000001'),1::bigint,
 'Idempotent replay does not duplicate data');
SELECT throws_ok($q$
 SELECT public.stage_historical_anamnesis_source(
 'f1700000-0000-4000-8000-000000000001','source_0001',
 'f1200000-0000-4000-8000-000000000001',
 repeat('a',64),repeat('b',64),'f1400000-0000-4000-8000-000000000001',
 repeat('c',64),
 'f1700000-0000-4000-8000-000000000001/source_0001/' || repeat('a',64) || '.xlsx',
 '[{"question_id":"f1600000-0000-4000-8000-000000000001","sheet_index":0,"column_index":1,"row_index":2}]'::jsonb,
 '[{"question_id":"f1600000-0000-4000-8000-000000000001","sheet_index":0,"column_index":1,"row_index":2,"raw_type":"str","raw_value":"DIFFERENT"}]'::jsonb,
 'f1100000-0000-4000-8000-000000000001',true,true,true)
 $q$,'23505',NULL,'Conflicting replay cannot overwrite original evidence');
SELECT throws_ok($q$
 SELECT public.stage_historical_anamnesis_source(
 'f1700000-0000-4000-8000-000000000001','source_0001',
 'f1200000-0000-4000-8000-000000000001',
 repeat('a',64),repeat('b',64),'f1400000-0000-4000-8000-000000000001',
 repeat('c',64),
 'f1700000-0000-4000-8000-000000000001/source_0001/' || repeat('a',64) || '.xlsx',
 '[{"question_id":"f1600000-0000-4000-8000-000000000001","sheet_index":0,"column_index":1,"row_index":2}]'::jsonb,
 '[{"question_id":"f1600000-0000-4000-8000-000000000001","sheet_index":0,"column_index":1,"row_index":2,"raw_type":"str","raw_value":"SYNTHETIC_ANSWER"}]'::jsonb,
 'f1100000-0000-4000-8000-000000000001',true,true,false)
 $q$,'42501',NULL,'Custody is a mandatory independent professional decision');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.anamnesis_submissions
 WHERE client_id='f1200000-0000-4000-8000-000000000001'),0::bigint,
 'Historical staging never creates a client-submitted Anamnesis');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"f1100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_anamnesis_imports),1::bigint,
 'Admin with AAL2 may review private historic evidence');
SELECT set_config('request.jwt.claims',
 '{"sub":"f1100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_anamnesis_imports),0::bigint,
 'Admin without MFA cannot review historic evidence');
SELECT set_config('request.jwt.claim.sub','f1100000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"f1100000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_anamnesis_imports),0::bigint,
 'Client with AAL2 cannot read historic evidence');
SELECT throws_ok($q$
 SELECT public.stage_historical_anamnesis_source(
 'f1700000-0000-4000-8000-000000000001','source_0001',
 'f1200000-0000-4000-8000-000000000001',
 repeat('a',64),repeat('b',64),'f1400000-0000-4000-8000-000000000001',
 repeat('c',64),
 'f1700000-0000-4000-8000-000000000001/source_0001/' || repeat('a',64) || '.xlsx',
 '[]'::jsonb,'[]'::jsonb,
 'f1100000-0000-4000-8000-000000000001',true,true,true)
 $q$,'42501',NULL,'Browser cannot invoke the server-only staging RPC');
RESET ROLE;

SELECT is((SELECT count(*) FROM public.clients
 WHERE id='f1200000-0000-4000-8000-000000000001'
 AND profile_id IS NULL AND status='inactive'),1::bigint,
 'Staging does not activate or duplicate historical clients');
SELECT * FROM finish();
ROLLBACK;
