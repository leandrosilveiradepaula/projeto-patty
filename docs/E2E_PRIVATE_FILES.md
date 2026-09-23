# E2E - arquivos privados da cliente

Este smoke test e manual e usa somente uma conta sintetica de cliente.

Fluxo coberto:

`login -> area da cliente -> arquivos -> upload -> validacao -> historico -> download`

## Secrets necessarios no GitHub Actions

- `E2E_BASE_URL`: URL de producao da aplicacao.
- `E2E_CLIENT_EMAIL`: email de uma conta sintetica com role `client`.
- `E2E_CLIENT_PASSWORD`: senha dessa conta sintetica.

Nao usar credenciais ou dados de cliente real.

O teste usa o arquivo sintetico fixo `e2e-private-file-smoke.png`. Se ele ja existir no historico da conta de teste, o upload nao e repetido; o teste reutiliza o arquivo para validar historico e download. Isso evita acumulo de arquivos em producao.

Execucao: GitHub Actions -> `E2E private files smoke` -> Run workflow.

O teste nao cria conta, nao altera schema/RLS e nao usa `SUPABASE_SECRET_KEY`.
