begin;

select plan(11);

select is(
  (select count(*) from information_schema.tables
   where table_schema='public'
     and table_name in ('anamnesis_clarification_requests','anamnesis_clarification_responses')),
  2::bigint,
  'clarification tables exist'
);

insert into auth.users (id,email,raw_user_meta_data)
values
  ('ca000000-0000-4000-8000-000000000001','clar-admin@example.test','{}'),
  ('ca000000-0000-4000-8000-000000000002','clar-client@example.test','{}'),
  ('ca000000-0000-4000-8000-000000000003','clar-other@example.test','{}');

insert into public.profiles (id,display_name)
values
  ('ca000000-0000-4000-8000-000000000001','Clarification Admin'),
  ('ca000000-0000-4000-8000-000000000002','Clarification Client'),
  ('ca000000-0000-4000-8000-000000000003','Other Client');

insert into public.user_roles (profile_id,role)
values
  ('ca000000-0000-4000-8000-000000000001','admin'),
  ('ca000000-0000-4000-8000-000000000002','client'),
  ('ca000000-0000-4000-8000-000000000003','client');

insert into public.clients (id,profile_id)
values
  ('cb000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000002'),
  ('cb000000-0000-4000-8000-000000000002','ca000000-0000-4000-8000-000000000003');

insert into public.client_assignments (client_id,staff_profile_id)
values ('cb000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000001');

insert into public.anamnesis_forms (id,form_key)
values ('cc000000-0000-4000-8000-000000000001','clarification-test-form');
insert into public.anamnesis_form_versions (id,form_id,version_number,published_at)
values ('cd000000-0000-4000-8000-000000000001','cc000000-0000-4000-8000-000000000001',1,now());
insert into public.anamnesis_sections (id,form_version_id,section_key,title,display_order)
values ('ce000000-0000-4000-8000-000000000001','cd000000-0000-4000-8000-000000000001','main','Main',1);
insert into public.anamnesis_questions
  (id,form_version_id,section_id,question_key,label,display_order,answer_type,required)
values
  ('cf000000-0000-4000-8000-000000000001','cd000000-0000-4000-8000-000000000001','ce000000-0000-4000-8000-000000000001','q1','Question',1,'text',true);
insert into public.anamnesis_submissions (id,client_id,form_version_id)
values ('d0000000-0000-4000-8000-000000000001','cb000000-0000-4000-8000-000000000001','cd000000-0000-4000-8000-000000000001');
insert into public.anamnesis_answers
  (id,submission_id,form_version_id,question_id,answer_value)
values ('d1000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','cd000000-0000-4000-8000-000000000001','cf000000-0000-4000-8000-000000000001','"original"'::jsonb);
update public.anamnesis_submissions set submitted_at=now()
where id='d0000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);

insert into public.anamnesis_clarification_requests
  (id,submission_id,source_answer_id,requested_by_profile_id,request_text)
values
  ('d2000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000001','Pode detalhar melhor?');

select is((select count(*) from public.anamnesis_clarification_requests),1::bigint,'admin AAL2 creates request');

select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-000000000002","aal":"aal1","role":"authenticated"}',true);

select is((select count(*) from public.anamnesis_clarification_requests),1::bigint,'client reads own request');

insert into public.anamnesis_clarification_responses
  (id,clarification_request_id,responder_profile_id,response_text)
values
  ('d3000000-0000-4000-8000-000000000001','d2000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000002','Primeiro complemento.'),
  ('d3000000-0000-4000-8000-000000000002','d2000000-0000-4000-8000-000000000001','ca000000-0000-4000-8000-000000000002','Segundo complemento.');

select is((select count(*) from public.anamnesis_clarification_responses),2::bigint,'multiple complements preserved');
select is((select answer_value #>> '{}' from public.anamnesis_answers where id='d1000000-0000-4000-8000-000000000001'),'original','original answer unchanged');

select set_config('request.jwt.claim.sub','ca000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"ca000000-0000-4000-8000-000000000003","aal":"aal1","role":"authenticated"}',true);
select is((select count(*) from public.anamnesis_clarification_requests),0::bigint,'other client cannot read request');
select is((select count(*) from public.anamnesis_clarification_responses),0::bigint,'other client cannot read response');

reset role;

select throws_ok(
  $$update public.anamnesis_clarification_requests set request_text='mutated'
    where id='d2000000-0000-4000-8000-000000000001'$$,
  '55000','anamnesis clarifications are append-only','request update blocked'
);
select throws_ok(
  $$delete from public.anamnesis_clarification_responses
    where id='d3000000-0000-4000-8000-000000000001'$$,
  '55000','anamnesis clarifications are append-only','response delete blocked'
);

select is(
  (select count(*) from pg_policies where schemaname='public'
    and tablename in ('anamnesis_clarification_requests','anamnesis_clarification_responses')
    and policyname='admin_mfa_aal2_required' and permissive='RESTRICTIVE'),
  2::bigint,
  'clarification tables inherit admin MFA'
);

select is(
  (select count(*) from information_schema.role_table_grants
   where table_schema='public'
     and table_name in ('anamnesis_clarification_requests','anamnesis_clarification_responses')
     and grantee='authenticated'
     and privilege_type in ('UPDATE','DELETE')),
  0::bigint,
  'authenticated has no update/delete grants'
);

select * from finish();
rollback;
