-- Synthetic only, transaction rolled back. Values are invented fixtures.
BEGIN;
SELECT no_plan();
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.historical_assessment_imports'::regclass),
 'Historical assessment evidence always uses RLS');
SELECT ok(
 NOT has_table_privilege('anon','public.historical_assessment_imports','SELECT')
 AND NOT has_table_privilege('authenticated','public.historical_assessment_imports','INSERT')
 AND NOT has_table_privilege('authenticated','public.historical_assessment_imports','UPDATE')
 AND NOT has_table_privilege('authenticated','public.historical_assessment_imports','DELETE'),
 'Anon cannot read, browsers cannot mutate historical assessments');
SELECT ok(
 NOT has_function_privilege('anon',
 'public.stage_historical_assessment_source(uuid,text,uuid,text,text,date,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean)','EXECUTE')
 AND NOT has_function_privilege('authenticated',
 'public.stage_historical_assessment_source(uuid,text,uuid,text,text,date,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean)','EXECUTE')
 AND has_function_privilege('service_role',
 'public.stage_historical_assessment_source(uuid,text,uuid,text,text,date,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean)','EXECUTE'),
 'Only service role can execute staging RPC');
SELECT is((SELECT count(*) FROM pg_policies
 WHERE schemaname='public' AND tablename='historical_assessment_imports'
 AND cmd <> 'SELECT'),0::bigint,'No client or browser write policy');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('f3100000-0000-4000-8000-000000000001','synthetic-assessment-admin@example.test','{}'),
 ('f3100000-0000-4000-8000-000000000002','synthetic-assessment-client@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('f3100000-0000-4000-8000-000000000001','Synthetic assessment admin'),
 ('f3100000-0000-4000-8000-000000000002','Synthetic assessment client');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('f3100000-0000-4000-8000-000000000001','admin'),
 ('f3100000-0000-4000-8000-000000000002','client');
INSERT INTO public.clients(id,profile_id,full_name,status) VALUES
 ('f3200000-0000-4000-8000-000000000001',NULL,'Synthetic inactive assessment','inactive'),
 ('f3200000-0000-4000-8000-000000000002',NULL,'Synthetic wrong assessment client','inactive');
INSERT INTO public.historical_initial_load_batches (
 id,manifest_sha256,manifest_metadata,source_count,created_by_profile_id
) VALUES (
 'f3300000-0000-4000-8000-000000000001',repeat('f',64),
 '[]'::jsonb,1,'f3100000-0000-4000-8000-000000000001'
);
INSERT INTO public.historical_initial_load_sources(
 batch_id,source_id,source_sha256,kind,state,layout_signature_sha256,
 worksheet_count,proposed_client_id
) VALUES (
 'f3300000-0000-4000-8000-000000000001','source_0001',repeat('a',64),
 'xlsx','pending_backend_identity_verification',repeat('b',64),1,
 'f3200000-0000-4000-8000-000000000001'
);
INSERT INTO storage.objects(bucket_id,name) VALUES (
 'historical-originals-private',
 'f3300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx'
);
SET LOCAL ROLE service_role;
SELECT lives_ok($q$
 SELECT public.stage_historical_assessment_source(
 'f3300000-0000-4000-8000-000000000001','source_0001',
 'f3200000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),
 '2026-01-15'::date,repeat('c',64),
 'f3300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg"}]'::jsonb,
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg","raw_type":"n","raw_value":"71,5","numeric_value":"71.5"}]'::jsonb,
 'f3100000-0000-4000-8000-000000000001',true,true,true)
 $q$, 'Approved synthetic measurements stage privately');
SELECT is((SELECT count(*) FROM public.historical_assessment_imports
 WHERE client_id='f3200000-0000-4000-8000-000000000001'),1::bigint,
 'Exactly one private assessment snapshot');
SELECT lives_ok($q$
 SELECT public.stage_historical_assessment_source(
 'f3300000-0000-4000-8000-000000000001','source_0001',
 'f3200000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),
 '2026-01-15'::date,repeat('c',64),
 'f3300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg"}]'::jsonb,
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg","raw_type":"n","raw_value":"71,5","numeric_value":"71.5"}]'::jsonb,
 'f3100000-0000-4000-8000-000000000001',true,true,true)
 $q$, 'Identical replay is idempotent');
SELECT is((SELECT count(*) FROM public.historical_assessment_imports),1::bigint,
 'Retry does not duplicate dated evidence');
SELECT lives_ok($q$
 SELECT public.stage_historical_assessment_source(
 'f3300000-0000-4000-8000-000000000001','source_0001',
 'f3200000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),
 '2026-02-15'::date,repeat('d',64),
 'f3300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg"}]'::jsonb,
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg","raw_type":"n","raw_value":"71,5","numeric_value":"71.5"}]'::jsonb,
 'f3100000-0000-4000-8000-000000000001',true,true,true)
 $q$, 'Another dated source snapshot is supported');
SELECT is((SELECT count(*) FROM public.historical_assessment_imports),2::bigint,
 'Multiple dates from one XLSX are preserved');
SELECT throws_ok($q$
 SELECT public.stage_historical_assessment_source(
 'f3300000-0000-4000-8000-000000000001','source_0001',
 'f3200000-0000-4000-8000-000000000002',repeat('a',64),repeat('b',64),
 '2026-01-15'::date,repeat('c',64),
 'f3300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg"}]'::jsonb,
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg","raw_type":"n","raw_value":"71,5","numeric_value":"71.5"}]'::jsonb,
 'f3100000-0000-4000-8000-000000000001',true,true,true)
 $q$,'23503',NULL,'Wrong Client association denied');
SELECT throws_ok($q$
 SELECT public.stage_historical_assessment_source(
 'f3300000-0000-4000-8000-000000000001','source_0001',
 'f3200000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),
 '2026-01-15'::date,repeat('c',64),
 'f3300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg"}]'::jsonb,
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg","raw_type":"n","raw_value":"72","numeric_value":"72"}]'::jsonb,
 'f3100000-0000-4000-8000-000000000001',true,true,true)
 $q$,'23505',NULL,'Conflicting original cannot overwrite');
SELECT throws_ok($q$
 SELECT public.stage_historical_assessment_source(
 'f3300000-0000-4000-8000-000000000001','source_0001',
 'f3200000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),
 '2026-01-15'::date,repeat('c',64),
 'f3300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg"}]'::jsonb,
 '[{"sheet_index":0,"column_index":2,"row_index":3,"measurement_key":"synthetic_value","unit":"kg","raw_type":"n","raw_value":"71,5","numeric_value":"71.5"}]'::jsonb,
 'f3100000-0000-4000-8000-000000000001',true,true,false)
 $q$,'42501',NULL,'Custody confirmation is independently required');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.client_assessments
 WHERE client_id='f3200000-0000-4000-8000-000000000001'),0::bigint,
 'No clinical assessment was created by historical staging');
SELECT is((SELECT count(*) FROM public.assessment_measurements),0::bigint,
 'No measurement inserted into current clinical tables');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f3100000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"f3100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_assessment_imports),2::bigint,
 'Admin AAL2 may review private historical evidence');
SELECT set_config('request.jwt.claims',
 '{"sub":"f3100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_assessment_imports),0::bigint,
 'Admin AAL1 cannot review historical evidence');
SELECT set_config('request.jwt.claim.sub','f3100000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"f3100000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_assessment_imports),0::bigint,
 'Client cannot read historical evidence');
SELECT throws_ok($q$
 SELECT public.stage_historical_assessment_source(
 'f3300000-0000-4000-8000-000000000001','source_0001',
 'f3200000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),
 '2026-01-15'::date,repeat('c',64),
 'f3300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[]'::jsonb,'[]'::jsonb,
 'f3100000-0000-4000-8000-000000000001',true,true,true)
 $q$,'42501',NULL,'Browser cannot invoke service-only staging');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.clients WHERE id=
 'f3200000-0000-4000-8000-000000000001'
 AND profile_id IS NULL AND status='inactive'),1::bigint,
 'Historical Client remains inactive and without Auth');
SELECT * FROM finish();
ROLLBACK;
