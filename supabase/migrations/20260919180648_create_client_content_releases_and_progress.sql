create table public.client_content_releases (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  educational_content_version_id uuid not null references public.educational_content_versions (id) on delete restrict,
  released_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  released_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (id, client_id),
  unique (client_id, educational_content_version_id)
);

create table public.client_content_progress (
  client_content_release_id uuid primary key,
  client_id uuid not null,
  first_opened_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_content_progress_release_client_fkey foreign key (client_content_release_id, client_id)
    references public.client_content_releases (id, client_id) on delete restrict,
  constraint client_content_progress_completion_after_open check (
    completed_at is null or (first_opened_at is not null and completed_at >= first_opened_at)
  )
);

create index client_content_releases_client_id_idx on public.client_content_releases (client_id);
create index client_content_releases_version_id_idx on public.client_content_releases (educational_content_version_id);
create index client_content_progress_client_id_idx on public.client_content_progress (client_id);

alter table public.client_content_releases enable row level security;
alter table public.client_content_progress enable row level security;

revoke all on table public.client_content_releases, public.client_content_progress from anon, authenticated;
grant select, insert on table public.client_content_releases to authenticated;
grant select, insert, update on table public.client_content_progress to authenticated;

drop policy "educational_content_versions_admin_select" on public.educational_content_versions;
create policy "educational_content_versions_select_admin_or_released"
  on public.educational_content_versions for select to authenticated
  using (
    exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin')
    or exists (
      select 1
      from public.client_content_releases r
      join public.clients c on c.id = r.client_id
      where r.educational_content_version_id = educational_content_versions.id
        and c.profile_id = (select auth.uid())
    )
  );

create policy "client_content_releases_select_own_or_assigned_admin"
  on public.client_content_releases for select to authenticated
  using (
    exists (select 1 from public.clients where clients.id = client_content_releases.client_id and clients.profile_id = (select auth.uid()))
    or exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = client_content_releases.client_id and client_assignments.ended_at is null)
  );
create policy "client_content_releases_admin_assigned_insert"
  on public.client_content_releases for insert to authenticated
  with check (
    released_by_profile_id = (select auth.uid())
    and exists (select 1 from public.educational_content_versions where id = educational_content_version_id and published_at is not null)
    and exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = client_content_releases.client_id and client_assignments.ended_at is null)
  );

create policy "client_content_progress_select_own_or_assigned_admin"
  on public.client_content_progress for select to authenticated
  using (
    exists (select 1 from public.clients where clients.id = client_content_progress.client_id and clients.profile_id = (select auth.uid()))
    or exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = client_content_progress.client_id and client_assignments.ended_at is null)
  );
create policy "client_content_progress_admin_assigned_insert"
  on public.client_content_progress for insert to authenticated
  with check (exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = client_content_progress.client_id and client_assignments.ended_at is null));
create policy "client_content_progress_admin_assigned_update"
  on public.client_content_progress for update to authenticated
  using (exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = client_content_progress.client_id and client_assignments.ended_at is null))
  with check (exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = client_content_progress.client_id and client_assignments.ended_at is null));

create function public.require_published_educational_content_version_for_release()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1 from public.educational_content_versions
    where id = new.educational_content_version_id and published_at is not null
  ) then
    raise exception 'content release requires a published educational content version' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger client_content_releases_require_published_version
  before insert on public.client_content_releases
  for each row execute function public.require_published_educational_content_version_for_release();

revoke all on function public.require_published_educational_content_version_for_release() from public;
