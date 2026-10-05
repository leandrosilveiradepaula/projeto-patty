alter table public.client_weekly_feedbacks
  alter column requested_by_profile_id drop not null;

alter table public.client_weekly_feedbacks
  drop constraint client_weekly_feedbacks_schedule_source_consistent;

alter table public.client_weekly_feedbacks
  add constraint client_weekly_feedbacks_schedule_source_consistent
    check (
      (
        request_source = 'manual'
        and requested_by_profile_id is not null
        and schedule_configuration_version_id is null
      )
      or
      (
        request_source = 'schedule'
        and requested_by_profile_id is null
        and schedule_configuration_version_id is not null
      )
    );

create or replace function public.generate_scheduled_weekly_feedback_requests(
  p_now timestamptz default now()
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_schedule_version_id uuid;
  v_request_weekday integer;
  v_request_time_local text;
  v_timezone text;
  v_local_timestamp timestamp without time zone;
  v_form_version_id uuid;
  v_period_start date;
  v_period_end date;
  v_inserted integer := 0;
begin
  select
    v.id,
    (v.configuration ->> 'request_weekday')::integer,
    v.configuration ->> 'request_time_local',
    v.configuration ->> 'timezone'
  into
    v_schedule_version_id,
    v_request_weekday,
    v_request_time_local,
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

  if v_request_weekday not between 1 and 7 then
    raise exception 'weekly feedback request_weekday is invalid'
      using errcode = '22023';
  end if;

  if v_request_time_local is null
     or v_request_time_local !~ '^(?:[01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'weekly feedback request_time_local is invalid'
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

  if extract(isodow from v_local_timestamp)::integer <> v_request_weekday
     or to_char(v_local_timestamp, 'HH24:MI') <> v_request_time_local then
    return 0;
  end if;

  select id
  into v_form_version_id
  from public.weekly_feedback_form_versions
  where published_at is not null
  order by version_number desc
  limit 1;

  if v_form_version_id is null then
    raise exception 'published weekly feedback form version not found'
      using errcode = 'P0001';
  end if;

  v_period_start := date_trunc('week', v_local_timestamp)::date - 7;
  v_period_end := date_trunc('week', v_local_timestamp)::date - 1;

  insert into public.client_weekly_feedbacks (
    client_id,
    form_version_id,
    period_start,
    period_end,
    due_at,
    requested_by_profile_id,
    request_source,
    schedule_configuration_version_id
  )
  select
    c.id,
    v_form_version_id,
    v_period_start,
    v_period_end,
    null,
    null,
    'schedule',
    v_schedule_version_id
  from public.clients c
  where exists (
    select 1
    from public.client_assignments ca
    join public.user_roles ur
      on ur.profile_id = ca.staff_profile_id
     and ur.role = 'admin'
    where ca.client_id = c.id
      and ca.ended_at is null
  )
  and exists (
    select 1
    from public.protocol_publications pp
    where pp.client_id = c.id
  )
  on conflict (client_id, period_start, period_end) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;
