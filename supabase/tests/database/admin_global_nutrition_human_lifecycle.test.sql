-- J4-ADMIN-HUMAN-LIFECYCLE-01, synthetic only; no data persists.
BEGIN;
SELECT no_plan();

SELECT ok((SELECT count(*) FROM pg_class WHERE oid IN (
  'public.protocol_versions'::regclass,
  'public.protocol_version_approvals'::regclass,
  'public.protocol_publications'::regclass
) AND relrowsecurity)=3,'RLS remains enabled');
SELECT ok((SELECT count(*) FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('protocol_versions','protocol_version_approvals','protocol_publications')
 AND policyname='admin_mfa_aal2_required' AND permissive='RESTRICTIVE')=3,
 'Admin MFA restrictive policies preserved');
SELECT ok((SELECT count(*) FROM pg_policies WHERE schemaname='public'
 AND policyname IN ('protocol_versions_submit_admin_global_aal2',
 'protocol_approvals_insert_admin_global_aal2',
 'protocol_publications_insert_admin_global_active_aal2',
 'protocol_publications_active_client_only'))=4,
 'Only explicit transition and restrictive publication policies were added');
SELECT ok((SELECT count(*) FROM pg_trigger WHERE tgrelid='public.protocol_versions'::regclass
 AND tgname IN ('protocol_versions_freeze_after_review','protocol_versions_submit_transition_only')
 AND tgenabled='O')=2,'Both immutable and single-transition guards are present');
SELECT ok(NOT has_table_privilege('anon','public.protocol_publications','INSERT')
 AND NOT has_table_privilege('anon','public.protocol_version_approvals','INSERT'),
 'Anon cannot insert decisions');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('b8100000-0000-4000-8000-000000000001','j4lifecycle-admin@example.test','{}'),
 ('b8100000-0000-4000-8000-000000000002','j4lifecycle-client@example.test','{}'),
 ('b8100000-0000-4000-8000-000000000003','j4lifecycle-norole@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('b8100000-0000-4000-8000-000000000001','Synthetic admin lifecycle'),
 ('b8100000-0000-4000-8000-000000000002','Synthetic client lifecycle'),
 ('b8100000-0000-4000-8000-000000000003','Synthetic no role');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('b8100000-0000-4000-8000-000000000001','admin'),
 ('b8100000-0000-4000-8000-000000000002','client');
INSERT INTO public.clients(id,full_name,status,profile_id) VALUES
 ('b8200000-0000-4000-8000-000000000001','Synthetic inactive historical','inactive',NULL),
 ('b8200000-0000-4000-8000-000000000002','Synthetic active client','active','b8100000-0000-4000-8000-000000000002');
INSERT INTO public.protocols(id,client_id) VALUES
 ('b8300000-0000-4000-8000-000000000001','b8200000-0000-4000-8000-000000000001'),
 ('b8300000-0000-4000-8000-000000000002','b8200000-0000-4000-8000-000000000002');
INSERT INTO public.protocol_versions(id,protocol_id,client_id,version_number,created_by_profile_id) VALUES
 ('b8400000-0000-4000-8000-000000000001','b8300000-0000-4000-8000-000000000001','b8200000-0000-4000-8000-000000000001',1,'b8100000-0000-4000-8000-000000000001'),
 ('b8400000-0000-4000-8000-000000000002','b8300000-0000-4000-8000-000000000002','b8200000-0000-4000-8000-000000000002',1,'b8100000-0000-4000-8000-000000000001');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','b8100000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"b8100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok($q$
 UPDATE public.protocol_versions SET submitted_for_review_at=now()
 WHERE id='b8400000-0000-4000-8000-000000000001'
$q$,'42501',NULL,'AAL1 admin denied submission');

SELECT set_config('request.jwt.claims','{"sub":"b8100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($q$
 UPDATE public.protocol_versions SET submitted_for_review_at=now(),client_instructions='Unreviewed change'
 WHERE id='b8400000-0000-4000-8000-000000000001'
$q$,'55000',NULL,'Mixed content change and submission is rejected');
SELECT is((SELECT submitted_for_review_at IS NULL FROM public.protocol_versions WHERE
 id='b8400000-0000-4000-8000-000000000001'),true,'Failed submission left draft intact');
SELECT lives_ok($q$
 UPDATE public.protocol_versions SET submitted_for_review_at=now()
 WHERE id='b8400000-0000-4000-8000-000000000001'
$q$,'Unassigned admin AAL2 submits historical version');
SELECT lives_ok($q$
 UPDATE public.protocol_versions SET submitted_for_review_at=now()
 WHERE id='b8400000-0000-4000-8000-000000000002'
$q$,'Unassigned AAL2 admin submits active client version');
SELECT throws_ok($q$
 UPDATE public.protocol_versions SET client_instructions='Edited after freeze'
 WHERE id='b8400000-0000-4000-8000-000000000001'
$q$,'55000',NULL,'Submitted version cannot be edited after freeze');

