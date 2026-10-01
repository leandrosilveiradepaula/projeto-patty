-- Official migration materialized by Supabase CLI:
-- supabase migration new create_method_configuration_foundation
-- Generated filename: 20261001213333_create_method_configuration_foundation.sql
-- Source reviewed in docs/METHOD_CONFIGURATION_FOUNDATION_MIGRATION_PROPOSAL_V2.sql

create table public.method_configuration_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  domain_key text not null,
  config_schema_key text not null,
  display_name text not null,
  description text,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (template_key),
  unique (id, template_key),
  constraint method_configuration_templates_key_not_blank
    check (length(trim(template_key)) > 0),
  constraint method_configuration_templates_domain_not_blank
    check (length(trim(domain_key)) > 0),
  constraint method_configuration_templates_schema_not_blank
    check (length(trim(config_schema_key)) > 0),
  constraint method_configuration_templates_name_not_blank
    check (length(trim(display_name)) > 0)
);

create table public.method_configuration_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references public.method_configuration_templates (id) on delete restrict,
  version_number integer not null,
  schema_version integer not null,
  configuration jsonb not null,
  source_kind text not null,
  source_reference text,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  activated_by_profile_id uuid references public.profiles (id) on delete restrict,
  retired_at timestamptz,
  retired_by_profile_id uuid references public.profiles (id) on delete restrict,
  unique (template_id, version_number),
  unique (id, template_id),
  constraint method_configuration_versions_version_positive
    check (version_number > 0),
  constraint method_configuration_versions_schema_version_positive
    check (schema_version > 0),
  constraint method_configuration_versions_configuration_object
    check (jsonb_typeof(configuration) = 'object'),
  constraint method_configuration_versions_source_kind_not_blank
    check (length(trim(source_kind)) > 0),
  constraint method_configuration_versions_activation_actor_consistent
    check (
      (activated_at is null and activated_by_profile_id is null)
      or
      (activated_at is not null and activated_by_profile_id is not null)
    ),
  constraint method_configuration_versions_retirement_actor_consistent
    check (
      (retired_at is null and retired_by_profile_id is null)
      or
      (retired_at is not null and retired_by_profile_id is not null)
    ),
  constraint method_configuration_versions_retirement_requires_activation
    check (retired_at is null or activated_at is not null),
  constraint method_configuration_versions_retired_after_activation
    check (retired_at is null or retired_at >= activated_at)
);

create unique index method_configuration_versions_one_active_per_template
  on public.method_configuration_versions (template_id)
  where activated_at is not null and retired_at is null;

create table public.client_method_configuration_override_versions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  template_id uuid not null references public.method_configuration_templates (id) on delete restrict,
  based_on_template_version_id uuid not null,
  version_number integer not null,
  override_configuration jsonb not null,
  protocol_version_id uuid,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  activated_by_profile_id uuid references public.profiles (id) on delete restrict,
  retired_at timestamptz,
  retired_by_profile_id uuid references public.profiles (id) on delete restrict,
  reason text,
  unique (id, client_id, template_id, based_on_template_version_id),
  constraint client_method_configuration_overrides_template_version_fkey
    foreign key (based_on_template_version_id, template_id)
    references public.method_configuration_versions (id, template_id)
    on delete restrict,
  constraint client_method_configuration_overrides_protocol_client_fkey
    foreign key (protocol_version_id, client_id)
    references public.protocol_versions (id, client_id)
    on delete restrict,
  constraint client_method_configuration_overrides_version_positive
    check (version_number > 0),
  constraint client_method_configuration_overrides_configuration_object
    check (jsonb_typeof(override_configuration) = 'object'),
  constraint client_method_configuration_overrides_activation_actor_consistent
    check (
      (activated_at is null and activated_by_profile_id is null)
      or
      (activated_at is not null and activated_by_profile_id is not null)
    ),
  constraint client_method_configuration_overrides_retirement_actor_consistent
    check (
      (retired_at is null and retired_by_profile_id is null)
      or
      (retired_at is not null and retired_by_profile_id is not null)
    ),
  constraint client_method_configuration_overrides_retirement_requires_activation
    check (retired_at is null or activated_at is not null),
  constraint client_method_configuration_overrides_retired_after_activation
    check (retired_at is null or retired_at >= activated_at)
);

