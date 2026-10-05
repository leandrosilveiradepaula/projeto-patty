begin;

select plan(29);

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

reset role;

select is(
  public.generate_scheduled_weekly_feedback_requests(
    '2026-10-05 10:59:00+00'::timestamptz
  ),
  0,
  'generator does nothing before configured Monday 08:00 local time'
);

select is(
  public.generate_scheduled_weekly_feedback_requests(
    '2026-10-05 11:00:00+00'::timestamptz
  ),
  1,
  'generator creates one request at configured Monday 08:00 local time'
);

select is(
  (
    select period_start
    from public.client_weekly_feedbacks
    where client_id = 'e2000000-0000-0000-0000-000000000001'
      and request_source = 'schedule'
  ),
  date '2026-09-28',
  'scheduled feedback starts on Monday of the previous complete week'
);

select is(
  (
    select period_end
    from public.client_weekly_feedbacks
    where client_id = 'e2000000-0000-0000-0000-000000000001'
      and request_source = 'schedule'
  ),
  date '2026-10-04',
  'scheduled feedback ends on Sunday of the previous complete week'
);

select is(
  (
    select request_source
    from public.client_weekly_feedbacks
    where client_id = 'e2000000-0000-0000-0000-000000000001'
      and period_start = date '2026-09-28'
      and period_end = date '2026-10-04'
  ),
  'schedule'::text,
  'scheduled request records automation as its origin'
);

select is(
  (
    select requested_by_profile_id
    from public.client_weekly_feedbacks
    where client_id = 'e2000000-0000-0000-0000-000000000001'
      and period_start = date '2026-09-28'
      and period_end = date '2026-10-04'
  ),
  null::uuid,
  'scheduled request does not pretend to have a human requester'
);

select is(
  (
    select schedule_configuration_version_id
    from public.client_weekly_feedbacks
    where client_id = 'e2000000-0000-0000-0000-000000000001'
      and period_start = date '2026-09-28'
      and period_end = date '2026-10-04'
  ),
  (
    select v.id
    from public.method_configuration_versions v
    join public.method_configuration_templates t on t.id = v.template_id
    where t.template_key = 'weekly_feedback.schedule'
      and v.activated_at is not null
      and v.retired_at is null
  ),
  'scheduled request preserves the exact schedule configuration version used'
);

select is(
  public.generate_scheduled_weekly_feedback_requests(
    '2026-10-05 11:00:00+00'::timestamptz
  ),
  0,
  'generator is idempotent for the same client and weekly period'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.activate_client_notification_preference_version_server(uuid,text,text,uuid,uuid)',
    'EXECUTE'
  ),
  'authenticated cannot call the internal notification preference boundary'
);

select isnt(
  public.activate_client_notification_preference_version_server(
    'e2000000-0000-0000-0000-000000000001',
    'weekly_feedback',
    'in_app',
    null,
    'e1000000-0000-0000-0000-000000000001'
  ),
  null::uuid,
  'admin assignment can create the first in-app notification preference version'
);

select is(
  (
    select channel_key
    from public.client_notification_preference_versions
    where client_id = 'e2000000-0000-0000-0000-000000000001'
      and purpose_key = 'weekly_feedback'
      and retired_at is null
  ),
  'in_app'::text,
  'in-app preference is the active client-scoped version'
);

select is(
  public.generate_weekly_feedback_reminder_events(
    '2026-10-06 15:17:00+00'::timestamptz
  ),
  0,
  'weekly feedback reminder generator does nothing before configured Wednesday'
);

select is(
  public.generate_weekly_feedback_reminder_events(
    '2026-10-07 15:17:00+00'::timestamptz
  ),
  1,
  'weekly feedback reminder generator creates one event on configured Wednesday'
);

select is(
  (
    select delivery_state
    from public.client_notification_events
    where client_id = 'e2000000-0000-0000-0000-000000000001'
      and weekly_feedback_id = (
        select id
        from public.client_weekly_feedbacks
        where client_id = 'e2000000-0000-0000-0000-000000000001'
          and period_start = date '2026-09-28'
          and period_end = date '2026-10-04'
      )
  ),
  'delivered'::text,
  'in-app reminder is recorded as delivered/available in the application'
);

select is(
  (
    select channel_key
    from public.client_notification_events
    where client_id = 'e2000000-0000-0000-0000-000000000001'
      and weekly_feedback_id = (
        select id
        from public.client_weekly_feedbacks
        where client_id = 'e2000000-0000-0000-0000-000000000001'
          and period_start = date '2026-09-28'
          and period_end = date '2026-10-04'
      )
  ),
  'in_app'::text,
  'in-app reminder preserves the selected preference channel'
);

select is(
  public.generate_weekly_feedback_reminder_events(
    '2026-10-07 18:00:00+00'::timestamptz
  ),
  0,
  'weekly feedback reminder generation is idempotent within the weekly feedback'
);

insert into public.client_registration (client_id, contact_email)
values (
  'e2000000-0000-0000-0000-000000000001',
  'weekly-client-contact@example.test'
);

select isnt(
  public.activate_client_notification_preference_version_server(
    'e2000000-0000-0000-0000-000000000001',
    'weekly_feedback',
    'email',
    (
      select id
      from public.client_notification_preference_versions
      where client_id = 'e2000000-0000-0000-0000-000000000001'
        and purpose_key = 'weekly_feedback'
        and retired_at is null
    ),
    'e1000000-0000-0000-0000-000000000001'
  ),
  null::uuid,
  'admin assignment can version the client preference from in-app to email'
);

select is(
  (
    select version_number
    from public.client_notification_preference_versions
    where client_id = 'e2000000-0000-0000-0000-000000000001'
      and purpose_key = 'weekly_feedback'
      and retired_at is null
  ),
  2,
  'email preference becomes version 2'
);

select is(
  (
    select count(*)
    from public.client_notification_preference_versions
    where client_id = 'e2000000-0000-0000-0000-000000000001'
      and purpose_key = 'weekly_feedback'
      and retired_at is not null
  ),
  1::bigint,
  'previous in-app preference version remains preserved as retired history'
);

select is(
  public.generate_scheduled_weekly_feedback_requests(
    '2026-10-19 11:00:00+00'::timestamptz
  ),
  1,
  'later Monday generation creates a new scheduled weekly feedback'
);

select is(
  public.generate_weekly_feedback_reminder_events(
    '2026-10-21 15:17:00+00'::timestamptz
  ),
  1,
  'later Wednesday creates the reminder event for the later scheduled period'
);

select is(
  (
    select delivery_state
    from public.client_notification_events
    where client_id = 'e2000000-0000-0000-0000-000000000001'
      and weekly_feedback_id = (
        select id
        from public.client_weekly_feedbacks
        where client_id = 'e2000000-0000-0000-0000-000000000001'
          and period_start = date '2026-10-12'
          and period_end = date '2026-10-18'
      )
  ),
  'blocked_provider'::text,
  'email reminder is not falsely marked delivered while provider is not configured'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'e1000000-0000-0000-0000-000000000002',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"e1000000-0000-0000-0000-000000000002","aal":"aal1","role":"authenticated"}',
  true
);

select is(
  (
    select count(*)
    from public.client_notification_events
    where client_id = 'e2000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'client RLS exposes delivered in-app reminder but not blocked external delivery events'
);

reset role;

select throws_ok(
  $sql$
    update public.client_notification_events
    set blocked_reason = 'rewritten'
    where client_id = 'e2000000-0000-0000-0000-000000000001'
  $sql$,
  '55000',
  'notification event history is append-only',
  'notification event history cannot be rewritten'
);

select * from finish();
rollback;
