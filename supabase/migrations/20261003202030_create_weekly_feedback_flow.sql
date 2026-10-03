create table public.weekly_feedback_form_versions (
  id uuid primary key default gen_random_uuid(),
  version_number integer not null unique,
  title text not null,
  definition jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  constraint weekly_feedback_form_versions_version_positive check (version_number > 0),
  constraint weekly_feedback_form_versions_title_not_blank check (length(trim(title)) > 0),
  constraint weekly_feedback_form_versions_definition_object check (jsonb_typeof(definition) = 'object')
);

create table public.client_weekly_feedbacks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  form_version_id uuid not null references public.weekly_feedback_form_versions(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  due_at timestamptz,
  requested_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint client_weekly_feedbacks_period_valid check (period_end >= period_start),
  constraint client_weekly_feedbacks_answers_object check (jsonb_typeof(answers) = 'object'),
  unique (client_id, period_start, period_end)
);

create index client_weekly_feedbacks_client_period_idx
  on public.client_weekly_feedbacks (client_id, period_start desc, period_end desc, id desc);

create index client_weekly_feedbacks_pending_idx
  on public.client_weekly_feedbacks (client_id, due_at)
  where submitted_at is null;

create function public.enforce_client_weekly_feedback_lifecycle()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'weekly feedback history is preserved' using errcode = '55000';
  end if;

  if old.submitted_at is not null then
    raise exception 'submitted weekly feedback is immutable' using errcode = '55000';
  end if;

  if new.client_id is distinct from old.client_id
     or new.form_version_id is distinct from old.form_version_id
     or new.period_start is distinct from old.period_start
     or new.period_end is distinct from old.period_end
     or new.due_at is distinct from old.due_at
     or new.requested_by_profile_id is distinct from old.requested_by_profile_id
     or new.created_at is distinct from old.created_at then
    raise exception 'weekly feedback request identity is immutable' using errcode = '55000';
  end if;

  if new.submitted_at is not null then
    new.submitted_at := now();
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_client_weekly_feedback_lifecycle() from public, anon, authenticated;

create trigger client_weekly_feedbacks_lifecycle
before update or delete on public.client_weekly_feedbacks
for each row execute function public.enforce_client_weekly_feedback_lifecycle();

alter table public.weekly_feedback_form_versions enable row level security;
alter table public.client_weekly_feedbacks enable row level security;

revoke all on table public.weekly_feedback_form_versions from anon, authenticated;
revoke all on table public.client_weekly_feedbacks from anon, authenticated;

grant select on table public.weekly_feedback_form_versions to authenticated;
grant select, insert on table public.client_weekly_feedbacks to authenticated;
grant update (answers, submitted_at) on table public.client_weekly_feedbacks to authenticated;

create policy admin_mfa_aal2_required
  on public.weekly_feedback_form_versions
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy admin_mfa_aal2_required
  on public.client_weekly_feedbacks
  as restrictive
  for all
  to authenticated
  using ((select public.current_user_admin_mfa_satisfied()))
  with check ((select public.current_user_admin_mfa_satisfied()));

create policy weekly_feedback_form_versions_select_published_or_admin
  on public.weekly_feedback_form_versions
  for select
  to authenticated
  using (
    published_at is not null
    or exists (
      select 1
      from public.user_roles ur
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy client_weekly_feedbacks_select_own_or_active_assignment
  on public.client_weekly_feedbacks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.clients c
      where c.id = client_weekly_feedbacks.client_id
        and c.profile_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_weekly_feedbacks.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
  );

create policy client_weekly_feedbacks_insert_active_assignment_admin
  on public.client_weekly_feedbacks
  for insert
  to authenticated
  with check (
    requested_by_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.user_roles ur
      join public.client_assignments ca
        on ca.staff_profile_id = ur.profile_id
       and ca.client_id = client_weekly_feedbacks.client_id
       and ca.ended_at is null
      where ur.profile_id = (select auth.uid())
        and ur.role = 'admin'
    )
    and exists (
      select 1
      from public.weekly_feedback_form_versions fv
      where fv.id = client_weekly_feedbacks.form_version_id
        and fv.published_at is not null
    )
  );

