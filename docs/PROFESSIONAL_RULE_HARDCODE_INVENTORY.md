# Inventário de regras profissionais hardcoded

Última atualização: 2026-10-03.

## Objetivo

Registrar onde o runtime atual ainda contém valores, fórmulas, catálogos ou workflows profissionais fixos que precisam migrar para a camada de configuração versionada definida em `CONFIGURABLE_RULES.md`.

Baseline auditada:

- `master`: `98bb2043cd0c415815ef1657c86b51c093cadaf1`;
- PR documental de parametrização: #245;
- nenhuma migration aplicada deve ser editada;
- este inventário não autoriza alteração de regra profissional nem ativação automática de questão ainda aberta.

## Classificação usada

- **MIGRAR**: regra profissional confirmada hoje está codificada como constante/branch/constraint e deve virar configuração versionada.
- **MIGRAR COM COMPATIBILIDADE**: existe hardcode também em schema/migration aplicada; a transição exige migration nova e leitura compatível com histórico.
- **FONTE HISTÓRICA**: valor veio de Excel/fonte histórica e deve ser importado como template/catálogo/configuração, sem promovê-lo automaticamente a regra global.
- **INVARIANTE TÉCNICA**: segurança, autorização, imutabilidade, lifecycle de revisão/publicação humana ou validação estrutural; não deve virar campo livre da Patty.
- **QUESTÃO ABERTA**: não automatizar nem inventar valor.

## Inventário confirmado

### HR-001 — Coeficientes do Carb Cycle

**Classificação:** EM MIGRAÇÃO — runtime parametrizado e templates/versionamento das Fases 1–3 já ativos no Supabase SaaS; integração operacional e snapshots continuam bloqueados por decisões abertas.

Arquivo ativo:

- `lib/method/carb-cycle.ts`.

Estado confirmado:

- coeficientes profissionais saíram do runtime e passam a ser recebidos como configuração explícita;
- identidade da fase, steps ordenados e pertencimento à média Linear vêm da configuração;
- o divisor da média deriva da quantidade de steps configurados para a média;
- o runtime não exige exatamente Low1/Low2/High;
- configuração inválida, steps duplicados, coeficientes inválidos e referências de média inexistentes falham fechados;
- `nutrition.carb_cycle.phase_1`, `phase_2` e `phase_3` estão materializados, ativos e versionados no SaaS;
- `lib/method/carb-cycle-loader.ts` resolve exatamente uma versão ativa sob RLS e falha fechado;
- nenhuma Fase 4/5/6 foi criada;
- nenhum pareamento Cutting↔fase nem progressão automática foi introduzido.

Ainda pendente para marcar como migrado:

- definir/documentar o mapeamento entre fases configuradas e etapas concretas do protocolo;
- criar snapshots dos coeficientes/steps efetivamente usados quando houver consumidor operacional;
- integrar o loader somente depois que esse mapeamento estiver confirmado;
- manter compatibilidade enquanto algum consumidor legado depender da estrutura histórica.

### HR-002 — Conversão de doses em gramas

**Classificação:** MIGRADO — runtime parametrizado e seed oficial aplicado no SaaS.

Arquivo ativo:

- `lib/method/doses.ts`.

Estado no PR #253:

- os valores `15/12/6` saíram do runtime;
- conversões recebem uma configuração escalar `g_per_dose` validada;
- golden tests usam explicitamente os valores do template atual e também valores alternativos;
- migration `20261001230751_seed_initial_method_templates.sql` cria os templates `nutrition.dose.protein`, `nutrition.dose.carbohydrate` e `nutrition.dose.fat`;
- migration `20261001230751` aplicada e templates ativos confirmados no SaaS;
- snapshots em protocolos consumidores continuam etapa posterior, pois estes helpers ainda não possuem consumidor operacional fora dos testes.

### HR-003 — Limite do grupo de proteína com maior teor de gordura

**Classificação:** MIGRADO — runtime parametrizado e seed oficial aplicado no SaaS.

Arquivo ativo:

- `lib/method/doses.ts`.

Regra confirmada preservada:

- metade das doses totais de proteína, arredondando para cima.

Estado no PR #255:

