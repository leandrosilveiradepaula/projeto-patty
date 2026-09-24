# Mapa de Campos da Anamnese v1 - Candidato

Data de referencia: 2026-09-24.

Status: **CANDIDATO / NAO PUBLICAR AINDA**.

Fonte estruturada: `docs/anamnesis_field_map_v1_candidate.json`.

## Resultado

O inventario historico completo foi mapeado sem perder nenhum codigo `ANAM-000..ANAM-046`.

Resumo:

- 47 entradas historicas;
- 51 campos de resposta candidatos;
- 10 campos dependentes com condicional candidata;
- 4 medidas corporais explicitamente fora da Anamnese;
- 1 item de abertura tratado como conteudo de UI;
- 1 item de upload tratado como integracao com o dominio de arquivos privados;
- 1 consentimento ainda bloqueado por texto/versionamento juridico.

## Regra de desenho usada

Para reduzir risco de alterar o sentido do formulario:

- perguntas simples abertas permanecem `text`;
- perguntas com opcoes observadas preservam essas opcoes;
- perguntas cuja redacao e claramente Sim/Nao podem usar `single_choice` como **decisao de produto candidata**, mesmo quando o controle historico nao foi observado;
- perguntas compostas do formato **Sim/Nao + Qual/Detalhes** sao candidatas a dois campos;
- somente o campo de detalhe fica condicional;
- perguntas compostas abertas, como sono e objetivos por horizonte, permanecem juntas nesta v1 candidata;
- nenhuma pergunta nova de saude foi adicionada;
- nenhuma resposta cria alerta, score, bloqueio ou diagnostico.

## Suporte atual da interface

O schema aceita `answer_type` como string nao vazia, mas a interface atual da cliente so edita rascunhos `answer_type = text`.

Consequencia:

- campos `text`: base de UI ja existe;
- campos `single_choice`: ainda precisam de componente e persistencia na UI;
- consentimento: ainda precisa de componente proprio e decisao juridica;
- este mapa nao autoriza publicacao enquanto esses pontos nao estiverem resolvidos.

## Mapa completo

