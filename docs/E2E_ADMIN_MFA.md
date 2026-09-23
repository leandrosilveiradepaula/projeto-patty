# E2E - MFA administrativo sintetico

Os smokes administrativos usam a conta sintetica E2E e devem passar pelo mesmo MFA TOTP exigido da Patty.

## Preparacao manual unica

1. Abra a aplicacao em producao e entre com a conta sintetica administrativa.
2. O sistema direcionara para `/mfa/admin/setup`.
3. Registre o fator TOTP em um autenticador e conclua o enrollment com um codigo valido.
4. Copie a chave TOTP exibida no enrollment para o secret GitHub Actions `E2E_ADMIN_TOTP_SECRET`.
5. Nao envie essa chave por chat, issue, commit ou log.

Depois do enrollment, os workflows administrativos geram o codigo TOTP localmente no runner a partir do secret e concluem o challenge normal do Supabase Auth.

## Secrets administrativos

- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
- `E2E_ADMIN_TOTP_SECRET`

A chave TOTP e apenas da conta sintetica. Nao reutilizar nem armazenar o fator real da Patty no GitHub Actions.
