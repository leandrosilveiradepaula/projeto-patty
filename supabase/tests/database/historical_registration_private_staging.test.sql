-- Synthetic-only data. ROLLBACK at end.
BEGIN;
SELECT no_plan();
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.historical_registration_imports'::regclass),
 'Historical registration evidence always has RLS');
SELECT ok(
 NOT has_table_privilege('anon','public.historical_registration_imports','SELECT')
 AND NOT has_table_privilege('authenticated','public.historical_registration_imports','INSERT')
 AND NOT has_table_privilege('authenticated','public.historical_registration_imports','UPDATE')
 AND NOT has_table_privilege('authenticated','public.historical_registration_imports','DELETE'),
 'No public read or browser writes to historical contact data');
SELECT ok(
 NOT has_function_privilege('anon',
 'public.stage_historical_registration_source(uuid,text,uuid,text,text,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean)','EXECUTE')
 AND NOT has_function_privilege('authenticated',
 'public.stage_historical_registration_source(uuid,text,uuid,text,text,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean)','EXECUTE')
 AND has_function_privilege('service_role',
 'public.stage_historical_registration_source(uuid,text,uuid,text,text,text,text,jsonb,jsonb,uuid,boolean,boolean,boolean)','EXECUTE'),
 'Only service_role may call historical registration staging');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('f4100000-0000-4000-8000-000000000001','synthetic-cad-admin@example.test','{}'),
 ('f4100000-0000-4000-8000-000000000002','synthetic-cad-client@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('f4100000-0000-4000-8000-000000000001','Synthetic admin'),
 ('f4100000-0000-4000-8000-000000000002','Synthetic client');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('f4100000-0000-4000-8000-000000000001','admin'),
 ('f4100000-0000-4000-8000-000000000002','client');
INSERT INTO public.clients(id,profile_id,full_name,status) VALUES
 ('f4200000-0000-4000-8000-000000000001',NULL,'Synthetic archived','inactive'),
 ('f4200000-0000-4000-8000-000000000002',NULL,'Synthetic other archived','inactive');
INSERT INTO public.historical_initial_load_batches(
 id,manifest_sha256,manifest_metadata,source_count,created_by_profile_id
) VALUES(
 'f4300000-0000-4000-8000-000000000001',repeat('f',64),'[]'::jsonb,1,
 'f4100000-0000-4000-8000-000000000001'
);
INSERT INTO public.historical_initial_load_sources(
 batch_id,source_id,source_sha256,kind,state,
 layout_signature_sha256,worksheet_count,proposed_client_id
) VALUES(
 'f4300000-0000-4000-8000-000000000001','source_0001',repeat('a',64),
 'xlsx','pending_backend_identity_verification',repeat('b',64),1,
 'f4200000-0000-4000-8000-000000000001'
);
INSERT INTO storage.objects(bucket_id,name) VALUES(
 'historical-originals-private',
 'f4300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx'
);
SET LOCAL ROLE service_role;
SELECT lives_ok($q$
 SELECT public.stage_historical_registration_source(
 'f4300000-0000-4000-8000-000000000001','source_0001',
 'f4200000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),
 repeat('c',64),
 'f4300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[{"sheet_index":0,"column_index":1,"row_index":2,"field_key":"city"}]'::jsonb,
 '[{"sheet_index":0,"column_index":1,"row_index":2,"field_key":"city","raw_type":"str","raw_value":"SYNTHETIC_CITY"}]'::jsonb,
 'f4100000-0000-4000-8000-000000000001',true,true,true)
 $q$, 'Historical contact field staged privately');
SELECT is((SELECT count(*) FROM public.historical_registration_imports),1::bigint,
 'Exactly one immutable receipt created');
SELECT lives_ok($q$
 SELECT public.stage_historical_registration_source(
 'f4300000-0000-4000-8000-000000000001','source_0001',
 'f4200000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),
 repeat('c',64),
 'f4300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[{"sheet_index":0,"column_index":1,"row_index":2,"field_key":"city"}]'::jsonb,
 '[{"sheet_index":0,"column_index":1,"row_index":2,"field_key":"city","raw_type":"str","raw_value":"SYNTHETIC_CITY"}]'::jsonb,
 'f4100000-0000-4000-8000-000000000001',true,true,true)
 $q$, 'Identical replay returns existing receipt');
SELECT is((SELECT count(*) FROM public.historical_registration_imports),1::bigint,
 'Idempotent retry does not duplicate');
SELECT throws_ok($q$
 SELECT public.stage_historical_registration_source(
 'f4300000-0000-4000-8000-000000000001','source_0001',
 'f4200000-0000-4000-8000-000000000002',repeat('a',64),repeat('b',64),
 repeat('c',64),
 'f4300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[{"sheet_index":0,"column_index":1,"row_index":2,"field_key":"city"}]'::jsonb,
 '[{"sheet_index":0,"column_index":1,"row_index":2,"field_key":"city","raw_type":"str","raw_value":"SYNTHETIC_CITY"}]'::jsonb,
 'f4100000-0000-4000-8000-000000000001',true,true,true)
 $q$,'23503',NULL,'Cannot attach historical contact data to another Client');
SELECT throws_ok($q$
 SELECT public.stage_historical_registration_source(
 'f4300000-0000-4000-8000-000000000001','source_0001',
 'f4200000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),
 repeat('c',64),
 'f4300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[{"sheet_index":0,"column_index":1,"row_index":2,"field_key":"city"}]'::jsonb,
 '[{"sheet_index":0,"column_index":1,"row_index":2,"field_key":"city","raw_type":"str","raw_value":"OTHER_SYNTHETIC_CITY"}]'::jsonb,
 'f4100000-0000-4000-8000-000000000001',true,true,true)
 $q$,'23505',NULL,'Conflicting replay cannot rewrite original');
SELECT throws_ok($q$
 SELECT public.stage_historical_registration_source(
 'f4300000-0000-4000-8000-000000000001','source_0001',
 'f4200000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),
 repeat('c',64),
 'f4300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[{"sheet_index":0,"column_index":1,"row_index":2,"field_key":"city"}]'::jsonb,
 '[{"sheet_index":0,"column_index":1,"row_index":2,"field_key":"city","raw_type":"str","raw_value":"SYNTHETIC_CITY"}]'::jsonb,
 'f4100000-0000-4000-8000-000000000001',true,true,false)
 $q$,'42501',NULL,'Explicit custody confirmation required');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.client_registration
 WHERE client_id='f4200000-0000-4000-8000-000000000001'),0::bigint,
 'Current registration remains untouched');
SELECT is((SELECT count(*) FROM public.clients
 WHERE id='f4200000-0000-4000-8000-000000000001'
 AND profile_id IS NULL AND status='inactive'),1::bigint,
 'Historical Client stays inactive without Auth');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f4100000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"f4100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_registration_imports),1::bigint,
 'Admin AAL2 may read receipt');
SELECT set_config('request.jwt.claims',
 '{"sub":"f4100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_registration_imports),0::bigint,
 'Admin AAL1 cannot read historic contacts');
SELECT set_config('request.jwt.claim.sub','f4100000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"f4100000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_registration_imports),0::bigint,
 'Client cannot read historical snapshots');
SELECT throws_ok($q$
 SELECT public.stage_historical_registration_source(
 'f4300000-0000-4000-8000-000000000001','source_0001',
 'f4200000-0000-4000-8000-000000000001',repeat('a',64),repeat('b',64),
 repeat('c',64),
 'f4300000-0000-4000-8000-000000000001/source_0001/'||repeat('a',64)||'.xlsx',
 '[]'::jsonb,'[]'::jsonb,
 'f4100000-0000-4000-8000-000000000001',true,true,true)
 $q$,'42501',NULL,'Browser cannot invoke service-only registration staging');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
