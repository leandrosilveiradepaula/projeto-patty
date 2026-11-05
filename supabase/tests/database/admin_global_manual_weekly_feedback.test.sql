-- J2 manual feedback regression: synthetic users and client, rolled back.
BEGIN;
SELECT no_plan();

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.client_weekly_feedbacks'::regclass),
 'RLS remains on');
SELECT is((SELECT count(*) FROM pg_policies WHERE schemaname='public'
 AND tablename='client_weekly_feedbacks'
 AND policyname='admin_mfa_aal2_required' AND permissive='RESTRICTIVE'),
 1::bigint,'Existing MFA restrictive policy remains');
SELECT is((SELECT count(*) FROM pg_policies WHERE schemaname='public'
 AND tablename='client_weekly_feedbacks'
 AND policyname='client_weekly_feedbacks_manual_active_profile_only'
 AND permissive='RESTRICTIVE' AND cmd='INSERT'),
 1::bigint,'New active-profile restrictive policy applies to INSERT');
SELECT is((SELECT count(*) FROM pg_policies WHERE schemaname='public'
 AND tablename='client_weekly_feedbacks'
 AND policyname='client_weekly_feedbacks_insert_admin_global_manual_aal2' AND cmd='INSERT'),
 1::bigint,'New AAL2 global admin INSERT policy exists');
SELECT ok(NOT has_table_privilege('anon','public.client_weekly_feedbacks','INSERT'),
 'Anonymous role retains no INSERT grant');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('d2100000-0000-4000-8000-000000000001','j2-admin@example.test','{}'),
 ('d2100000-0000-4000-8000-000000000002','j2-client@example.test','{}'),
 ('d2100000-0000-4000-8000-000000000003','j2-other@example.test','{}'),
 ('d2100000-0000-4000-8000-000000000004','j2-norole@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('d2100000-0000-4000-8000-000000000001','Synthetic J2 admin'),
 ('d2100000-0000-4000-8000-000000000002','Synthetic J2 owner'),
 ('d2100000-0000-4000-8000-000000000003','Synthetic J2 other'),
 ('d2100000-0000-4000-8000-000000000004','Synthetic J2 no role');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('d2100000-0000-4000-8000-000000000001','admin'),
 ('d2100000-0000-4000-8000-000000000002','client'),
 ('d2100000-0000-4000-8000-000000000003','client');
INSERT INTO public.clients(id,full_name,status,profile_id) VALUES
 ('d2200000-0000-4000-8000-000000000001','Synthetic J2 recipient','active','d2100000-0000-4000-8000-000000000002'),
 ('d2200000-0000-4000-8000-000000000002','Synthetic J2 unpublished','active','d2100000-0000-4000-8000-000000000003');

-- Seed a formally reviewed and published protocol. No assignment is created.
INSERT INTO public.protocols(id,client_id) VALUES
 ('d2300000-0000-4000-8000-000000000001','d2200000-0000-4000-8000-000000000001');
INSERT INTO public.protocol_versions
 (id,protocol_id,client_id,version_number,created_by_profile_id,submitted_for_review_at)
VALUES
 ('d2400000-0000-4000-8000-000000000001',
 'd2300000-0000-4000-8000-000000000001',
 'd2200000-0000-4000-8000-000000000001',1,
 'd2100000-0000-4000-8000-000000000001',now());
INSERT INTO public.protocol_version_approvals
 (id,protocol_version_id,client_id,approved_by_profile_id) VALUES
 ('d2500000-0000-4000-8000-000000000001',
 'd2400000-0000-4000-8000-000000000001',
 'd2200000-0000-4000-8000-000000000001',
 'd2100000-0000-4000-8000-000000000001');
INSERT INTO public.protocol_publications
 (protocol_version_id,client_id,approval_id,published_by_profile_id) VALUES
 ('d2400000-0000-4000-8000-000000000001',
 'd2200000-0000-4000-8000-000000000001',
 'd2500000-0000-4000-8000-000000000001',
 'd2100000-0000-4000-8000-000000000001');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','d2100000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"d2100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok($q$
 INSERT INTO public.client_weekly_feedbacks
 (client_id,form_version_id,period_start,period_end,requested_by_profile_id)
 VALUES('d2200000-0000-4000-8000-000000000001',
 (SELECT id FROM public.weekly_feedback_form_versions WHERE version_number=1),
 '2026-11-02','2026-11-08','d2100000-0000-4000-8000-000000000001')
$q$,'42501',NULL,'AAL1 admin cannot register feedback request');

