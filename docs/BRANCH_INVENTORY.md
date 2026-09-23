# Inventario de branches

Data de referencia: 2026-09-23.

Este documento registra uma auditoria conservadora das branches remotas do repositorio. Ele nao autoriza exclusao automatica de branch, merge, rebase ou force push.

## Referencias da auditoria

- `master` no momento da auditoria: `71420369c9a4c6ead1ad0782e7f6d554411118a1`
- branches nao-`master` encontradas: **127**
- branches cujo tip atual coincide exatamente com o `head_sha` de um PR ja mergeado: **113**
- branches que exigiram classificacao individual: **14**

A coincidencia exata de SHA com o head de um PR mergeado significa que a branch nao recebeu commits novos depois daquele merge. Essas 113 branches sao candidatas fortes a limpeza administrativa futura, mas nenhuma foi apagada nesta tarefa.

## Classificacao das 14 excecoes

| Branch | Estado | Evidencia | Acao recomendada |
| --- | --- | --- | --- |
| `codex/document-existing-draft-ui` | **ATIVA / DIVERGIDA** | PR #113 foi mergeado, mas a branch recebeu novos commits documentais depois. Comparada ao `master` atual: 12 commits a frente e 26 atras. Os diffs atuais sao documentais: `AGENTS.md`, `ANAMNESE.md`, `DATA_MODEL.md`, `MVP.md`, `MVP_READINESS.md`, `OPEN_QUESTIONS.md`, `PRODUCT.md`, `PROJECT_STATUS.md` e `RBAC_RLS.md`. | **PRESERVAR.** Reconciliar esses documentos com o `master` atual antes de considerar a documentacao oficialmente incorporada. Nao usar esta branch como base de codigo atual. |
| `codex/admin-mfa-enrollment-hygiene` | **REJEITADA** | PR #76 foi encerrado sem merge. O proprio PR registra que a abordagem era invalida para a API/tipagem atual de MFA e que nenhuma alteracao deveria ser aplicada. | Candidata a exclusao futura; nao reaproveitar codigo. |
| `codex/client-file-upload-session-foundation` | **SUBSTITUIDA** | PR #55 foi encerrado sem merge. A fundacao aplicada foi posteriormente reconciliada pela branch/PR #57, ja mergeada. | Candidata a exclusao futura. |
| `codex/e2e-admin-anamnesis-corrections` | **SUBSTITUIDA** | PR #107 foi encerrado explicitamente como substituido por branch limpa; PR #111 (`e2e-admin-anamnesis-corrections-v2`) foi mergeado. | Candidata a exclusao futura. |
| `codex/enforce-admin-mfa-rls` | **SUBSTITUIDA** | Branch antiga com migration alternativa. O enforcement atual foi implementado pela branch `codex/admin-mfa-rls-enforcement`, PR #85 mergeado, e posteriormente aplicado/validado. | Candidata a exclusao futura; nao aplicar sua migration antiga. |
| `codex/harden-anamnesis-draft-delete-e2e` | **IDENTICA AO MASTER** | Tip da branch e exatamente o SHA atual do `master` na auditoria. | Candidata a exclusao futura. |
| `codex/private-file-access-audit` | **SUBSTITUIDA** | Branch antiga com workflow gerador e migration vazia/antiga. O fluxo valido foi implementado por `codex/private-file-access-audit-v2`, PR #54 mergeado. | Candidata a exclusao futura; nao reutilizar migration antiga. |
| `codex/protocol-human-lifecycle` | **OBSOLETA** | PR #19 foi encerrado explicitamente como obsoleto. O lifecycle foi absorvido/evoluido posteriormente, incluindo PR #20 e guardas/testes posteriores. | Candidata a exclusao futura. |
| `codex/run-admin-corrections-production-smoke` | **TEMPORARIA** | Contem apenas workflow temporario de smoke. Run correspondente concluiu com failure durante a janela de producao defasada. | Candidata a exclusao futura; nao mergear workflow temporario. |
| `codex/run-anamnesis-production-smokes` | **TEMPORARIA** | Workflow temporario de smoke; runs falharam. Evidencia posterior mostrou defasagem do deployment Vercel, documentada em `DECISIONS.md`. | Candidata a exclusao futura. |
| `codex/run-anamnesis-production-smokes-v2` | **TEMPORARIA** | Segunda tentativa temporaria; runs falharam no mesmo contexto operacional. | Candidata a exclusao futura. |
| `codex/run-onboarding-e2e-pr-trigger` | **TEMPORARIA / NAO MERGEAR** | PR #83 registra explicitamente que existia apenas para disparar E2E usando secrets e que deveria ser fechada/descartada. | Candidata a exclusao futura. |
| `codex/supabase-auth-leaked-password-protection` | **SEM DIFF EFETIVO** | Comparacao com `master` mostrou zero arquivos diferentes, apesar de commits historicos na branch. A limitacao real de Leaked Password Protection esta documentada como dependencia do plano Supabase. | Candidata a exclusao futura. |
| `codex/verify-production-security-headers` | **DIAGNOSTICA / EVIDENCIA JA DOCUMENTADA** | Tres runs de verificacao falharam porque o deployment de producao ainda nao continha os headers; o run diagnostico posterior concluiu com sucesso. A causa foi documentada em `DECISIONS.md`: producao estava atras do `master` por limite de builds Vercel. | Candidata a exclusao futura depois de preservar a evidencia documental. Nao mergear o workflow branch-specific como solucao permanente. |

## Conclusao operacional

Nao foi identificado trabalho de produto/codigo aparentemente perdido nas 13 branches nao ativas.

O unico trabalho atual que precisa ser preservado antes de qualquer limpeza e o conjunto documental novo em:

`codex/document-existing-draft-ui`

Essa branch, entretanto, **nao deve ser tratada como base atual do codigo**, porque esta simultaneamente:
- 12 commits a frente do `master` em trabalho documental;
- 26 commits atras do `master` em evolucao do repositorio.

A proxima reconciliacao de documentacao deve partir do `master` atual e incorporar deliberadamente o conteudo documental ainda exclusivo dessa branch, sem reintroduzir estados antigos.

## Recomendacao de higiene futura

### RECOMENDACAO TECNICA

Depois de um PR ser mergeado, nao reutilizar a mesma branch para nova tarefa.

Motivo:
- dificulta distinguir o que ja foi incorporado do que nasceu depois do merge;
- transforma uma branch aparentemente historica em fonte parcial de trabalho novo;
- aumenta risco de basear implementacao em codigo atrasado.

Para nova tarefa, usar uma branch nova baseada no `master` atual, somente quando houver autorizacao explicita para cria-la.

Branches temporarias criadas apenas para disparar smoke/diagnostico nao devem ser mergeadas. Depois de a evidencia estar documentada, podem ser removidas em uma tarefa administrativa separada e explicitamente autorizada.

## Limites desta auditoria

- nenhuma branch foi apagada;
- nenhum ref foi movido;
- nenhum merge/rebase foi executado;
- nenhum PR foi criado ou alterado;
- nenhum codigo, migration ou Supabase foi modificado;
- classificacao de limpeza e uma recomendacao administrativa, nao uma exclusao ja executada.