SELECT lives_ok($q$
 INSERT INTO public.protocol_version_approvals
 (id,protocol_version_id,client_id,approved_by_profile_id)
 VALUES ('b8500000-0000-4000-8000-000000000001',
 'b8400000-0000-4000-8000-000000000001',
 'b8200000-0000-4000-8000-000000000001',
 'b8100000-0000-4000-8000-000000000001')
$q$,'Unassigned admin AAL2 records separate historical approval');
SELECT lives_ok($q$
 INSERT INTO public.protocol_version_approvals
 (id,protocol_version_id,client_id,approved_by_profile_id)
 VALUES ('b8500000-0000-4000-8000-000000000002',
 'b8400000-0000-4000-8000-000000000002',
 'b8200000-0000-4000-8000-000000000002',
 'b8100000-0000-4000-8000-000000000001')
$q$,'Unassigned AAL2 admin separately approves active version');
SELECT throws_ok($q$
 INSERT INTO public.protocol_version_approvals
 (protocol_version_id,client_id,approved_by_profile_id)
 VALUES ('b8400000-0000-4000-8000-000000000002',
 'b8200000-0000-4000-8000-000000000002',
 'b8100000-0000-4000-8000-000000000001')
$q$,'23505',NULL,'Duplicate approval is refused');
SELECT throws_ok($q$
 INSERT INTO public.protocol_version_approvals
 (protocol_version_id,client_id,approved_by_profile_id)
 VALUES ('b8400000-0000-4000-8000-000000000001',
 'b8200000-0000-4000-8000-000000000002',
 'b8100000-0000-4000-8000-000000000001')
$q$,'23503',NULL,'Approval cannot be assigned to unrelated client');

SELECT throws_ok($q$
 INSERT INTO public.protocol_publications
 (protocol_version_id,client_id,approval_id,published_by_profile_id)
 VALUES ('b8400000-0000-4000-8000-000000000001',
 'b8200000-0000-4000-8000-000000000001',
 'b8500000-0000-4000-8000-000000000001',
 'b8100000-0000-4000-8000-000000000001')
$q$,'42501',NULL,'Historical inactive Client without Profile cannot be published');
SELECT lives_ok($q$
 INSERT INTO public.protocol_publications
 (protocol_version_id,client_id,approval_id,published_by_profile_id)
 VALUES ('b8400000-0000-4000-8000-000000000002',
 'b8200000-0000-4000-8000-000000000002',
 'b8500000-0000-4000-8000-000000000002',
 'b8100000-0000-4000-8000-000000000001')
$q$,'Approved version is published only by explicit admin AAL2 action for active client');
SELECT is((SELECT count(*) FROM public.protocol_publications),1::bigint,
 'No automatic or inactive publication');
SELECT is((SELECT count(*) FROM public.client_assignments),0::bigint,
 'Human transitions did not manufacture any assignment');
SELECT is((SELECT status FROM public.clients WHERE id='b8200000-0000-4000-8000-000000000001'),'inactive',
 'Historical client remains inactive');

SELECT set_config('request.jwt.claims','{"sub":"b8100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok($q$
 INSERT INTO public.protocol_publications
 (protocol_version_id,client_id,approval_id,published_by_profile_id)
 VALUES ('b8400000-0000-4000-8000-000000000002',
 'b8200000-0000-4000-8000-000000000002',
 'b8500000-0000-4000-8000-000000000002',
 'b8100000-0000-4000-8000-000000000001')
$q$,'42501',NULL,'AAL1 cannot publish');
SELECT set_config('request.jwt.claim.sub','b8100000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"b8100000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($q$
 INSERT INTO public.protocol_version_approvals
 (protocol_version_id,client_id,approved_by_profile_id)
 VALUES ('b8400000-0000-4000-8000-000000000002',
 'b8200000-0000-4000-8000-000000000002',
 'b8100000-0000-4000-8000-000000000002')
$q$,'42501',NULL,'Client cannot approve');
SELECT set_config('request.jwt.claim.sub','b8100000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"b8100000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($q$
 UPDATE public.protocol_versions SET submitted_for_review_at=now()
 WHERE id='b8400000-0000-4000-8000-000000000002'
$q$,'42501',NULL,'No-role identity cannot submit');
SELECT * FROM finish();
ROLLBACK;
