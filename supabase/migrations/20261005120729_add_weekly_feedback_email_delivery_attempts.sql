alter table public.client_notification_events
  drop constraint client_notification_events_delivery_state_check;

alter table public.client_notification_events
  add constraint client_notification_events_delivery_state_check
  check (
    delivery_state in (
      'delivered',
      'queued_external',
      'delivery_failed',
      'blocked_no_channel',
      'blocked_missing_contact',
      'blocked_provider'
    )
  );

create table public.client_notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_event_id uuid not null references public.client_notification_events(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  weekly_feedback_id uuid not null references public.client_weekly_feedbacks(id) on delete restrict,
  channel_key text not null check (channel_key = 'email'),
  provider_key text not null check (provider_key = 'gmail_smtp'),
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('started', 'delivered', 'failed')),
  started_at timestamptz not null default now(),
  lease_expires_at timestamptz not null,
  completed_at timestamptz,
  provider_message_id text,
  failure_code text,
  failure_message text,
  constraint client_notification_delivery_attempts_number_unique unique (notification_event_id, attempt_number),
  constraint client_notification_delivery_attempts_status_consistent check (
    (status = 'started' and completed_at is null and provider_message_id is null and failure_code is null and failure_message is null)
    or
    (status = 'delivered' and completed_at is not null and provider_message_id is not null and failure_code is null and failure_message is null)
    or
    (status = 'failed' and completed_at is not null and provider_message_id is null and failure_code is not null)
  ),
  constraint client_notification_delivery_attempts_provider_message_id_length check (provider_message_id is null or char_length(provider_message_id) <= 255),
  constraint client_notification_delivery_attempts_failure_code_length check (failure_code is null or char_length(failure_code) between 1 and 80),
  constraint client_notification_delivery_attempts_failure_message_length check (failure_message is null or char_length(failure_message) <= 500)
);

create unique index client_notification_delivery_attempts_one_started
  on public.client_notification_delivery_attempts (notification_event_id)
  where status = 'started';

create index client_notification_delivery_attempts_client_started_idx
  on public.client_notification_delivery_attempts (client_id, started_at desc);

alter table public.client_notification_delivery_attempts enable row level security;

create policy client_notification_delivery_attempts_select_active_assignment_admin
  on public.client_notification_delivery_attempts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_notification_delivery_attempts.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy admin_mfa_aal2_required
  on public.client_notification_delivery_attempts
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

grant select on public.client_notification_delivery_attempts to authenticated;
grant select, insert, update on public.client_notification_delivery_attempts to service_role;

create function public.enforce_client_notification_delivery_attempt_transition()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'notification delivery attempt history cannot be deleted'
      using errcode = '55000';
  end if;

  if old.status <> 'started' then
    raise exception 'terminal notification delivery attempt cannot be changed'
      using errcode = '55000';
  end if;

  if new.id is distinct from old.id
     or new.notification_event_id is distinct from old.notification_event_id
     or new.client_id is distinct from old.client_id
     or new.weekly_feedback_id is distinct from old.weekly_feedback_id
     or new.channel_key is distinct from old.channel_key
     or new.provider_key is distinct from old.provider_key
     or new.attempt_number is distinct from old.attempt_number
     or new.started_at is distinct from old.started_at
     or new.lease_expires_at is distinct from old.lease_expires_at then
    raise exception 'notification delivery attempt identity is immutable'
      using errcode = '55000';
  end if;

  if new.status not in ('delivered', 'failed') then
    raise exception 'notification delivery attempt must transition to a terminal state'
      using errcode = '55000';
  end if;

  return new;
end
$$;

create trigger client_notification_delivery_attempts_transition_guard
before update or delete on public.client_notification_delivery_attempts
for each row
execute function public.enforce_client_notification_delivery_attempt_transition();

