-- MIGR-HIST-08B: all fixtures are synthetic; changes roll back.
BEGIN;
SELECT no_plan();

SELECT ok((SELECT relrowsecurity FROM pg_class
  WHERE oid='public.historical_initial_load_batches'::regclass),
  'Every historical batch is behind RLS');
SELECT ok((SELECT relrowsecurity FROM pg_class
  WHERE oid='public.historical_initial_load_sources'::regclass),
  'Every historical source is behind RLS');
SELECT ok(
  NOT has_table_privilege('anon','public.historical_initial_load_batches','SELECT')
  AND NOT has_table_privilege('anon','public.historical_initial_load_sources','INSERT')
  AND NOT has_table_privilege('authenticated','public.historical_initial_load_batches','INSERT')
  AND NOT has_table_privilege('authenticated','public.historical_initial_load_sources','UPDATE')
  AND NOT has_table_privilege('authenticated','public.historical_initial_load_sources','DELETE'),
  'Client/browser roles cannot create, rewrite or delete ledger rows');
SELECT ok(
  NOT has_function_privilege('anon','public.register_historical_initial_load_manifest(uuid,text,jsonb,uuid)','EXECUTE')
  AND NOT has_function_privilege('authenticated','public.register_historical_initial_load_manifest(uuid,text,jsonb,uuid)','EXECUTE')
  AND has_function_privilege('service_role','public.register_historical_initial_load_manifest(uuid,text,jsonb,uuid)','EXECUTE'),
  'Only server-only service_role can register the manifest');
SELECT is((SELECT count(*) FROM pg_policies
  WHERE schemaname='public' AND tablename LIKE 'historical_initial_load_%'
    AND cmd IN ('INSERT','UPDATE','DELETE')),0::bigint,
  'No browser mutation policies exist');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('f1000000-0000-4000-8000-000000000001','ledger-admin@example.test','{}'),
 ('f1000000-0000-4000-8000-000000000002','ledger-client@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('f1000000-0000-4000-8000-000000000001','Synthetic ledger admin'),
 ('f1000000-0000-4000-8000-000000000002','Synthetic ledger client');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('f1000000-0000-4000-8000-000000000001','admin'),
 ('f1000000-0000-4000-8000-000000000002','client');
INSERT INTO public.clients(id,profile_id,full_name,status) VALUES
 ('f2000000-0000-4000-8000-000000000001',NULL,'Synthetic archived client','inactive');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"f1000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($q$SELECT public.register_historical_initial_load_manifest(
 'f3000000-0000-4000-8000-000000000001',
 repeat('a',64),'[]'::jsonb,'f1000000-0000-4000-8000-000000000001')$q$,
 '42501',NULL,'Even admin+AAL2 cannot call server-only RPC directly');
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT is(
 public.register_historical_initial_load_manifest(
  'f3000000-0000-4000-8000-000000000001'::uuid, repeat('a',64),
  jsonb_build_array(
    jsonb_build_object('source_id','source_0001','sha256',repeat('1',64),
      'kind','xlsx','state','pending_human_association',
      'layout_signature_sha256',repeat('3',64),'worksheet_count',1),
    jsonb_build_object('source_id','source_0002','sha256',repeat('2',64),
      'kind','photo','state','pending_backend_identity_verification',
      'client_id','f2000000-0000-4000-8000-000000000001','photo_type','jpeg')
  ),'f1000000-0000-4000-8000-000000000001'::uuid),
 'f3000000-0000-4000-8000-000000000001'::uuid,
 'One atomic batch with spreadsheet + separate photo metadata');
SELECT is((SELECT count(*) FROM public.historical_initial_load_sources
 WHERE batch_id='f3000000-0000-4000-8000-000000000001'),2::bigint,
 'Both source rows registered in the same transaction');
