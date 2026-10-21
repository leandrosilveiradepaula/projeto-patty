# Encerramento de acompanhamento — smoke legado bloqueado

**NÃO EXECUTAR O E2E ANTIGO EM PRODUÇÃO.**

O workflow `e2e-end-client-assignment.yml` dependia da conta de admin sintética/TOTP e podia encerrar um assignment persistido no SaaS. Ele foi desativado, sem tocar em contas, assignments ou históricos existentes. Consulte [bloqueio de E2E legados](LEGACY_PRODUCTION_E2E_BLOCK.md).

O teste técnico atual é `e2e/j1-local-onboarding.spec.mjs` e o percurso de treino `e2e/j5-training-lifecycle.spec.mjs`: ambos usam identidades sintéticas e Supabase descartável, encerram pela UI autenticada com MFA AAL2, conferem `clients.status=inactive`, preservam histórico e comprovam isolamento. Essas suítes não homologam nenhuma operação profissional real.

Encerramento de vínculo real fica reservado à Patty, se necessário ao atendimento e expressamente autorizado na última sessão de homologação. Não usar um vínculo clínico real para simular resultado técnico.
