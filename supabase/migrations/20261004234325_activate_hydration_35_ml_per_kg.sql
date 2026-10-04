do $$
declare
  v_actor uuid;
  v_template_id uuid;
  v_active_version_id uuid;
  v_active_version_number integer;
  v_active_ml_per_kg numeric;
begin
  select ur.profile_id
    into v_actor
  from public.user_roles ur
  where ur.role = 'admin'
  order by ur.created_at, ur.profile_id
  limit 1;

  if v_actor is null then
    raise exception 'cannot activate hydration v2: no admin profile found'
      using errcode = 'P0001';
  end if;

  select
    t.id,
    v.id,
    v.version_number,
    (v.configuration #>> '{parameters,daily_ml_per_kg,value}')::numeric
  into
    v_template_id,
    v_active_version_id,
    v_active_version_number,
    v_active_ml_per_kg
  from public.method_configuration_templates t
  join public.method_configuration_versions v
    on v.template_id = t.id
   and v.activated_at is not null
   and v.retired_at is null
  where t.template_key = 'hydration.daily_target';

  if v_template_id is null or v_active_version_id is null then
    raise exception 'cannot activate hydration v2: active hydration template version not found'
      using errcode = 'P0001';
  end if;

  if v_active_version_number <> 1 or v_active_ml_per_kg <> 60 then
    raise exception
      'cannot activate hydration v2: expected active v1 with 60 mL/kg, found v% with % mL/kg',
      v_active_version_number,
      v_active_ml_per_kg
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.method_configuration_versions v
    where v.template_id = v_template_id
      and v.version_number = 2
  ) then
    raise exception 'cannot activate hydration v2: version 2 already exists'
      using errcode = 'P0001';
  end if;

  update public.method_configuration_versions
  set
    retired_at = now(),
    retired_by_profile_id = v_actor
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
    v_template_id,
    2,
    1,
    '{
      "inputs": {
        "weight_kg": {
          "unit": "kg"
        }
      },
      "parameters": {
        "daily_ml_per_kg": {
          "value": 35,
          "unit": "ml_per_kg"
        }
      },
      "outputs": {
        "target_ml": {
          "unit": "ml",
          "expression": {
            "op": "round",
            "arg": {
              "op": "multiply",
              "args": [
                {
                  "op": "input",
                  "key": "weight_kg"
                },
                {
                  "op": "parameter",
                  "key": "daily_ml_per_kg"
                }
              ]
            }
          }
        }
      }
    }'::jsonb,
    'confirmed_professional_rule',
    'patty-confirmed-hydration-35mlkg-2026-10-04',
    'profile',
    v_actor,
    now(),
    v_actor
  );
end
$$;