SELECT is(
 public.register_historical_initial_load_manifest(
  'f3000000-0000-4000-8000-000000000001'::uuid, repeat('a',64),
  jsonb_build_array(
    jsonb_build_object('source_id','source_0001','sha256',repeat('1',64),
      'kind','xlsx','state','pending_human_association',
      'layout_signature_sha256',repeat('3',64),'worksheet_count',1),
    jsonb_build_object('source_id','source_0002','sha256',repeat('2',64),
      'kind','photo','state','pending_backend_identity_verification',
      'client_id','f2000000-0000-4000-8000-000000000001','photo_type','jpeg')
  ),'f1000000-0000-4000-8000-000000000001'::uuid),
 'f3000000-0000-4000-8000-000000000001'::uuid,
 'Exact same id and metadata retries idempotently');
SELECT throws_ok($q$SELECT public.register_historical_initial_load_manifest(
 'f3000000-0000-4000-8000-000000000001',repeat('b',64),
 '[{"source_id":"source_0001","sha256":"1111111111111111111111111111111111111111111111111111111111111111","kind":"xlsx","state":"pending_human_association"}]'::jsonb,
 'f1000000-0000-4000-8000-000000000001')$q$,
 '23505',NULL,'Same batch UUID with changed manifest is blocked');
SELECT throws_ok($q$SELECT public.register_historical_initial_load_manifest(
 'f3000000-0000-4000-8000-000000000002',repeat('c',64),
 '[{"source_id":"source_0001","sha256":"1111111111111111111111111111111111111111111111111111111111111111","kind":"xlsx","state":"pending_human_association","full_name":"PRIVATE_NAME"}]'::jsonb,
 'f1000000-0000-4000-8000-000000000001')$q$,
 '22023',NULL,'Unexpected personally identifying metadata is rejected');
SELECT is((SELECT count(*) FROM public.historical_initial_load_batches
 WHERE id='f3000000-0000-4000-8000-000000000002'),0::bigint,
 'Invalid batch never leaves partial rows');
SELECT throws_ok($q$SELECT public.register_historical_initial_load_manifest(
 'f3000000-0000-4000-8000-000000000003',repeat('c',64),
 '[{"source_id":"source_0001","sha256":"1111111111111111111111111111111111111111111111111111111111111111","kind":"xlsx","state":"pending_backend_identity_verification","client_id":"f2000000-0000-4000-8000-000000000099"}]'::jsonb,
 'f1000000-0000-4000-8000-000000000001')$q$,
 '23503',NULL,'Unknown Client ID proposal cannot be registered');
SELECT throws_ok($q$SELECT public.register_historical_initial_load_manifest(
 'f3000000-0000-4000-8000-000000000004',repeat('c',64),
 '[{"source_id":"source_0001","sha256":"1111111111111111111111111111111111111111111111111111111111111111","kind":"xlsx","state":"pending_human_association"}]'::jsonb,
 'f1000000-0000-4000-8000-000000000002')$q$,
 '42501',NULL,'Client actor cannot forge administrative registration');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"f1000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_initial_load_batches
 WHERE id='f3000000-0000-4000-8000-000000000001'),1::bigint,
 'Admin AAL2 can read a batch without assignment');
SELECT is((SELECT count(*) FROM public.historical_initial_load_sources
 WHERE batch_id='f3000000-0000-4000-8000-000000000001'),2::bigint,
 'Admin AAL2 can see all source metadata');
SELECT set_config('request.jwt.claims',
 '{"sub":"f1000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_initial_load_batches
 WHERE id='f3000000-0000-4000-8000-000000000001'),0::bigint,
 'Admin AAL1 cannot read inventory');
SELECT set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"f1000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_initial_load_sources
 WHERE batch_id='f3000000-0000-4000-8000-000000000001'),0::bigint,
 'Client cannot read source metadata even with AAL2');
RESET ROLE;

SELECT is((SELECT count(*) FROM public.clients
 WHERE id='f2000000-0000-4000-8000-000000000001'
 AND profile_id IS NULL AND status='inactive'),1::bigint,
 'Ledger does not activate or rewrite historical clients');
SELECT * FROM finish();
ROLLBACK;
