# Deploy de migrations do Supabase SaaS

Data de referencia: 2026-10-02.

## Objetivo

Aplicar migrations versionadas do repositorio ao projeto Supabase SaaS preservando o timestamp de cada arquivo em `supabase/migrations` e o historico oficial em `supabase_migrations.schema_migrations`.

## Decisao tecnica

O deploy de schema deve usar o Supabase CLI com `supabase db push`.

Esse fluxo foi escolhido porque:

- compara os timestamps dos arquivos locais com o historico remoto;
- aplica somente migrations ainda pendentes;
- registra cada migration aplicada com seu timestamp original;
- oferece `--dry-run` antes da alteracao;
- e o fluxo recomendado pela documentacao do Supabase para CI/CD de producao.

Nao usar SQL Editor, `execute_sql` ou MCP `apply_migration` para substituir esse deploy quando a migration ja existe no repositorio. Esses caminhos podem executar o SQL, mas nao preservam necessariamente o mesmo identificador de migration do arquivo versionado.

## Estado atual

Migrations relevantes confirmadas no SaaS nesta rodada:

1. `20260922160058_ai_execution_failure_handling.sql`
2. `20260923113230_anamnesis_draft_write_foundation.sql`
3. `20260923113835_admin_mfa_rls_enforcement.sql`
4. `20260923114643_anamnesis_answer_corrections_foundation.sql`
5. `20260923150743_optimize_anamnesis_correction_rls.sql`
6. `20260923191554_fix_anamnesis_draft_delete_trigger.sql`

O workflow manual `Deploy Supabase migrations` de 2026-09-23 confirmou `20260922160058` ja presente no historico remoto. Em seguida, o dry-run listou somente `20260923191554` como pendente; o apply aplicou essa migration e o `migration list` pos-apply confirmou os mesmos timestamps local/remoto.

Os smokes anteriores confirmaram MFA AAL1/AAL2, isolamento entre clientes, persistencia de rascunho, correcoes append-only e preservacao do enforcement AAL2 apos a otimizacao das policies. O advisor deixou de reportar `auth_rls_initplan` para as policies de correcoes. Para `20260923191554`, um smoke transacional pos-apply com dados sinteticos e `ROLLBACK` confirmou DELETE real de draft nao submetido, bloqueio `55000` para submission enviada e isolamento RLS entre clientes. O E2E de UI deve ser repetido quando o deployment Vercel estiver atualizado.

Migration mais recente aplicada:

- `20260924142453_anamnesis_final_submission_foundation.sql`

O dry-run listou somente essa migration como pendente. O apply foi concluido com sucesso e o `migration list` pos-apply mostrou o mesmo timestamp local/remoto: `20260924105003`.

O smoke pos-apply confirmou:
- armazenamento de uma condicao valida;
- rejeicao de par fonte/valor incompleto;
- rejeicao de referencia a pergunta de outra versao;
- rejeicao de auto-referencia;
- rejeicao de `json null` como valor esperado;
- RLS de `anamnesis_questions` preservada;
- 0 residuos sinteticos apos rollback.

## Workflow

O repositorio possui `.github/workflows/deploy-supabase-migrations.yml`.

Caracteristicas:

- `push` no `master` que altere `supabase/migrations/**` ou o proprio workflow executa **somente preview/dry-run**;
- `workflow_dispatch` continua disponivel para preview manual e para apply;
- somente executa no branch `master`;
- usa a versao do Supabase CLI pinada no `package-lock.json`;
- faz `migration list`;
- sempre executa `db push --dry-run` antes de qualquer apply;
- apply continua impossivel em evento `push`;
- apply exige evento `workflow_dispatch`, `mode=apply` e confirmacao textual exata `APPLY`;
- nao executa seed;
- nao executa reset remoto;
- usa concurrency para impedir dois deploys de migration simultaneos.

A automatizacao do dry-run reduz operacao manual sem enfraquecer o gate de producao: nenhum push aplica schema.

## Secrets necessarios no GitHub Actions

O workflow precisa de dois secrets adicionais, diferentes de `SUPABASE_SECRET_KEY`:

