-- Only synthetic data, rolled back after each pgTAP invocation.
BEGIN;
SELECT no_plan();

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid='public.professional_follow_ups'::regclass),
  'RLS remains enabled for professional notes'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='professional_follow_ups'
    AND policyname='admin_mfa_aal2_required' AND permissive='RESTRICTIVE'),
  'Restrictive MFA policy remains installed'
);
SELECT ok(
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
    AND tablename='professional_follow_ups'
    AND policyname='professional_follow_ups_insert_admin_global_aal2'
    AND cmd='INSERT'),
  'Global insert is specific to professional follow-up'
);
SELECT ok(
  NOT has_table_privilege('authenticated','public.professional_follow_ups','UPDATE')
  AND NOT has_table_privilege('authenticated','public.professional_follow_ups','DELETE')
  AND NOT has_table_privilege('anon','public.professional_follow_ups','INSERT'),
  'No UPDATE, DELETE or anonymous INSERT granted'
);
SELECT ok(
  EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.professional_follow_ups'::regclass
    AND tgname='professional_follow_ups_finalized_assessment_guard' AND tgenabled='O'),
  'Finalized assessment trigger remains enabled'
);

INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('e1000000-0000-0000-0000-000000000001','followup-admin-assigned@example.test','{}'),
('e1000000-0000-0000-0000-000000000002','followup-admin-unassigned@example.test','{}'),
('e1000000-0000-0000-0000-000000000003','followup-client@example.test','{}'),
('e1000000-0000-0000-0000-000000000004','followup-ordinary@example.test','{}');
INSERT INTO public.profiles(id,display_name) VALUES
('e1000000-0000-0000-0000-000000000001','Synthetic assigned admin'),
('e1000000-0000-0000-0000-000000000002','Synthetic unassigned admin'),
('e1000000-0000-0000-0000-000000000003','Synthetic owner'),
('e1000000-0000-0000-0000-000000000004','Synthetic user without admin role');
INSERT INTO public.user_roles(profile_id,role) VALUES
('e1000000-0000-0000-0000-000000000001','admin'),
('e1000000-0000-0000-0000-000000000002','admin'),
('e1000000-0000-0000-0000-000000000003','client'),
('e1000000-0000-0000-0000-000000000004','client');
INSERT INTO public.clients(id,profile_id,full_name,status) VALUES
('e2000000-0000-0000-0000-000000000001',NULL,'Synthetic historical client','inactive'),
('e2000000-0000-0000-0000-000000000002','e1000000-0000-0000-0000-000000000003','Synthetic active client','active');
INSERT INTO public.client_assignments(client_id,staff_profile_id,ended_at) VALUES
('e2000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001',now());
INSERT INTO public.client_assessments(id,client_id,assessed_at,assessment_kind,created_by_profile_id,finalized_at,finalized_by_profile_id) VALUES
('e3000000-0000-0000-0000-000000000001','e2000000-0000-0000-0000-000000000001',now(),'monthly','e1000000-0000-0000-0000-000000000001',now(),'e1000000-0000-0000-0000-000000000001'),
('e3000000-0000-0000-0000-000000000002','e2000000-0000-0000-0000-000000000002',now(),'monthly','e1000000-0000-0000-0000-000000000001',NULL,NULL);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','e1000000-0000-0000-0000-000000000002',true);
SELECT set_config('request.jwt.claims','{"sub":"e1000000-0000-0000-0000-000000000002","aal":"aal2","role":"authenticated"}',true);
SELECT lives_ok(
  $$INSERT INTO public.professional_follow_ups(client_id,assessment_id,author_profile_id,professional_decision,decision_reason)
    VALUES ('e2000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001',
      'e1000000-0000-0000-0000-000000000002','maintain','Synthetic historical review')$$,
  'Unassigned admin with MFA records historical follow-up'
);
SELECT is(
  (SELECT count(*) FROM public.professional_follow_ups WHERE client_id='e2000000-0000-0000-0000-000000000001'),
  1::bigint,
  'Historical note visible with correct client identity'
);
SELECT is(
  (SELECT author_profile_id FROM public.professional_follow_ups WHERE client_id='e2000000-0000-0000-0000-000000000001'),
  'e1000000-0000-0000-0000-000000000002'::uuid,
  'Author is preserved'
);
SELECT throws_ok(
  $$INSERT INTO public.professional_follow_ups(client_id,assessment_id,author_profile_id,professional_decision,decision_reason)
    VALUES ('e2000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001',
      'e1000000-0000-0000-0000-000000000001','maintain','Forged author')$$,
  '42501',NULL,'Admin cannot forge another author'
);
SELECT throws_ok(
  $$INSERT INTO public.professional_follow_ups(client_id,assessment_id,author_profile_id,professional_decision,decision_reason)
    VALUES ('e2000000-0000-0000-0000-000000000002','e3000000-0000-0000-0000-000000000002',
      'e1000000-0000-0000-0000-000000000002','maintain','Draft forbidden')$$,
  '42501',NULL,'Global policy refuses draft assessment'
);
SELECT throws_ok(
  $$INSERT INTO public.professional_follow_ups(client_id,assessment_id,author_profile_id,professional_decision,decision_reason)
    VALUES ('e2000000-0000-0000-0000-000000000002','e3000000-0000-0000-0000-000000000001',
      'e1000000-0000-0000-0000-000000000002','maintain','Wrong client')$$,
  '42501',NULL,'Global policy refuses cross-client assessment'
);

SELECT set_config('request.jwt.claims','{"sub":"e1000000-0000-0000-0000-000000000002","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok(
  $$INSERT INTO public.professional_follow_ups(client_id,assessment_id,author_profile_id,professional_decision,decision_reason)
    VALUES ('e2000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001',
      'e1000000-0000-0000-0000-000000000002','maintain','AAL1 forbidden')$$,
  '42501',NULL,'Admin AAL1 is refused'
);
SELECT set_config('request.jwt.claim.sub','e1000000-0000-0000-0000-000000000003',true);
SELECT set_config('request.jwt.claims','{"sub":"e1000000-0000-0000-0000-000000000003","aal":"aal1","role":"authenticated"}',true);
SELECT throws_ok(
  $$INSERT INTO public.professional_follow_ups(client_id,assessment_id,author_profile_id,professional_decision,decision_reason)
    VALUES ('e2000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001',
      'e1000000-0000-0000-0000-000000000003','maintain','Client forbidden')$$,
  '42501',NULL,'Client cannot write professional history'
);
SELECT set_config('request.jwt.claim.sub','e1000000-0000-0000-0000-000000000004',true);
SELECT set_config('request.jwt.claims','{"sub":"e1000000-0000-0000-0000-000000000004","aal":"aal2","role":"authenticated"}',true);
SELECT throws_ok(
  $$INSERT INTO public.professional_follow_ups(client_id,assessment_id,author_profile_id,professional_decision,decision_reason)
    VALUES ('e2000000-0000-0000-0000-000000000001','e3000000-0000-0000-0000-000000000001',
      'e1000000-0000-0000-0000-000000000004','maintain','No admin role')$$,
  '42501',NULL,'Authenticated non-admin AAL2 cannot write professional history'
);
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
