-- Enforce the existing administrative MFA requirement at the RLS layer.
--
-- Existing authorization policies derive administrative access from the
-- caller's own public.user_roles row. Hiding an admin role from an aal1 JWT
-- therefore causes those policies (and SECURITY INVOKER helpers that read
-- user_roles) to deny administrative Data API / Storage access while leaving
-- client-role access unchanged.
--
-- The application resolves the current user's role through a narrow
-- server-only boundary before MFA so an authenticated admin can still be routed
-- to enrollment/challenge. No privileged key is exposed to the browser.

drop policy if exists user_roles_select_own on public.user_roles;

create policy user_roles_select_own
on public.user_roles
for select
to authenticated
using (
  profile_id = (select auth.uid())
  and (
    role <> 'admin'::public.app_role
    or coalesce((select auth.jwt() ->> 'aal'), 'aal1') = 'aal2'
  )
);
