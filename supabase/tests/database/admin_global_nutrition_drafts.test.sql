-- J4-ADMIN-UNASSIGNED-01: disposable database only; all synthetic rows rollback.
BEGIN;
SELECT no_plan();

SELECT ok((SELECT COUNT(*) FROM pg_class WHERE oid IN (
  'public.protocols'::regclass,'public.protocol_versions'::regclass,
  'public.meal_plan_versions'::regclass,'public.meal_plan_variants'::regclass,
  'public.meal_plan_cycles'::regclass,'public.meal_plan_cycle_steps'::regclass,
  'public.meals'::regclass,'public.meal_dose_allocations'::regclass
) AND relrowsecurity)=8,'Nutrition draft domain RLS is enabled');
SELECT ok((SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'
  AND tablename IN (
    'protocols','protocol_versions','meal_plan_versions','meal_plan_variants',
    'meal_plan_cycles','meal_plan_cycle_steps','meals','meal_dose_allocations'
  ) AND policyname='admin_mfa_aal2_required'
  AND cmd='ALL' AND permissive='RESTRICTIVE')=8,'Restrictive MFA stays on all 8 domain tables');
SELECT ok((SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'
  AND policyname IN (
    'protocols_insert_admin_global_aal2',
    'protocol_versions_insert_admin_global_draft_aal2',
    'protocol_versions_update_admin_global_draft_aal2',
    'meal_plan_versions_insert_admin_global_draft_aal2'
  ))=4,'Only four new narrow global draft policies');
SELECT ok((SELECT NOT prosecdef FROM pg_proc WHERE
  oid='public.meal_plan_version_is_draft(uuid)'::regprocedure),
  'Draft helper remains SECURITY INVOKER');
SELECT ok((SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'
  AND tablename IN ('protocol_publications','protocol_version_approvals')
  AND policyname LIKE '%global%insert%')=0,
  'No new global publication or approval mutation policies');
SELECT ok(NOT has_table_privilege('anon','public.protocols','INSERT')
  AND NOT has_table_privilege('anon','public.protocol_versions','UPDATE')
  AND NOT has_table_privilege('anon','public.meal_plan_versions','INSERT'),
  'Anonymous mutation grants remain denied');
SELECT ok((SELECT COUNT(*) FROM pg_trigger
  WHERE tgrelid='public.protocol_versions'::regclass
    AND tgname='protocol_versions_freeze_after_review' AND tgenabled='O')=1,
  'Reviewed protocol version freeze trigger retained');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('a8100000-0000-4000-8000-000000000001','j4global-admin@example.test','{}'),
('a8100000-0000-4000-8000-000000000002','j4global-client@example.test','{}'),
('a8100000-0000-4000-8000-000000000003','j4global-norole@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
('a8100000-0000-4000-8000-000000000001','Synthetic admin'),
('a8100000-0000-4000-8000-000000000002','Synthetic client'),
('a8100000-0000-4000-8000-000000000003','Synthetic no role');
INSERT INTO public.user_roles(profile_id,role) VALUES
('a8100000-0000-4000-8000-000000000001','admin'),
('a8100000-0000-4000-8000-000000000002','client');
INSERT INTO public.clients(id,full_name,profile_id,status) VALUES
('a8200000-0000-4000-8000-000000000001','Synthetic historical inactive',NULL,'inactive'),
('a8200000-0000-4000-8000-000000000002','Synthetic other client','a8100000-0000-4000-8000-000000000002','active');

-- AAL1 must never create a protocol for an unassigned historical client.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a8100000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"a8100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok($sql$
  INSERT INTO public.protocols(id,client_id)
  VALUES('a8300000-0000-4000-8000-000000000099','a8200000-0000-4000-8000-000000000001')
$sql$,'42501',NULL,'Admin AAL1 cannot create draft protocol');

-- Confirmed role admin at AAL2, without client_assignment, can prepare a
-- nutrition plan and dose allocation while retaining inactive/no Profile.
SELECT set_config('request.jwt.claims','{"sub":"a8100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT lives_ok($sql$
  INSERT INTO public.protocols(id,client_id)
  VALUES('a8300000-0000-4000-8000-000000000001','a8200000-0000-4000-8000-000000000001')
$sql$,'Unassigned AAL2 admin creates historical Client protocol root');
SELECT lives_ok($sql$
  INSERT INTO public.protocol_versions(id,protocol_id,client_id,version_number,created_by_profile_id)
  VALUES('a8400000-0000-4000-8000-000000000001',
    'a8300000-0000-4000-8000-000000000001',
    'a8200000-0000-4000-8000-000000000001',1,
    'a8100000-0000-4000-8000-000000000001')
$sql$,'Unassigned AAL2 admin creates nutrition draft version');
SELECT lives_ok($sql$
  INSERT INTO public.meal_plan_versions(id,protocol_version_id,client_id)
  VALUES('a8500000-0000-4000-8000-000000000001',
    'a8400000-0000-4000-8000-000000000001',
    'a8200000-0000-4000-8000-000000000001')
$sql$,'Unassigned AAL2 admin creates exact-client meal plan draft');
SELECT is(public.meal_plan_version_is_draft('a8500000-0000-4000-8000-000000000001'),true,
  'Draft helper recognizes unassigned AAL2 admin');
