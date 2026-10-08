begin;

select plan(16);

insert into auth.users (id,email,raw_user_meta_data)
values
  ('fa000000-0000-4000-8000-000000000001','ai-admin@example.test','{}'),
  ('fa000000-0000-4000-8000-000000000002','ai-client@example.test','{}');

insert into public.profiles (id,display_name)
values
  ('fa000000-0000-4000-8000-000000000001','AI Admin'),
  ('fa000000-0000-4000-8000-000000000002','AI Client');

insert into public.user_roles (profile_id,role)
values
  ('fa000000-0000-4000-8000-000000000001','admin'),
  ('fa000000-0000-4000-8000-000000000002','client');

insert into public.clients (id,profile_id)
values ('fb000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000002');

insert into public.client_assignments (client_id,staff_profile_id)
values ('fb000000-0000-4000-8000-000000000001','fa000000-0000-4000-8000-000000000001');

insert into public.anamnesis_forms (id,form_key)
values ('fc000000-0000-4000-8000-000000000001','ai-boundary-test');

insert into public.anamnesis_form_versions (id,form_id,version_number,published_at)
values ('fd000000-0000-4000-8000-000000000001','fc000000-0000-4000-8000-000000000001',1,now());

insert into public.anamnesis_sections (id,form_version_id,section_key,title,display_order)
values ('fe000000-0000-4000-8000-000000000001','fd000000-0000-4000-8000-000000000001','main','Main',1);

insert into public.anamnesis_questions
  (id,form_version_id,section_id,question_key,label,display_order,answer_type,required)
values
  ('ff000000-0000-4000-8000-000000000001','fd000000-0000-4000-8000-000000000001','fe000000-0000-4000-8000-000000000001','q1','Question 1',1,'text',false),
  ('ff000000-0000-4000-8000-000000000002','fd000000-0000-4000-8000-000000000001','fe000000-0000-4000-8000-000000000001','q2','Question 2',2,'text',false);

insert into public.anamnesis_submissions (id,client_id,form_version_id)
values ('e0000000-0000-4000-8000-000000000001','fb000000-0000-4000-8000-000000000001','fd000000-0000-4000-8000-000000000001');

insert into public.anamnesis_answers
  (id,submission_id,form_version_id,question_id,answer_value)
values ('e1000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001','fd000000-0000-4000-8000-000000000001','ff000000-0000-4000-8000-000000000001','"a1"'::jsonb);

update public.anamnesis_submissions
set submitted_at=now()
where id='e0000000-0000-4000-8000-000000000001';

insert into public.anamnesis_submissions (id,client_id,form_version_id)
values ('e0000000-0000-4000-8000-000000000002','fb000000-0000-4000-8000-000000000001','fd000000-0000-4000-8000-000000000001');

insert into public.anamnesis_answers
  (id,submission_id,form_version_id,question_id,answer_value)
values ('e1000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000002','fd000000-0000-4000-8000-000000000001','ff000000-0000-4000-8000-000000000002','"a2"'::jsonb);

update public.anamnesis_submissions
set submitted_at=now()
where id='e0000000-0000-4000-8000-000000000002';

insert into public.ai_prompt_versions
  (id,prompt_key,version_number,content,created_by_profile_id)
values
  ('e2000000-0000-4000-8000-000000000001','anamnesis_review',1,'{}'::jsonb,'fa000000-0000-4000-8000-000000000001'),
  ('e2000000-0000-4000-8000-000000000002','other_purpose',1,'{}'::jsonb,'fa000000-0000-4000-8000-000000000001');

select throws_ok(
  $$select public.start_anamnesis_review_execution(
    'fb000000-0000-4000-8000-000000000001',
    'e0000000-0000-4000-8000-000000000001',
    'e2000000-0000-4000-8000-000000000002',
    'fa000000-0000-4000-8000-000000000001',
    'provider-test',
    'model-test',
    array['e1000000-0000-4000-8000-000000000001']::uuid[]
  )$$,
  '23514',
  'anamnesis_review requires an anamnesis_review prompt version',
  'wrong prompt key is rejected'
);

create temp table ai_boundary_ids (key text primary key, value uuid);

insert into ai_boundary_ids
select 'completed', public.start_anamnesis_review_execution(
  'fb000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'fa000000-0000-4000-8000-000000000001',
  'provider-test',
  'model-test',
  array['e1000000-0000-4000-8000-000000000001']::uuid[]
);

select is(
  (select anamnesis_submission_id
   from public.ai_executions
   where id=(select value from ai_boundary_ids where key='completed')),
  'e0000000-0000-4000-8000-000000000001'::uuid,
  'execution is bound to selected submission'
);

select throws_ok(
  format(
    $$insert into public.ai_execution_sources
      (execution_id,client_id,source_kind,anamnesis_answer_id,anamnesis_submission_id)
      values (%L,'fb000000-0000-4000-8000-000000000001','anamnesis_answer',
        'e1000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000002')$$,
    (select value from ai_boundary_ids where key='completed')
  ),
  '23514',
  'anamnesis_review sources must belong to the selected submission',
  'cross-submission source is rejected'
);

