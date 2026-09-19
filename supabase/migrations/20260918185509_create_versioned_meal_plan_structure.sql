create table public.meal_plan_versions (
  id uuid primary key default gen_random_uuid(),
  protocol_version_id uuid not null,
  client_id uuid not null,
  food_equivalent_catalog_version_id uuid,
  created_at timestamptz not null default now(),
  unique (protocol_version_id),
  unique (id, client_id),
  constraint meal_plan_versions_protocol_client_fkey foreign key (protocol_version_id, client_id)
    references public.protocol_versions (id, client_id) on delete restrict
);

create table public.meal_plan_variants (
  id uuid primary key default gen_random_uuid(),
  meal_plan_version_id uuid not null,
  client_id uuid not null,
  variant_key text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (id, meal_plan_version_id),
  unique (meal_plan_version_id, variant_key),
  constraint meal_plan_variants_plan_client_fkey foreign key (meal_plan_version_id, client_id)
    references public.meal_plan_versions (id, client_id) on delete restrict,
  constraint meal_plan_variants_key_not_blank check (length(trim(variant_key)) > 0)
);

create table public.meal_plan_cycles (
  id uuid primary key default gen_random_uuid(),
  meal_plan_version_id uuid not null references public.meal_plan_versions (id) on delete restrict,
  client_id uuid not null,
  created_at timestamptz not null default now(),
  unique (id, meal_plan_version_id),
  constraint meal_plan_cycles_client_fkey foreign key (meal_plan_version_id, client_id)
    references public.meal_plan_versions (id, client_id) on delete restrict
);

create table public.meal_plan_cycle_steps (
  cycle_id uuid not null,
  meal_plan_version_id uuid not null,
  variant_id uuid not null,
  position integer not null,
  primary key (cycle_id, position),
  constraint meal_plan_cycle_steps_cycle_fkey foreign key (cycle_id, meal_plan_version_id)
    references public.meal_plan_cycles (id, meal_plan_version_id) on delete restrict,
  constraint meal_plan_cycle_steps_variant_fkey foreign key (variant_id, meal_plan_version_id)
    references public.meal_plan_variants (id, meal_plan_version_id) on delete restrict,
  constraint meal_plan_cycle_steps_position_positive check (position > 0)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  meal_plan_variant_id uuid not null references public.meal_plan_variants (id) on delete restrict,
  position integer not null,
  label text,
  created_at timestamptz not null default now(),
  unique (meal_plan_variant_id, position),
  constraint meals_position_positive check (position > 0)
);

create table public.meal_dose_allocations (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete restrict,
  dose_type text not null,
  dose_quantity numeric(12,4) not null,
  created_at timestamptz not null default now(),
  unique (meal_id, dose_type),
  constraint meal_dose_allocations_type check (dose_type in ('protein', 'carbohydrate', 'fat')),
  constraint meal_dose_allocations_positive check (dose_quantity > 0)
);

create index meal_plan_versions_client_id_idx on public.meal_plan_versions (client_id);
create index meal_plan_versions_catalog_version_id_idx on public.meal_plan_versions (food_equivalent_catalog_version_id);
create index meal_plan_variants_client_id_idx on public.meal_plan_variants (client_id);
create index meal_plan_cycles_client_id_idx on public.meal_plan_cycles (client_id);
create index meal_plan_cycles_version_id_idx on public.meal_plan_cycles (meal_plan_version_id);
create index meal_plan_cycle_steps_variant_id_idx on public.meal_plan_cycle_steps (variant_id);
create index meals_meal_plan_variant_id_idx on public.meals (meal_plan_variant_id);
create index meal_dose_allocations_meal_id_idx on public.meal_dose_allocations (meal_id);

alter table public.meal_plan_versions enable row level security;
alter table public.meal_plan_variants enable row level security;
alter table public.meal_plan_cycles enable row level security;
alter table public.meal_plan_cycle_steps enable row level security;
alter table public.meals enable row level security;
alter table public.meal_dose_allocations enable row level security;

revoke all on table public.meal_plan_versions, public.meal_plan_variants, public.meal_plan_cycles, public.meal_plan_cycle_steps, public.meals, public.meal_dose_allocations from anon, authenticated;
grant select, insert, update, delete on table public.meal_plan_versions, public.meal_plan_variants, public.meal_plan_cycles, public.meal_plan_cycle_steps, public.meals, public.meal_dose_allocations to authenticated;

create function public.meal_plan_version_is_draft(p_meal_plan_version_id uuid)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.meal_plan_versions mpv
    join public.protocol_versions pv on pv.id = mpv.protocol_version_id
    join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin'
    join public.client_assignments ca
      on ca.client_id = pv.client_id
      and ca.staff_profile_id = ur.profile_id
      and ca.ended_at is null
    where mpv.id = p_meal_plan_version_id
      and pv.submitted_for_review_at is null
  );
$$;

