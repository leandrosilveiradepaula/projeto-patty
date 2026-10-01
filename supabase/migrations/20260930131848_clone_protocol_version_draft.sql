create function public.clone_protocol_version_draft(
  p_source_protocol_version_id uuid,
  p_plan_snapshot jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_source public.protocol_versions%rowtype;
  v_new_version_id uuid;
  v_new_version_number integer;
  v_new_plan_id uuid;
  v_new_variant_id uuid;
  v_new_meal_id uuid;
  v_new_cycle_id uuid;
  v_variant_map jsonb := '{}'::jsonb;
  v_variant jsonb;
  v_meal jsonb;
  v_dose jsonb;
  v_cycle jsonb;
  v_step jsonb;
  v_step_variant_id uuid;
  v_catalog_version_id uuid;
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

  if p_plan_snapshot is not null
    and jsonb_typeof(p_plan_snapshot) <> 'object'
  then
    raise exception 'protocol plan snapshot must be a JSON object'
      using errcode = '22023';
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

  if p_plan_snapshot is null then
    return v_new_version_id;
  end if;

  if p_plan_snapshot ? 'foodEquivalentCatalogVersionId'
    and p_plan_snapshot ->> 'foodEquivalentCatalogVersionId' is not null
    and length(trim(p_plan_snapshot ->> 'foodEquivalentCatalogVersionId')) > 0
  then
    v_catalog_version_id :=
      (p_plan_snapshot ->> 'foodEquivalentCatalogVersionId')::uuid;
  end if;

  insert into public.meal_plan_versions (
    protocol_version_id,
    client_id,
    food_equivalent_catalog_version_id
  )
  values (
    v_new_version_id,
    v_source.client_id,
    v_catalog_version_id
  )
  returning id into v_new_plan_id;

  for v_variant in
    select value
    from jsonb_array_elements(
      coalesce(p_plan_snapshot -> 'variants', '[]'::jsonb)
    )
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
      v_variant ->> 'variantKey',
      nullif(v_variant ->> 'label', '')
    )
    returning id into v_new_variant_id;

    v_variant_map :=
      v_variant_map ||
      jsonb_build_object(v_variant ->> 'variantKey', v_new_variant_id::text);

    for v_meal in
      select value
      from jsonb_array_elements(
        coalesce(v_variant -> 'meals', '[]'::jsonb)
      )
    loop
      insert into public.meals (
        meal_plan_variant_id,
        position,
        label
      )
      values (
        v_new_variant_id,
        (v_meal ->> 'position')::integer,
        nullif(v_meal ->> 'label', '')
      )
      returning id into v_new_meal_id;

      for v_dose in
        select value
        from jsonb_array_elements(
          coalesce(v_meal -> 'doseAllocations', '[]'::jsonb)
        )
      loop
        insert into public.meal_dose_allocations (
          meal_id,
          dose_type,
          dose_quantity
        )
        values (
          v_new_meal_id,
          v_dose ->> 'doseType',
          (v_dose ->> 'doseQuantity')::numeric
        );
      end loop;
    end loop;
  end loop;

  for v_cycle in
    select value
    from jsonb_array_elements(
      coalesce(p_plan_snapshot -> 'cycles', '[]'::jsonb)
    )
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

    for v_step in
      select value
      from jsonb_array_elements(
        coalesce(v_cycle -> 'steps', '[]'::jsonb)
      )
    loop
      v_step_variant_id :=
        nullif(v_variant_map ->> (v_step ->> 'variantKey'), '')::uuid;

      if v_step_variant_id is null then
        raise exception 'cycle step references unknown variant key'
          using errcode = '23514';
      end if;

      insert into public.meal_plan_cycle_steps (
        cycle_id,
        meal_plan_version_id,
        variant_id,
        position
      )
      values (
        v_new_cycle_id,
        v_new_plan_id,
        v_step_variant_id,
        (v_step ->> 'position')::integer
      );
    end loop;
  end loop;

  return v_new_version_id;
end;
$$;

revoke all on function public.clone_protocol_version_draft(uuid, jsonb)
  from public, anon;
grant execute on function public.clone_protocol_version_draft(uuid, jsonb)
  to authenticated;
