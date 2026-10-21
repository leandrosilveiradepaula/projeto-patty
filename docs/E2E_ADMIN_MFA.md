# MFA administrativo: E2E legado bloqueado

**INSTRUÇÕES HISTÓRICAS SUPERADAS. NÃO EXECUTAR NA PRODUÇÃO.**

Este guia antigo explicava a criação de uma conta admin sintética e o armazenamento de um segredo TOTP no GitHub Actions. Essa orientação não corresponde à decisão de 14/10/2026, registrada em `DECISIONS.md`: a Patty é a única administradora de negócio permitida no MVP. A produção já tem múltiplas roles `admin` pendentes de reconciliação humana; não provisionar outras, não usar senhas/seeds TOTP pessoais da Patty nos runners e não inferir a legitimidade de identidades por email.

Os workflows administrativos de smoke legados foram bloqueados para que uma execução manual falhe **sem carregar credenciais**. Consulte [bloqueio de E2E legados](LEGACY_PRODUCTION_E2E_BLOCK.md), [RBAC/RLS](RBAC_RLS.md) e [questões abertas](OPEN_QUESTIONS.md). Testes MFA automatizados permanecem no Supabase **descartável**, nas suítes J1–J7 e em suas helpers sintéticas.

O acesso profissional real será exercitado na **última homologação conjunta**, somente com sessão autorizada, sem expor TOTP, senha, cookie ou identidade em CI e no chat. Este documento não constitui autorização para reativar o fluxo histórico.
