-- J5 global admin workflow regression. All identities synthetic, rolled back.
BEGIN;
SELECT no_plan();

SELECT ok((SELECT count(*) FROM pg_class WHERE oid IN
 ('public.client_training_requests'::regclass,
  'public.client_training_plans'::regclass,
  'public.client_training_plan_versions'::regclass,
  'public.client_training_plan_items'::regclass) AND relrowsecurity)=4,
 'Training domain RLS stays enabled');
SELECT ok((SELECT count(*) FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('client_training_requests','client_training_plans',
 'client_training_plan_versions','client_training_plan_items')
 AND policyname='admin_mfa_aal2_required' AND permissive='RESTRICTIVE')=4,
 'Restrictive MFA retained on four tables');
SELECT ok((SELECT count(*) FROM pg_policies WHERE schemaname='public'
 AND policyname LIKE 'client_training_%admin_global_%')=7,
 'Narrow admin-global mutation policies installed');
SELECT ok((SELECT count(*) FROM pg_policies WHERE schemaname='public'
 AND policyname='client_training_versions_publish_to_active_client_only'
 AND permissive='RESTRICTIVE' AND cmd='UPDATE')=1,
 'Restrictive active-profile publication gate installed');
SELECT ok((SELECT NOT prosecdef FROM pg_proc WHERE
 oid='public.create_client_training_plan_draft(uuid,text,text)'::regprocedure),
 'Training draft function stays SECURITY INVOKER');
SELECT ok(NOT has_table_privilege('anon','public.client_training_requests','INSERT')
 AND NOT has_table_privilege('anon','public.client_training_plan_versions','UPDATE'),
 'No anonymous training mutation grants');

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('b5100000-0000-4000-8000-000000000001','j5-adm@example.test','{}'),
 ('b5100000-0000-4000-8000-000000000002','j5-client@example.test','{}'),
 ('b5100000-0000-4000-8000-000000000003','j5-norole@example.test','{}'),
 ('b5100000-0000-4000-8000-000000000004','j5-otheradmin@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
 ('b5100000-0000-4000-8000-000000000001','Synthetic admin'),
 ('b5100000-0000-4000-8000-000000000002','Synthetic client'),
 ('b5100000-0000-4000-8000-000000000003','Synthetic no-role'),
 ('b5100000-0000-4000-8000-000000000004','Synthetic independent admin');
INSERT INTO public.user_roles(profile_id,role) VALUES
 ('b5100000-0000-4000-8000-000000000001','admin'),
 ('b5100000-0000-4000-8000-000000000002','client'),
 ('b5100000-0000-4000-8000-000000000004','admin');
INSERT INTO public.clients(id,full_name,status,profile_id) VALUES
 ('b5200000-0000-4000-8000-000000000001','Synthetic historic','inactive',NULL),
 ('b5200000-0000-4000-8000-000000000002','Synthetic active','active','b5100000-0000-4000-8000-000000000002');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','b5100000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"b5100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.client_training_requests(client_id,recorded_by_profile_id)
 VALUES('b5200000-0000-4000-8000-000000000001','b5100000-0000-4000-8000-000000000001')
$sql$,'42501',NULL,'AAL1 admin cannot register request');

SELECT set_config('request.jwt.claims',
 '{"sub":"b5100000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 SELECT public.create_client_training_plan_draft(
 'b5200000-0000-4000-8000-000000000001','Draft before request',NULL)
$sql$,'23514','training request is required before prescription',
 'Even global admin cannot prescribe without a request');

SELECT lives_ok($sql$
 INSERT INTO public.client_training_requests(client_id,recorded_by_profile_id,note)
 VALUES('b5200000-0000-4000-8000-000000000001',
 'b5100000-0000-4000-8000-000000000001','Synthetic professional request')
$sql$,'Unassigned AAL2 admin records historical request');
SELECT lives_ok($sql$
 INSERT INTO public.client_training_requests(client_id,recorded_by_profile_id)
 VALUES('b5200000-0000-4000-8000-000000000002','b5100000-0000-4000-8000-000000000001')
$sql$,'Unassigned AAL2 admin records active request');