create or replace function public.generate_weekly_feedback_reminder_events(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_schedule_version_id uuid;
  v_reminder_weekday integer;
  v_timezone text;
  v_local_timestamp timestamp without time zone;
  v_local_week_start date;
  v_period_start date;
  v_period_end date;
  v_inserted integer := 0;
begin
  select v.id, (v.configuration ->> 'reminder_weekday')::integer, v.configuration ->> 'timezone'
  into v_schedule_version_id, v_reminder_weekday, v_timezone
  from public.method_configuration_templates t
  join public.method_configuration_versions v
    on v.template_id = t.id
   and v.activated_at is not null
   and v.retired_at is null
  where t.template_key = 'weekly_feedback.schedule'
    and t.config_schema_key = 'weekly_feedback_schedule_v1';

  if v_schedule_version_id is null then
    raise exception 'active weekly feedback schedule configuration not found' using errcode = 'P0001';
  end if;

  if v_reminder_weekday not between 1 and 7 then
    raise exception 'weekly feedback reminder_weekday is invalid' using errcode = '22023';
  end if;

  if v_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = v_timezone) then
    raise exception 'weekly feedback timezone is invalid' using errcode = '22023';
  end if;

  v_local_timestamp := p_now at time zone v_timezone;

  if extract(isodow from v_local_timestamp)::integer <> v_reminder_weekday then
    return 0;
  end if;

  v_local_week_start := date_trunc('week', v_local_timestamp)::date;
  v_period_start := v_local_week_start - 7;
  v_period_end := v_local_week_start - 1;

  insert into public.client_notification_events (
    client_id, weekly_feedback_id, event_key, channel_key, preference_version_id,
    schedule_configuration_version_id, delivery_state, blocked_reason, delivered_at, created_at
  )
  select
    wf.client_id,
    wf.id,
    'weekly_feedback_reminder:' || coalesce(pref.id::text, 'none'),
    pref.channel_key,
    pref.id,
    v_schedule_version_id,
    case
      when pref.id is null then 'blocked_no_channel'
      when pref.channel_key = 'in_app' then 'delivered'
      when pref.channel_key = 'email' and nullif(trim(reg.contact_email), '') is null then 'blocked_missing_contact'
      when pref.channel_key = 'email' then 'queued_external'
      when pref.channel_key = 'whatsapp' and nullif(trim(reg.phone), '') is null then 'blocked_missing_contact'
      else 'blocked_provider'
    end,
    case
      when pref.id is null then 'channel_not_configured'
      when pref.channel_key = 'in_app' then null
      when pref.channel_key = 'email' and nullif(trim(reg.contact_email), '') is null then 'contact_email_missing'
      when pref.channel_key = 'email' then 'awaiting_external_delivery'
      when pref.channel_key = 'whatsapp' and nullif(trim(reg.phone), '') is null then 'phone_missing'
      else 'external_provider_not_configured'
    end,
    case when pref.channel_key = 'in_app' then p_now else null end,
    p_now
  from public.client_weekly_feedbacks wf
  left join lateral (
    select pv.id, pv.channel_key
    from public.client_notification_preference_versions pv
    where pv.client_id = wf.client_id
      and pv.purpose_key = 'weekly_feedback'
      and pv.retired_at is null
    limit 1
  ) pref on true
  left join public.client_registration reg on reg.client_id = wf.client_id
  where wf.request_source = 'schedule'
    and wf.submitted_at is null
    and wf.period_start = v_period_start
    and wf.period_end = v_period_end
    and not exists (
      select 1 from public.client_notification_events delivered
      where delivered.weekly_feedback_id = wf.id
        and delivered.delivery_state = 'delivered'
        and (
          delivered.event_key like 'weekly_feedback_reminder:%'
          or delivered.event_key like 'weekly_feedback_email_delivery:%'
        )
    )
  on conflict (weekly_feedback_id, event_key) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end
$$;