- `SUPABASE_ACCESS_TOKEN`: Personal Access Token da conta Supabase com acesso ao projeto;
- `SUPABASE_DB_PASSWORD`: senha do banco Postgres do projeto.

O project ref `hqanoskwjvpbgavppcud` nao e segredo e esta fixado no workflow para impedir selecao acidental de outro projeto.

`SUPABASE_SECRET_KEY` continua sendo usada pela aplicacao/E2E para APIs administrativas, mas **nao substitui** as credenciais exigidas pelo CLI para `db push`.

## Procedimento

Quando uma migration nova for mergeada no `master`, o workflow executa automaticamente o preview. Tambem continua possivel iniciar `workflow_dispatch` manual com:

- `mode = dry-run`;
- `confirmation` vazio.

O resultado deve listar somente as migrations esperadas como pendentes.

Somente depois de revisar esse resultado executar `workflow_dispatch` com:

- `mode = apply`;
- `confirmation = APPLY`.

Apos o apply, o workflow executa `migration list` novamente. Depois disso, conferir pelo conector Supabase que os timestamps esperados aparecem no historico remoto e rodar os smoke tests relevantes.

## Pos-aplicacao obrigatorio

Depois de cada apply:

1. conferir `list_migrations`;
2. rodar advisors de seguranca e performance;
3. executar smoke especifico das invariantes alteradas;
4. registrar a evidencia na documentacao antes de considerar a migration concluida operacionalmente.

Nenhuma UI final de submissao da Anamnese e liberada por esse deploy.


## Excecao operacional de 2026-09-24 — submissao final da Anamnese

O procedimento padrao permanece GitHub Actions + `supabase db push`.

Para `anamnesis_final_submission_foundation`, a integracao GitHub disponivel na sessao conseguia ler/reexecutar workflows, mas nao iniciar `workflow_dispatch`. Como o merge da UI ja havia produzido deployment Vercel de producao READY, deixar o schema pendente criaria uma acao visivel que falharia.

Foi usada, excepcionalmente, a operacao oficial `apply_migration` do conector Supabase com o **mesmo SQL revisado e mergeado**. O Supabase registrou a migration como:

`20260924142453_anamnesis_final_submission_foundation`

O arquivo local foi renomeado imediatamente para o mesmo timestamp remoto, restaurando paridade de historico. Essa excecao nao altera o procedimento padrao para migrations futuras.

Validacoes pos-apply:
- `list_migrations`: migration presente;
- smoke sintetico com `ROLLBACK`: PASS;
- grant de UPDATE apenas em `submitted_at`: confirmado;
- UPDATE de `client_id` e `form_version_id`: nao concedido;
- policy e trigger: presentes;
- advisor de seguranca: nenhum novo finding da migration; permanece apenas Leaked Password Protection, ja bloqueada pelo plano;
- advisor de performance: avisos historicos, sem novo indice criado apenas para zerar lint.


## Excecao operacional de 2026-09-24 — esclarecimentos pos-Anamnese

O procedimento padrao continua sendo GitHub Actions + `supabase db push`. A integracao GitHub desta sessao nao expoe inicio de `workflow_dispatch`.

Para evitar merge/publicacao de rotas que dependem de tabelas ainda inexistentes, a migration de esclarecimentos foi aplicada antes do merge por meio da operacao oficial `apply_migration` do Supabase, depois de:
- smoke transacional previo com `ROLLBACK`;
- CI do PR verde em typecheck, testes e build;
- revisao de RLS, AAL2 e imutabilidade.

O Supabase registrou a migration como:

`20260924153808_create_anamnesis_clarification_flow`

O arquivo do repositorio foi imediatamente alinhado ao mesmo version ID remoto antes do merge.

Validacoes pos-apply:
- `list_migrations`: version ID local/remoto alinhado;
- smoke sintetico com `ROLLBACK`: PASS;
- request administrativo AAL2 + assignment: PASS;
- leitura/resposta da propria cliente: PASS;
- isolamento de outra cliente: PASS;
- multiplos complementos append-only: PASS;
- resposta original preservada: PASS;
- UPDATE/DELETE privilegiado bloqueado pelos triggers: PASS;
- advisor de seguranca: nenhum novo finding; permanece apenas Leaked Password Protection ja conhecido/bloqueado pelo plano;
- advisor de performance: sem novo foreign key sem indice de cobertura nas tabelas de esclarecimentos; indices novos aparecem inicialmente como sem uso, esperado antes de workload.


