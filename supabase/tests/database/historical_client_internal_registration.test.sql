-- Synthetic-only pgTAP. Every row is rolled back.
BEGIN;
SELECT no_plan();

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.clients'::regclass),
  'Clients RLS remains enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.historical_client_registration_requests'::regclass),
  'Historical request ledger has RLS');
SELECT ok(NOT has_table_privilege('authenticated','public.clients','INSERT')
  AND NOT has_table_privilege('anon','public.clients','INSERT'),
  'Direct Client insertion stays denied');
SELECT ok(NOT has_table_privilege('authenticated','public.historical_client_registration_requests','INSERT')
  AND NOT has_table_privilege('authenticated','public.historical_client_registration_requests','UPDATE')
  AND NOT has_table_privilege('authenticated','public.historical_client_registration_requests','DELETE'),
  'Ledger cannot be forged by authenticated role');
SELECT ok(NOT has_function_privilege('authenticated','public.create_historical_client_internal(uuid,text,boolean,uuid)','EXECUTE')
  AND NOT has_function_privilege('anon','public.create_historical_client_internal(uuid,text,boolean,uuid)','EXECUTE')
  AND has_function_privilege('service_role','public.create_historical_client_internal(uuid,text,boolean,uuid)','EXECUTE'),
  'Only service_role may call the privileged RPC');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('d1000000-0000-0000-0000-000000000001','historical-admin@example.test','{}'),
('d1000000-0000-0000-0000-000000000002','historical-client@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
('d1000000-0000-0000-0000-000000000001','Synthetic historical admin'),
('d1000000-0000-0000-0000-000000000002','Synthetic historical user');
INSERT INTO public.user_roles(profile_id,role) VALUES
('d1000000-0000-0000-0000-000000000001','admin'),
('d1000000-0000-0000-0000-000000000002','client');

-- The browser role cannot execute the privileged RPC at any MFA level.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','d1000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"d1000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000001','Synthetic Historical One',true,'d1000000-0000-0000-0000-000000000001')$$,
  '42501',NULL,'Authenticated admin AAL2 cannot directly execute privileged RPC');
RESET ROLE;

-- Mimic only the server-side service-role RPC call after requireRole(admin)
-- verified AAL2. All test data is synthetic and transactionally rolled back.
SET LOCAL ROLE service_role;
SELECT ok(
  public.create_historical_client_internal(
    'd2000000-0000-0000-0000-000000000001'::uuid,
    'Synthetic Historical One',true,
    'd1000000-0000-0000-0000-000000000001'::uuid
  ) IS NOT NULL,
  'Verified admin server call creates historical client'
);
SELECT is((SELECT count(*) FROM public.clients c
  WHERE c.full_name='Synthetic Historical One' AND c.profile_id IS NULL
    AND c.status='inactive' AND c.started_at IS NULL),1::bigint,
  'Client remains inactive without Auth or assignment');
SELECT is((SELECT count(*) FROM public.historical_client_registration_requests
  WHERE created_by_profile_id='d1000000-0000-0000-0000-000000000001'),1::bigint,
  'Actor audit ledger created');
SELECT is(
  public.create_historical_client_internal(
    'd2000000-0000-0000-0000-000000000001'::uuid,
    'Synthetic Historical One',true,
    'd1000000-0000-0000-0000-000000000001'::uuid
  ),
  (SELECT client_id FROM public.historical_client_registration_requests
    WHERE request_id='d2000000-0000-0000-0000-000000000001'),
  'Retry returns same Client id');
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000002','Synthetic Historical One',true,'d1000000-0000-0000-0000-000000000001')$$,
  '23505',NULL,'Exact name collision requires manual review');
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000001','Synthetic Changed Name',true,'d1000000-0000-0000-0000-000000000001')$$,
  '23505',NULL,'Idempotency key cannot be reused for another name');
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000003','Synthetic Historical Two',false,'d1000000-0000-0000-0000-000000000001')$$,
  '22023',NULL,'Human duplicate review is required');
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000003',' X ',true,'d1000000-0000-0000-0000-000000000001')$$,
  '22023',NULL,'Name constraints are enforced');
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000004','Synthetic Client Rejected',true,'d1000000-0000-0000-0000-000000000002')$$,
  '42501',NULL,'Non-admin actor denied by RPC');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