- `Math.ceil(totalProteinDoses / 2)` saiu do runtime;
- o helper recebe configuração `method_engine_v1`;
- coeficiente `0.5` está em `higher_fat_ratio`;
- arredondamento `ceil` está na AST configurada;
- golden tests reproduzem 8 -> 4, 7 -> 4 e 9 -> 5;
- testes também demonstram alteração de ratio e arredondamento sem edição de código;
- migration `20261001235018_seed_higher_fat_protein_limit_template.sql` cria `nutrition.protein.higher_fat_daily_limit`;
- snapshots em consumidores operacionais continuam etapa posterior porque o helper ainda não possui consumidor fora dos testes;
- migration `20261001235018` aplicada no SaaS e template `nutrition.protein.higher_fat_daily_limit` ativo confirmado;
- snapshots em consumidores operacionais continuam etapa posterior porque o helper ainda não possui consumidor fora dos testes.

### HR-004 — Referência do Reconhecimento Metabólico

**Classificação:** MIGRADO — runtime parametrizado e seed oficial aplicado no SaaS.

Arquivo ativo:

- `lib/method/recognition.ts`.

Estado no PR #253:

- o helper não contém mais coeficientes profissionais;
- o cálculo usa o engine determinístico `method_engine_v1`;
- peso entra como input explícito `kg`;
- proteína, carboidrato e gordura são lidos da configuração;
- golden tests reproduzem `2 g/kg`, `2 g/kg` e `50 g/dia` e demonstram parâmetros alternativos sem mudança de código;
- migration `20261001230751_seed_initial_method_templates.sql` cria `nutrition.recognition.macros` como baseline versionado;
- override client/protocol e snapshot continuam suportados pela foundation, mas não há consumidor operacional deste helper ainda;
- migration `20261001230751` aplicada e template ativo confirmado no SaaS.

### HR-005 — Meta de líquidos

**Classificação:** MIGRADO — configuração, snapshot e caminho operacional integrados com compatibilidade histórica.

Hardcode histórico preservado:

- `supabase/migrations/20260930132221_create_client_checkins.sql` continua materializando `target_ml = round(weight_kg * 60)`;
- a migration histórica permanece intacta e linhas antigas continuam legíveis com `method_key = 'patty_60_ml_per_kg'`.

Estado após PR #273 e apply no SaaS:

- `lib/method/hydration.ts` calcula a meta a partir de configuração `method_engine_v1`, sem coeficiente profissional embutido;
- golden tests reproduzem 60 mL/kg, alteração de coeficiente e alteração de arredondamento sem mudança de runtime;
- migration oficial `20261002005720_hydrate_client_targets_from_configuration.sql` cria o template `hydration.daily_target` com baseline 60 mL/kg e `round` explícito;
- `client_hydration_targets` ganha caminho compatível com `method_configuration_snapshot_set_id` e `resolved_target_ml`;
- o modo legado e o modo configurado são mutuamente consistentes por constraints;
- o vínculo configurado aponta para snapshot set da mesma cliente;
- a migration histórica não é editada nem reescrita.

Aplicado e validado no SaaS:

- migration `20261001235018` aplicada e higher-fat ativo confirmado;
- migration `20261002005720` aplicada;
- template `hydration.daily_target` ativo com baseline 60 mL/kg e `round`;
- RPC `create_hydration_target_from_method_snapshot` presente como SECURITY INVOKER, sem EXECUTE para `anon`/`authenticated` e com EXECUTE para `service_role`.

Integração operacional concluída:

- a action administrativa resolve o template ativo e eventual override client-scoped via loader sujeito à RLS;
- a persistência privilegiada fica isolada em módulo `server-only` e chama exclusivamente a RPC atômica revisada;
- snapshot, configuração resolvida, resultado e meta ficam vinculados na mesma operação;
- data access/UI leem `resolved_target_ml` no modo configurado e mantêm `target_ml` somente como fallback de histórico legado;
- a UI não repete mais `60 mL/kg` como regra fixa;
- registros históricos `patty_60_ml_per_kg` permanecem intactos e legíveis.

Questões abertas continuam abertas: recálculo após mudança de peso, proporção mínima de água pura, lembretes e correções.

### HR-006 — Conversão de legumes e referências no validador da fonte alimentar

**Classificação:** EM MIGRAÇÃO — validador e equivalência confirmada já parametrizados; template ativo no SaaS e loader de reconciliação prontos, mas o catálogo histórico ainda não deve virar catálogo ativo sem revisão/aprovação.

Arquivo:

- `lib/content/food-equivalent-source.ts`.

Estado confirmado:

