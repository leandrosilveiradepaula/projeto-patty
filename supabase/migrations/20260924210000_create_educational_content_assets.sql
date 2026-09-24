create table public.educational_content_assets (
  id uuid primary key default gen_random_uuid(),
  educational_content_version_id uuid not null
    references public.educational_content_versions (id) on delete restrict,
  asset_key text not null default 'primary',
  storage_provider text not null,
  storage_path text not null,
  content_type text not null,
  byte_size bigint not null,
  sha256_hex text not null,
  created_at timestamptz not null default now(),
  unique (educational_content_version_id, asset_key),
  unique (storage_provider, storage_path),
  constraint educational_content_assets_asset_key_not_blank
    check (length(trim(asset_key)) > 0),
  constraint educational_content_assets_storage_provider_v1
    check (storage_provider = 'vercel_blob'),
  constraint educational_content_assets_storage_path_not_blank
    check (length(trim(storage_path)) > 0),
  constraint educational_content_assets_content_type_not_blank
    check (length(trim(content_type)) > 0),
  constraint educational_content_assets_byte_size_positive
    check (byte_size > 0),
  constraint educational_content_assets_sha256_hex
    check (sha256_hex ~ '^[0-9a-f]{64}$')
);

create index educational_content_assets_version_idx
  on public.educational_content_assets (educational_content_version_id);

create function public.reject_published_educational_content_asset_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  old_published_at timestamptz;
  new_published_at timestamptz;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select v.published_at
      into old_published_at
    from public.educational_content_versions v
    where v.id = old.educational_content_version_id;

    if old_published_at is not null then
      raise exception 'assets of a published educational content version are immutable'
        using errcode = '55000';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select v.published_at
      into new_published_at
    from public.educational_content_versions v
    where v.id = new.educational_content_version_id;

    if new_published_at is not null then
      raise exception 'assets can only be attached to an unpublished educational content version'
        using errcode = '55000';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke execute on function public.reject_published_educational_content_asset_mutation()
  from public, anon, authenticated;

create trigger educational_content_assets_freeze_after_publication
before insert or update or delete on public.educational_content_assets
for each row execute function public.reject_published_educational_content_asset_mutation();

alter table public.educational_content_assets enable row level security;

revoke all on table public.educational_content_assets from anon, authenticated;
grant select, insert, update, delete
  on table public.educational_content_assets
  to authenticated;

create policy admin_mfa_aal2_required
  on public.educational_content_assets
  as restrictive for all to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy educational_content_assets_select_admin_or_released
  on public.educational_content_assets
  for select to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
    or exists (
      select 1
      from public.client_content_releases r
      join public.clients c on c.id = r.client_id
      where r.educational_content_version_id =
            educational_content_assets.educational_content_version_id
        and c.profile_id = (select auth.uid())
    )
  );

create policy educational_content_assets_admin_insert
  on public.educational_content_assets
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy educational_content_assets_admin_update
  on public.educational_content_assets
  for update to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy educational_content_assets_admin_delete
  on public.educational_content_assets
  for delete to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );
