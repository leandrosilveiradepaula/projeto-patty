create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table public.exercise_versions (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  version_number integer not null,
  name text not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (exercise_id, version_number),
  constraint exercise_versions_number_positive check (version_number > 0),
  constraint exercise_versions_name_not_blank check (length(trim(name)) > 0)
);

create index exercise_versions_exercise_id_idx on public.exercise_versions (exercise_id);
create index exercise_versions_published_at_idx on public.exercise_versions (published_at) where published_at is not null;

alter table public.exercises enable row level security;
alter table public.exercise_versions enable row level security;

revoke all on table public.exercises, public.exercise_versions from anon, authenticated;
grant select, insert, update, delete on table public.exercises, public.exercise_versions to authenticated;

create policy "exercises_admin_all"
  on public.exercises for all to authenticated
  using (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'))
  with check (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'));
create policy "exercise_versions_admin_all"
  on public.exercise_versions for all to authenticated
  using (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'))
  with check (exists (select 1 from public.user_roles where profile_id = (select auth.uid()) and role = 'admin'));

create function public.reject_published_exercise_version_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.published_at is not null then
    raise exception 'published exercise version is immutable' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger exercise_versions_freeze_after_publication
  before update or delete on public.exercise_versions
  for each row execute function public.reject_published_exercise_version_mutation();

revoke all on function public.reject_published_exercise_version_mutation() from public;
