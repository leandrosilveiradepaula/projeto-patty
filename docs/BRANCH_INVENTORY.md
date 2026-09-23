# Inventario de branches

Data de referencia: 2026-09-23.

Este documento registra uma auditoria conservadora das branches remotas do repositorio. Ele nao autoriza exclusao automatica de branch, merge, rebase, force push ou alteracao de refs.

## Referencia da auditoria

A auditoria original foi feita quando o `master` estava em:

`71420369c9a4c6ead1ad0782e7f6d554411118a1`

Naquele momento existiam 127 branches nao-`master`.

Resultado:
- **113** branches tinham tip exatamente igual ao `head_sha` de um PR ja mergeado;
- **14** branches exigiram classificacao individual.

Depois da auditoria foi criada `codex/reconcile-documentation-master`, diretamente daquele `master`, para reconciliar a documentacao sem usar uma branch divergida como base.

Nenhuma branch foi apagada nesta tarefa.

## Branch ativa de reconciliacao

### `codex/reconcile-documentation-master`

Estado: **ATIVA / PRESERVAR**

Foi criada diretamente do `master` para incorporar apenas mudancas documentais ainda validas e fatos operacionais descobertos durante a reconciliacao.

Nao reutilizar esta branch para nova implementacao depois que seu pacote documental for encerrado. Nova tarefa deve partir do HEAD atual do `master`, salvo instrucao explicita diferente.

## Classificacao das 14 excecoes da auditoria original

| Branch | Estado | Evidencia | Acao recomendada |
| --- | --- | --- | --- |
| `codex/document-existing-draft-ui` | **SUPERADA PELA RECONCILIACAO ATUAL** | O PR #113 havia sido mergeado, mas a branch recebeu novos commits documentais e ficou 12 commits a frente e 26 atras do `master`. O conteudo documental valido foi reconciliado na branch limpa `codex/reconcile-documentation-master`. | Preservar apenas ate revisar/mergear a reconciliacao atual; depois candidata a limpeza. Nao usar como base de codigo. |
| `codex/admin-mfa-enrollment-hygiene` | **REJEITADA** | PR #76 foi encerrado sem merge porque a abordagem tentava localizar fator MFA `unverified` por uma API/tipagem que nao oferecia esse comportamento. | Candidata a exclusao futura; nao reaproveitar codigo. |
| `codex/client-file-upload-session-foundation` | **SUBSTITUIDA** | PR #55 foi encerrado sem merge; a fundacao aplicada foi posteriormente reconciliada por PR #57 e evoluida por fluxos seguintes. | Candidata a exclusao futura. |
| `codex/e2e-admin-anamnesis-corrections` | **SUBSTITUIDA** | PR #107 foi encerrado explicitamente como substituido por branch limpa; PR #111 foi mergeado. | Candidata a exclusao futura. |
| `codex/enforce-admin-mfa-rls` | **SUBSTITUIDA** | Branch antiga com migration alternativa. O enforcement vigente veio do PR #85 e foi posteriormente aplicado/validado. | Candidata a exclusao futura; nao aplicar migration antiga. |
| `codex/harden-anamnesis-draft-delete-e2e` | **IDENTICA AO MASTER NA AUDITORIA** | O tip coincidia com o SHA de `master` no momento da auditoria. | Candidata a exclusao futura. |
| `codex/private-file-access-audit` | **SUBSTITUIDA** | Branch antiga com workflow gerador/migration antiga. O fluxo valido foi implementado em `private-file-access-audit-v2`, PR #54 mergeado. | Candidata a exclusao futura. |
| `codex/protocol-human-lifecycle` | **OBSOLETA** | PR #19 foi encerrado como obsoleto; o lifecycle foi absorvido e evoluido por implementacoes posteriores. | Candidata a exclusao futura. |
| `codex/run-admin-corrections-production-smoke` | **TEMPORARIA** | Contem workflow temporario de smoke. O run falhou durante a janela em que producao estava defasada do `master`. | Candidata a exclusao futura; nao mergear workflow temporario. |
| `codex/run-anamnesis-production-smokes` | **TEMPORARIA** | Workflow temporario; falhas ocorreram no contexto posteriormente identificado de deployment Vercel defasado e do bug de DELETE de draft. | Candidata a exclusao futura. |
| `codex/run-anamnesis-production-smokes-v2` | **TEMPORARIA** | Segunda tentativa temporaria de smoke. | Candidata a exclusao futura. |
| `codex/run-onboarding-e2e-pr-trigger` | **TEMPORARIA / NAO MERGEAR** | PR #83 registra explicitamente que existia apenas para disparar E2E com secrets e deveria ser descartada. | Candidata a exclusao futura. |
| `codex/supabase-auth-leaked-password-protection` | **SEM DIFF EFETIVO NA AUDITORIA** | A comparacao com `master` mostrou zero arquivos diferentes. A limitacao real permanece ligada ao plano Supabase. | Candidata a exclusao futura. |
| `codex/verify-production-security-headers` | **DIAGNOSTICA / EVIDENCIA CONSUMIDA** | Runs de verificacao mostraram ausencia dos headers no deployment antigo; a documentacao posterior confirmou drift de producao por `build-rate-limit`. | Candidata a exclusao futura depois de preservar a evidencia documental. Nao mergear workflow branch-specific. |

## Branches com PR ja mergeado

As 113 branches cujo tip coincidia exatamente com o head do PR mergeado sao candidatas fortes a limpeza administrativa porque nao continham commits posteriores ao merge no momento da auditoria.

Isso **nao** significa que foram apagadas ou que devam ser removidas sem uma tarefa administrativa explicita.

## Regra recomendada de higiene

### RECOMENDACAO TECNICA

Depois que um PR for mergeado, nao reutilizar a mesma branch para uma nova tarefa.

Motivos:
- permite distinguir claramente trabalho incorporado de trabalho novo;
- reduz risco de trabalhar sobre base antiga;
- simplifica auditoria de branches;
- evita que um nome aparentemente historico vire fonte parcial de mudancas recentes.

Branches temporarias criadas apenas para executar smoke ou diagnostico nao devem ser mergeadas. Depois de a evidencia relevante estar documentada, podem ser removidas em tarefa administrativa separada e explicitamente autorizada.

## Limites desta auditoria

- nenhuma branch foi apagada;
- nenhum ref foi movido;
- nenhum merge/rebase foi executado;
- nenhuma branch foi force-updated;
- nenhum codigo ou Supabase foi alterado pela auditoria;
- classificacao de limpeza e recomendacao administrativa, nao exclusao executada.
