create function public.clone_protocol_version_draft(
  p_source_protocol_version_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_source public.protocol_versions%rowtype;
  v_source_plan public.meal_plan_versions%rowtype;
  v_new_version_id uuid;
  v_new_version_number integer;
  v_new_plan_id uuid;
  v_variants jsonb := '[]'::jsonb;
  v_meals jsonb := '[]'::jsonb;
  v_doses jsonb := '[]'::jsonb;
  v_cycles jsonb := '[]'::jsonb;
  v_steps jsonb := '[]'::jsonb;
  v_source_variant_ids uuid[] := '{}'::uuid[];
  v_source_meal_ids uuid[] := '{}'::uuid[];
  v_source_cycle_ids uuid[] := '{}'::uuid[];
begin
  select *
  into v_source
  from public.protocol_versions
  where id = p_source_protocol_version_id;

  if not found then
    raise exception 'source protocol version is not accessible'
      using errcode = 'P0002';
  end if;

  if v_source.submitted_for_review_at is null then
    raise exception 'source protocol version must be frozen before cloning'
      using errcode = '55000';
  end if;

  select *
  into v_source_plan
  from public.meal_plan_versions
  where protocol_version_id = v_source.id;

  if found then
    select
      coalesce(array_agg(id order by variant_key, id), '{}'::uuid[]),
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'source_id', id,
            'new_id', pg_catalog.gen_random_uuid(),
            'variant_key', variant_key,
            'label', label
          )
          order by variant_key, id
        ),
        '[]'::jsonb
      )
    into v_source_variant_ids, v_variants
    from public.meal_plan_variants
    where meal_plan_version_id = v_source_plan.id;

    select
      coalesce(
        array_agg(id order by meal_plan_variant_id, position, id),
        '{}'::uuid[]
      ),
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'source_id', id,
            'new_id', pg_catalog.gen_random_uuid(),
            'source_variant_id', meal_plan_variant_id,
            'position', position,
            'label', label
          )
          order by meal_plan_variant_id, position, id
        ),
        '[]'::jsonb
      )
    into v_source_meal_ids, v_meals
    from public.meals
    where meal_plan_variant_id = any(v_source_variant_ids);

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'source_meal_id', meal_id,
          'dose_type', dose_type,
          'dose_quantity', dose_quantity
        )
        order by meal_id, dose_type, id
      ),
      '[]'::jsonb
    )
    into v_doses
    from public.meal_dose_allocations
    where meal_id = any(v_source_meal_ids);

    select
      coalesce(array_agg(id order by created_at, id), '{}'::uuid[]),
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'source_id', id,
            'new_id', pg_catalog.gen_random_uuid()
          )
          order by created_at, id
        ),
        '[]'::jsonb
      )
    into v_source_cycle_ids, v_cycles
    from public.meal_plan_cycles
    where meal_plan_version_id = v_source_plan.id;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'source_cycle_id', cycle_id,
          'source_variant_id', variant_id,
          'position', position
        )
        order by cycle_id, position
      ),
      '[]'::jsonb
    )
    into v_steps
    from public.meal_plan_cycle_steps
    where cycle_id = any(v_source_cycle_ids);
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_source.protocol_id::text, 0)
  );

  select coalesce(max(version_number), 0) + 1
  into v_new_version_number
  from public.protocol_versions
  where protocol_id = v_source.protocol_id;

  insert into public.protocol_versions (
    protocol_id,
    client_id,
    version_number,
    created_by_profile_id,
    based_on_version_id
  )
  values (
    v_source.protocol_id,
    v_source.client_id,
    v_new_version_number,
    (select auth.uid()),
    v_source.id
  )
  returning id into v_new_version_id;

  if v_source_plan.id is null then
    return v_new_version_id;
  end if;

  insert into public.meal_plan_versions (
    protocol_version_id,
    client_id,
    food_equivalent_catalog_version_id
  )
  values (
    v_new_version_id,
    v_source.client_id,
    v_source_plan.food_equivalent_catalog_version_id
  )
  returning id into v_new_plan_id;

  insert into public.meal_plan_variants (
    id,
    meal_plan_version_id,
    client_id,
    variant_key,
    label
  )
  select
    variant_row.new_id,
    v_new_plan_id,
    v_source.client_id,
    variant_row.variant_key,
    variant_row.label
  from jsonb_to_recordset(v_variants) as variant_row(
    source_id uuid,
    new_id uuid,
    variant_key text,
    label text
  );

  insert into public.meals (
    id,
    meal_plan_variant_id,
    position,
    label
  )
  select
    meal_row.new_id,
    variant_row.new_id,
    meal_row.position,
    meal_row.label
  from jsonb_to_recordset(v_meals) as meal_row(
    source_id uuid,
    new_id uuid,
    source_variant_id uuid,
    position integer,
    label text
  )
  join jsonb_to_recordset(v_variants) as variant_row(
    source_id uuid,
    new_id uuid,
    variant_key text,
    label text
  )
    on variant_row.source_id = meal_row.source_variant_id;

  insert into public.meal_dose_allocations (
    meal_id,
    dose_type,
    dose_quantity
  )
  select
    meal_row.new_id,
    dose_row.dose_type,
    dose_row.dose_quantity
  from jsonb_to_recordset(v_doses) as dose_row(
    source_meal_id uuid,
    dose_type text,
    dose_quantity numeric
  )
  join jsonb_to_recordset(v_meals) as meal_row(
    source_id uuid,
    new_id uuid,
    source_variant_id uuid,
    position integer,
    label text
  )
    on meal_row.source_id = dose_row.source_meal_id;

  insert into public.meal_plan_cycles (
    id,
    meal_plan_version_id,
    client_id
  )
  select
    cycle_row.new_id,
    v_new_plan_id,
    v_source.client_id
  from jsonb_to_recordset(v_cycles) as cycle_row(
    source_id uuid,
    new_id uuid
  );

  insert into public.meal_plan_cycle_steps (
    cycle_id,
    meal_plan_version_id,
    variant_id,
    position
  )
  select
    cycle_row.new_id,
    v_new_plan_id,
    variant_row.new_id,
    step_row.position
  from jsonb_to_recordset(v_steps) as step_row(
    source_cycle_id uuid,
    source_variant_id uuid,
    position integer
  )
  join jsonb_to_recordset(v_cycles) as cycle_row(
    source_id uuid,
    new_id uuid
  )
    on cycle_row.source_id = step_row.source_cycle_id
  join jsonb_to_recordset(v_variants) as variant_row(
    source_id uuid,
    new_id uuid,
    variant_key text,
    label text
  )
    on variant_row.source_id = step_row.source_variant_id;

  return v_new_version_id;
end;
$$;

revoke all on function public.clone_protocol_version_draft(uuid)
  from public, anon;
grant execute on function public.clone_protocol_version_draft(uuid)
  to authenticated;
