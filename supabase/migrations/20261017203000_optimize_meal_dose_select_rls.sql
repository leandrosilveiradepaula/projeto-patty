-- J4: replace repeated SELECT-policy expansion for meal doses with one
-- indexed, row-scoped authorization lookup. The original meal/plan/protocol
-- SELECT policies are left intact; write policies and triggers are unchanged.
-- Only a private SECURITY DEFINER helper can avoid recursively expanding
-- those other policies while planning this SELECT.
--
-- SECURITY REVIEW REQUIRED before applying beyond disposable local tests:
-- definer runs with its owner privileges, so every branch below must enforce
-- the caller identity and the full current authorization contract.
create function app_private.can_select_meal_doses_for_meal(p_meal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and (
      -- Keep MFA as a defense in depth. The table's existing RESTRICTIVE
      -- admin_mfa_aal2_required policy remains in effect independently.
      not exists (
        select 1 from public.user_roles ur_mfa
        where ur_mfa.profile_id = (select auth.uid())
          and ur_mfa.role = 'admin'
      )
      or coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
    )
    and exists (
      select 1
      from public.meals m
      join public.meal_plan_variants v
        on v.id = m.meal_plan_variant_id
      join public.meal_plan_versions mp
        on mp.id = v.meal_plan_version_id
      join public.protocol_versions pv
        on pv.id = mp.protocol_version_id
       and pv.client_id = mp.client_id
      where m.id = p_meal_id
        and (
          -- Administrative read of draft, reviewed and published versions
          -- requires both the relational admin role and live assignment.
          exists (
            select 1
            from public.user_roles ur
            join public.client_assignments ca
              on ca.staff_profile_id = ur.profile_id
             and ca.client_id = pv.client_id
             and ca.ended_at is null
            where ur.profile_id = (select auth.uid())
              and ur.role = 'admin'
              and coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
          )
          or
          -- Clients can read only their own *published* protocol version;
          -- approval, submission or ownership alone never releases a draft.
          exists (
            select 1
            from public.clients c
            join public.protocol_publications pp
              on pp.client_id = c.id
             and pp.protocol_version_id = pv.id
            where c.id = pv.client_id
              and c.profile_id = (select auth.uid())
          )
        )
    );
$$;

-- app_private already exists and is not an exposed Data API schema.
-- Do not grant EXECUTE to PUBLIC or anon; authenticated must invoke the
-- row-scoped helper as part of the policy. The helper returns only boolean.
revoke all on function app_private.can_select_meal_doses_for_meal(uuid)
  from public, anon;
grant execute on function app_private.can_select_meal_doses_for_meal(uuid)
  to authenticated;

drop policy "meal_doses_select_assigned_or_published"
  on public.meal_dose_allocations;
create policy "meal_doses_select_assigned_or_published"
  on public.meal_dose_allocations
  for select to authenticated
  using (app_private.can_select_meal_doses_for_meal(meal_id));

-- Existing RESTRICTIVE admin MFA policy, draft-only DML policies and
-- post-submission immutability triggers remain active and unchanged.
