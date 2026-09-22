create table public.client_file_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  requester_profile_id uuid not null references public.profiles (id) on delete restrict,
  file_kind public.client_file_kind not null,
  original_filename text not null,
  file_extension text not null,
  claimed_mime_type text not null,
  declared_byte_size bigint not null,
  temp_object_path text generated always as (
    'pending/' || client_id::text || '/' || id::text || '.' || lower(file_extension)
  ) stored,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  constraint client_file_upload_sessions_original_filename_not_blank
    check (length(trim(original_filename)) > 0),
  constraint client_file_upload_sessions_extension_lowercase
    check (file_extension = lower(file_extension)),
  constraint client_file_upload_sessions_format_allowed check (
    (
      file_kind = 'photo'
      and file_extension in ('jpg', 'jpeg', 'png', 'webp')
      and claimed_mime_type = case file_extension
        when 'jpg' then 'image/jpeg'
        when 'jpeg' then 'image/jpeg'
        when 'png' then 'image/png'
        when 'webp' then 'image/webp'
      end
    )
    or (
      file_kind in ('exam', 'document')
      and file_extension in ('pdf', 'jpg', 'jpeg', 'png')
      and claimed_mime_type = case file_extension
        when 'pdf' then 'application/pdf'
        when 'jpg' then 'image/jpeg'
        when 'jpeg' then 'image/jpeg'
        when 'png' then 'image/png'
      end
    )
  ),
  constraint client_file_upload_sessions_size_allowed check (
    declared_byte_size > 0
    and (
      (file_kind = 'photo' and declared_byte_size <= 10485760)
      or
      (file_kind in ('exam', 'document') and declared_byte_size <= 20971520)
    )
  ),
  constraint client_file_upload_sessions_status_allowed
    check (status in ('pending', 'validating', 'accepted', 'rejected', 'expired')),
  constraint client_file_upload_sessions_expiry_after_creation
    check (expires_at > created_at),
  unique (temp_object_path)
);

create index client_file_upload_sessions_client_created_idx
  on public.client_file_upload_sessions (client_id, created_at desc);

create index client_file_upload_sessions_requester_status_idx
  on public.client_file_upload_sessions (requester_profile_id, status);

alter table public.client_file_upload_sessions enable row level security;

revoke all on table public.client_file_upload_sessions from anon, authenticated;

grant select on table public.client_file_upload_sessions to authenticated;

grant insert (
  client_id,
  requester_profile_id,
  file_kind,
  original_filename,
  file_extension,
  claimed_mime_type,
  declared_byte_size
) on table public.client_file_upload_sessions to authenticated;

create policy "client_file_upload_sessions_select_own_or_admin"
  on public.client_file_upload_sessions
  for select
  to authenticated
  using (
    (
      requester_profile_id = (select auth.uid())
      and exists (
        select 1
        from public.clients
        where clients.id = client_file_upload_sessions.client_id
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

create policy "client_file_upload_sessions_insert_client_self"
  on public.client_file_upload_sessions
  for insert
  to authenticated
  with check (
    requester_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.user_roles
      where user_roles.profile_id = (select auth.uid())
        and user_roles.role = 'client'
    )
    and exists (
      select 1
      from public.clients
      where clients.id = client_file_upload_sessions.client_id
        and clients.profile_id = (select auth.uid())
    )
  );

create policy "client_private_storage_objects_insert_authorized_pending"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'client-private'
    and exists (
      select 1
      from public.client_file_upload_sessions
      join public.clients
        on clients.id = client_file_upload_sessions.client_id
      where client_file_upload_sessions.temp_object_path = storage.objects.name
        and client_file_upload_sessions.requester_profile_id = (select auth.uid())
        and client_file_upload_sessions.status = 'pending'
        and client_file_upload_sessions.expires_at > now()
        and clients.profile_id = (select auth.uid())
    )
  );
