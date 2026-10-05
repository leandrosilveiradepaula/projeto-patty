begin;

select plan(5);

select is(
  (
    select v.configuration
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'weekly_feedback.schedule'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  '{
    "request_weekday": 1,
    "request_time_local": "08:00",
    "reminder_weekday": 3,
    "timezone": "America/Sao_Paulo"
  }'::jsonb,
  'weekly feedback schedule baseline is versioned as Monday 08:00 with Wednesday reminder'
);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('e1000000-0000-0000-0000-000000000001', 'weekly-admin@example.test', '{}'),
  ('e1000000-0000-0000-0000-000000000002', 'weekly-client@example.test', '{}');

insert into public.profiles (id, display_name)
values
  ('e1000000-0000-0000-0000-000000000001', 'Weekly Admin'),
  ('e1000000-0000-0000-0000-000000000002', 'Weekly Client');

insert into public.user_roles (profile_id, role)
values
  ('e1000000-0000-0000-0000-000000000001', 'admin'),
  ('e1000000-0000-0000-0000-000000000002', 'client');

insert into public.clients (id, profile_id)
values (
  'e2000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000002'
);

insert into public.client_assignments (client_id, staff_profile_id)
values (
  'e2000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'e1000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select throws_ok(
  $sql$
    insert into public.client_weekly_feedbacks (
      client_id,
      form_version_id,
      period_start,
      period_end,
      requested_by_profile_id
    )
    values (
      'e2000000-0000-0000-0000-000000000001',
      (select id from public.weekly_feedback_form_versions where version_number = 1),
      date '2026-10-05',
      date '2026-10-11',
      'e1000000-0000-0000-0000-000000000001'
    )
  $sql$,
  '42501',
  null,
  'weekly feedback cannot be created before the first protocol publication'
);

reset role;

insert into public.protocols (id, client_id)
values (
  'e3000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001'
);

insert into public.protocol_versions (
  id,
  protocol_id,
  client_id,
  version_number,
  created_by_profile_id,
  submitted_for_review_at
)
values (
  'e4000000-0000-0000-0000-000000000001',
  'e3000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001',
  1,
  'e1000000-0000-0000-0000-000000000001',
  now()
);

insert into public.protocol_version_approvals (
  id,
  protocol_version_id,
  client_id,
  approved_by_profile_id
)
values (
  'e5000000-0000-0000-0000-000000000001',
  'e4000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001'
);

insert into public.protocol_publications (
  protocol_version_id,
  client_id,
  approval_id,
  published_by_profile_id
)
values (
  'e4000000-0000-0000-0000-000000000001',
  'e2000000-0000-0000-0000-000000000001',
  'e5000000-0000-0000-0000-000000000001',
  'e1000000-0000-0000-0000-000000000001'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'e1000000-0000-0000-0000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-0000-0000-000000000001","aal":"aal2","role":"authenticated"}',
  true
);

select lives_ok(
  $sql$
    insert into public.client_weekly_feedbacks (
      client_id,
      form_version_id,
      period_start,
      period_end,
      requested_by_profile_id
    )
    values (
      'e2000000-0000-0000-0000-000000000001',
      (select id from public.weekly_feedback_form_versions where version_number = 1),
      date '2026-10-05',
      date '2026-10-11',
      'e1000000-0000-0000-0000-000000000001'
    )
  $sql$,
  'weekly feedback can be created after the first protocol publication'
);

select is(
  (
    select count(*)
    from public.client_weekly_feedbacks
    where client_id = 'e2000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'only the post-publication weekly feedback request exists'
);

select is(
  (
    select count(*)
    from public.protocol_publications
    where client_id = 'e2000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'eligibility uses the existing protocol publication event'
);

select * from finish();
rollback;