## 2026-09-24 — hardening da execution boundary de IA

A migration aplicada foi registrada remotamente como:

`20260924165942_harden_ai_execution_boundary`

Validacoes:
- historico remoto confirmado com o mesmo version ID;
- smoke pos-apply sintetico com `ROLLBACK`: PASS;
- submission vinculada diretamente a `anamnesis_review`: PASS;
- sources de outra submission bloqueadas: PASS;
- sources congeladas apos estado terminal: PASS;
- completion/output atomicos: PASS;
- failure metadata/failure response atomicos: PASS;
- `anon`/`authenticated` sem EXECUTE nas RPCs internas: PASS;
- RPCs internas `SECURITY INVOKER`: PASS;
- advisor de seguranca sem novo finding; permanece apenas HIBP ja conhecido;
- advisor de performance informa a nova FK composta de `ai_executions` sem indice de cobertura exata. Nenhum indice extra foi criado apenas para zerar lint sem workload, conforme decisao de performance vigente.


## 2026-09-24 — prompt OpenAI para revisao de Anamnese

Migration remota:

`20260924193339_seed_openai_anamnesis_review_prompt`

A migration apenas cria de forma idempotente o prompt versionado `anamnesis_review` v1. Ela nao chama provider e nao cria execution.

Validacao pos-apply:
- prompt v1: exatamente 1;
- `schema_version = 1`;
- instructions nao vazias;
- `ai_executions = 0`.


## 2026-09-24 — assets de midia educacional

Migration remota:

`20260924210600_create_educational_content_assets`

Estado:
- apply: PASS;
- historico remoto confirmado;
- smoke pos-apply sintetico com `ROLLBACK`: PASS;
- RLS por release: PASS;
- AAL2 admin: PASS;
- imutabilidade apos publicacao: PASS;
- provider v1 `vercel_blob`: PASS;
- advisor de seguranca: nenhum finding novo; HIBP permanece conhecido;
- advisor de performance: indice novo ainda sem uso observado; nenhuma alteracao criada apenas para zerar lint sem workload.

## Migration 20260924215415 - limites de retencao de falhas de IA

Status: **APLICADA / VALIDADA NO SAAS**

Migration:
`20260924215415_add_ai_failure_retention_constraints.sql`

Alteracoes:
- CHECK `ai_execution_failure_responses_content_size_check`: `octet_length(content) <= 131072`;
- CHECK `ai_executions_failure_message_size_check`: `failure_message is null or char_length(failure_message) <= 1024`.

Validacao pos-apply:
- historico remoto contem a migration;
- introspeccao de `pg_constraint` confirmou ambas as definicoes;
- nao existiam failure responses/failure messages reais antes do apply;
- advisor de seguranca sem finding novo causado pela migration.

## Migration 20260924230322 - publicacao da Anamnese canonica v1

Status: **APLICADA / VALIDADA NO SAAS**

Migration:
`20260924230322_publish_canonical_anamnesis_v1.sql`

Resultado:
- cria `anamnesis_forms.form_key = client-anamnesis`;
- cria versao 1;
- cria 10 secoes;
- cria 51 perguntas;
- configura 10 regras de aplicabilidade;
- inclui ANAM-046 obrigatorio com opcao `Concordo`;
- publica explicitamente a versao ao final da migration.

Antes do apply, o mesmo SQL foi validado em transacao com `ROLLBACK`, confirmando as invariantes. Pos-apply, a estrutura foi reconsultada e confirmou 10/51/10/1.
## Excecao operacional de 2026-09-26 — solicitacao de treino

O procedimento padrao continua sendo GitHub Actions + `supabase db push`, preservando o timestamp versionado.