create function public.meal_plan_version_is_published_for_current_client(p_meal_plan_version_id uuid)
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.meal_plan_versions mpv
    join public.protocol_versions pv on pv.id = mpv.protocol_version_id
    join public.protocol_publications pp on pp.protocol_version_id = pv.id
    join public.clients c on c.id = pv.client_id
    where mpv.id = p_meal_plan_version_id
      and c.profile_id = (select auth.uid())
  );
$$;

create policy "meal_plan_versions_admin_assigned_draft_all"
  on public.meal_plan_versions for all to authenticated
  using (exists (
    select 1 from public.protocol_versions pv
    join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin'
    join public.client_assignments ca
      on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null
    where pv.id = meal_plan_versions.protocol_version_id
      and pv.client_id = meal_plan_versions.client_id
      and pv.submitted_for_review_at is null
  ))
  with check (exists (
    select 1 from public.protocol_versions pv
    join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin'
    join public.client_assignments ca
      on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null
    where pv.id = meal_plan_versions.protocol_version_id
      and pv.client_id = meal_plan_versions.client_id
      and pv.submitted_for_review_at is null
  ));
create policy "meal_plan_versions_admin_assigned_select"
  on public.meal_plan_versions for select to authenticated
  using (exists (
    select 1 from public.protocol_versions pv
    join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin'
    join public.client_assignments ca
      on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null
    where pv.id = meal_plan_versions.protocol_version_id
      and pv.client_id = meal_plan_versions.client_id
  ));
create policy "meal_plan_versions_client_select_published"
  on public.meal_plan_versions for select to authenticated
  using (exists (
    select 1
    from public.protocol_versions pv
    join public.protocol_publications pp on pp.protocol_version_id = pv.id
    join public.clients c on c.id = pv.client_id
    where pv.id = meal_plan_versions.protocol_version_id
      and c.profile_id = (select auth.uid())
  ));

create policy "meal_plan_variants_admin_assigned_draft_all"
  on public.meal_plan_variants for all to authenticated
  using (public.meal_plan_version_is_draft(meal_plan_version_id))
  with check (public.meal_plan_version_is_draft(meal_plan_version_id));
create policy "meal_plan_variants_client_select_published"
  on public.meal_plan_variants for select to authenticated
  using (public.meal_plan_version_is_published_for_current_client(meal_plan_version_id));
create policy "meal_plan_variants_admin_assigned_select"
  on public.meal_plan_variants for select to authenticated
  using (exists (
    select 1 from public.meal_plan_versions mp
    join public.protocol_versions pv on pv.id = mp.protocol_version_id
    join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin'
    join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null
    where mp.id = meal_plan_variants.meal_plan_version_id
 ));

create policy "meal_plan_cycles_admin_assigned_draft_all"
  on public.meal_plan_cycles for all to authenticated
  using (public.meal_plan_version_is_draft(meal_plan_version_id))
  with check (public.meal_plan_version_is_draft(meal_plan_version_id));
create policy "meal_plan_cycles_client_select_published"
  on public.meal_plan_cycles for select to authenticated
  using (public.meal_plan_version_is_published_for_current_client(meal_plan_version_id));
create policy "meal_plan_cycles_admin_assigned_select"
  on public.meal_plan_cycles for select to authenticated
  using (exists (
    select 1 from public.meal_plan_versions mp
    join public.protocol_versions pv on pv.id = mp.protocol_version_id
    join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin'
    join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null
    where mp.id = meal_plan_cycles.meal_plan_version_id
 ));

create policy "meal_plan_cycle_steps_admin_assigned_draft_all"
  on public.meal_plan_cycle_steps for all to authenticated
  using (public.meal_plan_version_is_draft(meal_plan_version_id))
  with check (public.meal_plan_version_is_draft(meal_plan_version_id));
create policy "meal_plan_cycle_steps_client_select_published"
  on public.meal_plan_cycle_steps for select to authenticated
  using (public.meal_plan_version_is_published_for_current_client(meal_plan_version_id));
create policy "meal_plan_cycle_steps_admin_assigned_select"
  on public.meal_plan_cycle_steps for select to authenticated
  using (exists (
    select 1 from public.meal_plan_versions mp
    join public.protocol_versions pv on pv.id = mp.protocol_version_id
    join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin'
    join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null
    where mp.id = meal_plan_cycle_steps.meal_plan_version_id
 ));

create policy "meals_admin_assigned_draft_all"
  on public.meals for all to authenticated
  using (exists (
    select 1 from public.meal_plan_variants mpv
    where mpv.id = meals.meal_plan_variant_id
      and public.meal_plan_version_is_draft(mpv.meal_plan_version_id)
  ))
  with check (exists (
    select 1 from public.meal_plan_variants mpv
    where mpv.id = meals.meal_plan_variant_id
      and public.meal_plan_version_is_draft(mpv.meal_plan_version_id)
  ));
create policy "meals_client_select_published"
  on public.meals for select to authenticated
  using (exists (
    select 1 from public.meal_plan_variants mpv
    where mpv.id = meals.meal_plan_variant_id
      and public.meal_plan_version_is_published_for_current_client(mpv.meal_plan_version_id)
  ));
