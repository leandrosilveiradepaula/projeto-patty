create table public.educational_contents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.educational_content_versions (
  id uuid primary key default gen_random_uuid(),
  educational_content_id uuid not null references public.educational_contents (id) on delete restrict,
  version_number integer not null,
  title text not null,
  category_key text,
  content_type_key text,
  phase_key text,
  display_order integer not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (educational_content_id, version_number),
  constraint educational_content_versions_number_positive check (version_number > 0),
  constraint educational_content_versions_title_not_blank check (length(trim(title)) > 0),
  constraint educational_content_versions_category_key_not_blank check (category_key is null or length(trim(category_key)) > 0),
  constraint educational_content_versions_content_type_key_not_blank check (content_type_key is null or length(trim(content_type_key)) > 0),
  constraint educational_content_versions_phase_key_not_blank check (phase_key is null or length(trim(phase_key)) > 0),
  constraint educational_content_versions_display_order_positive check (display_order > 0)
);

create index educational_content_versions_content_id_idx on public.educational_content_versions (educational_content_id);
create index educational_content_versions_published_at_idx on public.educational_content_versions (published_at) where published_at is not null;

alter table public.educational_contents enable row level security;
alter table public.educational_content_versions enable row level security;

revoke all on table public.educational_contents, public.educational_content_versions from anon, authenticated;
grant select, insert, update, delete on table public.educational_contents, public.educational_content_versions to authenticated;

create policy "educational_contents_admin_select"
  on public.educational_contents for select to authenticated
  using (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'));
create policy "educational_contents_admin_insert"
  on public.educational_contents for insert to authenticated
  with check (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'));
create policy "educational_contents_admin_update"
  on public.educational_contents for update to authenticated
  using (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'))
  with check (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'));
create policy "educational_contents_admin_delete"
  on public.educational_contents for delete to authenticated
  using (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'));

create policy "educational_content_versions_admin_select"
  on public.educational_content_versions for select to authenticated
  using (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'));
create policy "educational_content_versions_admin_insert"
  on public.educational_content_versions for insert to authenticated
  with check (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'));
create policy "educational_content_versions_admin_update"
  on public.educational_content_versions for update to authenticated
  using (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'))
  with check (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'));
create policy "educational_content_versions_admin_delete"
  on public.educational_content_versions for delete to authenticated
  using (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'));

create function public.reject_published_educational_content_version_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.published_at is not null then
    raise exception 'published educational content version is immutable' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger educational_content_versions_freeze_after_publication
  before update or delete on public.educational_content_versions
  for each row execute function public.reject_published_educational_content_version_mutation();

revoke all on function public.reject_published_educational_content_version_mutation() from public;