SELECT lives_ok($sql$
  INSERT INTO public.meal_plan_variants(id,meal_plan_version_id,client_id,variant_key)
  VALUES('a8600000-0000-4000-8000-000000000001',
    'a8500000-0000-4000-8000-000000000001',
    'a8200000-0000-4000-8000-000000000001','linear')
$sql$,'AAL2 admin creates explicit variant with no assignment');
SELECT lives_ok($sql$
  INSERT INTO public.meals(id,meal_plan_variant_id,position)
  VALUES('a8700000-0000-4000-8000-000000000001',
    'a8600000-0000-4000-8000-000000000001',1)
$sql$,'AAL2 admin creates draft meal');
SELECT lives_ok($sql$
  INSERT INTO public.meal_dose_allocations(id,meal_id,dose_type,dose_quantity)
  VALUES('a8800000-0000-4000-8000-000000000001',
    'a8700000-0000-4000-8000-000000000001','protein',1.5)
$sql$,'AAL2 admin adds fractional draft allocation');
SELECT lives_ok($sql$
  UPDATE public.meal_dose_allocations SET dose_quantity=2
  WHERE id='a8800000-0000-4000-8000-000000000001'
$sql$,'AAL2 admin adjusts draft dose');
SELECT is((SELECT dose_quantity FROM public.meal_dose_allocations
  WHERE id='a8800000-0000-4000-8000-000000000001'),2::numeric,
  'Draft dose change persists under RLS');
SELECT is((SELECT status FROM public.clients
  WHERE id='a8200000-0000-4000-8000-000000000001'),'inactive',
  'Nutrition draft does not activate historical client');
SELECT is((SELECT COUNT(*) FROM public.client_assignments
  WHERE client_id='a8200000-0000-4000-8000-000000000001'),0::bigint,
  'Nutrition draft never creates assignments');
SELECT is((SELECT COUNT(*) FROM public.protocol_publications
  WHERE client_id='a8200000-0000-4000-8000-000000000001'),0::bigint,
  'Nutrition draft does not publish');

-- Non-admin users must remain unable to mutate any draft.
SELECT set_config('request.jwt.claim.sub','a8100000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"a8100000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
  INSERT INTO public.protocols(client_id)
  VALUES('a8200000-0000-4000-8000-000000000002')
$sql$,'42501',NULL,'Client cannot create own protocol');
SELECT is(public.meal_plan_version_is_draft('a8500000-0000-4000-8000-000000000001'),false,
  'Client cannot mutate a draft helper');
SELECT set_config('request.jwt.claim.sub','a8100000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"a8100000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
  INSERT INTO public.protocols(client_id)
  VALUES('a8200000-0000-4000-8000-000000000001')
$sql$,'42501',NULL,'Authenticated identity without admin role cannot create draft');

-- AAL1 admin cannot write plan children, even if the plan was prepared at AAL2.
SELECT set_config('request.jwt.claim.sub','a8100000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"a8100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT is(public.meal_plan_version_is_draft('a8500000-0000-4000-8000-000000000001'),false,
  'AAL1 draft helper denies access');
SELECT throws_ok($sql$
  INSERT INTO public.meals(meal_plan_variant_id,position)
  VALUES('a8600000-0000-4000-8000-000000000001',2)
$sql$,'42501',NULL,'AAL1 cannot insert draft meal');
SELECT throws_ok($sql$
  INSERT INTO public.protocol_versions(protocol_id,client_id,version_number,created_by_profile_id)
  VALUES('a8300000-0000-4000-8000-000000000001',
    'a8200000-0000-4000-8000-000000000001',2,
    'a8100000-0000-4000-8000-000000000001')
$sql$,'42501',NULL,'AAL1 admin cannot create a second version');

-- Following migration J4-HUMAN-LIFECYCLE, an AAL2 administrator may submit
-- the draft in a separate, explicit operation (never automatic approval).
SELECT set_config('request.jwt.claims','{"sub":"a8100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT lives_ok($sql$
  UPDATE public.protocol_versions SET submitted_for_review_at=now()
  WHERE id='a8400000-0000-4000-8000-000000000001'
$sql$,'Admin AAL2 explicitly submits historical draft for review');
SELECT set_config('request.jwt.claim.sub','a8100000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"a8100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT is(public.meal_plan_version_is_draft('a8500000-0000-4000-8000-000000000001'),false,
  'Submitted version ceases to be editable');
SELECT throws_ok($sql$
  INSERT INTO public.meals(meal_plan_variant_id,position)
  VALUES('a8600000-0000-4000-8000-000000000001',2)
$sql$,'55000',NULL,'Submitted version cannot receive another meal');
SELECT is((SELECT COUNT(*) FROM public.protocol_publications
  WHERE client_id='a8200000-0000-4000-8000-000000000001'),0::bigint,
  'No release created by draft workflow');

SELECT * FROM finish();
ROLLBACK;