create unique index client_method_configuration_overrides_client_version
  on public.client_method_configuration_override_versions (
    client_id,
    template_id,
    version_number
  )
  where protocol_version_id is null;

create unique index client_method_configuration_overrides_protocol_version
  on public.client_method_configuration_override_versions (
    client_id,
    template_id,
    protocol_version_id,
    version_number
  )
  where protocol_version_id is not null;

create unique index client_method_configuration_overrides_one_active_client
  on public.client_method_configuration_override_versions (client_id, template_id)
  where protocol_version_id is null
    and activated_at is not null
    and retired_at is null;

create unique index client_method_configuration_overrides_one_active_protocol
  on public.client_method_configuration_override_versions (
    client_id,
    template_id,
    protocol_version_id
  )
  where protocol_version_id is not null
    and activated_at is not null
    and retired_at is null;

create table public.method_configuration_snapshot_sets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  engine_contract_version integer not null,
  created_by_profile_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (id, client_id),
  constraint method_configuration_snapshot_sets_engine_version_positive
    check (engine_contract_version > 0)
);

create table public.method_configuration_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_set_id uuid not null,
  client_id uuid not null,
  template_id uuid not null,
  template_version_id uuid not null,
  template_key text not null,
  input_values jsonb not null,
  resolved_configuration jsonb not null,
  result_values jsonb not null,
  created_at timestamptz not null default now(),
  unique (id, client_id, template_id, template_version_id),
  constraint method_configuration_snapshots_set_client_fkey
    foreign key (snapshot_set_id, client_id)
    references public.method_configuration_snapshot_sets (id, client_id)
    on delete restrict,
  constraint method_configuration_snapshots_template_version_fkey
    foreign key (template_version_id, template_id)
    references public.method_configuration_versions (id, template_id)
    on delete restrict,
  constraint method_configuration_snapshots_template_key_fkey
    foreign key (template_id, template_key)
    references public.method_configuration_templates (id, template_key)
    on delete restrict,
  constraint method_configuration_snapshots_input_object
    check (jsonb_typeof(input_values) = 'object'),
  constraint method_configuration_snapshots_resolved_object
    check (jsonb_typeof(resolved_configuration) = 'object'),
  constraint method_configuration_snapshots_result_object
    check (jsonb_typeof(result_values) = 'object')
);

create table public.method_configuration_snapshot_overrides (
  snapshot_id uuid not null,
  client_id uuid not null,
  template_id uuid not null,
  template_version_id uuid not null,
  override_version_id uuid not null,
  precedence integer not null,
  created_at timestamptz not null default now(),
  primary key (snapshot_id, override_version_id),
  unique (snapshot_id, precedence),
  constraint method_configuration_snapshot_overrides_snapshot_fkey
    foreign key (snapshot_id, client_id, template_id, template_version_id)
    references public.method_configuration_snapshots (
      id,
      client_id,
      template_id,
      template_version_id
    )
    on delete restrict,
  constraint method_configuration_snapshot_overrides_override_fkey
    foreign key (
      override_version_id,
      client_id,
      template_id,
      template_version_id
    )
    references public.client_method_configuration_override_versions (
      id,
      client_id,
      template_id,
      based_on_template_version_id
    )
    on delete restrict,
  constraint method_configuration_snapshot_overrides_precedence_positive
    check (precedence > 0)
);

create index method_configuration_versions_template_id_idx
  on public.method_configuration_versions (template_id);

create index method_configuration_versions_created_by_profile_id_idx
  on public.method_configuration_versions (created_by_profile_id);

create index method_configuration_versions_activated_by_profile_id_idx
  on public.method_configuration_versions (activated_by_profile_id)
  where activated_by_profile_id is not null;

