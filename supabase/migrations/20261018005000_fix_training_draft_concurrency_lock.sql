-- J5: fix authenticated draft creation without broadening grants or RLS.
-- The historical function locked client_training_plans with SELECT FOR UPDATE,
-- requiring a table UPDATE privilege intentionally not granted to authenticated.
-- Serialize creation per client with a transaction-scoped advisory lock instead.
-- All ownership, assignment, MFA, request and unique draft checks are unchanged.
create or replace function public.create_client_training_plan_draft(
  p_client_id uuid,
  p_title text,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_plan_id uuid;
  v_version_number integer;
  v_version_id uuid;
begin
  if p_title is null or char_length(trim(p_title)) not between 1 and 160 then
    raise exception 'training plan title is required'
      using errcode = '22023';
  end if;

  if p_notes is not null
     and (char_length(trim(p_notes)) = 0 or char_length(trim(p_notes)) > 4000) then
    raise exception 'training plan notes are invalid'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    join public.client_assignments ca
      on ca.staff_profile_id = ur.profile_id
     and ca.client_id = p_client_id
     and ca.ended_at is null
    where ur.profile_id = (select auth.uid())
      and ur.role = 'admin'
  ) then
    raise exception 'active admin assignment is required'
      using errcode = '42501';
  end if;

  if not (select public.current_user_admin_mfa_satisfied()) then
    raise exception 'admin MFA AAL2 is required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.client_training_requests r
    where r.client_id = p_client_id
  ) then
    raise exception 'training request is required before prescription'
      using errcode = '23514';
  end if;

  -- Serialize drafts for the same client without acquiring a row-level
  -- lock on client_training_plans, which requires UPDATE on that table.
  -- A transaction-scoped advisory lock is released automatically on commit
  -- or rollback; possible hash collisions only serialize extra clients.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('client_training_plan_draft'),
    pg_catalog.hashtext(p_client_id::text)
  );

  insert into public.client_training_plans (client_id)
  values (p_client_id)
  on conflict (client_id) do nothing;

  select p.id
  into v_plan_id
  from public.client_training_plans p
  where p.client_id = p_client_id;

  if exists (
    select 1
    from public.client_training_plan_versions v
    where v.training_plan_id = v_plan_id
      and v.published_at is null
  ) then
    raise exception 'an open training plan draft already exists'
      using errcode = '23505';
  end if;

  select coalesce(max(v.version_number), 0) + 1
  into v_version_number
  from public.client_training_plan_versions v
  where v.training_plan_id = v_plan_id;

  insert into public.client_training_plan_versions (
    training_plan_id,
    version_number,
    title,
    notes,
    created_by_profile_id
  )
  values (
    v_plan_id,
    v_version_number,
    trim(p_title),
    nullif(trim(p_notes), ''),
    (select auth.uid())
  )
  returning id into v_version_id;

  return v_version_id;
end
$$;
