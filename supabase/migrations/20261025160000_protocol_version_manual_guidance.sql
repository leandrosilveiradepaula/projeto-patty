-- J4: campos opcionais explicitamente destinados a cliente, em versao imutavel.
-- Sem notas internas ou decisao profissional automatica. RLS existente de
-- protocol_versions permite leitura somente apos publicacao para a cliente.
alter table public.protocol_versions
  add column manual_stage_label text,
  add column planned_start_on date,
  add column client_instructions text;

alter table public.protocol_versions
  add constraint protocol_versions_manual_stage_label_valid
    check (manual_stage_label is null or
      (length(btrim(manual_stage_label)) between 1 and 120)),
  add constraint protocol_versions_client_instructions_valid
    check (client_instructions is null or
      (length(btrim(client_instructions)) between 1 and 4000));

comment on column public.protocol_versions.manual_stage_label is
  'Nome descritivo inserido manualmente pela profissional; nao determina fase automaticamente.';
comment on column public.protocol_versions.planned_start_on is
  'Data informada manualmente pela profissional, sem calendario automatico.';
comment on column public.protocol_versions.client_instructions is
  'Orientacoes explicitamente destinadas a cliente na versao publicada. Nunca incluir notas internas.';

-- O clone ja cria uma nova linha com based_on_version_id. Copiar as informacoes
-- da versao congelada dentro da mesma transacao do clone, sem modificar a RPC
-- historica nem copiar publicacao/aprovacao. Invoker/RLS preservados.
create function public.inherit_protocol_version_manual_guidance()
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
  return new;
end;
$$;

create trigger protocol_versions_inherit_manual_guidance_on_clone
  before insert on public.protocol_versions
  for each row when (new.based_on_version_id is not null)
  execute function public.inherit_protocol_version_manual_guidance();

revoke all on function public.inherit_protocol_version_manual_guidance()
  from public, anon, authenticated;
