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
SELECT ok(has_function_privilege('authenticated','public.create_historical_client_internal(uuid,text,boolean)','EXECUTE')
  AND NOT has_function_privilege('anon','public.create_historical_client_internal(uuid,text,boolean)','EXECUTE'),
  'Only authenticated may call the gated RPC');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('d1000000-0000-0000-0000-000000000001','historical-admin@example.test','{}'),
('d1000000-0000-0000-0000-000000000002','historical-client@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
('d1000000-0000-0000-0000-000000000001','Synthetic historical admin'),
('d1000000-0000-0000-0000-000000000002','Synthetic historical user');
INSERT INTO public.user_roles(profile_id,role) VALUES
('d1000000-0000-0000-0000-000000000001','admin'),
('d1000000-0000-0000-0000-000000000002','client');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','d1000000-0000-0000-0000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"d1000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT ok(
  public.create_historical_client_internal(
    'd2000000-0000-0000-0000-000000000001'::uuid,
    'Synthetic Historical One',true
  ) IS NOT NULL,
  'Unassigned admin AAL2 creates historical client'
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
    'Synthetic Historical One',true
  ),
  (SELECT client_id FROM public.historical_client_registration_requests
    WHERE request_id='d2000000-0000-0000-0000-000000000001'),
  'Retry returns same Client id');
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000002','Synthetic Historical One',true)$$,
  '23505',NULL,'Exact name collision requires manual review');
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000001','Synthetic Changed Name',true)$$,
  '23505',NULL,'Idempotency key cannot be reused for another name');
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000003','Synthetic Historical Two',false)$$,
  '22023',NULL,'Human duplicate review is required');
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000003',' X ',true)$$,
  '22023',NULL,'Name constraints are enforced');

SELECT set_config('request.jwt.claims','{"sub":"d1000000-0000-0000-0000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000004','Synthetic AAL1 Rejected',true)$$,
  '42501',NULL,'Admin AAL1 denied');

SELECT set_config('request.jwt.claim.sub','d1000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"d1000000-0000-0000-0000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok(
  $$SELECT public.create_historical_client_internal('d2000000-0000-0000-0000-000000000005','Synthetic Client Rejected',true)$$,
  '42501',NULL,'Client AAL2 denied');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
