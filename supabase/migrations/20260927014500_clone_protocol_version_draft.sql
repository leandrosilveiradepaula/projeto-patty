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
  v_variant record;
  v_new_variant_id uuid;
  v_meal record;
  v_new_meal_id uuid;
  v_cycle record;
  v_new_cycle_id uuid;
begin
  select *
  into v_source
  from public.protocol_versions
  where id = p_source_protocol_version_id;

  if not found then
    raise exception 'source protocol version is not accessible'
      using errcode = 'P0002';
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

  if found then
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

    for v_variant in
      select id, variant_key, label
      from public.meal_plan_variants
      where meal_plan_version_id = v_source_plan.id
      order by variant_key, id
    loop
      insert into public.meal_plan_variants (
        meal_plan_version_id,
        client_id,
        variant_key,
        label
      )
      values (
        v_new_plan_id,
        v_source.client_id,
        v_variant.variant_key,
        v_variant.label
      )
      returning id into v_new_variant_id;

      for v_meal in
        select id, position, label
        from public.meals
        where meal_plan_variant_id = v_variant.id
        order by position, id
      loop
        insert into public.meals (
          meal_plan_variant_id,
          position,
          label
        )
        values (
          v_new_variant_id,
          v_meal.position,
          v_meal.label
        )
        returning id into v_new_meal_id;

        insert into public.meal_dose_allocations (
          meal_id,
          dose_type,
          dose_quantity
        )
        select
          v_new_meal_id,
          dose_type,
          dose_quantity
        from public.meal_dose_allocations
        where meal_id = v_meal.id
        order by dose_type, id;
      end loop;
    end loop;

    for v_cycle in
      select id
      from public.meal_plan_cycles
      where meal_plan_version_id = v_source_plan.id
      order by created_at, id
    loop
      insert into public.meal_plan_cycles (
        meal_plan_version_id,
        client_id
      )
      values (
        v_new_plan_id,
        v_source.client_id
      )
      returning id into v_new_cycle_id;

      insert into public.meal_plan_cycle_steps (
        cycle_id,
        meal_plan_version_id,
        variant_id,
        position
      )
      select
        v_new_cycle_id,
        v_new_plan_id,
        new_variant.id,
        source_step.position
      from public.meal_plan_cycle_steps source_step
      join public.meal_plan_variants source_variant
        on source_variant.id = source_step.variant_id
       and source_variant.meal_plan_version_id = v_source_plan.id
      join public.meal_plan_variants new_variant
        on new_variant.meal_plan_version_id = v_new_plan_id
       and new_variant.variant_key = source_variant.variant_key
      where source_step.cycle_id = v_cycle.id
      order by source_step.position;
    end loop;
  end if;

  return v_new_version_id;
end;
$$;

revoke all on function public.clone_protocol_version_draft(uuid)
  from public, anon;
grant execute on function public.clone_protocol_version_draft(uuid)
  to authenticated;
