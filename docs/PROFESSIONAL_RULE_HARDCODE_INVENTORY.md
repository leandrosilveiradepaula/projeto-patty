# Inventário de regras profissionais hardcoded

Última atualização: 2026-10-02.

## Objetivo

Registrar onde o runtime atual ainda contém valores, fórmulas, catálogos ou workflows profissionais fixos que precisam migrar para a camada de configuração versionada definida em `CONFIGURABLE_RULES.md`.

Baseline auditada:

- `master`: `0de334b309ffd7dbf5db02b0e1ae88237e272b2b`;
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

**Classificação:** EM MIGRAÇÃO — runtime parametrizado no PR #257; template/versionamento de banco ainda pendentes.

Arquivo ativo:

- `lib/method/carb-cycle.ts`.

Estado no PR #257:

- coeficientes profissionais saem do runtime e passam a ser recebidos como configuração explícita;
- identidade da fase, steps ordenados e pertencimento à média Linear vêm da configuração;
- o divisor da média deixa de ser fixo em `3` e deriva da quantidade de steps configurados para a média;
- o runtime deixa de exigir exatamente Low1/Low2/High;
- os valores atuais das Fases 1, 2 e 3 permanecem apenas em golden tests como baseline de equivalência;
- configuração inválida, steps duplicados, coeficientes inválidos e referências de média inexistentes falham fechados;
- nenhuma Fase 4/5/6 foi inventada;
- nenhum pareamento Cutting↔fase nem progressão automática foi introduzido.

Ainda pendente para marcar como migrado:

- materializar via Supabase CLI a proposta revisada em `docs/CARB_CYCLE_CONFIGURATION_MIGRATION_PROPOSAL.sql`;
- promover o pgTAP proposto em `docs/CARB_CYCLE_CONFIGURATION_PGTAP_PROPOSAL.sql` para a suíte oficial;
- seed controlado dos baselines confirmados;
- snapshot dos coeficientes usados;
- integração operacional sem fallback silencioso;
- manter compatibilidade enquanto algum consumidor legado depender de Low1/Low2/High.

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

**Classificação:** EM MIGRAÇÃO — validador parametrizado no PR #259; equivalência confirmada de legumes materializada no Supabase SaaS pelo Lote A; referência profissional atual agora pode ser resolvida de templates versionados, enquanto entradas históricas permanecem explícitas.

Arquivo:

- `lib/content/food-equivalent-source.ts`.

Estado no PR #259:

- o validador deixa de embutir referências numéricas de proteína, carboidrato, gordura, legumes e marcador histórico de dose;
- todas essas referências entram explicitamente como contexto de reconciliação;
- golden tests preservam a fonte histórica atual e demonstram uma referência alternativa sem mudança de runtime;
- referências inválidas falham fechadas;
- a fonte continua obrigatoriamente `publishable: false`;
- nenhuma quantidade histórica foi promovida a catálogo ativo ou regra global.

Estado adicional no PR #267:

- `lib/method/vegetable-carb.ts` executa a equivalência por configuração `method_engine_v1`;
- o coeficiente atual `2 doses de legumes = 1 dose de carboidrato` permanece somente como baseline em golden tests;
- alteração do coeficiente não exige mudança de runtime;
- não foram inferidas redistribuição carboidrato/gordura, alocação fixa por refeição, exceções por fase ou gramas históricos de legumes.

Classificação preservada:

- a equivalência confirmada ainda precisa de template/versionamento ativo no banco;
- referências de proteína/carboidrato/gordura devem futuramente vir dos templates de doses já versionados;
- `vegetable_grams` e o marcador de dose dos itens permanecem referências históricas de reconciliação enquanto não houver confirmação profissional específica.

Estado adicional após o Lote A:

- `nutrition.vegetable_carbohydrate_equivalence` está materializado e ativo no Supabase SaaS;
- `lib/content/food-equivalent-reconciliation-loader.ts` resolve exatamente uma versão ativa dos templates de proteína, carboidrato, gordura e equivalência de legumes;
- a resolução usa o cliente server-side sujeito a RLS e falha fechada;
- `vegetable_grams` e o marcador de dose permanecem parâmetros históricos explícitos, sem promoção a regra profissional;
- o catálogo histórico continua `publishable: false`.

Ainda pendente:

- integrar esse loader somente quando houver um fluxo server-side real de reconciliação/revisão do catálogo;
- migrar catálogo histórico para catálogo versionado somente após revisão/aprovação;
- não publicar automaticamente a fonte Excel.

### HR-007 — Tipos de Avaliação Básica/Completa

**Classificação:** EM MIGRAÇÃO — catálogo versionado aplicado no Supabase SaaS pelo Lote B; consumidores administrativos passam a resolver a versão ativa neste PR.

Estado atual:

- `evaluation.assessment_kind_catalog` está materializado e ativo no SaaS;
- `lib/evaluations/assessment-configuration-loader.ts` resolve exatamente uma versão ativa sob RLS, sem service role;
- formulários, listagens e ações administrativas deixam de usar labels/opções fixos como fonte operacional;
- os códigos `fortnightly` e `monthly` permanecem como compatibilidade do schema legado, não como regra de calendário;
- códigos ativos que o schema atual não consegue persistir falham fechados;
- nenhuma regra de calendário/âncora foi inferida.

Compatibilidade preservada:

- `supabase/migrations/20260927002227_create_assessment_draft_lifecycle.sql` continua restringindo `assessment_kind` a `fortnightly|monthly`;
- a migration aplicada não será alterada;
- linhas históricas continuam preservando os códigos existentes.

