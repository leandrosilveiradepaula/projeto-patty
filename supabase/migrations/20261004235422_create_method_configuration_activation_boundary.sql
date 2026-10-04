create function public.activate_method_configuration_version_server(
  p_template_id uuid,
  p_expected_active_version_id uuid,
  p_configuration jsonb,
  p_source_reference text,
  p_actor_profile_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_active_version_id uuid;
  v_active_version_number integer;
  v_schema_version integer;
  v_new_version_id uuid;
begin
  if p_actor_profile_id is null then
    raise exception 'configuration activation actor is required'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_configuration) is distinct from 'object' then
    raise exception 'configuration must be a JSON object'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.profile_id = p_actor_profile_id
      and ur.role = 'admin'
  ) then
    raise exception 'admin role is required for configuration activation'
      using errcode = '42501';
  end if;

  select
    v.id,
    v.version_number,
    v.schema_version
  into
    v_active_version_id,
    v_active_version_number,
    v_schema_version
  from public.method_configuration_versions v
  where v.template_id = p_template_id
    and v.activated_at is not null
    and v.retired_at is null
  for update;

  if not found then
    raise exception 'active method configuration version not found'
      using errcode = '22023';
  end if;

  if v_active_version_id is distinct from p_expected_active_version_id then
    raise exception 'method configuration changed since it was loaded'
      using errcode = '40001';
  end if;

  update public.method_configuration_versions
  set
    retired_at = now(),
    retired_by_profile_id = p_actor_profile_id
  where id = v_active_version_id;

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
    p_template_id,
    v_active_version_number + 1,
    v_schema_version,
    p_configuration,
    'professional_update',
    nullif(trim(p_source_reference), ''),
    'profile',
    p_actor_profile_id,
    now(),
    p_actor_profile_id
  )
  returning id into v_new_version_id;

  return v_new_version_id;
end
$$;

revoke all on function public.activate_method_configuration_version_server(
  uuid,
  uuid,
  jsonb,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.activate_method_configuration_version_server(
  uuid,
  uuid,
  jsonb,
  text,
  uuid
) to service_role;