- o validador não embute referências numéricas de proteína, carboidrato, gordura, legumes e marcador histórico de dose;
- essas referências entram explicitamente como contexto de reconciliação;
- `lib/method/vegetable-carb.ts` executa a equivalência por configuração `method_engine_v1`;
- o coeficiente atual `2 doses de legumes = 1 dose de carboidrato` é baseline versionado, não constante de runtime;
- `nutrition.vegetable_carbohydrate_equivalence` está materializado e ativo no Supabase SaaS;
- `lib/content/food-equivalent-reconciliation-loader.ts` resolve exatamente uma versão ativa dos templates de proteína, carboidrato, gordura e equivalência de legumes;
- a resolução usa cliente server-side sujeito a RLS e falha fechada;
- `vegetable_grams` e o marcador de dose dos itens permanecem referências históricas explícitas, sem promoção a regra profissional;
- o catálogo histórico continua `publishable: false`;
- não foram inferidas redistribuição carboidrato/gordura, alocação fixa por refeição, exceções por fase ou gramas históricos de legumes.

Ainda pendente:

- integrar o loader somente quando houver fluxo server-side real de reconciliação/revisão do catálogo;
- migrar catálogo histórico para catálogo versionado somente após revisão/aprovação;
- não publicar automaticamente a fonte Excel.

### HR-007 — Tipos de Avaliação Básica/Completa

**Classificação:** MIGRADO — catálogo versionado ativo no Supabase SaaS e consumidores administrativos resolvem a configuração ativa com compatibilidade histórica.

Estado atual:

- `evaluation.assessment_kind_catalog` está materializado e ativo no SaaS;
- `lib/evaluations/assessment-configuration-loader.ts` resolve exatamente uma versão ativa sob RLS, sem service role;
- formulários, listagens e ações administrativas usam labels/opções da configuração ativa;
- os códigos `fortnightly` e `monthly` permanecem somente como compatibilidade do schema legado, não como regra de calendário;
- códigos ativos que o schema atual não consegue persistir falham fechados;
- nenhuma regra de calendário/âncora foi inferida;
- não há constante operacional `ASSESSMENT_KIND_OPTIONS` no `master`.

Compatibilidade preservada:

- `supabase/migrations/20260927002227_create_assessment_draft_lifecycle.sql` continua restringindo `assessment_kind` a `fortnightly|monthly`;
- a migration aplicada permanece intacta;
- linhas históricas continuam preservando os códigos existentes;
- se a Patty confirmar no futuro um novo tipo real, será necessária migration nova antes de esse código poder ser persistido.

### HR-008 — Catálogo obrigatório da Avaliação Básica/Completa

**Classificação:** MIGRADO — definições versionadas, snapshot operacional e hardening aplicados no Supabase SaaS com compatibilidade histórica.

Estado atual:

- `evaluation.assessment_definition.basic` e `evaluation.assessment_definition.complete` estão materializados e ativos no SaaS;
- a versão ativa define medidas obrigatórias, labels, aliases e requisito opcional de foto;
- a página de detalhe apresenta os requisitos da definição ativa em vez de repetir uma lista fixa;
- a finalização usa `buildConfigurableAssessmentReadiness` com a definição ativa;
- a persistência passa por `finalize_assessment_from_method_snapshot`, criando snapshot set + snapshots de catálogo/definição na mesma transação da finalização;
- aliases/configurações inválidas falham fechados;
- nenhuma regra de calendário/cadência foi inferida;
- códigos históricos internos continuam compatíveis;
- os antigos caminhos `buildAssessmentFinalizationReadiness` e `finalizeAccessibleClientAssessment` não possuem consumidores no `master`.

Hardening aplicado e verificado no SaaS:

- migration `20261002231111_harden_snapshot_consumers.sql` aplicada;
- novas transições de rascunho para avaliação finalizada exigem `method_configuration_snapshot_set_id`;
- avaliações históricas já finalizadas antes da adoção do snapshot permanecem válidas;
- `authenticated` não possui UPDATE amplo em `client_assessments`;
- `authenticated` mantém UPDATE somente em `assessed_at` e `assessment_kind` para o fluxo de rascunho;
- a função de lifecycle não é executável por `anon` nem `authenticated`.

A regra de calendário para âncoras 29/30/31 continua aberta e não deve ser inventada.

### HR-009 — Lembrete de esclarecimento em 24 horas

**Classificação:** MIGRADO — intervalo profissional versionado no SaaS e consumidor operacional do painel já resolve a configuração ativa sem fallback hardcoded.

Estado atual:

