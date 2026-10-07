create table public.client_training_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.client_training_plan_versions (
  id uuid primary key default gen_random_uuid(),
  training_plan_id uuid not null references public.client_training_plans(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  title text not null check (char_length(trim(title)) between 1 and 160),
  notes text check (notes is null or char_length(trim(notes)) between 1 and 4000),
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.profiles(id) on delete restrict,
  published_at timestamptz,
  published_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (training_plan_id, version_number),
  constraint client_training_plan_versions_review_consistent check (
    (reviewed_at is null and reviewed_by_profile_id is null)
    or
    (reviewed_at is not null and reviewed_by_profile_id is not null)
  ),
  constraint client_training_plan_versions_publish_consistent check (
    (published_at is null and published_by_profile_id is null)
    or
    (
      published_at is not null
      and published_by_profile_id is not null
      and reviewed_at is not null
      and reviewed_by_profile_id is not null
      and published_at >= reviewed_at
    )
  )
);

create unique index client_training_plan_versions_one_open_draft
  on public.client_training_plan_versions (training_plan_id)
  where published_at is null;

create index client_training_plan_versions_published_idx
  on public.client_training_plan_versions (training_plan_id, published_at desc)
  where published_at is not null;

create table public.client_training_plan_items (
  id uuid primary key default gen_random_uuid(),
  training_plan_version_id uuid not null references public.client_training_plan_versions(id) on delete restrict,
  position integer not null check (position > 0),
  exercise_version_id uuid references public.exercise_versions(id) on delete restrict,
  exercise_name text not null check (char_length(trim(exercise_name)) between 1 and 200),
  sets_text text not null check (char_length(trim(sets_text)) between 1 and 80),
  repetitions_text text not null check (char_length(trim(repetitions_text)) between 1 and 80),
  rest_text text check (rest_text is null or char_length(trim(rest_text)) between 1 and 120),
  execution_notes text check (execution_notes is null or char_length(trim(execution_notes)) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (training_plan_version_id, position)
);

create index client_training_plan_items_version_idx
  on public.client_training_plan_items (training_plan_version_id, position);

alter table public.client_training_plans enable row level security;
alter table public.client_training_plan_versions enable row level security;
alter table public.client_training_plan_items enable row level security;

revoke all on table
  public.client_training_plans,
  public.client_training_plan_versions,
  public.client_training_plan_items
from anon, authenticated;

grant select, insert on public.client_training_plans to authenticated;
grant select, insert, update on public.client_training_plan_versions to authenticated;
grant select, insert, update, delete on public.client_training_plan_items to authenticated;

create policy client_training_plans_select_assigned_admin_or_own_published
  on public.client_training_plans
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_training_plans.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
    or (
      exists (
        select 1
        from public.clients c
        where c.id = client_training_plans.client_id
          and c.profile_id = (select auth.uid())
      )
      and exists (
        select 1
        from public.client_training_plan_versions v
        where v.training_plan_id = client_training_plans.id
          and v.published_at is not null
      )
    )
  );

create policy client_training_plans_insert_assigned_admin_after_request
  on public.client_training_plans
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_training_plans.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
    and exists (
      select 1
      from public.client_training_requests r
      where r.client_id = client_training_plans.client_id
    )
  );

create policy admin_mfa_aal2_required
  on public.client_training_plans
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy client_training_plan_versions_select_assigned_admin_or_own_published
  on public.client_training_plan_versions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_training_plans p
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = p.client_id
       and ca.ended_at is null
      where p.id = client_training_plan_versions.training_plan_id
    )
    or (
      client_training_plan_versions.published_at is not null
      and exists (
        select 1
        from public.client_training_plans p
        join public.clients c on c.id = p.client_id
        where p.id = client_training_plan_versions.training_plan_id
          and c.profile_id = (select auth.uid())
      )
    )
  );

create policy client_training_plan_versions_insert_assigned_admin
  on public.client_training_plan_versions
  for insert
  to authenticated
  with check (
    created_by_profile_id = (select auth.uid())
    and reviewed_at is null
    and reviewed_by_profile_id is null
    and published_at is null
    and published_by_profile_id is null
    and exists (
      select 1
      from public.client_training_plans p
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = p.client_id
       and ca.ended_at is null
      where p.id = client_training_plan_versions.training_plan_id
    )
  );