SELECT lives_ok($sql$
 SELECT public.create_client_training_plan_draft(
 'b5200000-0000-4000-8000-000000000001','Synthetic historic draft',NULL)
$sql$,'Unassigned admin creates internal historic training draft');
SELECT lives_ok($sql$
 SELECT public.create_client_training_plan_draft(
 'b5200000-0000-4000-8000-000000000002','Synthetic active draft',NULL)
$sql$,'Unassigned admin creates active training draft');
SELECT is((SELECT count(*) FROM public.client_training_plans),2::bigint,
 'No duplicate Client or assignment is generated');

SELECT throws_ok($sql$
 SELECT public.create_client_training_plan_draft(
 'b5200000-0000-4000-8000-000000000001','Duplicate draft',NULL)
$sql$,'23505','an open training plan draft already exists',
 'One open draft invariant remains');

SELECT lives_ok($sql$
 INSERT INTO public.client_training_plan_items
 (training_plan_version_id,position,exercise_name,sets_text,repetitions_text)
 SELECT v.id,1,'Synthetic exercise','2','8'
 FROM public.client_training_plan_versions v
 JOIN public.client_training_plans p ON p.id=v.training_plan_id
 WHERE p.client_id='b5200000-0000-4000-8000-000000000001'
$sql$,'Unassigned admin inserts historic draft exercise');
SELECT lives_ok($sql$
 INSERT INTO public.client_training_plan_items
 (training_plan_version_id,position,exercise_name,sets_text,repetitions_text)
 SELECT v.id,1,'Synthetic active exercise','2','8'
 FROM public.client_training_plan_versions v
 JOIN public.client_training_plans p ON p.id=v.training_plan_id
 WHERE p.client_id='b5200000-0000-4000-8000-000000000002'
$sql$,'Unassigned admin inserts active draft exercise');
SELECT lives_ok($sql$
 UPDATE public.client_training_plan_items SET sets_text='3'
 WHERE exercise_name='Synthetic historic exercise'
$sql$,'Unassigned admin edits draft exercise');
SELECT throws_ok($sql$
 UPDATE public.client_training_plan_versions SET reviewed_at=now(),
 reviewed_by_profile_id='b5100000-0000-4000-8000-000000000004'
 WHERE training_plan_id=(SELECT id FROM public.client_training_plans
 WHERE client_id='b5200000-0000-4000-8000-000000000001')
$sql$,'42501',NULL,'AAL2 admin cannot forge reviewer attribution');
SELECT throws_ok($sql$
 UPDATE public.client_training_plan_versions SET reviewed_at=now(),
 reviewed_by_profile_id='b5100000-0000-4000-8000-000000000001',
 published_at=now(),published_by_profile_id='b5100000-0000-4000-8000-000000000001'
 WHERE training_plan_id=(SELECT id FROM public.client_training_plans
 WHERE client_id='b5200000-0000-4000-8000-000000000002')
$sql$,'55000',NULL,'Review and publication cannot occur in one mutation');
SELECT lives_ok($sql$
 UPDATE public.client_training_plan_versions SET reviewed_at=now(),
 reviewed_by_profile_id='b5100000-0000-4000-8000-000000000001'
 WHERE training_plan_id=(SELECT id FROM public.client_training_plans
 WHERE client_id='b5200000-0000-4000-8000-000000000001')
$sql$,'Unassigned admin reviews historic draft for internal record');
SELECT lives_ok($sql$
 UPDATE public.client_training_plan_versions SET reviewed_at=now(),
 reviewed_by_profile_id='b5100000-0000-4000-8000-000000000001'
 WHERE training_plan_id=(SELECT id FROM public.client_training_plans
 WHERE client_id='b5200000-0000-4000-8000-000000000002')
$sql$,'Unassigned admin reviews active draft');
WITH changed AS (
 UPDATE public.client_training_plan_items SET sets_text='5'
 WHERE exercise_name='Synthetic historic exercise'
 RETURNING id
)
SELECT is(count(*),0::bigint,'Reviewed plan items cannot mutate under RLS') FROM changed;

