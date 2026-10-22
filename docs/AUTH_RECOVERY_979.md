# Recuperação de senha — revisão da issue #979 (2026-10-22)

## Fatos de engenharia

A recuperação da Patty inicialmente exibiu erro de link, mas uma segunda solicitação concluiu a troca de senha. A causa específica do primeiro link continua não demonstrada; não associar a falha a usuário, navegador ou token sem reprodução.

No código de produção, os callbacks `app/auth/recovery/route.ts` e `app/auth/recovery-token/route.ts` usavam o cliente SSR geral para verificar o código, mas retornavam outro redirect sem cookies de sessão anexados explicitamente. O callback de convite `app/auth/confirm/route.ts` já usa um redirect relativo com cookies na resposta devolvida ao navegador e cabeçalhos privados.

## Correção proposta neste PR (ainda não integrada)

- Vincular a gravação de cookies dos dois callbacks à resposta `303` efetivamente devolvida.
- Redirecionar somente para o caminho relativo `/redefinir-senha`, removendo parâmetros de recuperação.
- Em erro de verificação, devolver redirect inválido sem os cookies produzidos no caminho de sucesso.
- Usar `Cache-Control: private, no-store` e `Referrer-Policy: no-referrer`.
- Marcar página de redefinição como dinâmica e explicar uso de mesmo navegador, perfil e dispositivo para PKCE.
- Testar deterministicamente esses contratos em `test:operations`; exigir CI, build e revisão específica antes do merge.

## Limites e segurança

A correção não altera senhas, identidades, MFA, e-mails, templates ou configurações Supabase SaaS, schema, RLS, migrations, Storage e acesso a dados pessoais. Não executa testes de recuperação em contas de produção. A validação sintética funcional de ponta a ponta continua pendente; links já utilizados, diferenças de navegador/dispositivo e scanners de e-mail podem produzir erros próprios. Evitar logs de URLs, cookies, códigos e segredos.

A avaliação de sessões preexistentes de outra identidade na página de redefinição continua um item distinto a ser coberto em E2E sintético, sem modificar a autenticação em produção nesta PR.

**Estado correto:** correção implementada em branch, não homologada, não integrada nem publicada. A issue #979 permanece aberta; homologação operacional profissional J1–J7 permanece a última etapa.