create policy client_training_plan_versions_update_assigned_admin
  on public.client_training_plan_versions
  for update
  to authenticated
  using (
    published_at is null
    and exists (
      select 1
      from public.client_training_plans p
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = p.client_id
       and ca.ended_at is null
      where p.id = client_training_plan_versions.training_plan_id
    )
  )
  with check (
    (reviewed_by_profile_id is null or reviewed_by_profile_id = (select auth.uid()))
    and (published_by_profile_id is null or published_by_profile_id = (select auth.uid()))
    and exists (
      select 1
      from public.client_training_plans p
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = p.client_id
       and ca.ended_at is null
      where p.id = client_training_plan_versions.training_plan_id
    )
  );

create policy admin_mfa_aal2_required
  on public.client_training_plan_versions
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy client_training_plan_items_select_assigned_admin_or_own_published
  on public.client_training_plan_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.client_training_plan_versions v
      join public.client_training_plans p on p.id = v.training_plan_id
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = p.client_id
       and ca.ended_at is null
      where v.id = client_training_plan_items.training_plan_version_id
    )
    or exists (
      select 1
      from public.client_training_plan_versions v
      join public.client_training_plans p on p.id = v.training_plan_id
      join public.clients c on c.id = p.client_id
      where v.id = client_training_plan_items.training_plan_version_id
        and v.published_at is not null
        and c.profile_id = (select auth.uid())
    )
  );

create policy client_training_plan_items_insert_assigned_admin_draft
  on public.client_training_plan_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.client_training_plan_versions v
      join public.client_training_plans p on p.id = v.training_plan_id
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = p.client_id
       and ca.ended_at is null
      where v.id = client_training_plan_items.training_plan_version_id
        and v.reviewed_at is null
        and v.published_at is null
    )
  );

create policy client_training_plan_items_update_assigned_admin_draft
  on public.client_training_plan_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.client_training_plan_versions v
      join public.client_training_plans p on p.id = v.training_plan_id
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = p.client_id
       and ca.ended_at is null
      where v.id = client_training_plan_items.training_plan_version_id
        and v.reviewed_at is null
        and v.published_at is null
    )
  )
  with check (
    exists (
      select 1
      from public.client_training_plan_versions v
      join public.client_training_plans p on p.id = v.training_plan_id
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = p.client_id
       and ca.ended_at is null
      where v.id = client_training_plan_items.training_plan_version_id
        and v.reviewed_at is null
        and v.published_at is null
    )
  );

create policy client_training_plan_items_delete_assigned_admin_draft
  on public.client_training_plan_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.client_training_plan_versions v
      join public.client_training_plans p on p.id = v.training_plan_id
      join public.user_roles ur
        on ur.profile_id = (select auth.uid())
       and ur.role = 'admin'
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = p.client_id
       and ca.ended_at is null
      where v.id = client_training_plan_items.training_plan_version_id
        and v.reviewed_at is null
        and v.published_at is null
    )
  );

create policy admin_mfa_aal2_required
  on public.client_training_plan_items
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create function public.enforce_client_training_plan_version_lifecycle()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'training plan versions cannot be deleted'
      using errcode = '55000';
  end if;

  if old.published_at is not null then
    raise exception 'published training plan version is immutable'
      using errcode = '55000';
  end if;

  if new.training_plan_id is distinct from old.training_plan_id
     or new.version_number is distinct from old.version_number
     or new.created_by_profile_id is distinct from old.created_by_profile_id
     or new.created_at is distinct from old.created_at then
    raise exception 'training plan version identity is immutable'
      using errcode = '55000';
  end if;

  if old.reviewed_at is not null then
    if new.title is distinct from old.title
       or new.notes is distinct from old.notes
       or new.reviewed_at is distinct from old.reviewed_at
       or new.reviewed_by_profile_id is distinct from old.reviewed_by_profile_id then
      raise exception 'reviewed training plan version cannot be edited'
        using errcode = '55000';
    end if;
  end if;

  if old.reviewed_at is null and new.reviewed_at is not null then
    if not exists (
      select 1
      from public.client_training_plan_items i
      where i.training_plan_version_id = old.id
    ) then
      raise exception 'training plan must contain at least one exercise before review'
        using errcode = '23514';
    end if;
  end if;

  if old.published_at is null and new.published_at is not null then
    if new.reviewed_at is null then
      raise exception 'training plan must be reviewed before publication'
        using errcode = '23514';
    end if;
    if not exists (
      select 1
      from public.client_training_plan_items i
      where i.training_plan_version_id = old.id
    ) then
      raise exception 'training plan must contain at least one exercise before publication'
        using errcode = '23514';
    end if;
  end if;

  return new;
end
$$;

