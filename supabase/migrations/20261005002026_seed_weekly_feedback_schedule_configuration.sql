do $$
declare
  v_template_id uuid;
begin
  if exists (
    select 1
    from public.method_configuration_templates
    where template_key = 'weekly_feedback.schedule'
  ) then
    raise exception 'weekly_feedback.schedule already exists'
      using errcode = 'P0001';
  end if;

  insert into public.method_configuration_templates (
    template_key,
    domain_key,
    config_schema_key,
    display_name,
    description,
    created_by_kind,
    created_by_profile_id
  )
  values (
    'weekly_feedback.schedule',
    'weekly_feedback',
    'weekly_feedback_schedule_v1',
    'Agenda do Feedback Semanal',
    'Dia e horario do Feedback Semanal e dia do lembrete. Nao inclui canal nem horario do lembrete.',
    'system',
    null
  )
  returning id into v_template_id;

  insert into public.method_configuration_versions (
    template_id,
    version_number,
    schema_version,
    configuration,
    source_kind,
    source_reference,
    created_by_kind,
    created_by_profile_id,
    activated_at,
    activated_by_profile_id
  )
  values (
    v_template_id,
    1,
    1,
    '{
      "request_weekday": 1,
      "request_time_local": "08:00",
      "reminder_weekday": 3,
      "timezone": "America/Sao_Paulo"
    }'::jsonb,
    'system_baseline',
    'Patty confirmed weekly feedback schedule on 2026-10-04',
    'system',
    null,
    now(),
    null
  );
end
$$;
