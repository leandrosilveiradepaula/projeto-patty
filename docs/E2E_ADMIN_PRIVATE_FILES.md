# E2E - arquivos privados administrativos

Este smoke test manual valida o fluxo administrativo usando somente contas sinteticas.

Fluxo coberto:

`admin login -> /admin/arquivos -> cliente sintetica -> upload administrativo -> oculto para cliente -> liberacao explicita -> cliente ve -> download`

## Secrets necessarios no GitHub Actions

- `E2E_BASE_URL`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
- `E2E_CLIENT_EMAIL`
- `E2E_CLIENT_PASSWORD`

Nao usar credenciais ou dados reais.

O teste usa o arquivo fixo `e2e-admin-private-file-smoke.png`. Na primeira execucao, ele verifica o estado oculto antes da liberacao. Em execucoes posteriores, se o arquivo ja estiver liberado, o teste reutiliza o mesmo registro e valida visibilidade e download, evitando acumulo de arquivos aceitos em producao.

O smoke nao cria contas, nao altera schema/RLS e nao executa hard delete.