create trigger client_training_plan_versions_lifecycle
before update or delete on public.client_training_plan_versions
for each row
execute function public.enforce_client_training_plan_version_lifecycle();

create function public.enforce_client_training_plan_item_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_version_id uuid;
begin
  v_version_id := coalesce(new.training_plan_version_id, old.training_plan_version_id);

  if exists (
    select 1
    from public.client_training_plan_versions v
    where v.id = v_version_id
      and (v.reviewed_at is not null or v.published_at is not null)
  ) then
    raise exception 'reviewed or published training plan items are immutable'
      using errcode = '55000';
  end if;

  if tg_op <> 'DELETE'
     and new.exercise_version_id is not null
     and not exists (
       select 1
       from public.exercise_versions ev
       where ev.id = new.exercise_version_id
         and ev.published_at is not null
     ) then
    raise exception 'referenced exercise version must be published'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end
$$;

create trigger client_training_plan_items_mutation_guard
before insert or update or delete on public.client_training_plan_items
for each row
execute function public.enforce_client_training_plan_item_mutation();

create function public.create_client_training_plan_draft(
  p_client_id uuid,
  p_title text,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_plan_id uuid;
  v_version_number integer;
  v_version_id uuid;
begin
  if p_title is null or char_length(trim(p_title)) not between 1 and 160 then
    raise exception 'training plan title is required'
      using errcode = '22023';
  end if;

  if p_notes is not null
     and (char_length(trim(p_notes)) = 0 or char_length(trim(p_notes)) > 4000) then
    raise exception 'training plan notes are invalid'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    join public.client_assignments ca
      on ca.staff_profile_id = ur.profile_id
     and ca.client_id = p_client_id
     and ca.ended_at is null
    where ur.profile_id = (select auth.uid())
      and ur.role = 'admin'
  ) then
    raise exception 'active admin assignment is required'
      using errcode = '42501';
  end if;

  if not (select public.current_user_admin_mfa_satisfied()) then
    raise exception 'admin MFA AAL2 is required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.client_training_requests r
    where r.client_id = p_client_id
  ) then
    raise exception 'training request is required before prescription'
      using errcode = '23514';
  end if;

  insert into public.client_training_plans (client_id)
  values (p_client_id)
  on conflict (client_id) do nothing;

  select p.id
  into v_plan_id
  from public.client_training_plans p
  where p.client_id = p_client_id
  for update;

  if exists (
    select 1
    from public.client_training_plan_versions v
    where v.training_plan_id = v_plan_id
      and v.published_at is null
  ) then
    raise exception 'an open training plan draft already exists'
      using errcode = '23505';
  end if;

  select coalesce(max(v.version_number), 0) + 1
  into v_version_number
  from public.client_training_plan_versions v
  where v.training_plan_id = v_plan_id;

  insert into public.client_training_plan_versions (
    training_plan_id,
    version_number,
    title,
    notes,
    created_by_profile_id
  )
  values (
    v_plan_id,
    v_version_number,
    trim(p_title),
    nullif(trim(p_notes), ''),
    (select auth.uid())
  )
  returning id into v_version_id;

  return v_version_id;
end
$$;

create function public.review_client_training_plan_version(
  p_training_plan_version_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_result uuid;
begin
  update public.client_training_plan_versions
  set
    reviewed_at = now(),
    reviewed_by_profile_id = (select auth.uid())
  where id = p_training_plan_version_id
    and reviewed_at is null
    and published_at is null
  returning id into v_result;

  if v_result is null then
    raise exception 'training plan draft is not available for review'
      using errcode = '55000';
  end if;

  return v_result;
end
$$;

create function public.publish_client_training_plan_version(
  p_training_plan_version_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_result uuid;
begin
  update public.client_training_plan_versions
  set
    published_at = now(),
    published_by_profile_id = (select auth.uid())
  where id = p_training_plan_version_id
    and reviewed_at is not null
    and published_at is null
  returning id into v_result;

  if v_result is null then
    raise exception 'reviewed training plan is not available for publication'
      using errcode = '55000';
  end if;

  return v_result;
end
$$;

revoke all on function public.create_client_training_plan_draft(uuid,text,text)
  from public, anon;
revoke all on function public.review_client_training_plan_version(uuid)
  from public, anon;
revoke all on function public.publish_client_training_plan_version(uuid)
  from public, anon;

grant execute on function public.create_client_training_plan_draft(uuid,text,text)
  to authenticated;
grant execute on function public.review_client_training_plan_version(uuid)
  to authenticated;
grant execute on function public.publish_client_training_plan_version(uuid)
  to authenticated;
