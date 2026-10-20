# Matriz vigente de pré-homologação técnica — J1 a J7

**Atualizada em 2026-10-20.** Este documento é um índice operacional de evidências, não cria regra do método da Patty nem substitui `BUSINESS_RULES.md`, `DECISIONS.md` ou `OPEN_QUESTIONS.md`. Registros de PRs em andamento nos documentos cronológicos são históricos: consultar **GitHub HEAD + checks do commit exato** para o estado corrente.

## Base publicada e proveniência

- Antes desta consolidação, o `master` estava em `17593d99086dc023207ed32606f52cf114c1b3c4` (merge da [PR #944](https://github.com/leandrosilveiradepaula/projeto-patty/pull/944)), com `Validate application` pós-merge `success` ([execução 39464236943](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39464236943)) e Vercel produção `READY` no **mesmo SHA** (deployment `dpl_4rDtYzTELwZE6oCg92xxpv7E73K4`).
- A última aprovação simultânea **anterior** de `Validate application` + sete suites J1–J7 foi no head `6b1c763b378d4aabfdf7ff35912a50eb61648c28`, da [PR #934](https://github.com/leandrosilveiradepaula/projeto-patty/pull/934). Esse SHA é **anterior** às PRs #940–#944 e não pode ser reapresentado como aprovação simultânea do `master` atual.
- Este arquivo é o gatilho **deliberado e restrito** para rodar todas as sete jornadas via `pull_request.paths` de cada workflow. Cada job usa checkout do head testado, Next.js e Supabase locais descartáveis, contas/dados sintéticos e isolamento previsto no seu próprio workflow. `Validate application` também deve passar no **mesmo head**. Não há disparo de deploy externo pelos testes.
- **Critério de aceite da PR de consolidação:** os oito jobs (`validate` + J1 a J7) com `conclusion: success` e mesmo `head_sha`, revisão das alterações dos workflows, PR mergeável e base sem divergências. O veredito pertence aos checks do GitHub, não a um status escrito antecipadamente aqui. Depois de integrar, confirmar o `Validate application` pós-merge e Vercel produção `READY` no commit de merge.

## Matriz de cobertura técnica existente

| Jornada | Contrato observável nos E2E sintéticos | Melhoria consolidada / referência | Limite ainda não homologado |
| --- | --- | --- | --- |
| **J1 — Cadastro, convite e anamnese** | Convite/ativação, autenticação, Cadastro Atual, rascunho versionado, isolamento e fluxos de arquivo privado | `e2e/j1-local-onboarding.spec.mjs` e PRs de pré-homologação até #934 | Conta real, cenário operacional acompanhado e dados de saúde reais não usados em CI |
| **J2 — Feedback Semanal** | Formulário versionado, rascunho, revisão, envio definitivo, leitura autorizada e histórico | `e2e/j2-weekly-feedback-lifecycle.spec.mjs`; integração real de UI com J4/J3 na [#942](https://github.com/leandrosilveiradepaula/projeto-patty/pull/942) | Sem escore de adesão automático nem interpretação clínica automática |
| **J3 — Avaliação / reavaliação** | Criação/finalização pela interface AAL2, snapshots, medições/fotos privadas, correção histórica append-only | [#940](https://github.com/leandrosilveiradepaula/projeto-patty/pull/940), [#941](https://github.com/leandrosilveiradepaula/projeto-patty/pull/941) e integração [#942](https://github.com/leandrosilveiradepaula/projeto-patty/pull/942) | Não é validação de critérios profissionais definitivos de avaliação |
| **J4 — Protocolo alimentar** | Rascunho, revisão/aprovação/publicação humanas, versões e doses, acesso cliente e J2 definitivo | `e2e/j4-nutrition-protocol-lifecycle.spec.mjs`; [#942](https://github.com/leandrosilveiradepaula/projeto-patty/pull/942) | Não inferir regras profissionais ainda abertas nem publicação automática por IA |
| **J5 — Treinos** | Solicitação, rascunho, revisão, duas versões liberadas, histórico e revogação do acesso da antiga profissional após encerramento UI MFA | [#943](https://github.com/leandrosilveiradepaula/projeto-patty/pull/943) | Progressão definitiva de treino continua dependente de confirmação profissional |
| **J6 — Conteúdo educacional** | Versão e release exatos por ação humana; acesso privado e leitura de bytes PDF sintéticos com SHA-256 e Range no simulador local | [#944](https://github.com/leandrosilveiradepaula/projeto-patty/pull/944) e `e2e/j6-educational-release-lifecycle.spec.mjs` | Provedor real Vercel Blob, cliente real, MIME/Range/seek reais de vídeo e direitos editoriais não são comprovados pelo simulador |
| **J7 — IA assistiva sob revisão humana** | Rascunho, proveniência dos dados, achados/decisões da profissional, trilha auditável e ausência de publicação automática | `e2e/j7-ai-review-lifecycle.spec.mjs` e suite pgTAP J7 | Não há diagnóstico/decisão clínica automática; aceite profissional pendente |

## Invariantes e separação de estados

1. **Técnico:** implementado ≠ testado ≠ migrado/aplicado ≠ mergeado ≠ publicado ≠ homologado. Uma aprovação Playwright sobre Supabase descartável **não comprova** uma sessão real no ambiente de produção.
2. **Segurança:** conta `auth.users` ≠ profile ≠ client ≠ Cadastro Atual ≠ anamnese ≠ avaliação ≠ protocolo; RLS, MFA AAL2 para ações profissionais e mídias privadas devem permanecer intactos. Nenhuma credencial `service_role` no browser e nenhum dado real nos testes.
3. **Método:** os parâmetros profissionais confirmados pertencem à configuração versionada/determinística; decisões de avaliação, protocolo e release são humanas. Exemplos antigos não são regras gerais. As questões ainda abertas permanecem em `OPEN_QUESTIONS.md`.
4. **Mídia:** o vídeo autorizado `Como utilizar a BALANCA DE ALIMENTOS` teve migração técnica, hash e reprodução administrativa reais documentados em `CONTENT_LIBRARY.md`, **mas continua em rascunho**, sem liberação a cliente. O PDF criado na suíte J6 é exclusivamente sintético e não prova o SDK/CDN real.
5. **Aceite final:** a **homologação operacional conjunta com a Patty é a última tarefa**, após pré-condições técnicas. Sua execução requer sessão autenticada, dados/autorização reais permitidos, avaliação de UI mobile, evidências de escopo de acesso e aceite humano registrado. Não inferir homologação de checks verdes.

## Próxima ação após o gate consolidado

Se os oito checks passarem e o commit integrado estiver `READY`, preparar roteiro da sessão final sem iniciá-la: identidades e perfis autorizados, material previamente aprovado, navegação por J1–J7 e itens pendentes explícitos. Se algum check falhar, corrigir **na mesma branch**, repetir os oito no novo head e não fazer merge antecipado. **Não** alterar migrations já aplicadas ou RLS para conseguir cobertura.
