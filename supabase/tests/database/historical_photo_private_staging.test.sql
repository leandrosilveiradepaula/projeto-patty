-- Synthetic-only RLS, idempotency and binding test. Changes rolled back.
BEGIN;
SELECT no_plan();
SELECT ok((SELECT relrowsecurity FROM pg_class
 WHERE oid='public.historical_photo_imports'::regclass),
 'Historical photo evidence always uses RLS');
SELECT ok(
 NOT has_table_privilege('anon','public.historical_photo_imports','SELECT')
 AND NOT has_table_privilege('authenticated','public.historical_photo_imports','INSERT')
 AND NOT has_table_privilege('authenticated','public.historical_photo_imports','UPDATE')
 AND NOT has_table_privilege('authenticated','public.historical_photo_imports','DELETE'),
 'Anon cannot read; browsers cannot alter immutable photo evidence');
SELECT ok(
 NOT has_function_privilege('anon',
  'public.stage_historical_photo_source(uuid,text,uuid,text,uuid,text,integer,uuid,boolean,boolean,boolean)',
  'EXECUTE')
 AND NOT has_function_privilege('authenticated',
  'public.stage_historical_photo_source(uuid,text,uuid,text,uuid,text,integer,uuid,boolean,boolean,boolean)',
  'EXECUTE')
 AND has_function_privilege('service_role',
  'public.stage_historical_photo_source(uuid,text,uuid,text,uuid,text,integer,uuid,boolean,boolean,boolean)',
  'EXECUTE'),
 'Only server-side role may stage photo');
SELECT ok((SELECT public IS FALSE FROM storage.buckets WHERE id='client-private'),
 'Existing client photo bucket is private');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('f2100000-0000-4000-8000-000000000001','photo-admin@example.test','{}'),
 ('f2100000-0000-4000-8000-000000000002','photo-client@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('f2100000-0000-4000-8000-000000000001','Synthetic photo admin'),
 ('f2100000-0000-4000-8000-000000000002','Synthetic photo client');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('f2100000-0000-4000-8000-000000000001','admin'),
 ('f2100000-0000-4000-8000-000000000002','client');
INSERT INTO public.clients(id,profile_id,full_name,status) VALUES
 ('f2200000-0000-4000-8000-000000000001',NULL,'Synthetic historical archive','inactive'),
 ('f2200000-0000-4000-8000-000000000002',NULL,'Other synthetic archive','inactive');
INSERT INTO public.historical_initial_load_batches(
 id,manifest_sha256,manifest_metadata,source_count,created_by_profile_id
) VALUES (
 'f2300000-0000-4000-8000-000000000001',repeat('f',64),
 '[]'::jsonb,1,'f2100000-0000-4000-8000-000000000001'
);
INSERT INTO public.historical_initial_load_sources(
 batch_id,source_id,source_sha256,kind,state,photo_type,proposed_client_id
) VALUES (
 'f2300000-0000-4000-8000-000000000001','source_0001',repeat('a',64),
 'photo','pending_backend_identity_verification','jpeg',
 'f2200000-0000-4000-8000-000000000001'
);
-- Exactly the same opaquely determined path as the server prepares.
INSERT INTO storage.objects(bucket_id,name) VALUES (
 'client-private',
 'clients/f2200000-0000-4000-8000-000000000001/photo/f2400000-0000-4000-8000-000000000001.jpg'
);

SET LOCAL ROLE service_role;
SELECT lives_ok($q$
 SELECT public.stage_historical_photo_source(
 'f2300000-0000-4000-8000-000000000001','source_0001',
 'f2200000-0000-4000-8000-000000000001',
 repeat('a',64),'f2400000-0000-4000-8000-000000000001',
 'image/jpeg',128,'f2100000-0000-4000-8000-000000000001',
 true,true,true)
 $q$, 'Authorized synthetic photo stages privately');
SELECT is((SELECT count(*) FROM public.historical_photo_imports
 WHERE batch_id='f2300000-0000-4000-8000-000000000001'),1::bigint,
 'One immutable photo import receipt exists');
SELECT is((SELECT count(*) FROM public.client_files
 WHERE id='f2400000-0000-4000-8000-000000000001'
 AND client_id='f2200000-0000-4000-8000-000000000001'
 AND client_visible_at IS NULL AND client_visibility_set_by_profile_id IS NULL
 AND file_kind='photo'),1::bigint,
 'Photo created in correct Client private files, not released');
SELECT lives_ok($q$
 SELECT public.stage_historical_photo_source(
 'f2300000-0000-4000-8000-000000000001','source_0001',
 'f2200000-0000-4000-8000-000000000001',
 repeat('a',64),'f2400000-0000-4000-8000-000000000001',
 'image/jpeg',128,'f2100000-0000-4000-8000-000000000001',
 true,true,true)
 $q$, 'Identical photo replay is idempotent');
SELECT is((SELECT count(*) FROM public.client_files
 WHERE client_id='f2200000-0000-4000-8000-000000000001'),1::bigint,
 'Replay does not duplicate a photo');
SELECT throws_ok($q$
 SELECT public.stage_historical_photo_source(
 'f2300000-0000-4000-8000-000000000001','source_0001',
 'f2200000-0000-4000-8000-000000000002',
 repeat('a',64),'f2400000-0000-4000-8000-000000000001',
 'image/jpeg',128,'f2100000-0000-4000-8000-000000000001',
 true,true,true)
 $q$,'23503',NULL,'Cannot bind photo to a different Client');
SELECT throws_ok($q$
 SELECT public.stage_historical_photo_source(
 'f2300000-0000-4000-8000-000000000001','source_0001',
 'f2200000-0000-4000-8000-000000000001',
 repeat('b',64),'f2400000-0000-4000-8000-000000000001',
 'image/jpeg',128,'f2100000-0000-4000-8000-000000000001',
 true,true,true)
 $q$,'23503',NULL,'Cannot substitute source SHA');
SELECT throws_ok($q$
 SELECT public.stage_historical_photo_source(
 'f2300000-0000-4000-8000-000000000001','source_0001',
 'f2200000-0000-4000-8000-000000000001',
 repeat('a',64),'f2400000-0000-4000-8000-000000000001',
 'image/jpeg',128,'f2100000-0000-4000-8000-000000000001',
 true,true,false)
 $q$,'42501',NULL,'Custody declaration is independently mandatory');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','f2100000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"f2100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_photo_imports),1::bigint,
 'Admin with AAL2 may read imported photo receipt');
SELECT set_config('request.jwt.claims',
 '{"sub":"f2100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_photo_imports),0::bigint,
 'Admin AAL1 cannot read imported photo receipts');
SELECT set_config('request.jwt.claim.sub','f2100000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"f2100000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT is((SELECT count(*) FROM public.historical_photo_imports),0::bigint,
 'Client with AAL2 cannot read photo receipts');
SELECT throws_ok($q$
 SELECT public.stage_historical_photo_source(
 'f2300000-0000-4000-8000-000000000001','source_0001',
 'f2200000-0000-4000-8000-000000000001',
 repeat('a',64),'f2400000-0000-4000-8000-000000000001',
 'image/jpeg',128,'f2100000-0000-4000-8000-000000000001',
 true,true,true)
 $q$,'42501',NULL,'No browser role may invoke staging RPC');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.clients
 WHERE id='f2200000-0000-4000-8000-000000000001'
 AND profile_id IS NULL AND status='inactive'),1::bigint,
 'Historical client stays inactive with no Auth/Profile');
SELECT * FROM finish();
ROLLBACK;
