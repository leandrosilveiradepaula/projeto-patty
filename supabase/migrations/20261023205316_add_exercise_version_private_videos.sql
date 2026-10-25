create table public.exercise_version_videos (
  id uuid primary key default gen_random_uuid(),
  exercise_version_id uuid not null unique references public.exercise_versions(id) on delete restrict,
  storage_provider text not null default 'vercel_blob'
    check (storage_provider = 'vercel_blob'),
  storage_path text not null unique
    check (
      storage_path ~ '^exercise-videos/[0-9a-f-]{36}[.]mp4$'
    ),
  content_type text not null check (content_type = 'video/mp4'),
  byte_size bigint not null check (byte_size > 0),
  sha256_hex text not null check (sha256_hex ~ '^[0-9a-f]{64}$'),
  verified_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index exercise_version_videos_version_idx
  on public.exercise_version_videos (exercise_version_id);

alter table public.exercise_version_videos enable row level security;

revoke all on table public.exercise_version_videos from anon, authenticated;
grant select, insert, update, delete on table public.exercise_version_videos to authenticated;

create policy admin_mfa_aal2_required
  on public.exercise_version_videos
  as restrictive for all to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy exercise_version_videos_admin_all
  on public.exercise_version_videos
  for all to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where profile_id = (select auth.uid()) and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where profile_id = (select auth.uid()) and role = 'admin'
    )
  );

create policy exercise_version_videos_select_own_published_training
  on public.exercise_version_videos
  for select to authenticated
  using (
    exists (
      select 1
      from public.client_training_plan_items item
      join public.client_training_plan_versions plan_version
        on plan_version.id = item.training_plan_version_id
       and plan_version.published_at is not null
      join public.client_training_plans plan
        on plan.id = plan_version.training_plan_id
      join public.clients client
        on client.id = plan.client_id
      where item.exercise_version_id = exercise_version_videos.exercise_version_id
        and client.profile_id = (select auth.uid())
    )
  );

create function public.reject_published_exercise_version_video_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  -- An UPDATE must check the OLD association as well as the NEW target:
  -- otherwise a video for a published exercise could be moved to a draft.
  if tg_op in ('UPDATE', 'DELETE') then
    if exists (
      select 1 from public.exercise_versions
      where id = old.exercise_version_id and published_at is not null
    ) then
      raise exception 'exercise video for a published version is immutable'
        using errcode = '55000';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    if exists (
      select 1 from public.exercise_versions
      where id = new.exercise_version_id and published_at is not null
    ) then
      raise exception 'exercise video for a published version is immutable'
        using errcode = '55000';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create trigger exercise_version_videos_freeze_after_publication
  before insert or update or delete on public.exercise_version_videos
  for each row execute function public.reject_published_exercise_version_video_mutation();

revoke all on function public.reject_published_exercise_version_video_mutation()
  from public, anon, authenticated;