select public.complete_ai_execution(
  (select value from ai_boundary_ids where key='completed'),
  '{"findings":[]}'::jsonb
);

set constraints all immediate;
set constraints all deferred;

select is(
  (select status from public.ai_executions
   where id=(select value from ai_boundary_ids where key='completed')),
  'completed',
  'completion transitions execution atomically'
);

select is(
  (select content from public.ai_execution_outputs
   where execution_id=(select value from ai_boundary_ids where key='completed')),
  '{"findings":[]}'::jsonb,
  'completion persists exactly one output'
);

select throws_ok(
  format(
    $$insert into public.ai_execution_sources
      (execution_id,client_id,source_kind,anamnesis_answer_id,anamnesis_submission_id)
      values (%L,'fb000000-0000-4000-8000-000000000001','anamnesis_answer',
        'e1000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000001')$$,
    (select value from ai_boundary_ids where key='completed')
  ),
  '55000',
  'AI execution sources can only be added while execution is started',
  'sources freeze after terminal transition'
);

insert into ai_boundary_ids
select 'failed-request', public.start_anamnesis_review_execution(
  'fb000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'fa000000-0000-4000-8000-000000000001',
  'provider-test',
  'model-test',
  array['e1000000-0000-4000-8000-000000000001']::uuid[]
);

select public.fail_ai_execution(
  (select value from ai_boundary_ids where key='failed-request'),
  'provider_request',
  'provider_request_failed',
  'sanitized failure',
  null,
  null,
  null
);

set constraints all immediate;
set constraints all deferred;

select is(
  (select failure_code from public.ai_executions
   where id=(select value from ai_boundary_ids where key='failed-request')),
  'provider_request_failed',
  'provider request failure persists without raw response'
);

insert into ai_boundary_ids
select 'failed-parse', public.start_anamnesis_review_execution(
  'fb000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'fa000000-0000-4000-8000-000000000001',
  'provider-test',
  'model-test',
  array['e1000000-0000-4000-8000-000000000001']::uuid[]
);

select public.fail_ai_execution(
  (select value from ai_boundary_ids where key='failed-parse'),
  'output_parse',
  'invalid_json',
  'invalid provider response',
  '{not-json',
  'text',
  statement_timestamp()
);

set constraints all immediate;
set constraints all deferred;

select is(
  (select content from public.ai_execution_failure_responses
   where execution_id=(select value from ai_boundary_ids where key='failed-parse')),
  '{not-json',
  'provider response is preserved for received-response failures'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.start_anamnesis_review_execution(uuid,uuid,uuid,uuid,text,text,uuid[])',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.complete_ai_execution(uuid,jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'public.fail_ai_execution(uuid,text,text,text,text,text,timestamptz)',
    'EXECUTE'
  ),
  'authenticated cannot call internal AI persistence RPCs'
);

select is(
  (select count(*)
   from pg_proc p
   join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public'
     and p.proname in (
       'start_anamnesis_review_execution',
       'complete_ai_execution',
       'fail_ai_execution'
     )
     and p.prosecdef),
  0::bigint,
  'internal AI RPCs are SECURITY INVOKER'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public'
      and t.relname='ai_execution_failure_responses'
      and c.conname='ai_execution_failure_responses_content_size_check'
      and pg_get_constraintdef(c.oid) ilike '%octet_length(content) <= 131072%'
  ),
  'failure response raw content has a 128 KiB database check constraint'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where n.nspname='public'
      and t.relname='ai_executions'
      and c.conname='ai_executions_failure_message_size_check'
      and pg_get_constraintdef(c.oid) ilike '%char_length(failure_message) <= 1024%'
  ),
  'failure message has a 1024-character database check constraint'
);


insert into ai_boundary_ids
select 'recoverable', public.start_anamnesis_review_execution(
  'fb000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000001',
  'e2000000-0000-4000-8000-000000000001',
  'fa000000-0000-4000-8000-000000000001',
  'provider-test',
  'model-test',
  array['e1000000-0000-4000-8000-000000000001']::uuid[]
);

select public.recover_started_ai_execution(
  (select value from ai_boundary_ids where key='recoverable'),
  'fa000000-0000-4000-8000-000000000001',
  'manual recovery after interrupted request'
);

set constraints all immediate;
set constraints all deferred;

select is(
  (select status from public.ai_executions
   where id=(select value from ai_boundary_ids where key='recoverable')),
  'failed',
  'manual recovery moves only a started execution to failed'
);

select is(
  (select failure_code from public.ai_executions
   where id=(select value from ai_boundary_ids where key='recoverable')),
  'manual_recovery',
  'manual recovery remains distinguishable from provider failures'
);

select is(
  (select failure_message from public.ai_executions
   where id=(select value from ai_boundary_ids where key='recoverable')),
  'manual recovery after interrupted request',
  'manual recovery preserves the human reason'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.recover_started_ai_execution(uuid,uuid,text)',
    'EXECUTE'
  ),
  'authenticated cannot call internal AI recovery RPC directly'
);

select * from finish();
rollback;
