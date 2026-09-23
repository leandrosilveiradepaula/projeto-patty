# Hardening do Supabase Auth

Data de referencia: 2026-09-23.

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

Para habilitar a protecao, executar depois:

- `mode = enable-hibp`;
- `confirmation = ENABLE`.

Apos o workflow, rodar novamente o security advisor. O item so pode ser considerado fechado quando `auth_leaked_password_protection` deixar de aparecer.
