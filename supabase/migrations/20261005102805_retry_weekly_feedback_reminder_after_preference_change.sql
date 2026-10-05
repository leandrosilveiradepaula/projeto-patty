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
  select
    v.id,
    (v.configuration ->> 'reminder_weekday')::integer,
    v.configuration ->> 'timezone'
  into
    v_schedule_version_id,
    v_reminder_weekday,
    v_timezone
  from public.method_configuration_templates t
  join public.method_configuration_versions v
    on v.template_id = t.id
   and v.activated_at is not null
   and v.retired_at is null
  where t.template_key = 'weekly_feedback.schedule'
    and t.config_schema_key = 'weekly_feedback_schedule_v1';

  if v_schedule_version_id is null then
    raise exception 'active weekly feedback schedule configuration not found'
      using errcode = 'P0001';
  end if;

  if v_reminder_weekday not between 1 and 7 then
    raise exception 'weekly feedback reminder_weekday is invalid'
      using errcode = '22023';
  end if;

  if v_timezone is null
     or not exists (
       select 1
       from pg_catalog.pg_timezone_names
       where name = v_timezone
     ) then
    raise exception 'weekly feedback timezone is invalid'
      using errcode = '22023';
  end if;

  v_local_timestamp := p_now at time zone v_timezone;

  if extract(isodow from v_local_timestamp)::integer <> v_reminder_weekday then
    return 0;
  end if;

  v_local_week_start := date_trunc('week', v_local_timestamp)::date;
  v_period_start := v_local_week_start - 7;
  v_period_end := v_local_week_start - 1;

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
    wf.client_id,
    wf.id,
    'weekly_feedback_reminder:' || coalesce(pref.id::text, 'none'),
    pref.channel_key,
    pref.id,
    v_schedule_version_id,
    case
      when pref.id is null then 'blocked_no_channel'
      when pref.channel_key = 'in_app' then 'delivered'
      when pref.channel_key = 'email'
        and nullif(trim(reg.contact_email), '') is null
        then 'blocked_missing_contact'
      when pref.channel_key = 'whatsapp'
        and nullif(trim(reg.phone), '') is null
        then 'blocked_missing_contact'
      else 'blocked_provider'
    end,
    case
      when pref.id is null then 'channel_not_configured'
      when pref.channel_key = 'in_app' then null
      when pref.channel_key = 'email'
        and nullif(trim(reg.contact_email), '') is null
        then 'contact_email_missing'
      when pref.channel_key = 'whatsapp'
        and nullif(trim(reg.phone), '') is null
        then 'phone_missing'
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
  left join public.client_registration reg
    on reg.client_id = wf.client_id
  where wf.request_source = 'schedule'
    and wf.submitted_at is null
    and wf.period_start = v_period_start
    and wf.period_end = v_period_end
  on conflict (weekly_feedback_id, event_key) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end
$$;
