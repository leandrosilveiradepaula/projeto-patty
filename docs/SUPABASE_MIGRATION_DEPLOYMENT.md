# Deploy de migrations do Supabase SaaS

Data de referencia: 2026-09-23.

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

Ultimas migrations confirmadas no SaaS:

1. `20260923113230_anamnesis_draft_write_foundation.sql`
2. `20260923113835_admin_mfa_rls_enforcement.sql`
3. `20260923114643_anamnesis_answer_corrections_foundation.sql`
4. `20260923150743_optimize_anamnesis_correction_rls.sql`

As quatro foram aplicadas em 2026-09-23 pelo workflow manual `Deploy Supabase migrations`. O `migration list` pos-apply confirmou os mesmos timestamps local/remoto.

Os smokes pos-aplicacao, executados em transacao com `ROLLBACK`, confirmaram MFA AAL1/AAL2, isolamento entre clientes, persistencia de rascunho, correcoes append-only e preservacao do enforcement AAL2 apos a otimizacao das policies. O advisor deixou de reportar `auth_rls_initplan` para as policies de correcoes.

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
