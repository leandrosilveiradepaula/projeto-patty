-- RBAC-ADMIN-WRITE-05: entirely synthetic fixtures; rollback.
BEGIN;
SELECT no_plan();

SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid='public.client_liquid_intake_event_corrections'::regclass)
 AND (SELECT relrowsecurity FROM pg_class WHERE oid='public.client_activity_checkin_event_corrections'::regclass),
 'Both correction tables retain RLS');
SELECT ok((SELECT count(*) FROM pg_policies
 WHERE schemaname='public'
 AND tablename IN ('client_liquid_intake_event_corrections','client_activity_checkin_event_corrections')
 AND policyname='admin_mfa_aal2_required' AND permissive='RESTRICTIVE')=2,
 'Both correction tables retain restrictive MFA');
SELECT ok((SELECT count(*) FROM pg_policies
 WHERE schemaname='public'
 AND policyname IN ('client_liquid_intake_event_corrections_insert_admin_global_aal2',
                    'client_activity_checkin_event_corrections_insert_admin_global_aal2')
 AND cmd='INSERT')=2,
 'Only scoped admin correction INSERT policies are added');
SELECT ok(NOT has_table_privilege('authenticated','public.client_liquid_intake_event_corrections','UPDATE')
 AND NOT has_table_privilege('authenticated','public.client_liquid_intake_event_corrections','DELETE')
 AND NOT has_table_privilege('authenticated','public.client_activity_checkin_event_corrections','UPDATE')
 AND NOT has_table_privilege('authenticated','public.client_activity_checkin_event_corrections','DELETE')
 AND NOT has_table_privilege('anon','public.client_liquid_intake_event_corrections','INSERT')
 AND NOT has_table_privilege('anon','public.client_activity_checkin_event_corrections','INSERT'),
 'Append-only and anonymous privilege boundary preserved');
SELECT ok((SELECT count(*) FROM pg_trigger WHERE tgrelid IN (
 'public.client_liquid_intake_event_corrections'::regclass,
 'public.client_activity_checkin_event_corrections'::regclass)
 AND tgname IN ('client_liquid_intake_event_corrections_immutable',
                'client_activity_checkin_event_corrections_immutable')
 AND tgenabled='O')=2, 'Both immutable correction triggers remain enabled');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('b1000000-0000-4000-8000-000000000001','synthetic-checkin-admin@example.test','{}'),
 ('b1000000-0000-4000-8000-000000000002','synthetic-checkin-owner@example.test','{}'),
 ('b1000000-0000-4000-8000-000000000003','synthetic-checkin-other@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('b1000000-0000-4000-8000-000000000001','Synthetic check-in admin'),
 ('b1000000-0000-4000-8000-000000000002','Synthetic check-in owner'),
 ('b1000000-0000-4000-8000-000000000003','Synthetic unrelated user');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('b1000000-0000-4000-8000-000000000001','admin'),
 ('b1000000-0000-4000-8000-000000000002','client'),
 ('b1000000-0000-4000-8000-000000000003','client');
INSERT INTO public.clients(id,profile_id,full_name,status) VALUES
 ('b2000000-0000-4000-8000-000000000001',NULL,'Synthetic historical inactive client','inactive'),
 ('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','Synthetic own active client','active');
INSERT INTO public.client_liquid_intake_events(id,client_id,recorded_by_profile_id,amount_ml,liquid_kind) VALUES
 ('b3000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001',250,'water'),
 ('b3000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002',250,'water');
INSERT INTO public.client_activity_checkin_events(id,client_id,recorded_by_profile_id,checkin_date,did_activity) VALUES
 ('b4000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001',current_date,true),
 ('b4000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002',current_date,true);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);

SELECT lives_ok($sql$
 INSERT INTO public.client_liquid_intake_event_corrections(
 event_id,corrected_amount_ml,corrected_liquid_kind,corrected_recorded_at,corrected_by_profile_id)
 VALUES ('b3000000-0000-4000-8000-000000000001',300,'water',now(),
 'b1000000-0000-4000-8000-000000000001')
$sql$, 'Unassigned AAL2 admin corrects historical liquid event');
SELECT lives_ok($sql$
 INSERT INTO public.client_activity_checkin_event_corrections(
 event_id,corrected_checkin_date,corrected_did_activity,corrected_by_profile_id)
 VALUES ('b4000000-0000-4000-8000-000000000001',current_date,false,
 'b1000000-0000-4000-8000-000000000001')
$sql$, 'Unassigned AAL2 admin corrects historical activity event');
SELECT is((SELECT count(*) FROM public.client_liquid_intake_event_corrections
 WHERE event_id='b3000000-0000-4000-8000-000000000001'),1::bigint,
 'Exactly one historical liquid correction');