create policy client_weekly_feedbacks_update_client_draft
  on public.client_weekly_feedbacks
  for update
  to authenticated
  using (
    submitted_at is null
    and exists (
      select 1
      from public.clients c
      where c.id = client_weekly_feedbacks.client_id
        and c.profile_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.clients c
      where c.id = client_weekly_feedbacks.client_id
        and c.profile_id = (select auth.uid())
    )
  );

insert into public.weekly_feedback_form_versions (
  version_number,
  title,
  definition,
  published_at
)
values (
  1,
  'Feedback Semanal C&M',
  jsonb_build_object(
    'schema_version', 1,
    'source_reference', 'docs/source_drafts/weekly_feedback_current_source.md',
    'questions', jsonb_build_array(
      jsonb_build_object('key','q01','label','1) Fez quantos treinos?','input_type','integer','required',true),
      jsonb_build_object('key','q02','label','2) Quantos aeróbicos?','input_type','integer','required',true),
      jsonb_build_object('key','q03','label','3) Teve refeição livre programada por mim essa semana? (Relate o que foi consumido)','input_type','text','required',true),
      jsonb_build_object('key','q04','label','4) Comeu a mais? MESMO QUE LIMPO (sem gordura ou açúcar) nas refeições propostas no protocolo?','input_type','text','required',true),
      jsonb_build_object('key','q05','label','5) Existiu algum momento no qual você beliscou algum alimento? Se sim, com qual frequência, e o quê?','input_type','text','required',true),
      jsonb_build_object('key','q06','label','6) Você furou o protocolo com alimentos preparados com óleo ou açúcar?','input_type','text','required',true),
      jsonb_build_object('key','q07','label','7) Comeu em Restaurante?','input_type','text','required',true),
      jsonb_build_object('key','q08','label','8) Se estiver em Cutting, consumiu churrasco ou comida japonesa? Se sim quais cortes de carne ou peixes foi consumido?','input_type','text','required',true,'allows_not_applicable',true),
      jsonb_build_object('key','q09','label','9) Consumiu bebida alcoólica não programada? Se sim, qual, quais dias e quanto foi consumido?','input_type','text','required',true),
      jsonb_build_object('key','q10','label','10) Comeu a menos as doses propostas? Se sim quantas doses e em quantas refeições?','input_type','text','required',true),
      jsonb_build_object('key','q11','label','11) Respeitou o quadro de limite máximo diário? Se ultrapassou, quantos dias foi ultrapassado?','input_type','text','required',true),
      jsonb_build_object('key','q12','label','12) Líquidos consumiu a meta?','input_type','text','required',true),
      jsonb_build_object('key','q13','label','13) Qual média diária de líquidos está consumindo?','input_type','text','required',true),
      jsonb_build_object('key','q14','label','14) Manipulados, se está no protocolo, está fazendo uso?','input_type','text','required',true,'allows_not_applicable',true),
      jsonb_build_object('key','q15','label','15) Suplementos, se estiver no protocolo, está fazendo uso?','input_type','text','required',true,'allows_not_applicable',true),
      jsonb_build_object('key','q16','label','16) Recursos Ergogênicos, se estiver no protocolo está fazendo uso? Qual semana do ciclo atual você está?','input_type','text','required',true,'allows_not_applicable',true),
      jsonb_build_object('key','q17','label','17) De 0 a 10 qual nota você se dá para sua execução do protocolo nesta semana?','input_type','rating_0_10','required',true),
      jsonb_build_object('key','q18','label','18) Nesta semana qual foi sua maior dificuldade em relação ao protocolo?','input_type','text','required',true),
      jsonb_build_object('key','q19','label','19) Como você está se sentindo?','input_type','text','required',true),
      jsonb_build_object('key','q20','label','20) Trabalha em home office ou trabalho externo?','input_type','text','required',true),
      jsonb_build_object('key','q21','label','21) Está treinando na ACADEMIA ou EM CASA?','input_type','text','required',true)
    )
  ),
  now()
);