create index method_configuration_versions_retired_by_profile_id_idx
  on public.method_configuration_versions (retired_by_profile_id)
  where retired_by_profile_id is not null;

create index client_method_configuration_overrides_client_id_idx
  on public.client_method_configuration_override_versions (client_id);

create index client_method_configuration_overrides_template_id_idx
  on public.client_method_configuration_override_versions (template_id);

create index client_method_configuration_overrides_protocol_version_id_idx
  on public.client_method_configuration_override_versions (protocol_version_id)
  where protocol_version_id is not null;

create index client_method_configuration_overrides_created_by_profile_id_idx
  on public.client_method_configuration_override_versions (created_by_profile_id);

create index method_configuration_snapshot_sets_client_created_idx
  on public.method_configuration_snapshot_sets (client_id, created_at desc, id desc);

create index method_configuration_snapshots_set_id_idx
  on public.method_configuration_snapshots (snapshot_set_id);

create index method_configuration_snapshots_client_id_idx
  on public.method_configuration_snapshots (client_id);

create index method_configuration_snapshots_template_id_idx
  on public.method_configuration_snapshots (template_id);

create index method_configuration_snapshot_overrides_client_id_idx
  on public.method_configuration_snapshot_overrides (client_id);

create index method_configuration_snapshot_overrides_override_version_id_idx
  on public.method_configuration_snapshot_overrides (override_version_id);

create function public.guard_method_configuration_template_identity()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.id is distinct from old.id
     or new.template_key is distinct from old.template_key
     or new.domain_key is distinct from old.domain_key
     or new.config_schema_key is distinct from old.config_schema_key
     or new.created_by_profile_id is distinct from old.created_by_profile_id
     or new.created_at is distinct from old.created_at then
    raise exception 'method configuration template identity is immutable'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create trigger method_configuration_templates_identity_guard
before update on public.method_configuration_templates
for each row execute function public.guard_method_configuration_template_identity();

create function public.guard_method_configuration_version_lifecycle()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.retired_at is not null then
    raise exception 'retired method configuration version is immutable'
      using errcode = '55000';
  end if;

  if new.id is distinct from old.id
     or new.template_id is distinct from old.template_id
     or new.version_number is distinct from old.version_number
     or new.created_by_profile_id is distinct from old.created_by_profile_id
     or new.created_at is distinct from old.created_at then
    raise exception 'method configuration version identity is immutable'
      using errcode = '55000';
  end if;

  if old.activated_at is not null then
    if new.schema_version is distinct from old.schema_version
       or new.configuration is distinct from old.configuration
       or new.source_kind is distinct from old.source_kind
       or new.source_reference is distinct from old.source_reference
       or new.activated_at is distinct from old.activated_at
       or new.activated_by_profile_id is distinct from old.activated_by_profile_id then
      raise exception 'active method configuration version content is immutable'
        using errcode = '55000';
    end if;
  end if;

  if old.activated_at is null and new.retired_at is not null then
    raise exception 'method configuration version must be activated before retirement'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create trigger method_configuration_versions_lifecycle_guard
before update on public.method_configuration_versions
for each row execute function public.guard_method_configuration_version_lifecycle();

create function public.guard_client_method_configuration_override_lifecycle()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.retired_at is not null then
    raise exception 'retired client method configuration override is immutable'
      using errcode = '55000';
  end if;

  if new.id is distinct from old.id
     or new.client_id is distinct from old.client_id
     or new.template_id is distinct from old.template_id
     or new.based_on_template_version_id is distinct from old.based_on_template_version_id
     or new.version_number is distinct from old.version_number
     or new.protocol_version_id is distinct from old.protocol_version_id
     or new.created_by_profile_id is distinct from old.created_by_profile_id
     or new.created_at is distinct from old.created_at then
    raise exception 'client method configuration override identity is immutable'
      using errcode = '55000';
  end if;

  if old.activated_at is not null then
    if new.override_configuration is distinct from old.override_configuration
       or new.reason is distinct from old.reason
       or new.activated_at is distinct from old.activated_at
       or new.activated_by_profile_id is distinct from old.activated_by_profile_id then
      raise exception 'active client method configuration override content is immutable'
        using errcode = '55000';
    end if;
  end if;

  if old.activated_at is null and new.retired_at is not null then
    raise exception 'client method configuration override must be activated before retirement'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create trigger client_method_configuration_overrides_lifecycle_guard
