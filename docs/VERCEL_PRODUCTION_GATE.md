# Gate de recuperacao da producao Vercel

Data de referencia: 2026-09-24.

Este checklist deve ser usado quando a Vercel voltar a aceitar um build de producao do `master`.

Ele existe para separar:
- codigo mergeado;
- deployment efetivamente publicado;
- validacao de runtime.

Nao considerar um fluxo como PRODUCAO VALIDADA apenas porque o PR foi mergeado ou o build de CI passou.


## Resultado da validacao de 2026-09-24

Os gates funcionais foram executados com o codigo de aplicacao do commit `19d216bf2148e983d452f0555a2d1e740e1027ca`, que permanece contido no `master`. Merges exclusivamente documentais posteriores nao alteram essa evidencia de runtime. O deployment de producao do `master` permanece `READY`.

Os gates executados contra a producao atual tiveram o seguinte resultado:

- **Gate 1 - deployment:** PASS; SHA publicado corresponde ao `master` atual.
- **Gate 2 - headers HTTP:** PASS em `/login`; CSP, Permissions-Policy, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff` e `X-Frame-Options: DENY` presentes.
- **Gate 3 - rascunho da Anamnese:** PASS no smoke de producao apos correcao de um seletor Playwright ambiguo. Login sintetico, retomada do rascunho, INSERT/UPDATE da resposta e cleanup passaram.
- **Gate 4 - correcoes administrativas:** PASS no smoke de producao apos escopo mais preciso do seletor da resposta original. A rota respondeu `200`, MFA/admin funcionou, a resposta original foi lida e o caso de JSON invalido nao criou historico.
- **Residuos sinteticos:** consulta pos-smoke confirmou `0` drafts E2E ativos e `0` correcoes E2E.

Evidencia operacional do run final: GitHub Actions run `35985899621`, conclusao `success`.

O Gate 5 continua coberto pelas regressões de seguranca ja existentes e nao foi enfraquecido por esta correcao, que alterou somente seletores de teste.

## Pre-condicoes

Antes de iniciar:

1. confirmar o HEAD atual do `master`;
2. confirmar que nao ha migration pendente necessaria para o runtime que sera validado;
3. confirmar que a Vercel nao esta mais retornando `build-rate-limit`;
4. nao criar preview de branch tecnica apenas para testar producao;
5. usar somente contas/dados sinteticos nos E2E.

## Gate 1 - confirmar deployment

### PASS EM 2026-09-23

O merge do PR #120 publicou o commit:

`602c6d5129b093fc092f7b87209f21d1eab574ca`

O GitHub recebeu do contexto Vercel:
- estado: `success`;
- descricao: `Deployment has completed`.

Isso confirmou a recuperacao do pipeline de producao para esse SHA. Em 2026-09-24, os gates de runtime de headers, rascunho e correcoes administrativas foram executados novamente contra a producao atual e passaram.

## Gate 2 - headers HTTP

Executar GET real contra `/login` no deployment publicado e confirmar os headers definidos pelo codigo atual:

- `Content-Security-Policy` com pelo menos as diretivas parciais aprovadas;
- `Permissions-Policy`;
- `Referrer-Policy: no-referrer`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`.

A CSP permanece deliberadamente parcial. Nao adicionar diretivas novas durante este gate.

## Gate 3 - Anamnese: rascunho

Executar o smoke E2E versionado:

`.github/workflows/e2e-client-anamnesis-draft.yml`

Validar:
- login da cliente sintetica;
- retomada de um unico rascunho;
- persistencia de resposta `text`;
- update da mesma resposta;
- cleanup do draft sintetico;
- ausencia de residuo sintetico apos o teste.

A migration `20260923191554_fix_anamnesis_draft_delete_trigger.sql` ja foi aplicada e passou smoke transacional no banco. Este gate valida o runtime publicado.

## Gate 4 - Anamnese: correcoes administrativas

Executar o smoke E2E versionado:

`.github/workflows/e2e-admin-anamnesis-corrections.yml`

Validar:
- rota administrativa publicada;
- MFA/admin conforme fluxo atual;
- leitura da resposta original;
- historico append-only;
- inclusao de nova correcao;
- preservacao da resposta original;
- cleanup dos dados sinteticos usados pelo teste.

## Gate 5 - regressao minima de seguranca

Confirmar que:
- cliente nao acessa dados de outra cliente;
- admin continua exigindo AAL2 nos recursos protegidos;
- nenhum secret aparece no browser/log de aplicacao;
- arquivos privados continuam privados;
- nenhum teste exigiu enfraquecimento de RLS.

## Criterio de encerramento

Somente depois de todos os gates aplicaveis passarem:

1. atualizar `DECISIONS.md` com SHA publicado e evidencias;
2. atualizar `MVP_READINESS.md`;
3. atualizar `PROJECT_STATUS.md`;
4. substituir estados IMPLEMENTADO/CI VALIDADO por PRODUCAO VALIDADA somente nos fluxos efetivamente testados.

Se qualquer gate falhar, registrar a falha como evidencia operacional. Nao mascarar o resultado nem alterar seguranca apenas para obter PASS.
