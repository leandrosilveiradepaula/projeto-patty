# Deploy de migrations do Supabase SaaS

Data de referencia: 2026-09-24.

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

- somente `workflow_dispatch`;
- somente executa no branch `master`;
- usa a versao do Supabase CLI pinada no `package-lock.json`;
- faz `migration list`;
- sempre executa `db push --dry-run` antes de qualquer apply;
- apply exige `mode=apply` e confirmacao textual exata `APPLY`;
- nao executa seed;
- nao executa reset remoto;
- usa concurrency para impedir dois deploys de migration simultaneos.

## Secrets necessarios no GitHub Actions

O workflow precisa de dois secrets adicionais, diferentes de `SUPABASE_SECRET_KEY`:

- `SUPABASE_ACCESS_TOKEN`: Personal Access Token da conta Supabase com acesso ao projeto;
- `SUPABASE_DB_PASSWORD`: senha do banco Postgres do projeto.

O project ref `hqanoskwjvpbgavppcud` nao e segredo e esta fixado no workflow para impedir selecao acidental de outro projeto.

`SUPABASE_SECRET_KEY` continua sendo usada pela aplicacao/E2E para APIs administrativas, mas **nao substitui** as credenciais exigidas pelo CLI para `db push`.

## Procedimento

Primeiro executar o workflow com:

- `mode = dry-run`;
- `confirmation` vazio.

O resultado deve listar somente as migrations esperadas como pendentes.

Somente depois de revisar esse resultado executar novamente com:

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
