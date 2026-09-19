create table public.protocols (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  protocol_type text not null default 'nutrition',
  created_at timestamptz not null default now(),
  unique (id, client_id),
  constraint protocols_type check (protocol_type = 'nutrition')
);

create table public.protocol_versions (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null,
  client_id uuid not null,
  version_number integer not null,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  based_on_version_id uuid,
  submitted_for_review_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, client_id),
  unique (protocol_id, version_number),
  constraint protocol_versions_protocol_client_fkey foreign key (protocol_id, client_id)
    references public.protocols (id, client_id) on delete restrict,
  constraint protocol_versions_based_on_fkey foreign key (based_on_version_id, client_id)
    references public.protocol_versions (id, client_id) on delete restrict,
  constraint protocol_versions_number_positive check (version_number > 0)
);

create table public.protocol_version_approvals (
  id uuid primary key default gen_random_uuid(),
  protocol_version_id uuid not null,
  client_id uuid not null,
  approved_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  approved_at timestamptz not null default now(),
  unique (protocol_version_id),
  unique (id, protocol_version_id, client_id),
  constraint protocol_version_approvals_version_client_fkey foreign key (protocol_version_id, client_id)
    references public.protocol_versions (id, client_id) on delete restrict
);

create table public.protocol_publications (
  id uuid primary key default gen_random_uuid(),
  protocol_version_id uuid not null,
  client_id uuid not null,
  approval_id uuid not null,
  published_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  published_at timestamptz not null default now(),
  unique (protocol_version_id),
  constraint protocol_publications_approval_version_client_fkey foreign key (approval_id, protocol_version_id, client_id)
    references public.protocol_version_approvals (id, protocol_version_id, client_id) on delete restrict
);

create index protocols_client_id_idx on public.protocols (client_id);
create index protocol_versions_client_id_idx on public.protocol_versions (client_id);
create index protocol_versions_based_on_version_id_idx on public.protocol_versions (based_on_version_id);
create index protocol_versions_created_by_profile_id_idx on public.protocol_versions (created_by_profile_id);
create index protocol_version_approvals_client_id_idx on public.protocol_version_approvals (client_id);
create index protocol_version_approvals_approved_by_profile_id_idx on public.protocol_version_approvals (approved_by_profile_id);
create index protocol_publications_client_id_idx on public.protocol_publications (client_id);
create index protocol_publications_published_by_profile_id_idx on public.protocol_publications (published_by_profile_id);

alter table public.protocols enable row level security;
alter table public.protocol_versions enable row level security;
alter table public.protocol_version_approvals enable row level security;
alter table public.protocol_publications enable row level security;

revoke all on table public.protocols, public.protocol_versions, public.protocol_version_approvals, public.protocol_publications from anon, authenticated;
grant select on table public.protocols, public.protocol_versions, public.protocol_version_approvals, public.protocol_publications to authenticated;
grant insert on table public.protocols, public.protocol_versions, public.protocol_version_approvals, public.protocol_publications to authenticated;
grant update on table public.protocol_versions to authenticated;

create policy "protocols_admin_assigned_all"
  on public.protocols for all to authenticated
  using (exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocols.client_id and client_assignments.ended_at is null))
  with check (exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocols.client_id and client_assignments.ended_at is null));

create policy "protocols_client_select_published"
  on public.protocols for select to authenticated
  using (exists (select 1 from public.clients join public.protocol_versions on protocol_versions.protocol_id = protocols.id join public.protocol_publications on protocol_publications.protocol_version_id = protocol_versions.id where clients.id = protocols.client_id and clients.profile_id = (select auth.uid())));

create policy "protocol_versions_admin_assigned_all"
  on public.protocol_versions for all to authenticated
  using (exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_versions.client_id and client_assignments.ended_at is null))
  with check (created_by_profile_id = (select auth.uid()) and exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_versions.client_id and client_assignments.ended_at is null));

create policy "protocol_versions_client_select_published"
  on public.protocol_versions for select to authenticated
  using (exists (select 1 from public.clients join public.protocol_publications on protocol_publications.protocol_version_id = protocol_versions.id where clients.id = protocol_versions.client_id and clients.profile_id = (select auth.uid())));

create policy "protocol_approvals_admin_assigned_all"
  on public.protocol_version_approvals for all to authenticated
  using (exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_version_approvals.client_id and client_assignments.ended_at is null))
  with check (approved_by_profile_id = (select auth.uid()) and exists (select 1 from public.protocol_versions where id = protocol_version_approvals.protocol_version_id and submitted_for_review_at is not null) and exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_version_approvals.client_id and client_assignments.ended_at is null));

create policy "protocol_publications_admin_assigned_all"
  on public.protocol_publications for all to authenticated
  using (exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_publications.client_id and client_assignments.ended_at is null))
  with check (published_by_profile_id = (select auth.uid()) and exists (select 1 from public.user_roles join public.client_assignments on client_assignments.staff_profile_id = user_roles.profile_id where user_roles.profile_id = (select auth.uid()) and user_roles.role = 'admin' and client_assignments.client_id = protocol_publications.client_id and client_assignments.ended_at is null));

create policy "protocol_publications_client_select_own"
  on public.protocol_publications for select to authenticated
  using (exists (select 1 from public.clients where clients.id = protocol_publications.client_id and clients.profile_id = (select auth.uid())));

create function public.reject_protocol_version_mutation_after_review()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' and old.submitted_for_review_at is not null then
    raise exception 'protocol version is frozen after submission for review' using errcode = '55000';
  end if;

  if tg_op = 'UPDATE' then
    if old.submitted_for_review_at is not null then
      raise exception 'protocol version is frozen after submission for review' using errcode = '55000';
    end if;
    if new.created_by_profile_id <> old.created_by_profile_id
      or new.protocol_id <> old.protocol_id
      or new.client_id <> old.client_id
      or new.version_number <> old.version_number
      or new.based_on_version_id is distinct from old.based_on_version_id then
      raise exception 'protocol version identity is immutable' using errcode = '55000';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger protocol_versions_freeze_after_review
  before update or delete on public.protocol_versions
  for each row execute function public.reject_protocol_version_mutation_after_review();

create function public.require_submitted_protocol_version_for_approval()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.protocol_versions
    where id = new.protocol_version_id
      and client_id = new.client_id
      and submitted_for_review_at is not null
  ) then
    raise exception 'protocol approval requires a submitted version' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger protocol_approvals_require_submitted_version
  before insert on public.protocol_version_approvals
  for each row execute function public.require_submitted_protocol_version_for_approval();

revoke all on function public.reject_protocol_version_mutation_after_review() from public;
revoke all on function public.require_submitted_protocol_version_for_approval() from public;
