# Inventário de regras profissionais hardcoded

Última atualização: 2026-10-01.

## Objetivo

Registrar onde o runtime atual ainda contém valores, fórmulas, catálogos ou workflows profissionais fixos que precisam migrar para a camada de configuração versionada definida em `CONFIGURABLE_RULES.md`.

Baseline auditada:

- `master`: `a274b7fafb2e3aa32276833c38f583a132feba73`;
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

**Classificação:** MIGRAR.

Arquivo ativo:

- `lib/method/carb-cycle.ts`.

Hardcodes atuais:

- fases aceitas pelo tipo: `1 | 2 | 3`;
- Fase 1 carboidrato: `[1.55, 1.55, 4.4]`;
- Fase 1 proteína: `[2.3, 2.3, 2.3]`;
- Fase 2 carboidrato: `[1.25, 1.25, 3.5]`;
- Fase 2 proteína: `[2.3, 2.3, 2.3]`;
- Fase 3 carboidrato: `[0.95, 0.95, 2.6]`;
- Fase 3 proteína: `[2.3, 2.3, 2.3]`;
- média linear calculada como `(low1 + low2 + high) / 3`.

Acoplamento de teste:

- `lib/method/carb-cycle.test.ts` reproduz exatamente esses valores.

Risco:

- mudar uma planilha ou adicionar nova fase exige alteração de código;
- o tipo `1 | 2 | 3` impede extensão por configuração;
- o divisor `3` pressupõe estrutura fixa do ciclo.

Destino esperado:

- template versionado de fase/ciclo;
- steps configurados, cada um com papel/ordem e fórmula;
- cálculo da média derivado genericamente da configuração, quando a média fizer parte da regra ativa;
- snapshot dos coeficientes usados.

Não inferir Fases 5/6 ou pareamento de Cutting ainda aberto.

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

**Classificação:** EM MIGRAÇÃO — runtime parametrizado no PR #255; seed oficial ainda não aplicado.

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
- a migration ainda não foi aplicada no SaaS.

Critério para marcar como migrado: migration aplicada + template ativo confirmado no SaaS.

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

**Classificação:** MIGRAR COM COMPATIBILIDADE.

Hardcodes ativos:

- `supabase/migrations/20260930132221_create_client_checkins.sql` materializou `target_ml = round(weight_kg * 60)`;
- a mesma migration restringe `method_key = 'patty_60_ml_per_kg'`;
- `app/admin/clientes/[clienteId]/checkins/page.tsx` exibe `60 mL/kg` e `peso x 60 mL`.

Estado:

- a migration já foi aplicada e **não deve ser alterada**;
- metas já criadas são snapshots históricos e devem permanecer válidas.

Destino esperado:

- migration nova para separar definição/configuração da fórmula do snapshot calculado;
- template inicial com `60 mL/kg/dia`;
- cada nova meta registra template/versão, peso usado, parâmetros resolvidos e resultado;
- UI lê a configuração/snapshot em vez de repetir `60`.

Questões ainda abertas continuam abertas: recálculo após mudança de peso, proporção mínima de água pura, lembretes e correções.

### HR-006 — Conversão de legumes e referências no validador da fonte alimentar

**Classificação:** EM MIGRAÇÃO — validador parametrizado no PR #259; templates/catálogos ativos ainda pendentes.

Arquivo:

- `lib/content/food-equivalent-source.ts`.

Estado no PR #259:

- o validador deixa de embutir referências numéricas de proteína, carboidrato, gordura, legumes e marcador histórico de dose;
- todas essas referências entram explicitamente como contexto de reconciliação;
- golden tests preservam a fonte histórica atual e demonstram uma referência alternativa sem mudança de runtime;
- referências inválidas falham fechadas;
- a fonte continua obrigatoriamente `publishable: false`;
- nenhuma quantidade histórica foi promovida a catálogo ativo ou regra global.

Classificação preservada:

- a regra confirmada de `2 doses de legumes = 1 dose de carboidrato` ainda precisa virar configuração versionada própria;
- referências de proteína/carboidrato/gordura devem futuramente vir dos templates de doses já versionados;
- `vegetable_grams` e o marcador de dose dos itens permanecem referências históricas de reconciliação enquanto não houver confirmação profissional específica.

Ainda pendente:

- resolver as referências a partir de versões concretas de templates em vez de fixture explícita;
- criar template versionado da conversão confirmada de legumes;
- migrar catálogo histórico para catálogo versionado somente após revisão/aprovação;
- não publicar automaticamente a fonte Excel.

### HR-007 — Tipos de Avaliação Básica/Completa

