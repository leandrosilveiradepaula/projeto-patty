-- MIGR-HIST-05A. Fully synthetic pgTAP; transactional rollback.
BEGIN;
SELECT no_plan();

SELECT ok((SELECT relrowsecurity FROM pg_class
  WHERE oid='public.historical_client_return_requests'::regclass),
  'Historical return ledger has RLS');
SELECT ok(
  NOT has_table_privilege('authenticated','public.historical_client_return_requests','SELECT')
  AND NOT has_table_privilege('authenticated','public.historical_client_return_requests','INSERT')
  AND NOT has_table_privilege('anon','public.historical_client_return_requests','SELECT')
  AND NOT has_table_privilege('anon','public.historical_client_return_requests','INSERT'),
  'Browser roles cannot read or insert return ledger');
SELECT ok(
  NOT has_function_privilege('authenticated',
    'public.register_historical_client_return_request(uuid,uuid,uuid,boolean,uuid)','EXECUTE')
  AND NOT has_function_privilege('anon',
    'public.register_historical_client_return_request(uuid,uuid,uuid,boolean,uuid)','EXECUTE')
  AND has_function_privilege('service_role',
    'public.register_historical_client_return_request(uuid,uuid,uuid,boolean,uuid)','EXECUTE'),
  'Return request RPC is service-role-only');

INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES
  ('e1000000-0000-4000-8000-000000000001','return-admin@example.test','{}'),
  ('e1000000-0000-4000-8000-000000000002','return-nonadmin@example.test','{}'),
  ('e1000000-0000-4000-8000-000000000003','return-client@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
  ('e1000000-0000-4000-8000-000000000001','Synthetic Return Admin'),
  ('e1000000-0000-4000-8000-000000000002','Synthetic Return Nonadmin'),
  ('e1000000-0000-4000-8000-000000000003','Synthetic Return Client');
INSERT INTO public.user_roles(profile_id,role) VALUES
  ('e1000000-0000-4000-8000-000000000001','admin'),
  ('e1000000-0000-4000-8000-000000000002','client'),
  ('e1000000-0000-4000-8000-000000000003','client');
INSERT INTO public.clients(id,full_name,profile_id,status) VALUES
  ('e2000000-0000-4000-8000-000000000001','Synthetic Historic Return One',NULL,'inactive'),
  ('e2000000-0000-4000-8000-000000000002','Synthetic Historic Return Two',NULL,'inactive'),
  ('e2000000-0000-4000-8000-000000000003','Synthetic Already Linked','e1000000-0000-4000-8000-000000000003','inactive'),
  ('e2000000-0000-4000-8000-000000000004','Synthetic Already Active',NULL,'active');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e1000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"e1000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok(
  $$SELECT public.register_historical_client_return_request(
    'e3000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000001',true,
    'e1000000-0000-4000-8000-000000000001')$$,
  '42501',NULL,'Even admin AAL2 cannot invoke privileged RPC from browser');
RESET ROLE;

SET LOCAL ROLE service_role;
SELECT is(
  public.register_historical_client_return_request(
    'e3000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000001',true,
    'e1000000-0000-4000-8000-000000000001'),
  'e2000000-0000-4000-8000-000000000001'::uuid,
  'Verified server role records one Client return request');
SELECT is(
  public.register_historical_client_return_request(
    'e3000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000001',true,
    'e1000000-0000-4000-8000-000000000001'),
  'e2000000-0000-4000-8000-000000000001'::uuid,
  'Same request is idempotent');
SELECT is((SELECT count(*) FROM public.historical_client_return_requests
  WHERE client_id='e2000000-0000-4000-8000-000000000001'),1::bigint,
  'Single audit entry per historical Client');
SELECT throws_ok(
  $$SELECT public.register_historical_client_return_request(
    'e3000000-0000-4000-8000-000000000002',
    'e2000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000001',true,
    'e1000000-0000-4000-8000-000000000001')$$,
  '23505',NULL,'Different request ID is rejected');
SELECT throws_ok(
  $$SELECT public.register_historical_client_return_request(
    'e3000000-0000-4000-8000-000000000003',
    'e2000000-0000-4000-8000-000000000002',
    'e2000000-0000-4000-8000-000000000001',true,
    'e1000000-0000-4000-8000-000000000001')$$,
  '22023',NULL,'Different confirmed Client ID rejected');
SELECT throws_ok(
  $$SELECT public.register_historical_client_return_request(
    'e3000000-0000-4000-8000-000000000003',
    'e2000000-0000-4000-8000-000000000002',
    'e2000000-0000-4000-8000-000000000002',false,
    'e1000000-0000-4000-8000-000000000001')$$,
  '22023',NULL,'Missing human declaration rejected');
SELECT throws_ok(
  $$SELECT public.register_historical_client_return_request(
    'e3000000-0000-4000-8000-000000000003',
    'e2000000-0000-4000-8000-000000000002',
    'e2000000-0000-4000-8000-000000000002',true,
    'e1000000-0000-4000-8000-000000000002')$$,
  '42501',NULL,'Nonadmin cannot spoof request actor');
SELECT throws_ok(
  $$SELECT public.register_historical_client_return_request(
    'e3000000-0000-4000-8000-000000000003',
    'e2000000-0000-4000-8000-000000000003',
    'e2000000-0000-4000-8000-000000000003',true,
    'e1000000-0000-4000-8000-000000000001')$$,
  '23514',NULL,'Already linked Client rejected');
SELECT throws_ok(
  $$SELECT public.register_historical_client_return_request(
    'e3000000-0000-4000-8000-000000000004',
    'e2000000-0000-4000-8000-000000000004',
    'e2000000-0000-4000-8000-000000000004',true,
    'e1000000-0000-4000-8000-000000000001')$$,
  '23514',NULL,'Active Client rejected');
SELECT throws_ok(
  $$SELECT public.register_historical_client_return_request(
    'e3000000-0000-4000-8000-000000000004',
    'e2000000-0000-4000-8000-000000000005',
    'e2000000-0000-4000-8000-000000000005',true,
    'e1000000-0000-4000-8000-000000000001')$$,
  '23514',NULL,'Missing Client rejected');

SELECT is((SELECT count(*) FROM public.clients
  WHERE id IN ('e2000000-0000-4000-8000-000000000001',
               'e2000000-0000-4000-8000-000000000002')
    AND profile_id IS NULL AND status='inactive'),2::bigint,
  'Existing Clients remain unlinked and inactive');
SELECT is((SELECT count(*) FROM public.client_assignments
  WHERE client_id='e2000000-0000-4000-8000-000000000001'),0::bigint,
  'No active or historical assignment created by request');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