| Codigo | Texto historico | Destino | Secao candidata | Campo(s) candidato(s) | Condicional candidata | Status |
| --- | --- | --- | --- | --- | --- | --- |
| ANAM-000 | Conteudo de abertura / onboarding do formulario atual | ui_content_not_question | - | - | - | not_question |
| ANAM-001 | Cidade | include_candidate | - | `city` — text_input | - | product_candidate |
| ANAM-002 | Telefone | include_candidate | - | `contact_phone` — tel_input | - | product_candidate |
| ANAM-003 | Email | include_candidate | - | `contact_email` — email_input | - | product_candidate |
| ANAM-004 | Instagram | include_candidate | - | `instagram` — text_input | - | product_candidate |
| ANAM-005 | Ombros (toda circunferencia) | exclude_to_assessment | - | - | - | confirmed_by_patty |
| ANAM-006 | Panturrilha | exclude_to_assessment | - | - | - | confirmed_by_patty |
| ANAM-007 | Peso atual | exclude_to_assessment | - | - | - | confirmed_by_patty |
| ANAM-008 | Altura | exclude_to_assessment | - | - | - | confirmed_by_patty |
| ANAM-009 | Tem o costume de realizar exames de sangue? | include_candidate | - | `blood_test_habit` — radio_group [Sim/Nao] | - | product_candidate |
| ANAM-010 | Possui plano de saude? Qual? | include_candidate | - | `has_health_plan` — radio_group [Sim/Nao]<br>`health_plan_details` — text_input | `health_plan_details` se `has_health_plan` = `Sim` | split_candidate |
| ANAM-011 | Possui diabetes? Quanto tempo? Esta controlado? | include_candidate | - | `has_diabetes` — radio_group [Sim/Nao]<br>`diabetes_details` — textarea | `diabetes_details` se `has_diabetes` = `Sim` | split_candidate |
| ANAM-012 | Possui algum transtorno metabolico, como tireoide ou hipogonadismo? Qual(is), ha quanto tempo e esta controlado? | include_candidate | - | `has_metabolic_disorder` — radio_group [Sim/Nao]<br>`metabolic_disorder_details` — textarea | `metabolic_disorder_details` se `has_metabolic_disorder` = `Sim` | split_candidate |
| ANAM-013 | Possui alguma doenca cronica, como anemia, artrite, fibromialgia etc.? | include_candidate | - | `chronic_disease` — textarea | - | product_candidate |
| ANAM-014 | Ja realizou alguma cirurgia? Qual(is)? | include_candidate | - | `had_surgery` — radio_group [Sim/Nao]<br>`surgery_details` — textarea | `surgery_details` se `had_surgery` = `Sim` | split_candidate |
| ANAM-015 | Possui alergia a alguma medicacao ou comida? Qual(is)? | include_candidate | - | `has_allergy` — radio_group [Sim/Nao]<br>`allergy_details` — textarea | `allergy_details` se `has_allergy` = `Sim` | split_candidate |
| ANAM-016 | Ja fraturou ou teve alguma lesao importante que deixou sequela? Qual(is)? | include_candidate | - | `had_fracture_or_sequela` — radio_group [Sim/Nao]<br>`fracture_or_injury_details` — textarea | `fracture_or_injury_details` se `had_fracture_or_sequela` = `Sim` | split_candidate |
| ANAM-017 | Sente dor intensa em alguma parte do corpo? | include_candidate | - | `intense_body_pain` — textarea | - | product_candidate |
| ANAM-018 | Possui alguma doenca cardiovascular ou hipertensao arterial? | include_candidate | - | `cardiovascular_or_hypertension` — textarea | - | product_candidate |
| ANAM-019 | Ja sentiu dor no peito durante alguma atividade fisica? | include_candidate | - | `chest_pain_during_activity` — radio_group [Sim/Nao] | - | product_candidate |
| ANAM-020 | Ja desmaiou alguma vez? Descricao e frequencia. | include_candidate | - | `has_fainted` — radio_group [Sim/Nao]<br>`fainting_details` — textarea | `fainting_details` se `has_fainted` = `Sim` | split_candidate |
| ANAM-021 | Ja usou algum tipo de suplemento alimentar? Qual(is)? | include_candidate | - | `used_supplement_before` — radio_group [Sim/Nao]<br>`past_supplement_details` — textarea | `past_supplement_details` se `used_supplement_before` = `Sim` | split_candidate |
| ANAM-022 | O que esta administrando atualmente entre suplementos, fitoterapicos e medicamentos? | include_candidate | - | `current_supplements_medicines` — textarea | - | product_candidate |
| ANAM-023 | Como esta sua libido? | include_candidate | - | `libido` — textarea | - | product_candidate |
| ANAM-024 | Toma algum suplemento vitaminico? Qual(is)? | include_candidate | - | `uses_vitamin_supplement` — radio_group [Sim/Nao]<br>`vitamin_supplement_details` — textarea | `vitamin_supplement_details` se `uses_vitamin_supplement` = `Sim` | split_candidate |
| ANAM-025 | Como esta a qualidade e o tempo do seu sono? | include_candidate | - | `sleep_quality_and_duration` — textarea | - | keep_compound_candidate |
| ANAM-026 | Demora a dormir? | include_candidate | - | `takes_long_to_sleep` — radio_group [Sim/Nao] | - | product_candidate |
| ANAM-027 | Acorda muitas vezes durante a noite? | include_candidate | - | `wakes_often_at_night` — radio_group [Sim/Nao] | - | product_candidate |
| ANAM-028 | Como sao suas relacoes sociais? | include_candidate | - | `social_relationships` — textarea | - | product_candidate |
| ANAM-029 | Considera-se paciente? | include_candidate | - | `considers_self_patient` — radio_group [Sim/Nao] | - | product_candidate |
| ANAM-030 | Ja foi mais paciente do que e hoje? | include_candidate | - | `was_more_patient_before` — radio_group [Sim/Nao] | - | product_candidate |
| ANAM-031 | Como esta seu humor? | include_candidate | - | `mood` — textarea | - | product_candidate |
| ANAM-032 | Sente-se muito cansado para levantar da cama pela manha? | include_candidate | - | `too_tired_to_get_up` — radio_group [Sim/Nao] | - | product_candidate |
| ANAM-033 | Tem condicao financeira para gastos com suplementos/medicamentos? | include_candidate | - | `financial_capacity_for_supplements` — radio_group [Sim/Nao/Talvez] | - | observed_choice_candidate |
| ANAM-034 | Toma quantos litros de agua por dia? | include_candidate | - | `daily_water_intake` — radio_group [1L/1,5L/2L/2,5L/3L/3,5L/4L/4,5L/5L ou mais/Nao sei] | - | observed_choice_candidate |
| ANAM-035 | 3 alimentos preferidos | include_candidate | - | `favorite_foods` — textarea | - | product_candidate |
| ANAM-036 | 3 alimentos que menos gostei | include_candidate | - | `least_favorite_foods` — textarea | - | product_candidate |
| ANAM-037 | Me fala um pouco como tu ve tua relacao com a comida | include_candidate | - | `relationship_with_food` — textarea | - | product_candidate |
| ANAM-038 | Quando tu te olha no espelho, o que tu enxerga? | include_candidate | - | `self_image_in_mirror` — textarea | - | product_candidate |
| ANAM-039 | E como acredita que as pessoas te veem? | include_candidate | - | `perceived_external_image` — textarea | - | product_candidate |
| ANAM-040 | Me fala das tuas qualidades | include_candidate | - | `self_qualities` — textarea | - | product_candidate |
| ANAM-041 | Possui algum vicio (cigarro, bebidas alcoolicas, drogas ilicitas etc.)? | include_candidate | - | `has_addiction` — radio_group [Sim/Nao] | - | observed_choice_candidate |
| ANAM-042 | E atleta competitivo de fisiculturismo ou outro esporte? Qual(is)? | include_candidate | - | `is_competitive_athlete` — radio_group [Sim/Nao]<br>`competitive_sport_details` — textarea | `competitive_sport_details` se `is_competitive_athlete` = `Sim` | split_candidate |
| ANAM-043 | Quais sao seus objetivos a curto (3 meses), medio (12 meses) e longo (5 anos) prazo? | include_candidate | - | `short_medium_long_term_goals` — textarea | - | keep_compound_candidate |
| ANAM-044 | Upload de arquivos | files_integration_pending | - | - | - | integration_pending |
| ANAM-045 | Por que optou por este plano? | include_candidate | - | `plan_choice_reason` — textarea | - | product_candidate |
| ANAM-046 | Declaracao de Anuencia | consent_pending | - | `consent_acceptance` — consent_choice [concordancia/nao concordancia] | - | legal_pending |