create policy "meals_admin_assigned_select"
  on public.meals for select to authenticated
  using (exists (
    select 1 from public.meal_plan_variants v
    join public.meal_plan_versions mp on mp.id = v.meal_plan_version_id
    join public.protocol_versions pv on pv.id = mp.protocol_version_id
    join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin'
    join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null
    where v.id = meals.meal_plan_variant_id
 ));

create policy "meal_doses_admin_assigned_draft_all"
  on public.meal_dose_allocations for all to authenticated
  using (exists (
    select 1 from public.meals m
    join public.meal_plan_variants mpv on mpv.id = m.meal_plan_variant_id
    where m.id = meal_dose_allocations.meal_id
      and public.meal_plan_version_is_draft(mpv.meal_plan_version_id)
  ))
  with check (exists (
    select 1 from public.meals m
    join public.meal_plan_variants mpv on mpv.id = m.meal_plan_variant_id
    where m.id = meal_dose_allocations.meal_id
      and public.meal_plan_version_is_draft(mpv.meal_plan_version_id)
  ));
create policy "meal_doses_client_select_published"
  on public.meal_dose_allocations for select to authenticated
  using (exists (
    select 1 from public.meals m
    join public.meal_plan_variants mpv on mpv.id = m.meal_plan_variant_id
    where m.id = meal_dose_allocations.meal_id
      and public.meal_plan_version_is_published_for_current_client(mpv.meal_plan_version_id)
  ));
create policy "meal_doses_admin_assigned_select"
  on public.meal_dose_allocations for select to authenticated
  using (exists (
    select 1 from public.meals m
    join public.meal_plan_variants v on v.id = m.meal_plan_variant_id
    join public.meal_plan_versions mp on mp.id = v.meal_plan_version_id
    join public.protocol_versions pv on pv.id = mp.protocol_version_id
    join public.user_roles ur on ur.profile_id = (select auth.uid()) and ur.role = 'admin'
    join public.client_assignments ca on ca.client_id = pv.client_id and ca.staff_profile_id = ur.profile_id and ca.ended_at is null
    where m.id = meal_dose_allocations.meal_id
 ));

create function public.reject_meal_plan_mutation_after_protocol_review()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_plan_id uuid;
begin
  if tg_table_name = 'meal_plan_versions' then
    v_plan_id := case when tg_op = 'DELETE' then old.id else new.id end;
  elsif tg_table_name in ('meal_plan_variants', 'meal_plan_cycles', 'meal_plan_cycle_steps') then
    v_plan_id := case when tg_op = 'DELETE' then old.meal_plan_version_id else new.meal_plan_version_id end;
  elsif tg_table_name = 'meals' then
    select meal_plan_version_id into v_plan_id
    from public.meal_plan_variants
    where id = case when tg_op = 'DELETE' then old.meal_plan_variant_id else new.meal_plan_variant_id end;
  elsif tg_table_name = 'meal_dose_allocations' then
    select v.meal_plan_version_id into v_plan_id
    from public.meals m
    join public.meal_plan_variants v on v.id = m.meal_plan_variant_id
    where m.id = case when tg_op = 'DELETE' then old.meal_id else new.meal_id end;
  end if;
  if exists (
    select 1 from public.meal_plan_versions mp
    join public.protocol_versions pv on pv.id = mp.protocol_version_id
    where mp.id = v_plan_id and pv.submitted_for_review_at is not null
  ) then
    raise exception 'meal plan content is frozen after protocol submission for review' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger meal_plan_versions_freeze_after_review before update or delete on public.meal_plan_versions for each row execute function public.reject_meal_plan_mutation_after_protocol_review();
create trigger meal_plan_variants_freeze_after_review before insert or update or delete on public.meal_plan_variants for each row execute function public.reject_meal_plan_mutation_after_protocol_review();
create trigger meal_plan_cycles_freeze_after_review before insert or update or delete on public.meal_plan_cycles for each row execute function public.reject_meal_plan_mutation_after_protocol_review();
create trigger meal_plan_cycle_steps_freeze_after_review before insert or update or delete on public.meal_plan_cycle_steps for each row execute function public.reject_meal_plan_mutation_after_protocol_review();
create trigger meals_freeze_after_review before insert or update or delete on public.meals for each row execute function public.reject_meal_plan_mutation_after_protocol_review();
create trigger meal_doses_freeze_after_review before insert or update or delete on public.meal_dose_allocations for each row execute function public.reject_meal_plan_mutation_after_protocol_review();

revoke all on function public.meal_plan_version_is_draft(uuid) from public;
revoke all on function public.meal_plan_version_is_published_for_current_client(uuid) from public;
revoke all on function public.reject_meal_plan_mutation_after_protocol_review() from public;
grant execute on function public.meal_plan_version_is_draft(uuid) to authenticated;
grant execute on function public.meal_plan_version_is_published_for_current_client(uuid) to authenticated;
