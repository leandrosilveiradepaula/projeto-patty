alter table public.client_files
  add column uploaded_by_profile_id uuid not null
    references public.profiles (id) on delete restrict,
  add column client_visible_at timestamptz,
  add column client_visibility_set_by_profile_id uuid
    references public.profiles (id) on delete restrict,
  add constraint client_files_visibility_pair check (
    (client_visible_at is null) = (client_visibility_set_by_profile_id is null)
  );

create index client_files_uploaded_by_profile_id_idx
  on public.client_files (uploaded_by_profile_id);

create index client_files_client_visibility_set_by_profile_id_idx
  on public.client_files (client_visibility_set_by_profile_id);

drop policy "client_files_select_own_or_active_assignment"
  on public.client_files;

create policy "client_files_select_visible_own_or_admin"
  on public.client_files
  for select
  to authenticated
  using (
    (
      client_visible_at is not null
      and exists (
        select 1
        from public.clients
        where clients.id = client_files.client_id
          and clients.profile_id = (select auth.uid())
      )
    )
    or exists (
      select 1
      from public.user_roles
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'admin'
    )
  );

drop policy "client_private_storage_objects_select_own_or_active_assignment"
  on storage.objects;

create policy "client_private_storage_objects_select_visible_own_or_admin"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'client-private'
    and exists (
      select 1
      from public.client_files
      join public.clients
        on clients.id = client_files.client_id
      where client_files.bucket_id = storage.objects.bucket_id
        and client_files.object_path = storage.objects.name
        and (
          (
            client_files.client_visible_at is not null
            and clients.profile_id = (select auth.uid())
          )
          or exists (
            select 1
            from public.user_roles
            where user_roles.profile_id = (select auth.uid())
              and user_roles.role = 'admin'
          )
        )
    )
  );