## Condicionais candidatas

As 10 dependencias propostas surgem somente de perguntas compostas cujo proprio texto historico contem uma pergunta-base e um pedido de detalhe.

Elas sao candidatas, nao regras profissionais confirmadas:

1. plano de saude -> qual;
2. diabetes -> tempo/controle;
3. transtorno metabolico -> qual/tempo/controle;
4. cirurgia -> qual;
5. alergia -> qual;
6. fratura/lesao com sequela -> qual;
7. desmaio -> descricao/frequencia;
8. suplemento alimentar anterior -> qual;
9. suplemento vitaminico -> qual;
10. atleta competitivo -> qual esporte.

Cada dependencia usa a fundacao ja aplicada de `applicability_source_question_id` + `applicability_expected_answer`.

## Decisoes de produto candidatas que ainda nao sao regra confirmada

Os tipos `single_choice` derivados apenas da forma de pergunta Sim/Nao nao devem ser tratados como evidencia do Google Forms.

Exemplos:
- exames de sangue;
- dor no peito durante atividade;
- demora para dormir;
- acorda muitas vezes;
- considera-se paciente;
- ja foi mais paciente;
- cansaco para levantar.

Esses tipos sao recomendacao de UX candidata. Se a revisao final preferir resposta aberta, o conteudo profissional da pergunta continua preservado.

## Itens que continuam bloqueadores

### ANAM-044 - arquivos

Nao vira `anamnesis_answer` nesta etapa. O app ja possui dominio privado de arquivos. Falta decidir a relacao da Anamnese com fotos, exames e documentos enviados.

### ANAM-046 - consentimento

Continua sem texto final, versao juridica e operacao definitiva. As opcoes candidatas preservam literalmente a evidencia historica `concordancia` / `nao concordancia`; isso nao define a redacao final do app.

### UI de tipos

A cliente ainda precisa de suporte a `single_choice` e ao controle de consentimento.

## Proximo criterio de pronto

Antes de gerar a primeira versao draft `client-anamnesis`, revisar este mapa e fechar somente:

1. aceitar ou ajustar os tipos `single_choice` candidatos;
2. aceitar ou ajustar os 10 desdobramentos Sim/Nao + detalhe;
3. definir ANAM-044;
4. definir ANAM-046;
5. implementar os controles de UI que ainda nao existem;
6. revisar a ordem final.

Enquanto isso, o mapa permanece especificacao candidata e nao deve ser persistido como formulario publicado.
