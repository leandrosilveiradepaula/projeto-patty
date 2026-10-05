create or replace function public.claim_weekly_feedback_email_deliveries_server(
  p_limit integer default 10,
  p_now timestamptz default now()
)
returns table (
  attempt_id uuid,
  notification_event_id uuid,
  client_id uuid,
  weekly_feedback_id uuid,
  recipient_email text,
  period_start date,
  period_end date
)
language plpgsql
security invoker
set search_path = pg_catalog
as $$
#variable_conflict use_column
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'email delivery claim limit must be between 1 and 100'
      using errcode = '22023';
  end if;

  with expired as (
    update public.client_notification_delivery_attempts a
    set
      status = 'failed',
      completed_at = p_now,
      failure_code = 'lease_expired',
      failure_message = 'Delivery worker lease expired before completion'
    where a.status = 'started'
      and a.lease_expires_at <= p_now
    returning
      a.id,
      a.notification_event_id,
      a.client_id,
      a.weekly_feedback_id
  )
  insert into public.client_notification_events (
    client_id,
    weekly_feedback_id,
    event_key,
    channel_key,
    preference_version_id,
    schedule_configuration_version_id,
    delivery_state,
    blocked_reason,
    delivered_at,
    created_at
  )
  select
    expired.client_id,
    expired.weekly_feedback_id,
    'weekly_feedback_email_delivery_failed:' || expired.id::text,
    'email',
    source.preference_version_id,
    source.schedule_configuration_version_id,
    'delivery_failed',
    'lease_expired',
    null,
    p_now
  from expired
  join public.client_notification_events source
    on source.id = expired.notification_event_id
  on conflict on constraint client_notification_events_weekly_event_unique
  do nothing;

  return query
  with candidates as (
    select
      e.id as notification_event_id,
      e.client_id,
      e.weekly_feedback_id,
      reg.contact_email,
      wf.period_start,
      wf.period_end,
      coalesce((
        select max(a.attempt_number)
        from public.client_notification_delivery_attempts a
        where a.notification_event_id = e.id
      ), 0) + 1 as next_attempt_number
    from public.client_notification_events e
    join public.client_weekly_feedbacks wf
      on wf.id = e.weekly_feedback_id
    join public.client_registration reg
      on reg.client_id = e.client_id
    join public.method_configuration_versions schedule_version
      on schedule_version.id = e.schedule_configuration_version_id
    where e.event_key like 'weekly_feedback_reminder:%'
      and e.channel_key = 'email'
      and e.delivery_state in ('queued_external', 'blocked_provider')
      and wf.submitted_at is null
      and nullif(trim(reg.contact_email), '') is not null
      and extract(
        isodow from p_now at time zone (schedule_version.configuration ->> 'timezone')
      )::integer = (schedule_version.configuration ->> 'reminder_weekday')::integer
      and exists (
        select 1
        from public.client_assignments ca
        where ca.client_id = e.client_id
          and ca.ended_at is null
      )
      and not exists (
        select 1
        from public.client_notification_events delivered
        where delivered.weekly_feedback_id = e.weekly_feedback_id
          and delivered.channel_key = 'email'
          and delivered.delivery_state = 'delivered'
          and delivered.event_key like 'weekly_feedback_email_delivery:%'
      )
      and not exists (
        select 1
        from public.client_notification_delivery_attempts active_attempt
        where active_attempt.notification_event_id = e.id
          and active_attempt.status = 'started'
      )
      and (
        select count(*)
        from public.client_notification_delivery_attempts previous_attempt
        where previous_attempt.notification_event_id = e.id
      ) < 3
    order by e.created_at, e.id
    for update of e skip locked
    limit p_limit
  ),
  inserted as (
    insert into public.client_notification_delivery_attempts (
      notification_event_id,
      client_id,
      weekly_feedback_id,
      channel_key,
      provider_key,
      attempt_number,
      status,
      started_at,
      lease_expires_at
    )
    select
      candidate.notification_event_id,
      candidate.client_id,
      candidate.weekly_feedback_id,
      'email',
      'gmail_smtp',
      candidate.next_attempt_number,
      'started',
      p_now,
      p_now + interval '10 minutes'
    from candidates candidate
    returning
      id,
      notification_event_id,
      client_id,
      weekly_feedback_id
  )
  select
    inserted.id,
    inserted.notification_event_id,
    inserted.client_id,
    inserted.weekly_feedback_id,
    candidate.contact_email,
    candidate.period_start,
    candidate.period_end
  from inserted
  join candidates candidate
    on candidate.notification_event_id = inserted.notification_event_id;
end
$$;
