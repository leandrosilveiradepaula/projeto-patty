# Observabilidade somente leitura de releases — issue #970

## Objetivo e status

**DECISÃO TÉCNICA PROPOSTA NA PR:** criar uma verificação GitHub Actions capaz de identificar um commit recente da `master` sem os dois sinais esperados de integração: `Validate application` aprovado para o SHA exato e status `Vercel=success` para o mesmo commit. O monitor **não resolve a causa** de um webhook ausente nem inicia um deployment. Antes de integrar a PR, a rotina agendada **não está ativa**.

Motivação factual: o merge #969 (SHA `28c1db08...`) não possui status Vercel no GitHub; a publicação Git da PR #997 demorou aproximadamente 25 minutos, enquanto #995, #998 e #999 publicaram rapidamente. Essas observações foram registradas na [issue #970](https://github.com/leandrosilveiradepaula/projeto-patty/issues/970). Não há logs de entregas webhook suficientes para atribuir a causa.

## Escopo implementado na proposta

- `.github/workflows/watch-master-release.yml`: `schedule` aos minutos 17 e 47 de cada hora (frequência de 30 minutos), mais `workflow_dispatch` para inspeção manual. Executa apenas checkout confiável de `master`, Node.js 22 e GETs à API GitHub com `GITHUB_TOKEN` de escopo **somente leitura** (`contents`, `actions`, `statuses`). Não usa token Vercel, Supabase, senhas, service role nem dados de clientes.
- `.github/scripts/release-watch.mjs`: reutiliza `evaluateMasterReleaseGate`, já utilizado no bloqueio de merges da `journey-automerge.mjs`. Evita uma segunda definição de CI/status autorizado e valida uma leitura repetida de `master` para não alertar com SHA antigo durante um merge concorrente.
- `security/release-watch.test.mjs`: casos sintéticos para gate saudável, status ausente, atraso de até 30 minutos, status mais recente pendente/falho, execução de CI ausente, SHA errado, destino Vercel não autorizado, `workflow_dispatch` legítimo e avanço simultâneo da `master`. A suíte entra em `npm run test:security-boundaries`.

## Estados e interpretação

| Estado | Condição | Efeito |
| --- | --- | --- |
| `HEALTHY` | CI bem-sucedido e status GitHub `Vercel=success` para o SHA atual | Workflow verde; sinal preliminar, **não** atestado de domínio em produção |
| `GRACE` | Falta algum sinal, mas a data do commit indica menos de 30 minutos | Workflow verde, relatório indica aguardar propagação; não faz deploy |
| `ALERT` | Falta sinal e a idade do commit atingiu 30 minutos, ou há dados inválidos | Workflow vermelho, com motivos no resumo da execução; operador investiga |
| `DEFERRED` | `master` mudou entre as duas leituras durante a verificação | Workflow verde, novo SHA será verificado no próximo ciclo |

A idade usa `commit.committer.date` do merge e o relógio do runner. É uma aproximação; relógio errado, metadados antigos ou atrasos no agendamento podem gerar alertas sem que haja falha de deployment. Erro de API ou falta de `GITHUB_TOKEN` também produz falha no workflow, **não** prova falha de Vercel. Execuções agendadas do GitHub podem atrasar ou deixar de ocorrer; manter `workflow_dispatch` como caminho manual.

O gate aceita CI `push` ou `workflow_dispatch` no SHA exato. Isso preserva o funcionamento de merges feitos pelo `GITHUB_TOKEN`, cujos eventos de `push` podem não iniciar outros workflows. Os checks de merge existentes não são alterados.

## Limite importante de verificação

O status `Vercel=success` no GitHub **não prova** que o deployment é do target `production`, está `READY`, ou que `projeto-patty.vercel.app` recebeu o alias correto. Para declarar uma publicação, o operador deve conferir via Vercel: `READY`, `meta.githubCommitSha === master`, `target=production` e aliases do domínio. Falhas do monitor são sinais para investigar; **jamais** autorização para criar deployments, promover builds, modificar webhooks, fazer commits artificiais, desligar gates ou alterar ambientes.

O status da [#970](https://github.com/leandrosilveiradepaula/projeto-patty/issues/970) continua **ABERTO** até haver explicação causal e recuperação confiável dos incidentes de eventos, com controle de acesso apropriado. A criação do monitor não equivale a resolução da integração.

## Como operar após merge e publicação do workflow

1. Abrir o GitHub Actions, **Watch master release signals**. Verificar o relatório `HEALTHY`, `GRACE`, `DEFERRED` ou `ALERT` no resumo da run.
2. Em caso de `ALERT`, conferir `master.sha`, `Validate application` do mesmo SHA e o deployment Vercel `READY`/domínio. Se tudo estiver correto, registrar falso positivo de sinal GitHub, sem forçar redeploy.
3. Para checagem fora da agenda, executar `Run workflow` na branch `master`. Nunca selecionar uma branch de PR para rodar com credenciais do repositório.
4. Respostas e notificações sobre workflows falhos dependem das configurações GitHub da conta; não afirmar envio de alerta push/SMS/e-mail sem evidência dessas preferências.

**Critérios de aceitação:** testes de fronteira e `Validate application` aprovados no SHA final da PR, conteúdo limitado a script, workflow, testes e documentação, revisão específica de CI/segurança e merge manual. Somente depois do merge a agenda passa a funcionar. Nenhuma automação clínica, uso de dados de saúde, alteração de Auth/Supabase ou homologação humana é contemplada.
