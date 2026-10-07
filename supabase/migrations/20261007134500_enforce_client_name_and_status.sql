alter table public.clients
  add column full_name text;

update public.clients c
set full_name = btrim(p.display_name)
from public.profiles p
where p.id = c.profile_id
  and nullif(btrim(p.display_name), '') is not null;

do $$
begin
  if exists (
    select 1
    from public.clients
    where nullif(btrim(full_name), '') is null
  ) then
    raise exception 'Cannot enforce client full_name: unnamed clients still exist';
  end if;
end
$$;

update public.clients c
set status = case
  when exists (
    select 1
    from public.client_assignments ca
    where ca.client_id = c.id
      and ca.ended_at is null
  ) then 'active'
  else 'inactive'
end;

alter table public.clients
  alter column full_name set default '',
  alter column full_name set not null,
  alter column status set not null;

alter table public.clients
  add constraint clients_full_name_valid
    check (
      full_name = btrim(full_name)
      and char_length(full_name) between 2 and 120
    ),
  add constraint clients_status_valid
    check (status in ('active', 'inactive'));

create or replace function private.enforce_client_full_name()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_display_name text;
begin
  if nullif(btrim(new.full_name), '') is null then
    if new.profile_id is null then
      raise exception 'Client full_name is required';
    end if;

    select nullif(btrim(p.display_name), '')
      into v_display_name
    from public.profiles p
    where p.id = new.profile_id;

    if v_display_name is null then
      raise exception 'Client full_name is required';
    end if;

    new.full_name := v_display_name;
  else
    new.full_name := btrim(new.full_name);
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_client_full_name() from public;
revoke all on function private.enforce_client_full_name() from anon;
revoke all on function private.enforce_client_full_name() from authenticated;

drop trigger if exists clients_enforce_full_name on public.clients;
create trigger clients_enforce_full_name
before insert or update of full_name, profile_id
on public.clients
for each row
execute function private.enforce_client_full_name();

create or replace function private.sync_client_full_name_from_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  if new.display_name is not distinct from old.display_name then
    return new;
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.profile_id = new.id
  ) then
    return new;
  end if;

  v_display_name := nullif(btrim(new.display_name), '');

  if v_display_name is null then
    raise exception 'Client profile display_name cannot be empty';
  end if;

  update public.clients
  set
    full_name = v_display_name,
    updated_at = now()
  where profile_id = new.id;

  return new;
end;
$$;

revoke all on function private.sync_client_full_name_from_profile() from public;
revoke all on function private.sync_client_full_name_from_profile() from anon;
revoke all on function private.sync_client_full_name_from_profile() from authenticated;

drop trigger if exists profiles_sync_client_full_name on public.profiles;
create trigger profiles_sync_client_full_name
after update of display_name
on public.profiles
for each row
execute function private.sync_client_full_name_from_profile();

create or replace function private.sync_client_status_from_assignments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_id uuid;
begin
  if tg_op = 'DELETE' then
    v_client_id := old.client_id;
  else
    v_client_id := new.client_id;
  end if;

  update public.clients c
  set
    status = case
      when exists (
        select 1
        from public.client_assignments ca
        where ca.client_id = v_client_id
          and ca.ended_at is null
      ) then 'active'
      else 'inactive'
    end,
    updated_at = now()
  where c.id = v_client_id;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_client_status_from_assignments() from public;
revoke all on function private.sync_client_status_from_assignments() from anon;
revoke all on function private.sync_client_status_from_assignments() from authenticated;

drop trigger if exists client_assignments_sync_client_status on public.client_assignments;
create trigger client_assignments_sync_client_status
after insert or update of ended_at or delete
on public.client_assignments
for each row
execute function private.sync_client_status_from_assignments();