before update on public.client_method_configuration_override_versions
for each row execute function public.guard_client_method_configuration_override_lifecycle();

create function public.reject_method_configuration_snapshot_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'method configuration snapshots are append-only'
    using errcode = '55000';
end;
$$;

create trigger method_configuration_snapshot_sets_immutable
before update or delete on public.method_configuration_snapshot_sets
for each row execute function public.reject_method_configuration_snapshot_mutation();

create trigger method_configuration_snapshots_immutable
before update or delete on public.method_configuration_snapshots
for each row execute function public.reject_method_configuration_snapshot_mutation();

create trigger method_configuration_snapshot_overrides_immutable
before update or delete on public.method_configuration_snapshot_overrides
for each row execute function public.reject_method_configuration_snapshot_mutation();

alter table public.method_configuration_templates enable row level security;
alter table public.method_configuration_versions enable row level security;
alter table public.client_method_configuration_override_versions enable row level security;
alter table public.method_configuration_snapshot_sets enable row level security;
alter table public.method_configuration_snapshots enable row level security;
alter table public.method_configuration_snapshot_overrides enable row level security;

revoke all on table
  public.method_configuration_templates,
  public.method_configuration_versions,
  public.client_method_configuration_override_versions,
  public.method_configuration_snapshot_sets,
  public.method_configuration_snapshots,
  public.method_configuration_snapshot_overrides
from anon, authenticated, service_role;

grant select on table
  public.method_configuration_templates,
  public.method_configuration_versions,
  public.client_method_configuration_override_versions,
  public.method_configuration_snapshot_sets,
  public.method_configuration_snapshots,
  public.method_configuration_snapshot_overrides
to authenticated;

grant select, insert, update on table
  public.method_configuration_templates,
  public.method_configuration_versions,
  public.client_method_configuration_override_versions
to service_role;

grant select, insert on table
  public.method_configuration_snapshot_sets,
  public.method_configuration_snapshots,
  public.method_configuration_snapshot_overrides
to service_role;

create policy admin_mfa_aal2_required
  on public.method_configuration_templates
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy admin_mfa_aal2_required
  on public.method_configuration_versions
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy admin_mfa_aal2_required
  on public.client_method_configuration_override_versions
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy admin_mfa_aal2_required
  on public.method_configuration_snapshot_sets
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy admin_mfa_aal2_required
  on public.method_configuration_snapshots
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy admin_mfa_aal2_required
  on public.method_configuration_snapshot_overrides
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy "method_configuration_templates_admin_select"
  on public.method_configuration_templates
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy "method_configuration_versions_admin_select"
  on public.method_configuration_versions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy "client_method_configuration_overrides_assigned_admin_select"
  on public.client_method_configuration_override_versions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_method_configuration_override_versions.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy "method_configuration_snapshot_sets_assigned_admin_select"
  on public.method_configuration_snapshot_sets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = method_configuration_snapshot_sets.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy "method_configuration_snapshots_assigned_admin_select"
  on public.method_configuration_snapshots
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = method_configuration_snapshots.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy "method_configuration_snapshot_overrides_assigned_admin_select"
  on public.method_configuration_snapshot_overrides
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = method_configuration_snapshot_overrides.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

revoke all on function public.guard_method_configuration_template_identity()
  from public, anon, authenticated, service_role;
revoke all on function public.guard_method_configuration_version_lifecycle()
  from public, anon, authenticated, service_role;
revoke all on function public.guard_client_method_configuration_override_lifecycle()
  from public, anon, authenticated, service_role;
revoke all on function public.reject_method_configuration_snapshot_mutation()
  from public, anon, authenticated, service_role;
