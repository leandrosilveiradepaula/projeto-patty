# Próximo lote de templates de configuração profissional

Última atualização: 2026-10-02.

## Status

**PROPOSTA TÉCNICA — NÃO APLICADA.**

Este documento organiza o próximo lote de materialização da fundação de configuração profissional. Ele não cria migration, não ativa template e não altera nenhum consumidor operacional.

A fila de produção precisa permanecer, nesta ordem:

1. `20261001235018_seed_higher_fat_protein_limit_template.sql`;
2. `20261002005720_hydrate_client_targets_from_configuration.sql`;
3. somente depois, migrations novas geradas pelo Supabase CLI para os itens deste documento.

Nenhum timestamp de migration futura é definido aqui.

## Princípios

- cada template tem semântica estável e sem PII;
- `config_schema_key` referencia um parser conhecido pelo runtime;
- baseline atual fica em versão de sistema, não em constante operacional;
- nenhum consumidor troca para configuração antes de resolver versão ativa e estratégia de snapshot;
- ausência de configuração obrigatória falha explicitamente;
- questões abertas não recebem valor por inferência;
- migrations aplicadas não são editadas.

## Lote A — regras matemáticas simples

### Equivalência de legumes

Template proposto:

`nutrition.vegetable_carbohydrate_equivalence`

Schema:

`method_engine_v1`

Runtime já preparado:

`lib/method/vegetable-carb.ts`

Baseline confirmado:

- 2 doses de legumes equivalem a 1 dose de carboidrato na contagem total.

Shape esperado:
- input: `vegetable_doses: dose`;
- parâmetro: `vegetable_doses_per_carbohydrate_dose: ratio`;
- output: `carbohydrate_dose_equivalent: dose`;
- expressão: divisão do input pelo parâmetro.

Fora deste template:
- redistribuição carboidrato/gordura;
- alocação fixa por refeição;
- exceções de fase;
- gramas históricos de legumes.

### Lembrete de esclarecimento

Template proposto:

`workflow.anamnesis_clarification_reminder`

Schema:

`scalar_parameter_v1`

Runtime já preparado:

`lib/operations/clarification-reminder.ts`

Baseline confirmado:

`{"value":24,"unit":"hour"}`

O template define apenas o intervalo. Não define canal, envio, retry, expiração ou prova de entrega.

## Lote B — schemas estruturais fechados

### Carb Cycle

Templates propostos:

- `nutrition.carb_cycle.phase_1`;
- `nutrition.carb_cycle.phase_2`;
- `nutrition.carb_cycle.phase_3`.

Schema proposto:

`carb_cycle_v1`

Parser já existente:

`parseCarbCycleConfiguration`

Shape fechado:

- `phaseKey`;
- `steps[]`;
- cada step: `key`, `label`, `carbohydratePerKg`, `proteinPerKg`;
- `linearAverageStepKeys[]`.

O schema não deve assumir permanentemente três steps nem Low1/Low2/High.

Antes de seed:
- reconciliar os valores baseline com a fonte já preservada;
- não criar Fases 4, 5 ou 6 por inferência;
- não criar pareamento automático Cutting↔fase.

### Catálogo de tipos de Avaliação

Template proposto:

`assessment.kind_catalog`

Schema proposto:

`assessment_kind_catalog_v1`

Parser já existente:

`parseAssessmentKindCatalogConfiguration`

Shape fechado:

- `entries[]`;
- cada entrada: `historicalCode`, `semanticKey`, `label`.

Baseline de compatibilidade atual:
- `fortnightly -> basic -> Básica`;
- `monthly -> complete -> Completa`.

Os códigos históricos continuam válidos para linhas existentes e não significam uma regra automática de calendário.

### Definição da Avaliação Básica

Template proposto:

`assessment.basic`

Schema proposto:

`assessment_definition_v1`

Parser já existente:

`parseAssessmentDefinitionConfiguration`

Baseline confirmado:
- peso;
- cintura;
- abdômen;
- quadril;
- sem requisito de foto confirmado para esta definição.

### Definição da Avaliação Completa

Template proposto:

`assessment.complete`

Schema proposto:

`assessment_definition_v1`

Baseline confirmado:
- peso;
- cintura;
- abdômen;
- coxa;
- bíceps;
- busto/peito normalizado para a chave técnica aplicável;
- quadril;
- ombros;
- panturrilha;
- pelo menos uma foto.

Unidades e regra de calendário não pertencem a esta primeira definição se ainda não estiverem confirmadas como parte do catálogo.

### Taxonomia de líquidos

Template proposto:

`hydration.liquid_taxonomy`

Schema proposto:

`liquid_taxonomy_v1`

Parser já existente:

`parseLiquidTaxonomyConfiguration`

Baseline de compatibilidade:
- `water` classificado como `pure_water`;
- `zero_calorie_other` classificado como `zero_calorie_other`.

O schema não contém proporção mínima de água pura.

## Registro de schemas

Antes de ativar qualquer template com schema novo, o runtime deve possuir um registro fechado de `config_schema_key` conhecidos.

O registro não deve executar funções por nome vindo do banco. Ele deve usar uma allowlist compilada no código.

Contrato conceitual:

```text
config_schema_key
  -> parser/validator conhecido
  -> configuração tipada ou erro fail-closed
```

Schemas previstos após esta proposta:
- `method_engine_v1`;
- `scalar_parameter_v1`;
- `carb_cycle_v1`;
- `assessment_kind_catalog_v1`;
- `assessment_definition_v1`;
- `liquid_taxonomy_v1`.

A inclusão de um schema novo exige código, testes e revisão técnica. Valores dentro de um schema ativo podem evoluir por versionamento sem deploy quando o contrato permitir.

## Ordem interna recomendada

Depois que a fila atual de produção estiver limpa:

1. materializar equivalência de legumes e lembrete de 24h;
2. materializar Carb Cycle Fases 1–3 após reconciliação da fonte;
3. materializar catálogo e definições de Avaliação;
4. materializar taxonomia de líquidos;
5. somente depois migrar consumidores operacionais um a um.

Motivo: primeiro seeds sem mudança de comportamento; depois resolução/snapshot; por último troca de consumidores.

## Gating de ativação

Uma versão só pode ser considerada pronta quando:
- parser do schema existe;
- fixture baseline passa;
- configuração alternativa passa sem mudança de código;
- shape inválido falha fechado;
- autoria/proveniência está correta;
- versão ativa é única;
- RLS/grants continuam restritivos;
- nenhum consumidor depende de fallback silencioso.

## Fora de escopo

Continuam fora deste lote:
- Fases 5/6;
- Cutting 3 com valores ainda não reconciliados;
- Bulking e Consolidação;
- proporção mínima de água pura;
- regra de recálculo de hidratação;
- canal/cadência de notificações além do intervalo confirmado;
- redistribuição carboidrato/gordura;
- calendário de Avaliação para âncoras 29/30/31;
- treino, suplementação e manipulados ainda abertos.
