# Arquivos privados da cliente — smoke legado bloqueado

**NÃO ENVIAR ARQUIVOS DE TESTE AO SUPABASE DE PRODUÇÃO.**

O workflow manual `e2e-private-files.yml` usava conta sintética de cliente e podia gravar um PNG de teste no Storage SaaS. Foi desativado para evitar fixture persistente e resíduos no histórico. Não configurar `E2E_CLIENT_EMAIL`/`E2E_CLIENT_PASSWORD` de contas reais como substituto.

Teste automatizado permitido: `e2e/j1-local-onboarding.spec.mjs` no Supabase local descartável verifica upload, arquivo oculto/liberado, download privado e negação de outra cliente, mesmo após encerramento. A J6 testa material educacional privado por simulador local; nenhum teste sintético garante reprodução de conteúdo real no Vercel Blob.

Veja [bloqueio técnico dos smokes legados](LEGACY_PRODUCTION_E2E_BLOCK.md) e [roteiro de homologação conjunta](OPERATIONAL_ACCEPTANCE_RUNBOOK.md). Não publicar nem liberar conteúdo para testes sem decisão humana.
