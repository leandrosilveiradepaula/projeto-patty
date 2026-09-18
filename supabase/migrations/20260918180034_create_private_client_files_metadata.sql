create type public.client_file_kind as enum ('photo', 'exam', 'document');

create table public.client_files (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  file_kind public.client_file_kind not null,
  bucket_id text not null default 'client-private',
  object_path text not null,
  original_filename text,
  mime_type text,
  byte_size bigint,
  created_at timestamptz not null default now(),
  constraint client_files_bucket_id check (bucket_id = 'client-private'),
  constraint client_files_object_path_not_blank check (length(trim(object_path)) > 0),
  constraint client_files_object_path_matches_namespace check (
    object_path ~ (
      '^clients/' || client_id::text || '/' || file_kind::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.[A-Za-z0-9]+$'
    )
  ),
  constraint client_files_original_filename_not_blank check (
    original_filename is null or length(trim(original_filename)) > 0
  ),
  constraint client_files_mime_type_not_blank check (
    mime_type is null or length(trim(mime_type)) > 0
  ),
  constraint client_files_byte_size_positive check (byte_size is null or byte_size > 0),
  unique (bucket_id, object_path),
  unique (id, client_id)
);

create index client_files_client_id_idx on public.client_files (client_id);

alter table public.client_files enable row level security;

revoke all on type public.client_file_kind from anon, authenticated;
revoke all on table public.client_files from anon, authenticated;
grant usage on type public.client_file_kind to authenticated;
grant select on table public.client_files to authenticated;

create policy "client_files_select_own_or_active_assignment"
  on public.client_files
  for select to authenticated
  using (
    exists (
      select 1 from public.clients
      where clients.id = client_files.client_id
        and clients.profile_id = (select auth.uid())
    )
    or (
      exists (
        select 1 from public.user_roles
        where user_roles.profile_id = (select auth.uid())
          and user_roles.role = 'admin'
      )
      and exists (
        select 1 from public.client_assignments
        where client_assignments.client_id = client_files.client_id
          and client_assignments.staff_profile_id = (select auth.uid())
          and client_assignments.ended_at is null
      )
    )
  );

create policy "client_private_storage_objects_select_own_or_active_assignment"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-private'
    and exists (
      select 1
      from public.client_files
      join public.clients on clients.id = client_files.client_id
      where client_files.bucket_id = storage.objects.bucket_id
        and client_files.object_path = storage.objects.name
        and (
          clients.profile_id = (select auth.uid())
          or (
            exists (
              select 1 from public.user_roles
              where user_roles.profile_id = (select auth.uid())
                and user_roles.role = 'admin'
            )
            and exists (
              select 1 from public.client_assignments
              where client_assignments.client_id = client_files.client_id
                and client_assignments.staff_profile_id = (select auth.uid())
                and client_assignments.ended_at is null
            )
          )
        )
    )
  );