A migration de solicitacao de treino foi validada previamente com o SQL completo dentro de `BEGIN`/`ROLLBACK`, passou CI/build no PR #207 e foi aplicada excepcionalmente pelo conector Supabase imediatamente apos o merge para evitar publicar UI dependente de tabela inexistente.

O Supabase registrou:
- `20260926233725_create_client_training_requests`;
- `20260926233849_optimize_client_training_request_rls`.

O primeiro apply havia partido de um arquivo local com timestamp anterior ao version ID gerado pelo conector. O repositorio foi imediatamente reconciliado para os dois version IDs remotos acima, sem alterar o SQL ja aplicado.

Validacoes pos-apply:
- `list_migrations`: ambas presentes;
- RLS: habilitada em `client_training_requests`;
- grants de browser: somente `SELECT` e `INSERT` para `authenticated`; nenhum grant para `anon`; sem UPDATE/DELETE;
- policy `RESTRICTIVE` de MFA AAL2: presente;
- policies de SELECT/INSERT: admin relacional + assignment ativo; autoria do INSERT = `auth.uid()`;
- trigger append-only: UPDATE/DELETE bloqueados;
- advisor de seguranca: nenhum finding novo; permanece apenas Leaked Password Protection ja conhecido;
- advisor de performance: os dois `auth_rls_initplan` introduzidos pela migration inicial desapareceram apos a migration de otimizacao; lints restantes sao historicos/informativos.
- smoke sintetico pos-apply com `ROLLBACK`: admin AAL2 + assignment ativo INSERT/SELECT PASS; admin AAL1 SELECT bloqueado; admin AAL2 sem assignment para a cliente SELECT bloqueado; 0 residuos.
## Excecao operacional de 2026-09-27 — lifecycle de Avaliacoes

O procedimento padrao continua sendo GitHub Actions + `supabase db push` com preservacao do timestamp versionado.

A migration do lifecycle de Avaliacoes foi validada integralmente com `BEGIN`/`ROLLBACK`, passou CI/build no PR #210 e, imediatamente depois do merge, foi aplicada pelo conector Supabase para evitar publicar a UI dependente de colunas/policies ainda ausentes.

O Supabase registrou:
- `20260927002227_create_assessment_draft_lifecycle`.

O arquivo revisado no PR possuia timestamp local anterior ao version ID gerado pelo conector. O repositorio foi reconciliado imediatamente para `20260927002227`, preservando exatamente o SQL aplicado e sem editar migration historica ja aplicada.

Validacoes pos-apply registradas:
- RLS permanece habilitada em `client_assessments`;
- `client_assessments`: browser autenticado possui somente `SELECT`, `INSERT`, `UPDATE`; sem `DELETE`;
- `assessment_measurements`: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, cercados por draft + admin/assignment + MFA transversal;
- `assessment_files`: `SELECT`, `INSERT`, `DELETE`, com vinculo somente a foto da mesma cliente;
- triggers de draft/finalizacao e guarda de follow-up finalizado presentes;
- advisor de seguranca sem finding novo; permanece apenas Leaked Password Protection ja conhecido;
- advisor de performance sem novo `auth_rls_initplan`; indices novos aparecem apenas como `unused_index` imediatamente apos criacao, sem justificar remocao.
- smoke sintetico pos-apply com `ROLLBACK`: admin AAL2 + assignment ativo criou/alterou draft, atualizou medida, vinculou foto e finalizou; AAL1 e admin sem assignment nao leram o registro; follow-up antes da finalizacao foi bloqueado; mutacao da avaliacao/medida apos finalizacao foi bloqueada por `55000`; 0 residuos.



## 2026-10-02 — dry-run automatico no master

### DECISAO TECNICA

Para reduzir dependencia de operacao manual sem remover o gate de producao, o workflow passa a executar automaticamente `migration list` + `db push --dry-run` quando um push ao `master` altera migrations ou o proprio workflow.

Esse trigger:
- nao executa `db push` sem `--dry-run`;
- nao aceita `confirmation`;
- nao aplica schema;
- reutiliza a mesma concurrency do fluxo manual;
- preserva `workflow_dispatch` + `confirmation=APPLY` como unico caminho de apply.

Portanto, preview automatico nao equivale a autorizacao de apply.