- o template `workflow.anamnesis_clarification_reminder` foi materializado pela migration `20261002195239_seed_next_method_templates_batch_a.sql`;
- a versão ativa no Supabase SaaS é a v1 com `{"value":24,"unit":"hour"}`, preservando o baseline confirmado pela Patty;
- `lib/operations/clarification-reminder.ts` interpreta a configuração escalar e calcula deterministicamente o marco de lembrete;
- `lib/operations/clarification-reminder-loader.ts` é `server-only`, resolve exatamente uma versão ativa sob RLS e falha fechado;
- `lib/operations/pending-data.ts` carrega o intervalo ativo e o injeta explicitamente em `buildOperationalPendingItems`;
- `lib/operations/pending.ts` não contém mais `CLARIFICATION_REMINDER_INTERVAL_MS` nem fallback silencioso para 24 horas;
- textos do painel derivam o número de horas da configuração resolvida;
- testes de boundary regression protegem o loader fail-closed e a ausência do hardcode legado.

Limite desta conclusão:

- isso encerra a retirada do hardcode profissional do cálculo/indicador operacional;
- o painel apenas registra que um lembrete está **devido** e não presume que uma mensagem foi enviada;
- o canal técnico de envio continua questão aberta e nenhuma escolha entre in-app, e-mail, push ou outro canal foi inferida;
- a implementação de envio recorrente deve permanecer separada até existir decisão documentada sobre canal/mecanismo e rastreabilidade de envio.

### HR-010 — Taxonomia de líquidos do check-in

**Classificação:** MIGRADO — catálogo versionado, snapshot operacional e hardening aplicados no Supabase SaaS com compatibilidade histórica.

Estado atual:

- `hydration.liquid_taxonomy` está materializado e ativo no SaaS;
- `lib/method/liquid-taxonomy-loader.ts` resolve exatamente uma versão ativa sob RLS, sem service role;
- cada tipo possui chave, label e classe `pure_water` ou `zero_calorie_other`;
- a ação da cliente valida o tipo contra a taxonomia ativa antes da escrita;
- a escrita passa por `create_liquid_intake_event_from_method_snapshot`, criando snapshot set + snapshot da taxonomia na mesma transação do evento;
- páginas de cliente/admin usam labels e classificação da taxonomia ativa em vez de traduzir diretamente os códigos;
- a UI deixa explícito que não existe proporção mínima automática entre tipos;
- nenhuma proporção mínima de água pura foi inventada;
- o antigo caminho `createCurrentClientLiquidIntakeEvent` não possui consumidores no `master`.

Hardening aplicado e verificado no SaaS:

- migration `20261002231111_harden_snapshot_consumers.sql` aplicada;
- `authenticated` não possui INSERT direto em `client_liquid_intake_events`;
- novos eventos do fluxo suportado passam pela boundary atômica de snapshot;
- registros históricos anteriores à adoção do snapshot permanecem legíveis e não foram reescritos.

Compatibilidade preservada:

- `supabase/migrations/20260930132221_create_client_checkins.sql` mantém o CHECK histórico `water|zero_calorie_other`;
- o loader falha fechado se uma versão ativa introduzir uma chave que o schema atual ainda não consegue persistir;
- uma nova chave profissional exigirá migration nova antes de poder ser gravada;
- valores históricos permanecem append-only.

### HR-011 — Nomenclatura legada de Avaliações em UI

**Classificação:** CORRIGIDO NO PR #258 — dívida de consistência, não nova regra.

Arquivos ajustados:

- `app/admin/clientes/[clienteId]/avaliacoes/actions.ts`;
- `components/admin/AssessmentCreateForm.tsx`.

Estado no PR #258:

- a linguagem visível de criação de avaliação usa “Básica/Completa”;
- os códigos históricos internos `fortnightly` / `monthly` permanecem inalterados para compatibilidade;
- schema, RLS, lifecycle, catálogo obrigatório e regras de calendário não foram alterados.

**Estado no `master`: RESOLVIDO.** O PR #258 foi mergeado com CI verde; a linguagem visível usa Básica/Completa e os códigos históricos internos permanecem preservados apenas por compatibilidade.

### HR-012 — Estrutura do Carb Cycle implicitamente limitada a Low1/Low2/High

**Classificação:** EM MIGRAÇÃO — runtime generalizado e templates das Fases 1–3 materializados/ativos no SaaS pelo Lote B; integração automática ao protocolo permanece bloqueada por decisões abertas.

Estado atual:

- o runtime aceita coleção ordenada de steps configurados;
- labels/roles e pertencimento à média vêm da configuração;
- o cálculo da média não depende mais de exatamente três steps;
- `nutrition.carb_cycle.phase_1`, `phase_2` e `phase_3` estão ativos e versionados;
- `lib/method/carb-cycle-loader.ts` resolve uma versão ativa fail-closed e permanece limitado às Fases 1–3;
- nenhuma Fase 4/5/6 foi criada.

Ainda pendente:

- definir/documentar o mapeamento entre fases configuradas e etapas concretas do protocolo antes de qualquer consumer switch;
- não automatizar progressão entre fases;
- criar snapshots dos steps/coeficientes efetivamente usados em protocolos;
- manter adapters de compatibilidade apenas enquanto consumidores antigos precisarem deles.

## Fontes já estruturadas que não devem ser confundidas com configuração ativa

### Catálogo alimentar histórico

`docs/source_drafts/food_equivalent_catalog_historical_source.json` contém grupos, itens, quantidades e doses históricos.

Estado correto:

- fonte histórica desidentificada;
- `publishable: false`;
- não é catálogo ativo;
- deve ser classificada e migrada gradualmente para catálogo versionado;
- quantidades individuais não viram default global sem decisão.

### Biblioteca histórica de exercícios

`docs/source_drafts/exercise_library_historical_source.json` é inventário/revisão de mídia, não prescrição de treino.

Na auditoria atual **não foi encontrada implementação ativa de treino prescrito com hardcodes como 3x12/4x12**. Portanto, séries/repetições/descanso devem nascer já parametrizados quando o domínio de prescrição for implementado, em vez de introduzir constantes temporárias.

## Itens revisados que permanecem invariantes técnicas nesta etapa

Não migrar para configuração livre da Patty:

- RLS e policies de autorização;
- MFA/AAL2;
- segregação Auth/Profile/Client;
- grants e secrets;
- imutabilidade de registros finalizados;
- histórico append-only;
- exigência de revisão/aprovação/publicação humana;
- proibição de IA publicar diretamente;
- validações técnicas como número finito/positivo, UUID válido, integridade referencial;
- lifecycle técnico `draft -> submitted/review -> approved -> published` que garante revisão humana.

Esses controles podem ter implementação técnica versionada, mas não são parâmetros profissionais editáveis.

## Restrições de domínio que precisam de decisão arquitetural, não migração automática

Foram observadas restrições como:

- `protocol_type = 'nutrition'`;
- tipos de dose `protein|carbohydrate|fat`;
- check-in de atividade representado como booleano.

Não alterar automaticamente esses domínios nesta migração. Antes, separar:

1. tipo estrutural necessário ao motor;
2. taxonomia profissional que a Patty realmente precisa editar;
3. extensão futura ainda não confirmada.

O objetivo de parametrização não autoriza transformar integridade estrutural em JSON livre.

## Ordem recomendada de migração

1. Criar contrato do motor declarativo e resolução de configuração sem mudar comportamento.
2. Materializar templates versionados para regras matemáticas simples:
   - doses;
   - Reconhecimento Metabólico;
   - limite de proteína de maior teor de gordura;
   - hidratação.
3. Migrar Carb Cycle para steps/fórmulas configuradas.
4. Migrar tipos/catálogos de Avaliação com compatibilidade dos códigos históricos.
5. Parametrizar regra de lembrete de esclarecimento.
6. Migrar catálogo alimentar histórico para catálogo versionado aprovado, separando fonte histórica de template ativo.
7. Fazer novos domínios de treino nascerem já sobre a fundação configurável.
8. Só depois remover caminhos de compatibilidade/hardcodes antigos.

## Critérios de aceite para cada retirada de hardcode

Cada migração deve provar:

- comportamento atual reproduzido pelo template inicial;
- nenhuma migration antiga alterada;
- template possui versão e autoria;
- override individual não muda template global;
- snapshot preserva valor efetivamente usado;
- histórico anterior continua legível;
- RLS não é enfraquecida;
- testes deixam de testar constante global e passam a testar configuração explícita;
- questão aberta não ganha valor por inferência;
- publicação para cliente continua exigindo revisão humana quando aplicável.


## Contrato tecnico aprovado para a proxima etapa

O desenho que orienta a retirada gradual destes hardcodes esta em `METHOD_CONFIGURATION_CONTRACT.md`.

Nenhum item deste inventario deve ser migrado diretamente para um `jsonb` generico sem schema. A retirada de cada hardcode deve usar template/version, resolver de escopo, engine deterministico e snapshot conforme o contrato.