**Classificação:** MIGRAR COM COMPATIBILIDADE.

Hardcodes ativos:

- `lib/evaluations/assessment-draft.ts` fixa apenas:
  - `fortnightly -> Básica`;
  - `monthly -> Completa`;
- `supabase/migrations/20260927002227_create_assessment_draft_lifecycle.sql` restringe `assessment_kind` a `fortnightly|monthly`;
- policies da mesma migration repetem essa allowlist.

Estado:

- os identificadores técnicos são históricos e já existem no SaaS;
- a migration aplicada não deve ser alterada.

Destino esperado:

- catálogo/versionamento de tipos de avaliação;
- manter compatibilidade com códigos históricos;
- criar migration nova caso o schema precise deixar de limitar tipos por CHECK fixo.

### HR-008 — Catálogo obrigatório da Avaliação Básica/Completa

**Classificação:** MIGRAR.

Arquivo ativo:

- `lib/evaluations/assessment-readiness.ts`.

Hardcodes atuais:

Avaliação Básica:
- peso;
- cintura;
- abdômen;
- quadril.

Avaliação Completa:
- peso;
- cintura;
- abdômen;
- coxa;
- bíceps;
- busto/peito normalizado como tórax;
- quadril;
- ombros;
- panturrilhas;
- pelo menos uma foto.

Acoplamento de teste:

- `lib/evaluations/assessment-readiness.test.ts`.

Destino esperado:

- definição versionada de cada tipo de avaliação;
- itens obrigatórios, unidade, aliases de entrada quando necessários e requisito de foto como configuração;
- finalização resolve a versão aplicável e registra snapshot suficiente para auditoria.

A regra de calendário para âncoras 29/30/31 continua aberta e não deve ser inventada.

### HR-009 — Lembrete de esclarecimento em 24 horas

**Classificação:** MIGRAR.

Arquivo ativo:

- `lib/operations/pending.ts`.

Hardcode atual:

- `CLARIFICATION_REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000`;
- textos de UI também dizem `24 horas`/`24h`.

Acoplamento de teste:

- `lib/operations/pending.test.ts`.

Regra atual confirmada:

- enquanto aguarda resposta da cliente, deve existir lembrete a cada 24 horas.

Destino esperado:

- intervalo configurável/versionado;
- cálculo de due date recebe o parâmetro resolvido;
- canal e execução real continuam separados e ainda abertos;
- não presumir envio apenas porque o marco ficou devido.

### HR-010 — Taxonomia de líquidos do check-in

**Classificação:** MIGRAR COM COMPATIBILIDADE como taxonomia do método.

Hardcodes ativos:

- `app/cliente/checkins/actions.ts` aceita somente `water` e `zero_calorie_other`;
- `supabase/migrations/20260930132221_create_client_checkins.sql` contém CHECK com os mesmos dois valores;
- UI traduz os dois tipos diretamente.

Regra atual confirmada:

- maior parte em água pura;
- restante pode ser complementado em menor quantidade por líquidos zero calorias.

Questão aberta:

- proporção mínima/exata de água pura.

Destino esperado:

- preservar valores históricos;
- permitir catálogo/configuração de tipos elegíveis sem alterar a regra de proporção ainda aberta;
- qualquer flexibilização de CHECK exige migration nova.

### HR-011 — Nomenclatura legada de Avaliações ainda exposta em UI

**Classificação:** DÍVIDA DE CONSISTÊNCIA, não nova regra.

Arquivos observados:

- `app/admin/clientes/[clienteId]/avaliacoes/actions.ts`;
- `components/admin/AssessmentCreateForm.tsx`.

Ainda existem mensagens com “quinzenal ou mensal” e descrição “Quinzenal/Mensal”, apesar da decisão profissional vigente usar “Avaliação Básica/Completa”.

Destino esperado:

- remover linguagem legada visível;
- manter códigos históricos internos apenas enquanto necessário para compatibilidade.

### HR-012 — Estrutura do Carb Cycle implicitamente limitada a Low1/Low2/High

**Classificação:** MIGRAR.

Arquivo:

- `lib/method/carb-cycle.ts`.

O contrato `CarbCycleMacroValues` expõe campos fixos:

- `low1Grams`;
- `low2Grams`;
- `highGrams`;
- `linearAverageGrams`.

Isso impede representar por dados uma sequência diferente sem mudar TypeScript.

Destino esperado:

- coleção ordenada de steps configurados;
- labels/roles versionados;
- resultados por step;
- helpers de compatibilidade enquanto telas antigas consumirem Low1/Low2/High.

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