Ainda pendente:

- criar migration nova somente se a Patty confirmar um novo tipo real que exija relaxar o CHECK;
- preservar indefinidamente os códigos históricos nas linhas existentes.

### HR-008 — Catálogo obrigatório da Avaliação Básica/Completa

**Classificação:** EM MIGRAÇÃO — definições versionadas aplicadas no Supabase SaaS pelo Lote B; finalização passa a consumir a definição ativa neste PR.

Estado atual:

- `evaluation.assessment_definition.basic` e `evaluation.assessment_definition.complete` estão materializados e ativos no SaaS;
- a versão ativa define medidas obrigatórias, labels, aliases e requisito opcional de foto;
- a página de detalhe apresenta os requisitos da definição ativa em vez de repetir uma lista fixa;
- a finalização usa `buildConfigurableAssessmentReadiness` com a definição ativa;
- aliases/configurações inválidas falham fechados;
- nenhuma regra de calendário/cadência foi inferida;
- códigos históricos internos continuam compatíveis.

Ainda pendente para encerrar completamente:

- persistir ou referenciar explicitamente na avaliação a versão de catálogo/definição usada na finalização, para auditoria direta sem depender apenas da linha do tempo de ativação;
- decidir o mecanismo de snapshot/referência antes de automatizar qualquer decisão posterior baseada nessas definições;
- remover o helper legado de prontidão somente depois de confirmar que nenhum consumidor restante depende dele.

A regra de calendário para âncoras 29/30/31 continua aberta e não deve ser inventada.

### HR-009 — Lembrete de esclarecimento em 24 horas

**Classificação:** EM PREPARAÇÃO — helper configurável mergeado no PR #260; integração operacional ainda pendente.

Estado no `master`:

- `lib/operations/clarification-reminder.ts` recebe configuração escalar explícita com unidade `hour`;
- `lib/operations/clarification-reminder-loader.ts` prepara resolução server-side fail-closed do template ativo, sem service role e sem fallback silencioso;
- golden tests reproduzem o baseline atual de 24 horas e demonstram intervalo alternativo sem mudança de runtime;
- não existe fallback silencioso para 24 horas no helper configurável;
- canal e envio real continuam separados e não foram inferidos.

Hardcode legado ainda ativo:

- `lib/operations/pending.ts` ainda contém `CLARIFICATION_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000`;
- textos operacionais ainda dizem `24 horas`/`24h`.

Ainda pendente para marcar como migrado:

- criar template/versionamento ativo para o intervalo;
- materializar/aplicar o template ativo do Lote A no SaaS;
- somente depois conectar o loader ao builder operacional e passar o intervalo resolvido;
- substituir textos fixos por texto derivado da configuração quando aplicável;
- manter a distinção entre `lembrete devido` e `lembrete enviado`.

### HR-010 — Taxonomia de líquidos do check-in

**Classificação:** EM PREPARAÇÃO — parser de catálogo configurável mergeado no PR #264; escrita operacional e CHECK histórico permanecem legados.

Estado no `master`:

- `lib/method/liquid-taxonomy.ts` recebe catálogo explícito de tipos elegíveis;
- `lib/method/liquid-taxonomy-loader.ts` prepara resolução server-side fail-closed do catálogo ativo, sob RLS e sem service role;
- cada tipo possui chave, label e classe `pure_water` ou `zero_calorie_other`;
- os códigos históricos `water` e `zero_calorie_other` existem apenas como baseline nos golden tests do novo helper;
- tipo ausente, chave duplicada, classe desconhecida ou campos que tentem introduzir proporção falham fechados;
- nenhuma proporção mínima de água pura foi inventada.

Compatibilidade ainda ativa:

- `app/cliente/checkins/actions.ts` continua aceitando somente `water` e `zero_calorie_other`;
- `supabase/migrations/20260930132221_create_client_checkins.sql` mantém o CHECK histórico;
- a UI atual ainda traduz diretamente esses códigos.

Ainda pendente para marcar como migrado:

- persistir catálogo/versionamento;
- resolver catálogo ativo server-side;
- migrar validação e exibição do check-in;
- preservar valores históricos;
- criar migration nova somente se o catálogo aprovado exigir novos códigos persistidos.

Preparação de persistência:

- `docs/LIQUID_TAXONOMY_CONFIGURATION_MIGRATION_PROPOSAL.sql` preserva somente os dois códigos históricos atuais;
- `docs/LIQUID_TAXONOMY_CONFIGURATION_PGTAP_PROPOSAL.sql` cobre proveniência, versão ativa, chaves históricas e ausência de regra de proporção;
- materialização oficial continua dependente de arquivo criado por `supabase migration new` e apply pelo workflow oficial;
- consumidor atual permanece legado até o template existir e ser validado no SaaS.

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

**Classificação:** EM MIGRAÇÃO — estrutura de runtime generalizada no PR #257; persistência/configuração ativa ainda pendente.

Estado no `master`:

- o runtime aceita coleção ordenada de steps configurados;
- labels/roles e pertencimento à média vêm da configuração;
- o cálculo da média não depende mais de exatamente três steps;
- golden tests preservam Low1/Low2/High somente como baseline atual de equivalência;
- nenhuma Fase 4/5/6 foi inventada.

Ainda pendente:

- materializar os templates versionados no banco;
- loader server-side fail-closed preparado em `lib/method/carb-cycle-loader.ts`, limitado às Fases 1–3; conectar consumidor somente após apply/validação no SaaS;
- criar snapshots dos steps/coeficientes usados;
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
