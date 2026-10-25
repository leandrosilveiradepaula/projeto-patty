-- J4: orientacoes opcionais de autoria da Patty, associadas a versao exata.
-- Estes campos sao destinados a cliente apos publicacao humana; nunca notas internas.
-- Nenhuma formula, frequencia, suplemento ou dose e sugerida automaticamente.
alter table public.protocol_versions
  add column free_meal_guidance text,
  add column supplement_guidance text,
  add column compounded_guidance text;

alter table public.protocol_versions
  add constraint protocol_versions_free_meal_guidance_valid
    check (free_meal_guidance is null or length(btrim(free_meal_guidance)) between 1 and 4000),
  add constraint protocol_versions_supplement_guidance_valid
    check (supplement_guidance is null or length(btrim(supplement_guidance)) between 1 and 4000),
  add constraint protocol_versions_compounded_guidance_valid
    check (compounded_guidance is null or length(btrim(compounded_guidance)) between 1 and 4000);

comment on column public.protocol_versions.free_meal_guidance is
  'Orientacao opcional de refeicao livre definida manualmente por Patty, sem periodicidade padrao.';
comment on column public.protocol_versions.supplement_guidance is
  'Orientacao opcional de suplementacao definida manualmente pela profissional, sem prescricao automatica.';
comment on column public.protocol_versions.compounded_guidance is
  'Orientacao opcional sobre manipulados definida manualmente pela profissional, sem prescricao automatica.';

-- Substitui SOMENTE o corpo da funcao de clone ja existente; mantem
-- SECURITY INVOKER, search_path restrito, RLS, trigger e historico intactos.
-- A nova versao nunca herda aprovacao ou publicacao da base.
create or replace function public.inherit_protocol_version_manual_guidance()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  v_base public.protocol_versions%rowtype;
begin
  select *
    into v_base
    from public.protocol_versions
   where id = new.based_on_version_id
     and client_id = new.client_id
     and submitted_for_review_at is not null;

  if not found then
    raise exception 'source version must be accessible and submitted'
      using errcode = '55000';
  end if;

  new.manual_stage_label := v_base.manual_stage_label;
  new.planned_start_on := v_base.planned_start_on;
  new.client_instructions := v_base.client_instructions;
  new.free_meal_guidance := v_base.free_meal_guidance;
  new.supplement_guidance := v_base.supplement_guidance;
  new.compounded_guidance := v_base.compounded_guidance;
  return new;
end;
$$;

revoke all on function public.inherit_protocol_version_manual_guidance()
  from public, anon, authenticated;
