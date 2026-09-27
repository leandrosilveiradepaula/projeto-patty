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
  v_variant_map jsonb := '{}'::jsonb;
  v_meal_map jsonb := '{}'::jsonb;
  v_cycle_map jsonb := '{}'::jsonb;
  v_source_variant_ids uuid[] := '{}'::uuid[];
  v_source_meal_ids uuid[] := '{}'::uuid[];
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

  select *
  into v_source_plan
  from public.meal_plan_versions
  where protocol_version_id = v_source.id;

  if not found then
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

  select
    coalesce(array_agg(id order by variant_key, id), '{}'::uuid[]),
    coalesce(
      jsonb_object_agg(id::text, pg_catalog.gen_random_uuid()::text),
      '{}'::jsonb
    )
  into v_source_variant_ids, v_variant_map
  from public.meal_plan_variants
  where meal_plan_version_id = v_source_plan.id;

  insert into public.meal_plan_variants (
    id,
    meal_plan_version_id,
    client_id,
    variant_key,
    label
  )
  select
    (v_variant_map ->> source_variant.id::text)::uuid,
    v_new_plan_id,
    v_source.client_id,
    source_variant.variant_key,
    source_variant.label
  from public.meal_plan_variants source_variant
  where source_variant.meal_plan_version_id = v_source_plan.id;

  select
    coalesce(array_agg(id order by meal_plan_variant_id, position, id), '{}'::uuid[]),
    coalesce(
      jsonb_object_agg(id::text, pg_catalog.gen_random_uuid()::text),
      '{}'::jsonb
    )
  into v_source_meal_ids, v_meal_map
  from public.meals
  where meal_plan_variant_id = any(v_source_variant_ids);

  insert into public.meals (
    id,
    meal_plan_variant_id,
    position,
    label
  )
  select
    (v_meal_map ->> source_meal.id::text)::uuid,
    (v_variant_map ->> source_meal.meal_plan_variant_id::text)::uuid,
    source_meal.position,
    source_meal.label
  from public.meals source_meal
  where source_meal.id = any(v_source_meal_ids);

  insert into public.meal_dose_allocations (
    meal_id,
    dose_type,
    dose_quantity
  )
  select
    (v_meal_map ->> source_allocation.meal_id::text)::uuid,
    source_allocation.dose_type,
    source_allocation.dose_quantity
  from public.meal_dose_allocations source_allocation
  where source_allocation.meal_id = any(v_source_meal_ids);

  select coalesce(
    jsonb_object_agg(id::text, pg_catalog.gen_random_uuid()::text),
    '{}'::jsonb
  )
  into v_cycle_map
  from public.meal_plan_cycles
  where meal_plan_version_id = v_source_plan.id;

  insert into public.meal_plan_cycles (
    id,
    meal_plan_version_id,
    client_id
  )
  select
    (v_cycle_map ->> source_cycle.id::text)::uuid,
    v_new_plan_id,
    v_source.client_id
  from public.meal_plan_cycles source_cycle
  where source_cycle.meal_plan_version_id = v_source_plan.id;

  insert into public.meal_plan_cycle_steps (
    cycle_id,
    meal_plan_version_id,
    variant_id,
    position
  )
  select
    (v_cycle_map ->> source_step.cycle_id::text)::uuid,
    v_new_plan_id,
    (v_variant_map ->> source_step.variant_id::text)::uuid,
    source_step.position
  from public.meal_plan_cycle_steps source_step
  where source_step.meal_plan_version_id = v_source_plan.id;

  return v_new_version_id;
end;
$$;

revoke all on function public.clone_protocol_version_draft(uuid)
  from public, anon;
grant execute on function public.clone_protocol_version_draft(uuid)
  to authenticated;