SELECT throws_ok($sql$
 UPDATE public.client_training_plan_versions SET published_at=now(),
 published_by_profile_id='b5100000-0000-4000-8000-000000000001'
 WHERE training_plan_id=(SELECT id FROM public.client_training_plans
 WHERE client_id='b5200000-0000-4000-8000-000000000001')
$sql$,'42501',NULL,'Inactive/no-Profile client cannot receive publication');
-- A second legitimate AAL2 admin may publish the existing reviewed version,
-- while attribution of the first reviewer must remain immutable.
SELECT set_config('request.jwt.claim.sub','b5100000-0000-4000-8000-000000000004',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"b5100000-0000-4000-8000-000000000004","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 UPDATE public.client_training_plan_versions SET
 published_at=now(),
 published_by_profile_id='b5100000-0000-4000-8000-000000000001'
 WHERE training_plan_id=(SELECT id FROM public.client_training_plans
 WHERE client_id='b5200000-0000-4000-8000-000000000002')
$sql$,'42501',NULL,'AAL2 admin cannot forge publisher identity');
SELECT lives_ok($sql$
 SELECT public.publish_client_training_plan_version(v.id)
 FROM public.client_training_plan_versions v
 JOIN public.client_training_plans p ON p.id=v.training_plan_id
 WHERE p.client_id='b5200000-0000-4000-8000-000000000002'
$sql$,'Second AAL2 admin publishes reviewed version without assignment');
SELECT is((SELECT count(*) FROM public.client_training_plan_versions
 WHERE published_at IS NOT NULL),1::bigint,
 'Only active client training was published');
SELECT is((SELECT reviewed_by_profile_id FROM public.client_training_plan_versions
 WHERE published_at IS NOT NULL),'b5100000-0000-4000-8000-000000000001'::uuid,
 'Original human reviewer attribution is preserved');
SELECT is((SELECT published_by_profile_id FROM public.client_training_plan_versions
 WHERE published_at IS NOT NULL),'b5100000-0000-4000-8000-000000000004'::uuid,
 'Separate human publisher is attributed correctly');
SELECT is((SELECT count(*) FROM public.client_assignments),0::bigint,
 'No assignment was created by this workflow');

SELECT set_config('request.jwt.claims',
 '{"sub":"b5100000-0000-4000-8000-000000000001","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.client_training_requests(client_id,recorded_by_profile_id)
 VALUES('b5200000-0000-4000-8000-000000000001',
 'b5100000-0000-4000-8000-000000000001')
$sql$,'42501',NULL,'AAL1 stays denied after workflow');

SELECT set_config('request.jwt.claim.sub','b5100000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"b5100000-0000-4000-8000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 INSERT INTO public.client_training_requests(client_id,recorded_by_profile_id)
 VALUES('b5200000-0000-4000-8000-000000000001',
 'b5100000-0000-4000-8000-000000000002')
$sql$,'42501',NULL,'Client cannot request training for other Client');
SELECT throws_ok($sql$
 SELECT public.create_client_training_plan_draft(
 'b5200000-0000-4000-8000-000000000001','Forged professional',NULL)
$sql$,'42501',NULL,'Client cannot act as professional');

SELECT set_config('request.jwt.claim.sub','b5100000-0000-4000-8000-000000000003',true);
SELECT set_config('request.jwt.claims',
 '{"sub":"b5100000-0000-4000-8000-000000000003","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok($sql$
 SELECT public.create_client_training_plan_draft(
 'b5200000-0000-4000-8000-000000000001','Roleless',NULL)
$sql$,'42501',NULL,'Roleless identity cannot create professional training');

SELECT * FROM finish();
ROLLBACK;
