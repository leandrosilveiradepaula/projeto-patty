-- Align the private Storage object SELECT policy with the confirmed sole-admin
-- exception for client_files. The original 20260922230034 policy joined clients
-- for *both* branches: after an assignment ended, clients RLS hid that row from
-- the admin, preventing createSignedUrl even though client_files remained visible.
--
-- This migration does NOT change clients, client_files or their RLS, and does not
-- change the separately restrictive storage_objects_admin_mfa_aal2_required
-- policy. The MVP permits exactly one admin (Patty); adding a second admin
-- requires a separate authorization redesign, see OPEN_QUESTIONS/issue #950.
-- Deployment guard: the rule is approved only for the *sole* business
-- administrator. A production metadata audit on 2026-10-20 found multiple
-- distinct profiles with role=admin. Never grant unassigned private-file
-- access to multiple roles. Empty local databases are permitted for pgTAP/E2E;
-- any environment with multiple admins must reconcile roles, with human
-- authorization, before this migration can be applied. No user is deleted.
do $private_file_admin_count_guard$
begin
  if (
    select count(distinct profile_id)
    from public.user_roles
    where role = 'admin'
  ) > 1 then
    raise exception 'Private Storage migration blocked: multiple admins require human reconciliation before expanding unassigned access';
  end if;
end;
$private_file_admin_count_guard$;

drop policy if exists "client_private_storage_objects_select_visible_own_or_admin"
  on storage.objects;

create policy "client_private_storage_objects_select_visible_own_or_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'client-private'
    and (
      (
        exists (
          select 1
          from public.user_roles as roles
          where roles.profile_id = (select auth.uid())
            and roles.role = 'admin'
        )
        and exists (
          select 1
          from public.client_files as f
          where f.bucket_id = storage.objects.bucket_id
            and f.object_path = storage.objects.name
        )
      )
      or exists (
        select 1
        from public.client_files as f
        join public.clients as c on c.id = f.client_id
        where f.bucket_id = storage.objects.bucket_id
          and f.object_path = storage.objects.name
          and f.client_visible_at is not null
          and c.profile_id = (select auth.uid())
      )
    )
  );
