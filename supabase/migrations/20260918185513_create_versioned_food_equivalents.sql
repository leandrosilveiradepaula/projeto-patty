create table public.food_equivalent_catalogs (
  id uuid primary key default gen_random_uuid(),
  catalog_key text not null unique,
  created_at timestamptz not null default now(),
  constraint food_equivalent_catalogs_key_not_blank check (length(trim(catalog_key)) > 0)
);

create table public.food_equivalent_catalog_versions (
  id uuid primary key default gen_random_uuid(),
  catalog_id uuid not null references public.food_equivalent_catalogs (id) on delete restrict,
  version_number integer not null,
  created_at timestamptz not null default now(),
  unique (catalog_id, version_number),
  constraint food_equivalent_catalog_versions_number_positive check (version_number > 0)
);

create table public.food_equivalent_groups (
  id uuid primary key default gen_random_uuid(),
  catalog_version_id uuid not null references public.food_equivalent_catalog_versions (id) on delete restrict,
  group_key text not null,
  label text not null,
  position integer not null,
  unique (catalog_version_id, group_key),
  unique (catalog_version_id, position),
  constraint food_equivalent_groups_key_not_blank check (length(trim(group_key)) > 0),
  constraint food_equivalent_groups_label_not_blank check (length(trim(label)) > 0),
  constraint food_equivalent_groups_position_positive check (position > 0)
);

create table public.food_equivalent_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.food_equivalent_groups (id) on delete restrict,
  item_key text not null,
  label text not null,
  position integer not null,
  unique (group_id, item_key),
  unique (group_id, position),
  constraint food_equivalent_items_key_not_blank check (length(trim(item_key)) > 0),
  constraint food_equivalent_items_label_not_blank check (length(trim(label)) > 0),
  constraint food_equivalent_items_position_positive check (position > 0)
);

alter table public.meal_plan_versions add constraint meal_plan_versions_catalog_version_fkey
  foreign key (food_equivalent_catalog_version_id) references public.food_equivalent_catalog_versions (id) on delete restrict;

create index food_equivalent_catalog_versions_catalog_id_idx on public.food_equivalent_catalog_versions (catalog_id);
create index food_equivalent_groups_catalog_version_id_idx on public.food_equivalent_groups (catalog_version_id);
create index food_equivalent_items_group_id_idx on public.food_equivalent_items (group_id);

alter table public.food_equivalent_catalogs enable row level security;
alter table public.food_equivalent_catalog_versions enable row level security;
alter table public.food_equivalent_groups enable row level security;
alter table public.food_equivalent_items enable row level security;

revoke all on table public.food_equivalent_catalogs, public.food_equivalent_catalog_versions, public.food_equivalent_groups, public.food_equivalent_items from anon, authenticated;
grant select, insert, update, delete on table public.food_equivalent_catalogs, public.food_equivalent_catalog_versions, public.food_equivalent_groups, public.food_equivalent_items to authenticated;

create function public.current_user_is_assigned_admin()
returns boolean
language sql
stable
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.client_assignments ca
      on ca.staff_profile_id = ur.profile_id
      and ca.ended_at is null
    where ur.profile_id = (select auth.uid())
      and ur.role = 'admin'
  );
$$;

create policy "food_equivalent_catalogs_assigned_admin_all"
  on public.food_equivalent_catalogs for all to authenticated
  using (public.current_user_is_assigned_admin())
  with check (public.current_user_is_assigned_admin());
create policy "food_equivalent_catalog_versions_assigned_admin_all"
  on public.food_equivalent_catalog_versions for all to authenticated
  using (public.current_user_is_assigned_admin())
  with check (public.current_user_is_assigned_admin());
create policy "food_equivalent_groups_assigned_admin_all"
  on public.food_equivalent_groups for all to authenticated
  using (public.current_user_is_assigned_admin())
  with check (public.current_user_is_assigned_admin());
create policy "food_equivalent_items_assigned_admin_all"
  on public.food_equivalent_items for all to authenticated
  using (public.current_user_is_assigned_admin())
  with check (public.current_user_is_assigned_admin());

create function public.reject_food_equivalent_mutation_when_referenced_by_frozen_protocol()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  v_catalog_version_id uuid;
begin
  if tg_table_name = 'food_equivalent_catalog_versions' then
    v_catalog_version_id := case when tg_op = 'DELETE' then old.id else new.id end;
  elsif tg_table_name = 'food_equivalent_groups' then
    v_catalog_version_id := case when tg_op = 'DELETE' then old.catalog_version_id else new.catalog_version_id end;
  elsif tg_table_name = 'food_equivalent_items' then
    select catalog_version_id into v_catalog_version_id
    from public.food_equivalent_groups
    where id = case when tg_op = 'DELETE' then old.group_id else new.group_id end;
  end if;

  if exists (
    select 1
    from public.meal_plan_versions mp
    join public.protocol_versions pv on pv.id = mp.protocol_version_id
    where mp.food_equivalent_catalog_version_id = v_catalog_version_id
      and pv.submitted_for_review_at is not null
  ) then
    raise exception 'food equivalent content is frozen after protocol submission for review' using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger food_equivalent_catalog_versions_freeze_when_referenced
  before update or delete on public.food_equivalent_catalog_versions
  for each row execute function public.reject_food_equivalent_mutation_when_referenced_by_frozen_protocol();
create trigger food_equivalent_groups_freeze_when_referenced
  before insert or update or delete on public.food_equivalent_groups
  for each row execute function public.reject_food_equivalent_mutation_when_referenced_by_frozen_protocol();
create trigger food_equivalent_items_freeze_when_referenced
  before insert or update or delete on public.food_equivalent_items
  for each row execute function public.reject_food_equivalent_mutation_when_referenced_by_frozen_protocol();

revoke all on function public.current_user_is_assigned_admin() from public;
grant execute on function public.current_user_is_assigned_admin() to authenticated;
revoke all on function public.reject_food_equivalent_mutation_when_referenced_by_frozen_protocol() from public;