create function public.claim_weekly_feedback_email_deliveries_server(
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
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'email delivery claim limit must be between 1 and 100' using errcode = '22023';
  end if;

  with expired as (
    update public.client_notification_delivery_attempts a
    set status = 'failed',
        completed_at = p_now,
        failure_code = 'lease_expired',
        failure_message = 'Delivery worker lease expired before completion'
    where a.status = 'started' and a.lease_expires_at <= p_now
    returning a.id, a.notification_event_id, a.client_id, a.weekly_feedback_id
  )
  insert into public.client_notification_events (
    client_id, weekly_feedback_id, event_key, channel_key, preference_version_id,
    schedule_configuration_version_id, delivery_state, blocked_reason, delivered_at, created_at
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
  join public.client_notification_events source on source.id = expired.notification_event_id
  on conflict (weekly_feedback_id, event_key) do nothing;

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
    join public.client_weekly_feedbacks wf on wf.id = e.weekly_feedback_id
    join public.client_registration reg on reg.client_id = e.client_id
    join public.method_configuration_versions schedule_version on schedule_version.id = e.schedule_configuration_version_id
    where e.event_key like 'weekly_feedback_reminder:%'
      and e.channel_key = 'email'
      and e.delivery_state in ('queued_external', 'blocked_provider')
      and wf.submitted_at is null
      and nullif(trim(reg.contact_email), '') is not null
      and extract(isodow from p_now at time zone (schedule_version.configuration ->> 'timezone'))::integer
        = (schedule_version.configuration ->> 'reminder_weekday')::integer
      and exists (
        select 1 from public.client_assignments ca
        where ca.client_id = e.client_id and ca.ended_at is null
      )
      and not exists (
        select 1 from public.client_notification_events delivered
        where delivered.weekly_feedback_id = e.weekly_feedback_id
          and delivered.channel_key = 'email'
          and delivered.delivery_state = 'delivered'
          and delivered.event_key like 'weekly_feedback_email_delivery:%'
      )
      and not exists (
        select 1 from public.client_notification_delivery_attempts active_attempt
        where active_attempt.notification_event_id = e.id and active_attempt.status = 'started'
      )
      and (
        select count(*) from public.client_notification_delivery_attempts previous_attempt
        where previous_attempt.notification_event_id = e.id
      ) < 3
    order by e.created_at, e.id
    for update of e skip locked
    limit p_limit
  ),
  inserted as (
    insert into public.client_notification_delivery_attempts (
      notification_event_id, client_id, weekly_feedback_id, channel_key, provider_key,
      attempt_number, status, started_at, lease_expires_at
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
    returning id, notification_event_id, client_id, weekly_feedback_id
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
  join candidates candidate on candidate.notification_event_id = inserted.notification_event_id;
end
$$;

create function public.complete_weekly_feedback_email_delivery_server(
  p_attempt_id uuid,
  p_provider_message_id text,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_attempt public.client_notification_delivery_attempts%rowtype;
  v_source public.client_notification_events%rowtype;
  v_event_id uuid;
begin
  if p_provider_message_id is null or char_length(trim(p_provider_message_id)) = 0 or char_length(p_provider_message_id) > 255 then
    raise exception 'provider message id is required and must be at most 255 characters' using errcode = '22023';
  end if;

  select * into v_attempt
  from public.client_notification_delivery_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'notification delivery attempt not found' using errcode = '22023';
  end if;

  if v_attempt.status = 'delivered' then
    select id into v_event_id
    from public.client_notification_events
    where weekly_feedback_id = v_attempt.weekly_feedback_id
      and event_key = 'weekly_feedback_email_delivery:' || v_attempt.id::text;
    return v_event_id;
  end if;

  if v_attempt.status <> 'started' then
    raise exception 'notification delivery attempt is already terminal' using errcode = '55000';
  end if;

  select * into v_source from public.client_notification_events where id = v_attempt.notification_event_id;

  update public.client_notification_delivery_attempts
  set status = 'delivered', completed_at = p_now, provider_message_id = trim(p_provider_message_id)
  where id = p_attempt_id;

  insert into public.client_notification_events (
    client_id, weekly_feedback_id, event_key, channel_key, preference_version_id,
    schedule_configuration_version_id, delivery_state, blocked_reason, delivered_at, created_at
  )
  values (
    v_attempt.client_id,
    v_attempt.weekly_feedback_id,
    'weekly_feedback_email_delivery:' || v_attempt.id::text,
    'email',
    v_source.preference_version_id,
    v_source.schedule_configuration_version_id,
    'delivered',
    null,
    p_now,
    p_now
  )
  on conflict (weekly_feedback_id, event_key) do update set event_key = excluded.event_key
  returning id into v_event_id;

  return v_event_id;
end
$$;

create function public.fail_weekly_feedback_email_delivery_server(
  p_attempt_id uuid,
  p_failure_code text,
  p_failure_message text default null,
  p_now timestamptz default now()
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_attempt public.client_notification_delivery_attempts%rowtype;
  v_source public.client_notification_events%rowtype;
  v_event_id uuid;
begin
  if p_failure_code is null or char_length(trim(p_failure_code)) = 0 or char_length(p_failure_code) > 80 then
    raise exception 'failure code is required and must be at most 80 characters' using errcode = '22023';
  end if;

  if p_failure_message is not null and char_length(p_failure_message) > 500 then
    raise exception 'failure message must be at most 500 characters' using errcode = '22023';
  end if;

  select * into v_attempt
  from public.client_notification_delivery_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'notification delivery attempt not found' using errcode = '22023';
  end if;

  if v_attempt.status = 'failed' then
    select id into v_event_id
    from public.client_notification_events
    where weekly_feedback_id = v_attempt.weekly_feedback_id
      and event_key = 'weekly_feedback_email_delivery_failed:' || v_attempt.id::text;
    return v_event_id;
  end if;

  if v_attempt.status <> 'started' then
    raise exception 'notification delivery attempt is already terminal' using errcode = '55000';
  end if;

  select * into v_source from public.client_notification_events where id = v_attempt.notification_event_id;

  update public.client_notification_delivery_attempts
  set status = 'failed',
      completed_at = p_now,
      failure_code = trim(p_failure_code),
      failure_message = p_failure_message
  where id = p_attempt_id;

  insert into public.client_notification_events (
    client_id, weekly_feedback_id, event_key, channel_key, preference_version_id,
    schedule_configuration_version_id, delivery_state, blocked_reason, delivered_at, created_at
  )
  values (
    v_attempt.client_id,
    v_attempt.weekly_feedback_id,
    'weekly_feedback_email_delivery_failed:' || v_attempt.id::text,
    'email',
    v_source.preference_version_id,
    v_source.schedule_configuration_version_id,
    'delivery_failed',
    trim(p_failure_code),
    null,
    p_now
  )
  on conflict (weekly_feedback_id, event_key) do update set event_key = excluded.event_key
  returning id into v_event_id;

  return v_event_id;
end
$$;

revoke all on function public.claim_weekly_feedback_email_deliveries_server(integer,timestamptz)
  from public, anon, authenticated;
revoke all on function public.complete_weekly_feedback_email_delivery_server(uuid,text,timestamptz)
  from public, anon, authenticated;
revoke all on function public.fail_weekly_feedback_email_delivery_server(uuid,text,text,timestamptz)
  from public, anon, authenticated;

grant execute on function public.claim_weekly_feedback_email_deliveries_server(integer,timestamptz) to service_role;
grant execute on function public.complete_weekly_feedback_email_delivery_server(uuid,text,timestamptz) to service_role;
grant execute on function public.fail_weekly_feedback_email_delivery_server(uuid,text,text,timestamptz) to service_role;
