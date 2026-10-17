-- J4: avoid expanding the meal's existing RLS policy into the dose
-- query planner. The separately planned SECURITY INVOKER function answers
-- the same question as the existing public.meals SELECT policy: is this
-- exact parent meal visible to the current authenticated caller?
--
-- No privileges are elevated or RLS bypassed. The function executes as the
-- calling role; the public.meals SELECT policy enforces relational admin role,
-- active assignment, published-only client ownership and restrictive AAL2.
-- Existing dose INSERT/UPDATE/DELETE policies, triggers and restrictive
-- admin MFA policy are unchanged.
create function app_private.can_select_meal_doses_for_meal(p_meal_id uuid)
returns boolean
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  -- Using PL/pgSQL (rather than an inlineable SQL function) separates the
  -- planner for this indexed parent lookup from the outer dose SELECT.
  -- No IF branch or role claim overrides the parent meal's existing RLS.
  return exists (
    select 1 from public.meals m
    where m.id = p_meal_id
  );
end;
$$;

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

-- No modifications to the current restrictive MFA policy or draft-only
-- mutation policies. This migration is unmerged and must pass pgTAP,
-- authorization regression and synthetic authenticated Playwright.
