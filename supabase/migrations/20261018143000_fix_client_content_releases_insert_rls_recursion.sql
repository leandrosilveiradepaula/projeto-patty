-- J6: break circular RLS expansion on client content release INSERT.
-- The old INSERT policy selected educational_content_versions directly.
-- That table's SELECT policy consults client_content_releases, which causes
-- an infinite recursion error when PostgreSQL expands the original INSERT RLS.
--
-- Use a non-inlined PL/pgSQL lookup with the caller's exact privileges.
-- SECURITY INVOKER means this lookup still honors the version SELECT RLS;
-- no privileged bypass, new table grant, or policy of broader visibility.
create function app_private.educational_content_version_is_published_for_release(
  p_educational_content_version_id uuid
)
returns boolean
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  v_is_published boolean;
begin
  select exists (
    select 1
    from public.educational_content_versions v
    where v.id = p_educational_content_version_id
      and v.published_at is not null
  )
  into v_is_published;

  return v_is_published;
end;
$$;

revoke all on function app_private.educational_content_version_is_published_for_release(uuid)
  from public, anon;
grant execute on function app_private.educational_content_version_is_published_for_release(uuid)
  to authenticated;

drop policy "client_content_releases_admin_assigned_insert"
  on public.client_content_releases;

create policy "client_content_releases_admin_assigned_insert"
  on public.client_content_releases
  for insert to authenticated
  with check (
    released_by_profile_id = (select auth.uid())
    and app_private.educational_content_version_is_published_for_release(
      educational_content_version_id
    )
    and exists (
      select 1
      from public.user_roles
      join public.client_assignments
        on client_assignments.staff_profile_id = user_roles.profile_id
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
        and client_assignments.client_id = client_content_releases.client_id
        and client_assignments.ended_at is null
    )
  );

-- The restrictive admin MFA policy on the release table and the
-- require_published_educational_content_version_for_release trigger remain.

-- Reuse the existing trigger as an independent integrity guard. The UI
-- already requires an asset before release; direct REST INSERT must not
-- bypass that requirement. Only registered metadata is checked here: this
-- cannot prove the remote Blob exists or that distribution is licensed.
-- Existing releases remain unchanged. The function runs as invoker;
-- row-level policies and all grants remain unchanged.
create or replace function public.require_published_educational_content_version_for_release()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.educational_content_versions v
    where v.id = new.educational_content_version_id
      and v.published_at is not null
  ) then
    raise exception 'content release requires a published educational content version'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.educational_content_assets a
    where a.educational_content_version_id = new.educational_content_version_id
  ) then
    raise exception 'content release requires a registered private asset'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function public.require_published_educational_content_version_for_release()
  from public, anon, authenticated;
