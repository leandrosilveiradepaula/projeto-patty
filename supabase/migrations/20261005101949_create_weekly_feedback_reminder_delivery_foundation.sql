create table public.client_notification_preference_versions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  purpose_key text not null,
  channel_key text not null
    check (channel_key in ('email','whatsapp','in_app')),
  version_number integer not null check (version_number > 0),
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  activated_at timestamptz not null default now(),
  activated_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  retired_at timestamptz,
  retired_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint client_notification_preference_versions_version_unique
    unique (client_id, purpose_key, version_number),
  constraint client_notification_preference_versions_retirement_consistent
    check (
      (retired_at is null and retired_by_profile_id is null)
      or
      (retired_at is not null and retired_by_profile_id is not null)
    )
);

create unique index client_notification_preference_versions_one_active
  on public.client_notification_preference_versions (client_id, purpose_key)
  where retired_at is null;

create index client_notification_preference_versions_client_idx
  on public.client_notification_preference_versions (client_id);

alter table public.client_notification_preference_versions enable row level security;

create policy client_notification_preferences_select_active_assignment_admin
  on public.client_notification_preference_versions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_notification_preference_versions.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy admin_mfa_aal2_required
  on public.client_notification_preference_versions
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

grant select on public.client_notification_preference_versions to authenticated;
grant select, insert, update on public.client_notification_preference_versions to service_role;

create table public.client_notification_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  weekly_feedback_id uuid not null
    references public.client_weekly_feedbacks(id) on delete restrict,
  event_key text not null,
  channel_key text
    check (channel_key is null or channel_key in ('email','whatsapp','in_app')),
  preference_version_id uuid
    references public.client_notification_preference_versions(id) on delete restrict,
  schedule_configuration_version_id uuid not null
    references public.method_configuration_versions(id) on delete restrict,
  delivery_state text not null
    check (
      delivery_state in (
        'delivered',
        'blocked_no_channel',
        'blocked_missing_contact',
        'blocked_provider'
      )
    ),
  blocked_reason text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint client_notification_events_weekly_event_unique
    unique (weekly_feedback_id, event_key),
  constraint client_notification_events_delivery_consistent
    check (
      (
        delivery_state = 'delivered'
        and channel_key is not null
        and delivered_at is not null
        and blocked_reason is null
      )
      or
      (
        delivery_state <> 'delivered'
        and delivered_at is null
        and blocked_reason is not null
      )
    )
);

create index client_notification_events_client_created_idx
  on public.client_notification_events (client_id, created_at desc);

alter table public.client_notification_events enable row level security;

create policy client_notification_events_select_own_or_active_assignment
  on public.client_notification_events
  for select
  to authenticated
  using (
    (
      channel_key = 'in_app'
      and delivery_state = 'delivered'
      and exists (
        select 1
        from public.clients c
        where c.id = client_notification_events.client_id
          and c.profile_id = (select auth.uid())
      )
    )
    or
    exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_notification_events.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy admin_mfa_aal2_required
  on public.client_notification_events
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

grant select on public.client_notification_events to authenticated;
grant select on public.client_notification_events to service_role;

create function public.activate_client_notification_preference_version_server(
  p_client_id uuid,
  p_purpose_key text,
  p_channel_key text,
  p_expected_active_version_id uuid,
  p_actor_profile_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_active_id uuid;
  v_active_version_number integer;
  v_new_id uuid;
begin
  if p_purpose_key <> 'weekly_feedback' then
    raise exception 'unsupported notification preference purpose'
      using errcode = '22023';
  end if;

  if p_channel_key not in ('email','whatsapp','in_app') then
    raise exception 'unsupported notification channel'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    join public.client_assignments ca
      on ca.staff_profile_id = ur.profile_id
     and ca.client_id = p_client_id
     and ca.ended_at is null
    where ur.profile_id = p_actor_profile_id
      and ur.role = 'admin'
  ) then
    raise exception 'active admin assignment is required'
      using errcode = '42501';
  end if;

  perform 1
  from public.clients c
  where c.id = p_client_id
  for update;

  if not found then
    raise exception 'client not found'
      using errcode = '22023';
  end if;

  select id, version_number
  into v_active_id, v_active_version_number
  from public.client_notification_preference_versions
  where client_id = p_client_id
    and purpose_key = p_purpose_key
    and retired_at is null
  for update;

  if v_active_id is distinct from p_expected_active_version_id then
    raise exception 'notification preference changed since it was loaded'
      using errcode = '40001';
  end if;

  if v_active_id is not null then
    update public.client_notification_preference_versions
    set
      retired_at = now(),
      retired_by_profile_id = p_actor_profile_id
    where id = v_active_id;
  end if;

  insert into public.client_notification_preference_versions (
    client_id,
    purpose_key,
    channel_key,
    version_number,
    created_by_profile_id,
    activated_at,
    activated_by_profile_id
  )
  values (
    p_client_id,
    p_purpose_key,
    p_channel_key,
    coalesce(v_active_version_number, 0) + 1,
    p_actor_profile_id,
    now(),
    p_actor_profile_id
  )
  returning id into v_new_id;

  return v_new_id;
end
$$;

revoke all on function public.activate_client_notification_preference_version_server(
  uuid,text,text,uuid,uuid
) from public, anon, authenticated;

grant execute on function public.activate_client_notification_preference_version_server(
  uuid,text,text,uuid,uuid
) to service_role;

create function public.preserve_client_notification_event_history()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'notification event history is append-only'
    using errcode = '55000';
end
$$;

create trigger client_notification_events_preserve_history
before update or delete on public.client_notification_events
for each row
execute function public.preserve_client_notification_event_history();

create function public.generate_weekly_feedback_reminder_events(
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
    'weekly_feedback_reminder',
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
    case
      when pref.channel_key = 'in_app' then p_now
      else null
    end,
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
    and date_trunc('week', wf.created_at at time zone v_timezone)::date
      = v_local_week_start
  on conflict (weekly_feedback_id, event_key) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end
$$;

revoke all on function public.generate_weekly_feedback_reminder_events(timestamptz)
  from public, anon, authenticated, service_role;

select cron.schedule(
  'weekly-feedback-reminders-due',
  '0 * * * *',
  $$select public.generate_weekly_feedback_reminder_events();$$
);
