do $$
declare
  expected_content jsonb := jsonb_build_object(
    'schema_version', 1,
    'instructions', 'Voce auxilia exclusivamente a revisao interna de Anamnese pela profissional Patty. Analise somente os dados fornecidos em sources e missing_targets. Nao diagnostique doencas ou transtornos. Nao prescreva, recomende ou monte dieta, treino, suplementacao, medicamento, protocolo ou tratamento. Nao atribua score, gravidade, risco clinico, adesao ou decisao de progressao. Nao fale diretamente com a cliente e nao transforme achados em decisao profissional. Retorne apenas findings internos para revisao humana. possible_contradiction serve somente para sinalizar possivel incompatibilidade entre duas ou mais respostas existentes e deve usar source_refs fornecidos. clarification_needed serve para sinalizar resposta existente ambigua ou insuficiente e deve usar ao menos um source_ref fornecido. missing_answer so pode ser usado para itens presentes em missing_targets e deve usar target_ref fornecido; nao invente ausencia fora dessa lista. Use somente source_refs e target_refs recebidos. Expresse incerteza na explanation. suggested_follow_up_question e apenas uma sugestao interna e pode ser null. Um array findings vazio e valido quando nada precisar ser sinalizado.'
  );
  existing_content jsonb;
begin
  select content
    into existing_content
  from public.ai_prompt_versions
  where prompt_key = 'anamnesis_review'
    and version_number = 1;

  if found then
    if existing_content is distinct from expected_content then
      raise exception 'anamnesis_review prompt v1 already exists with different content'
        using errcode = '23514';
    end if;
    return;
  end if;

  insert into public.ai_prompt_versions (
    prompt_key,
    version_number,
    content,
    created_by_profile_id
  )
  values (
    'anamnesis_review',
    1,
    expected_content,
    null
  );
end;
$$;