SELECT is((SELECT count(*) FROM public.client_activity_checkin_event_corrections
 WHERE event_id='b4000000-0000-4000-8000-000000000001'),1::bigint,
 'Exactly one historical activity correction');
SELECT is((SELECT amount_ml FROM public.client_liquid_intake_events
 WHERE id='b3000000-0000-4000-8000-000000000001'),250,
 'Original liquid event is unchanged');
SELECT is((SELECT did_activity FROM public.client_activity_checkin_events
 WHERE id='b4000000-0000-4000-8000-000000000001'),true,
 'Original activity event is unchanged');

SELECT throws_ok($sql$
 INSERT INTO public.client_liquid_intake_event_corrections(
 event_id,corrected_amount_ml,corrected_liquid_kind,corrected_recorded_at,corrected_by_profile_id)
 VALUES ('b3000000-0000-4000-8000-000000000001',301,'water',now(),
 'b1000000-0000-4000-8000-000000000003')
$sql$,'42501',NULL,'Admin cannot forge another correction author');

SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.client_activity_checkin_event_corrections(
 event_id,corrected_checkin_date,corrected_did_activity,corrected_by_profile_id)
 VALUES ('b4000000-0000-4000-8000-000000000001',current_date,false,
 'b1000000-0000-4000-8000-000000000001')
$sql$,'42501',NULL,'Admin AAL1 cannot correct historical activity');

SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT lives_ok($sql$
 INSERT INTO public.client_liquid_intake_event_corrections(
 event_id,corrected_amount_ml,corrected_liquid_kind,corrected_recorded_at,corrected_by_profile_id)
 VALUES ('b3000000-0000-4000-8000-000000000002',350,'water',now(),
 'b1000000-0000-4000-8000-000000000002')
$sql$, 'Client retains own liquid correction access');
SELECT lives_ok($sql$
 INSERT INTO public.client_activity_checkin_event_corrections(
 event_id,corrected_checkin_date,corrected_did_activity,corrected_by_profile_id)
 VALUES ('b4000000-0000-4000-8000-000000000002',current_date,false,
 'b1000000-0000-4000-8000-000000000002')
$sql$, 'Client retains own activity correction access');
SELECT throws_ok($sql$
 INSERT INTO public.client_liquid_intake_event_corrections(
 event_id,corrected_amount_ml,corrected_liquid_kind,corrected_recorded_at,corrected_by_profile_id)
 VALUES ('b3000000-0000-4000-8000-000000000001',351,'water',now(),
 'b1000000-0000-4000-8000-000000000002')
$sql$,'42501',NULL,'Client cannot correct unrelated historical liquid event');
SELECT throws_ok($sql$
 INSERT INTO public.client_activity_checkin_event_corrections(
 event_id,corrected_checkin_date,corrected_did_activity,corrected_by_profile_id)
 VALUES ('b4000000-0000-4000-8000-000000000001',current_date,false,
 'b1000000-0000-4000-8000-000000000002')
$sql$,'42501',NULL,'Client cannot correct unrelated historical activity event');

SELECT set_config('request.jwt.claim.sub','b1000000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.client_liquid_intake_event_corrections(
 event_id,corrected_amount_ml,corrected_liquid_kind,corrected_recorded_at,corrected_by_profile_id)
 VALUES ('b3000000-0000-4000-8000-000000000001',351,'water',now(),
 'b1000000-0000-4000-8000-000000000003')
$sql$,'42501',NULL,'Non-admin cannot correct historical liquid');
SELECT throws_ok($sql$
 INSERT INTO public.client_activity_checkin_event_corrections(
 event_id,corrected_checkin_date,corrected_did_activity,corrected_by_profile_id)
 VALUES ('b4000000-0000-4000-8000-000000000001',current_date,false,
 'b1000000-0000-4000-8000-000000000003')
$sql$,'42501',NULL,'Non-admin cannot correct historical activity');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
