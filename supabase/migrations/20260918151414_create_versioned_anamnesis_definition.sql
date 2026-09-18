create table public.anamnesis_forms (
  id uuid primary key default gen_random_uuid(),
  form_key text not null unique,
  created_at timestamptz not null default now(),
  constraint anamnesis_forms_form_key_not_blank check (length(trim(form_key)) > 0)
);

create table public.anamnesis_form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.anamnesis_forms (id) on delete restrict,
  version_number integer not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint anamnesis_form_versions_version_number_positive check (version_number > 0),
  unique (form_id, version_number)
);

create table public.anamnesis_sections (
  id uuid primary key default gen_random_uuid(),
  form_version_id uuid not null references public.anamnesis_form_versions (id) on delete restrict,
  section_key text not null,
  title text not null,
  display_order integer not null,
  created_at timestamptz not null default now(),
  constraint anamnesis_sections_key_not_blank check (length(trim(section_key)) > 0),
  constraint anamnesis_sections_title_not_blank check (length(trim(title)) > 0),
  constraint anamnesis_sections_display_order_positive check (display_order > 0),
  unique (form_version_id, section_key),
  unique (form_version_id, display_order),
  unique (id, form_version_id)
);

create table public.anamnesis_questions (
  id uuid primary key default gen_random_uuid(),
  form_version_id uuid not null references public.anamnesis_form_versions (id) on delete restrict,
  section_id uuid not null,
  question_key text not null,
  label text not null,
  display_order integer not null,
  answer_type text not null,
  required boolean not null default false,
  options jsonb,
  created_at timestamptz not null default now(),
  constraint anamnesis_questions_section_version_fkey
    foreign key (section_id, form_version_id)
    references public.anamnesis_sections (id, form_version_id)
    on delete restrict,
  constraint anamnesis_questions_key_not_blank check (length(trim(question_key)) > 0),
  constraint anamnesis_questions_label_not_blank check (length(trim(label)) > 0),
  constraint anamnesis_questions_display_order_positive check (display_order > 0),
  constraint anamnesis_questions_answer_type_not_blank check (length(trim(answer_type)) > 0),
  constraint anamnesis_questions_options_array check (options is null or jsonb_typeof(options) = 'array'),
  unique (form_version_id, question_key),
  unique (section_id, display_order),
  unique (id, form_version_id)
);

create index anamnesis_form_versions_form_id_idx on public.anamnesis_form_versions (form_id);
create index anamnesis_sections_form_version_id_idx on public.anamnesis_sections (form_version_id);
create index anamnesis_questions_form_version_id_idx on public.anamnesis_questions (form_version_id);

alter table public.anamnesis_forms enable row level security;
alter table public.anamnesis_form_versions enable row level security;
alter table public.anamnesis_sections enable row level security;
alter table public.anamnesis_questions enable row level security;

revoke all on table public.anamnesis_forms from anon, authenticated;
revoke all on table public.anamnesis_form_versions from anon, authenticated;
revoke all on table public.anamnesis_sections from anon, authenticated;
revoke all on table public.anamnesis_questions from anon, authenticated;
grant select on table public.anamnesis_forms to authenticated;
grant select on table public.anamnesis_form_versions to authenticated;
grant select on table public.anamnesis_sections to authenticated;
grant select on table public.anamnesis_questions to authenticated;

create policy "anamnesis_forms_select_available_to_client_or_assigned_admin"
  on public.anamnesis_forms
  for select to authenticated
  using (
    exists (
      select 1
      from public.anamnesis_form_versions
      where anamnesis_form_versions.form_id = anamnesis_forms.id
        and anamnesis_form_versions.published_at is not null
    )
    and (
      exists (
        select 1 from public.clients
        where clients.profile_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.user_roles
        join public.client_assignments
          on client_assignments.staff_profile_id = user_roles.profile_id
        where user_roles.profile_id = (select auth.uid())
          and user_roles.role = 'admin'
          and client_assignments.ended_at is null
      )
    )
  );

create policy "anamnesis_form_versions_select_available_to_client_or_assigned_admin"
  on public.anamnesis_form_versions
  for select to authenticated
  using (
    published_at is not null
    and (
      exists (
        select 1 from public.clients
        where clients.profile_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.user_roles
        join public.client_assignments
          on client_assignments.staff_profile_id = user_roles.profile_id
        where user_roles.profile_id = (select auth.uid())
          and user_roles.role = 'admin'
          and client_assignments.ended_at is null
      )
    )
  );

create policy "anamnesis_sections_select_available_version"
  on public.anamnesis_sections
  for select to authenticated
  using (
    exists (
      select 1
      from public.anamnesis_form_versions
      where anamnesis_form_versions.id = anamnesis_sections.form_version_id
        and anamnesis_form_versions.published_at is not null
    )
    and (
      exists (
        select 1 from public.clients
        where clients.profile_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.user_roles
        join public.client_assignments
          on client_assignments.staff_profile_id = user_roles.profile_id
        where user_roles.profile_id = (select auth.uid())
          and user_roles.role = 'admin'
          and client_assignments.ended_at is null
      )
    )
  );

create policy "anamnesis_questions_select_available_version"
  on public.anamnesis_questions
  for select to authenticated
  using (
    exists (
      select 1
      from public.anamnesis_form_versions
      where anamnesis_form_versions.id = anamnesis_questions.form_version_id
        and anamnesis_form_versions.published_at is not null
    )
    and (
      exists (
        select 1 from public.clients
        where clients.profile_id = (select auth.uid())
      )
      or exists (
        select 1
        from public.user_roles
        join public.client_assignments
          on client_assignments.staff_profile_id = user_roles.profile_id
        where user_roles.profile_id = (select auth.uid())
          and user_roles.role = 'admin'
          and client_assignments.ended_at is null
      )
    )
  );
