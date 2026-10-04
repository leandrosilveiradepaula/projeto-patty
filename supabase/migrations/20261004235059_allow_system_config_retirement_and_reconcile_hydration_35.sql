alter table public.method_configuration_versions
  drop constraint method_configuration_versions_retirement_actor_consistent;

alter table public.method_configuration_versions
  add constraint method_configuration_versions_retirement_actor_consistent
  check (
    (
      retired_at is null
      and retired_by_profile_id is null
    )
    or
    (
      retired_at is not null
      and (
        retired_by_profile_id is not null
        or (
          created_by_kind = 'system'
          and source_kind = 'system_baseline'
          and retired_by_profile_id is null
        )
      )
    )
  );

do $$
declare
  v_template_id uuid;
  v_active_version_id uuid;
  v_active_version_number integer;
  v_active_ml_per_kg numeric;
begin
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
    raise exception 'cannot reconcile hydration: active hydration template version not found'
      using errcode = 'P0001';
  end if;

  if v_active_version_number = 2 and v_active_ml_per_kg = 35 then
    return;
  end if;

  if v_active_version_number <> 1 or v_active_ml_per_kg <> 60 then
    raise exception
      'cannot reconcile hydration: expected active v1/60 or v2/35, found v%/%',
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
    raise exception 'cannot reconcile hydration: version 2 already exists but is not the active 35 mL/kg version'
      using errcode = 'P0001';
  end if;

  update public.method_configuration_versions
  set
    retired_at = now(),
    retired_by_profile_id = null
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
    'system_baseline',
    'patty-confirmed-hydration-35mlkg-2026-10-04',
    'system',
    null,
    now(),
    null
  );
end
$$;
