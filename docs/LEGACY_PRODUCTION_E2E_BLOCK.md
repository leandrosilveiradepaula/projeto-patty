# Bloqueio de E2E legados que usavam o Supabase de produção

**Referência: 20/10/2026. Escopo: segurança técnica, sem regra profissional nova.** O Projeto Patty utiliza o mesmo Supabase SaaS de produção e não cria um segundo projeto staging. A decisão registrada em `DECISIONS.md` em 14/10/2026 proíbe a criação de outra admin na produção e proíbe uso de senha/TOTP pessoal da Patty no GitHub Actions. A homologação conjunta profissional será a última tarefa.

## Fato e risco identificados

Nove workflows históricos `workflow_dispatch` ainda continham comandos executáveis contra o **SaaS real**. Conforme a esteira, eles poderiam usar secrets privilegiados para criar/remover clientes sintéticas, salvar anamnese/esclarecimentos e protocolos de teste, enviar arquivos privados ou encerrar assignments. Outros dependiam de uma conta administrativa sintética e seu segredo TOTP. Não há evidência nesta auditoria de que tenham sido executados recentemente, de que dados reais tenham sido alterados ou de que seus secrets estejam presentes.

Mesmo com nomes de fixture sintética, essas operações deixariam efeito no banco ou Storage **de produção**. A eventual falha de limpeza não justifica apagar histórico. Não tentar executar essas rotinas para provar o risco.

## Contenção implementada no repositório

Os arquivos seguintes **continuam reconhecíveis no histórico do Git**, mas seus jobs manuais agora exibem um bloqueio explícito e terminam em erro **antes de instalar dependências, carregar secrets, autenticar-se ou abrir conexões com o SaaS**:

| Workflow legado | Risco da implementação histórica |
| --- | --- |
| `e2e-admin-anamnesis-corrections.yml` | Operação administrativa sintética usando chave privilegiada |
| `e2e-admin-private-files.yml` | MFA de admin sintética, upload/liberação em produção |
| `e2e-anamnesis-clarifications.yml` | Criação de histórico sintético durável |
| `e2e-client-anamnesis-canonical-consent.yml` | Provisionamento temporário de cliente no SaaS |
| `e2e-client-anamnesis-canonical-start.yml` | Provisionamento temporário e navegação cliente |
| `e2e-client-anamnesis-conditional-submit.yml` | Submissão de anamnese sintética |
| `e2e-end-client-assignment.yml` | Encerramento do vínculo de teste |
| `e2e-post-migration-runtime.yml` | Criação/remoção sintética para smoke pós-migration |
| `e2e-private-files.yml` | Upload/download privado feito pela cliente de teste |

A verificação determinística `security/legacy-production-e2e-disabled.test.mjs` é executada pelo comando existente `npm run test:security-boundaries`. Ela exige que esses nove workflows permaneçam sem acesso a secrets, URLs Supabase remotas ou comandos de E2E e que as **sete suítes locais** continuem ativas.

**Delimitação:** o workflow `bootstrap-patty-admin.yml`, de provisionamento administrativo intencional, **não é um E2E legado** e não foi alterado por este pacote; seu risco deve ser avaliado separadamente diante das múltiplas roles `admin` existentes. `e2e-j1-invitation-handoff.yml` já é somente um aviso de bloqueio sem autenticação; também não foi alterado. O workflow de deploy de migrations mantém seu processo controlado independente.

## Caminho permitido para continuar os testes

- Testes automáticos: `validate-j1-local-onboarding-browser.yml` até `validate-j7-ai-review-browser.yml`, com Auth/PostgreSQL/Storage descartáveis, localhost e dados sintéticos. `Validate application` e testes de segurança avaliam cada mudança.
- Produção: somente leituras técnicas agregadas/sem PII quando autorizadas; nenhum fixture persistente, criação de role administrativa, senha/TOTP real no CI, upload de arquivo de cliente ou publicação de conteúdo para testar.
- Homologação: sessão autenticada autorizada da Patty e de participante consentido, conforme `OPERATIONAL_ACCEPTANCE_RUNBOOK.md`, **na última etapa**. Não inventar consentimento ou realizar mudanças clínicas para satisfazer testes.

## Critérios para eventual reativação

Nenhum workflow poderá ser reativado com a simples remoção de `exit 1`. Seriam necessários uma decisão operacional documentada, autorização específica para contas e dados, desenho de autenticação sem secrets pessoais no CI, política de limpeza que preserve histórico, revisão do diff de workflow e nova validação de isolamento. A decisão vigente recomenda manter testes sintéticos exclusivamente no Supabase local descartável.

**Questões independentes:** [#950](https://github.com/leandrosilveiradepaula/projeto-patty/issues/950) e [#951](https://github.com/leandrosilveiradepaula/projeto-patty/issues/951) permanecem abertas; este bloqueio **não** reconcilia perfis admin existentes nem aplica a migration `20261020191000` do Storage. Não classificar como homologado.
