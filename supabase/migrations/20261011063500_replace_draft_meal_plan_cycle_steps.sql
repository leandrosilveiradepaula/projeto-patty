-- Atomic manual cycle editing. No nutrition sequence, formula, new table or RLS exception.
-- This function is SECURITY INVOKER: the authenticated professional must still pass
-- the existing protocol, plan, cycle, variant and step RLS policies.
create function public.replace_draft_meal_plan_cycle_steps(
  p_cycle_id uuid,
  p_meal_plan_version_id uuid,
  p_expected_steps jsonb,
  p_variant_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_version_id uuid;
  v_submitted_at timestamptz;
  v_actual_steps jsonb;
begin
  if p_expected_steps is null
    or pg_catalog.jsonb_typeof(p_expected_steps) <> 'array'
    or p_variant_ids is null
    or pg_catalog.array_position(p_variant_ids, null) is not null
  then
    raise exception 'invalid cycle edit payload' using errcode = '22023';
  end if;

  -- Serialize against submitting the protocol for review as well as other
  -- manual cycle edits. The existing freeze triggers still enforce immutability.
  select pv.id, pv.submitted_for_review_at
    into v_version_id, v_submitted_at
    from public.meal_plan_versions mp
    join public.protocol_versions pv on pv.id = mp.protocol_version_id
    where mp.id = p_meal_plan_version_id
    for update of pv;

  if v_version_id is null then
    raise exception 'plan version not accessible' using errcode = 'P0002';
  end if;
  if v_submitted_at is not null then
    raise exception 'reviewed plan is immutable' using errcode = '55000';
  end if;

  perform 1 from public.meal_plan_cycles
    where id = p_cycle_id and meal_plan_version_id = p_meal_plan_version_id
    for update;
  if not found then
    raise exception 'cycle not accessible' using errcode = 'P0002';
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object('position', s.position, 'variantId', s.variant_id::text)
      order by s.position
    ),
    '[]'::jsonb
  )
    into v_actual_steps
    from public.meal_plan_cycle_steps s
    where s.cycle_id = p_cycle_id
      and s.meal_plan_version_id = p_meal_plan_version_id;

  if v_actual_steps <> p_expected_steps then
    raise exception 'cycle_steps_changed' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from pg_catalog.unnest(p_variant_ids) as desired(variant_id)
    left join public.meal_plan_variants v
      on v.id = desired.variant_id
      and v.meal_plan_version_id = p_meal_plan_version_id
    where v.id is null
  ) then
    raise exception 'cycle variant is outside this plan' using errcode = '23514';
  end if;

  -- Delete and rebuild are ONE transaction inside the RPC. Step rows have no
  -- durable identity beyond (cycle_id, position); no approved snapshot is touched.
  delete from public.meal_plan_cycle_steps
    where cycle_id = p_cycle_id and meal_plan_version_id = p_meal_plan_version_id;

  insert into public.meal_plan_cycle_steps (
    cycle_id, meal_plan_version_id, variant_id, position
  )
    select p_cycle_id, p_meal_plan_version_id, desired.variant_id,
           desired.ordinality::integer
    from pg_catalog.unnest(p_variant_ids) with ordinality as desired(variant_id, ordinality);
end;
$$;

revoke all on function public.replace_draft_meal_plan_cycle_steps(uuid, uuid, jsonb, uuid[])
  from public, anon;
grant execute on function public.replace_draft_meal_plan_cycle_steps(uuid, uuid, jsonb, uuid[])
  to authenticated;