SELECT set_config('request.jwt.claims',
 '{"sub":"d2100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT lives_ok($q$
 INSERT INTO public.client_weekly_feedbacks
 (client_id,form_version_id,period_start,period_end,requested_by_profile_id)
 VALUES('d2200000-0000-4000-8000-000000000001',
 (SELECT id FROM public.weekly_feedback_form_versions WHERE version_number=1),
 '2026-11-02','2026-11-08','d2100000-0000-4000-8000-000000000001')
$q$,'AAL2 admin without assignment can request feedback for active linked Client');
SELECT is((SELECT count(*) FROM public.client_weekly_feedbacks
 WHERE client_id='d2200000-0000-4000-8000-000000000001'),1::bigint,
 'Exactly one manually requested feedback');
SELECT is((SELECT count(*) FROM public.client_assignments
 WHERE client_id IN ('d2200000-0000-4000-8000-000000000001','d2200000-0000-4000-8000-000000000002')),0::bigint,
 'Request never creates assignment');

SELECT throws_ok($q$
 INSERT INTO public.client_weekly_feedbacks
 (client_id,form_version_id,period_start,period_end,requested_by_profile_id)
 VALUES('d2200000-0000-4000-8000-000000000002',
 (SELECT id FROM public.weekly_feedback_form_versions WHERE version_number=1),
 '2026-11-02','2026-11-08','d2100000-0000-4000-8000-000000000001')
$q$,'42501',NULL,'Published protocol required for a different Client');
SELECT throws_ok($q$
 INSERT INTO public.client_weekly_feedbacks
 (client_id,form_version_id,period_start,period_end,requested_by_profile_id)
 VALUES('d2200000-0000-4000-8000-000000000001',
 (SELECT id FROM public.weekly_feedback_form_versions WHERE version_number=1),
 '2026-11-09','2026-11-15','d2100000-0000-4000-8000-000000000004')
$q$,'42501',NULL,'AAL2 admin cannot forge request author');
SELECT throws_ok($q$
 INSERT INTO public.client_weekly_feedbacks
 (client_id,form_version_id,period_start,period_end,requested_by_profile_id,request_source)
 VALUES('d2200000-0000-4000-8000-000000000001',
 (SELECT id FROM public.weekly_feedback_form_versions WHERE version_number=1),
 '2026-11-09','2026-11-15','d2100000-0000-4000-8000-000000000001','schedule')
$q$,'42501',NULL,'Manual admin cannot spoof scheduler source');

RESET ROLE;
UPDATE public.clients SET status='inactive'
 WHERE id='d2200000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$
 INSERT INTO public.client_weekly_feedbacks
 (client_id,form_version_id,period_start,period_end,requested_by_profile_id)
 VALUES('d2200000-0000-4000-8000-000000000001',
 (SELECT id FROM public.weekly_feedback_form_versions WHERE version_number=1),
 '2026-11-09','2026-11-15','d2100000-0000-4000-8000-000000000001')
$q$,'42501',NULL,'Inactive Client retains history but cannot receive new request');

RESET ROLE;
UPDATE public.clients SET status='active',profile_id=NULL
 WHERE id='d2200000-0000-4000-8000-000000000001';
SET LOCAL ROLE authenticated;
SELECT throws_ok($q$
 INSERT INTO public.client_weekly_feedbacks
 (client_id,form_version_id,period_start,period_end,requested_by_profile_id)
 VALUES('d2200000-0000-4000-8000-000000000001',
 (SELECT id FROM public.weekly_feedback_form_versions WHERE version_number=1),
 '2026-11-09','2026-11-15','d2100000-0000-4000-8000-000000000001')
$q$,'42501',NULL,'No linked Profile prevents new manual request');

SELECT set_config('request.jwt.claim.sub','d2100000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"d2100000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($q$
 INSERT INTO public.client_weekly_feedbacks
 (client_id,form_version_id,period_start,period_end,requested_by_profile_id)
 VALUES('d2200000-0000-4000-8000-000000000001',
 (SELECT id FROM public.weekly_feedback_form_versions WHERE version_number=1),
 '2026-11-16','2026-11-22','d2100000-0000-4000-8000-000000000002')
$q$,'42501',NULL,'Client role may not create request even for own historical Client');

SELECT set_config('request.jwt.claim.sub','d2100000-0000-4000-8000-000000000004',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"d2100000-0000-4000-8000-000000000004","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($q$
 INSERT INTO public.client_weekly_feedbacks
 (client_id,form_version_id,period_start,period_end,requested_by_profile_id)
 VALUES('d2200000-0000-4000-8000-000000000002',
 (SELECT id FROM public.weekly_feedback_form_versions WHERE version_number=1),
 '2026-11-02','2026-11-08','d2100000-0000-4000-8000-000000000004')
$q$,'42501',NULL,'Roleless AAL2 identity cannot act as admin');

SELECT * FROM finish();
ROLLBACK;
