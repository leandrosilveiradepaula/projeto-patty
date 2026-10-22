# Hardening do Supabase Auth

Data de referencia: 2026-09-23.

## Situacao verificada em 22/10/2026 — issue #985

- A execucao manual [Harden Supabase Auth #39852766198](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39852766198), no modo `inspect`, terminou com `success`. Os passos que aplicariam alteracoes foram **ignorados**. Nenhuma configuracao remota foi modificada.
- Valores nao sensiveis observados: `password_hibp_enabled=false`, `password_min_length=8`, `password_required_characters=null`, `mfa_totp_enroll_enabled=true`, `mfa_totp_verify_enabled=true`. A disponibilidade de TOTP nao comprova que MFA e exigido para todos os usuarios.
- A consulta somente leitura da assinatura da organizacao confirmou `plan=free` e `tier=tier_free`. A documentacao oficial informa que a protecao HIBP contra senhas vazadas exige plano **Pro ou superior**. O [Security Advisor](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ainda indica `auth_leaked_password_protection` como `WARN`.
- **Nao executar `mode=enable-hibp` no plano atual**, nem tentar contornar a elegibilidade por PATCH, migration, RLS ou mudancas de login. A eventual mudanca de plano exige aprovacao especifica de custo, seguida de autorizacao explicita para habilitar o recurso.
- A UI de criacao/redefinicao pode recomendar senhas longas e exclusivas, sem mudar a politica vigente de **8 a 128 caracteres**. Orientacao nao e medidor de forca, verificacao de vazamento ou substituto do HIBP. Qualquer endurecimento real dos requisitos de senha deve ser uma decisao tecnica documentada, compativel com Auth e testada antes de aplicacao.

## Objetivo

Resolver configuracoes de seguranca do Supabase Auth que nao pertencem ao schema Postgres e, portanto, nao devem ser tratadas por migration SQL.

## Leaked Password Protection

O advisor de seguranca do Supabase reporta `Leaked Password Protection Disabled`.

A documentacao oficial do Supabase informa que:
- a protecao consulta a base Pwned Passwords do HaveIBeenPwned para rejeitar senhas conhecidamente vazadas;
- a funcionalidade esta disponivel em planos Pro ou superiores;
- a configuracao pertence ao Auth do projeto, nao a RLS/Postgres.

O Management API expoe `PATCH /v1/projects/{ref}/config/auth`. O campo atual correspondente e `password_hibp_enabled`.

## Workflow

O repositorio possui `.github/workflows/harden-supabase-auth.yml`.

Ele e deliberadamente manual e possui apenas dois modos:

- `inspect`: le o Auth config e imprime somente campos nao secretos selecionados;
- `enable-hibp`: envia exclusivamente `{"password_hibp_enabled": true}`.

O workflow:
- roda somente no branch `master`;
- usa somente `SUPABASE_ACCESS_TOKEN`;
- exige confirmacao textual exata `ENABLE` para alterar configuracao;
- nao possui modo para desabilitar a protecao;
- nao usa `SUPABASE_SECRET_KEY` nem senha do banco;
- verifica novamente o Auth config depois do PATCH.

Se o plano do projeto nao suportar a funcionalidade, o PATCH deve falhar sem alterar outras configuracoes.

## Procedimento

Primeiro executar:

- `mode = inspect`;
- confirmation vazio.

Revisar no log:
- `password_hibp_enabled`;
- `password_min_length`;
- `password_required_characters`;
- flags TOTP;
- `site_url`;
- `uri_allow_list`.

**Somente se a assinatura for Pro ou superior e houver autorizacao especifica para modificar o Auth**, para habilitar a protecao, executar depois:

- `mode = enable-hibp`;
- `confirmation = ENABLE`.

Apos o workflow, rodar novamente o security advisor. O item so pode ser considerado fechado quando `auth_leaked_password_protection` deixar de aparecer.
