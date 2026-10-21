# Arquivos privados administrativos — smoke legado bloqueado

**NÃO EXECUTAR ESTE SMOKE CONTRA O SUPABASE DE PRODUÇÃO.**

O roteiro histórico dependia de uma segunda admin sintética com TOTP em GitHub Actions, upload privado e liberação de arquivos de teste no SaaS. Isso conflita com a regra de uma única admin de negócio e com a política atual de manter dados de teste exclusivamente em ambiente descartável.

O workflow `e2e-admin-private-files.yml` está bloqueado. Consulte [contenção de workflows legados](LEGACY_PRODUCTION_E2E_BLOCK.md). O cenário autorizado é coberto por `e2e/j1-local-onboarding.spec.mjs` em PostgreSQL/Auth/Storage locais, incluindo MFA AAL2, upload, liberação deliberada, `307` temporário, cliente não titular negada e histórico após encerramento.

A correção `20261020191000` de Storage **não foi aplicada ao SaaS** enquanto [#950](https://github.com/leandrosilveiradepaula/projeto-patty/issues/950) e [#951](https://github.com/leandrosilveiradepaula/projeto-patty/issues/951) dependerem de reconciliação humana. A entrega de mídia real será verificada na homologação final autorizada, não por fixtures no SaaS.
