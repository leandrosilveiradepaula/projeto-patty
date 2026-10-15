## J1 — ativação intermitente: prevenir digitação antes da hidratação (2026-10-14)

**FATO OBSERVADO:** no novo percurso com checks móveis/de autorização, o workflow [38657414114](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38657414114) chegou ao Playwright autenticado, mas falhou na etapa de criação de senha: o botão `Criar senha e continuar` permaneceu desabilitado e o passo atingiu 45 s. Na execução anterior [38656714848](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38656714848), a mesma ativação funcionou e o cenário completo passou. O navegador realizou cleanup e o pós-processo independente confirmou `already-clean`; consulta somente leitura de produção confirmou zero Auth/Clients sintéticos restantes.

**HIPÓTESE TÉCNICA:** existe janela entre HTML inicial e hidratação React na qual eventos sobre campos controlados não atualizam o estado, deixando o botão desabilitado. Ainda não há prova definitiva de causa-raiz; o produto deve evitar qualquer digitação antes de o formulário estar interativo. A correção torna os campos e botões inicialmente indisponíveis, exibe orientação `Preparando formulário para digitação`, marca `data-interactive` após hidratação e só aceita submit quando interativo. O E2E aguarda explicitamente `data-interactive=true` e botão habilitado. Preserva validação de senha, server action, Auth e MFA. A hipótese só será avaliada como mitigada após nova execução real.

**Pendências reais:** ainda não avaliados nesse segundo run: acesso negado anônimo/admin e overflow horizontal. O PASS do percurso anterior permanece válido para o escopo anterior; a J1 inteira continua NÃO HOMOLOGADA.

## J1.02–03 — primeiro percurso real aprovado, com persistência e limpeza (2026-10-14)

**EVIDÊNCIA EXECUTADA:** [GitHub Actions 38656714848](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38656714848), no `master` `b84925d4`, com Vercel Production READY e CI do mesmo SHA aprovados. Playwright Chromium concluiu **1 teste PASS em 25,4 s**, incluindo: ativação da conta sintética com viewport 390×844, definição de senha, login da cliente, Cadastro Atual salvo e lido novamente do banco e do formulário após reload, início de rascunho versionado de Anamnese, retomada do mesmo ID e novo login independente.

**LIMPEZA REAL:** o browser registrou `J1 synthetic fixture cleanup completed`; o pós-job independente executou e confirmou `J1 exact-fixture cleanup: already-clean`. Consulta **somente leitura posterior no Supabase de produção** confirmou 0 Auth sintéticas recentes, 0 Clients sintéticos e 0 assignments sintéticos. Evidências de cleanup e teste são independentes de `Validate application`.

**ESCOPOS AINDA NÃO HOMOLOGADOS:** a cliente sintética foi provisionada exclusivamente para E2E via API server-side; o fluxo real de convite pela Patty, uploads/exames privados, submissão final da anamnese, avaliação, revisão e publicação do protocolo e visualização do conteúdo liberado **não** foram executados neste cenário. Dados profissionais continuam com revisão humana. Não declarar J1 integral homologada.

**Próxima ampliação segura da mesma execução:** validar os redirects reais de sessão anônima ao tentar acessar perfil e Anamnese privada e de uma sessão cliente ao tentar acessar pendências administrativas, além de verificar ausência de overflow horizontal nas telas móveis de Cadastro Atual e Anamnese. Esses novos asserts dependem da próxima execução do browser; são `PENDENTES` até run comprovada.

## J1 — retomada controlada do navegador com limpeza independente verificada (2026-10-14)

**Base de decisão técnica:** o resíduo sintético foi removido no workflow [38655756684](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38655756684), com resposta `cleaned`, e a consulta somente leitura após a operação retornou zero Auth/Clients/assignments/client_registration recentes com os identificadores de teste. O PR #846 removeu o workflow temporário privilegiado e acrescentou testes da limpeza independente, cobrindo um ciclo completo de criação/remoção de dados sintéticos e bloqueios antes de deletar dados com papel privilegiado, Anamnese enviada, protocolo ou vínculo divergente. Nenhum segundo administrador foi criado.

**Retomada restrita:** o workflow da cliente `e2e-client-onboarding-activation.yml` deixa de exigir `J1_E2E_ENABLE` e volta a executar quando `Validate application` do master atual terminar com sucesso ou o status Vercel do mesmo SHA marcar `success`. Antes de qualquer escrita, o preflight exige CI+deployment do runtime publicado (ou equivalência exata dos arquivos auditados). Retirado o `schedule` diário para não gerar cadastros sem nova publicação; `workflow_dispatch` permanece para diagnóstico pontual. O navegador utiliza somente identidade/client sintéticos, em viewport móvel, com login independente, Cadastro Atual e rascunho de Anamnese. O processo de cleanup **independente do Playwright** executa sob `if: always()` após o passo de browser, valida o livro-razão da execução e deve falhar o job se não conseguir comprovar a exclusão.

**Critério de aceite:** após o próximo CI/deploy, evidenciar o passo exato em caso de falha, limpeza por Auth/Client e zero resíduos por consulta somente leitura. Se surgir qualquer resíduo, desativar novamente a escrita antes de novo teste. Os passos profissionais com a Patty continuam sob revisão humana; a J1 inteira ainda está **NÃO HOMOLOGADA**.

## J1 — resíduo sintético removido e recuperação privilegiada desativada (2026-10-14)

**FATO CONFIRMADO POR EXECUÇÃO REAL:** o PR #845 foi mergeado após CI PASS. O workflow confiável [38655756684](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38655756684) realizou `One-time J1 synthetic recovery: cleaned` usando Auth UUID, email, Client UUID e data de criação previamente conferidos; **não** buscou nem apagou contas reais por prefixo. Consulta **somente leitura após a limpeza** no Supabase de produção confirmou todos os contadores **zero** para Auth, Profile, papel, Client, assignment, Cadastro Atual e outras identidades recentes com o padrão sintético da J1.

**Próxima ação de manutenção:** remover da branch os três artefatos estritamente temporários (`j1-one-time-fixture-recovery.yml`, `j1-onetime-orphan-recovery.mjs` e seu teste) para impedir que continuem carregando a chave server-side nas próximas execuções do CI. Acrescentar testes determinísticos que simulem completamente a limpeza independente e confirmem recusa de papel privilegiado, anamnese enviada, protocolo e divergência de vínculo **antes** de qualquer mutação.

**Estado separado:** cleanup real comprovado; CI e publicação do pacote de retirada dependem da validação própria; o E2E com escrita em produção permanece **DESABILITADO** por `J1_E2E_ENABLE`, e a J1 inteira permanece **NÃO HOMOLOGADA**. Não confundir a correção de um resíduo técnico com a conclusão do atendimento.

## J1 — recuperação única do resíduo sintético da run 38637655316 (2026-10-14)

**Read-only verificado neste ciclo:** existe precisamente uma identidade Auth com email no padrão sintético `e2e-onboarding-[hex16]@example.invalid`, criada em 2026-10-14 às 21:07 UTC, um Client/Profile correspondente e um assignment; **zero** Cadastro Atual, submissões de Anamnese, protocolos e papéis privilegiados. Não extrapolar este resultado para outros clientes ou contas.

A limpeza permanente da run falha foi separada da reativação do navegador. PR de manutenção introduz `e2e/helpers/j1-onetime-orphan-recovery.mjs` e workflow de vida curta `.github/workflows/j1-one-time-fixture-recovery.yml`. Após `Validate application` de push/master PASS, executa **somente** o helper auditado `cleanupExactJ1Fixture` com UUIDs, email sintético e horário de criação exatos. Recusa branch externa, senha/MFA pessoal, divergência de ownership, Auth privilegiado, submissão profissional, protocolo ou evidência mais antiga que 8 horas. Nenhuma consulta por prefixo é usada para excluir usuários. O workflow não dispara Playwright nem habilita `J1_E2E_ENABLE`.

**Aceitação obrigatória:** CI do PR com testes do helper, execução real da limpeza com estado `cleaned` ou `already-clean` e nova consulta somente leitura confirmando zero Auth/Client residuais. **Depois do sucesso, retirar o workflow e o script temporários** da branch de manutenção; não deixar uma rotina com service-role rodando perpetuamente. O E2E com escrita continuará desativado até revisão independente do cleanup, como decidido no PR #843. J1 não homologada.

## J1 — limpeza independente de Playwright e diagnóstico por etapas (2026-10-14)

**Estado: IMPLEMENTADO NA BRANCH, NÃO EXECUTADO EM PRODUÇÃO.** A run E2E [38636904607](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38636904607) confirmou a limpeza da fixture daquela tentativa e revelou seletor ambíguo de Anamnese, corrigido em #842. A run [38637655316](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38637655316) falhou após 180s sem identificação conclusiva da etapa e deixou **uma conta Auth e um Client fictícios**, com um assignment, zero Cadastro Atual, zero Anamnese e zero protocolos (consulta read-only do prefixo da fixture em 2026-10-14). O PR #843 suspendeu imediatamente a escrita automática em produção via `J1_E2E_ENABLE`. **Manter desabilitado até comprovação do cleanup e autorização de retomada.**

A correção proposta utiliza livro-razão temporário de fixture, criado no runner **antes da criação de Auth**, com email sintético aleatório, identificadores exatos e proprietário (ID/attempt da run). Atualiza os IDs logo após cada criação, em arquivo `0600`; Playwright separa o setup, ativação, Cadastro Atual, Anamnese e login em passos com limites próprios para diagnosticar o ponto de bloqueio. Um **segundo processo independente**, acionado por `if: always()` após o passo de navegador, verifica Auth ID, email exclusivo, horário de criação, client/profile/assignment, proíbe remoção se existir Anamnese enviada ou protocolo profissional, e limpa somente os IDs confirmados. Se Playwright morrer antes de `finally`, o processo independente ainda tenta o cleanup; se faltar evidência de ownership, bloqueia sem apagar. O pós-processo permanece igualmente protegido por `J1_E2E_ENABLE` desligado.

**Antes de liberar a escrita automática:** (1) CI de helper + testes de contrato aprovados; (2) revisão de segurança das operações de limpeza e da proteção contra dados reais; (3) identificação e remoção separada e auditada do único resíduo sintético anterior, sem delete por prefixo; (4) confirmação por consulta read-only de zero identidades/clients residuais; (5) execução do navegador até a última etapa com sucesso e rollback do próprio teste verificado. CI verde não equivale a E2E real. J1 **NÃO HOMOLOGADA**.

## 2026-10-14 — Suspensão preventiva do E2E sintético automático em produção

A execução autenticada real do navegador passou a testar a cliente sintética, mas o workflow ainda não é confiável: [38636904607](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38636904607) falhou por seletor ambíguo de "Anamnese" (corrigido no #842), e [38637655316](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38637655316) atingiu **180 segundos** sem concluir. O encerramento do navegador também não garantiu o cleanup após o timeout. Uma consulta **somente leitura** ao Supabase de produção confirmou **uma identidade e um Client sintéticos residuais**, criados na segunda run, sem Cadastro Atual, Anamnese ou protocolo.

**Decisão técnica de contenção:** o job `e2e-client-onboarding-activation.yml` passa a exigir a variável explícita `J1_E2E_ENABLE=true`, ausente por padrão; os eventos existentes continuam registrados, mas não disparam operações de escrita enquanto essa chave não for deliberadamente ativada. **Não habilitar** essa variável agora. Nenhum dado real, migration, RLS, papel administrativo ou runtime de aplicativo foi modificado.

**Pendências antes de reativar:** (1) isolamento do passo que trava com fases do Playwright que não exponham tokens; (2) cleanup independente de sucesso/timeout do Playwright, testado com fixture segura e validação estrita por Auth UUID, client ID e email sintético; (3) reconciliação controlada do resíduo existente, sem exclusão por prefixo e sem SQL destrutivo genérico; (4) execução com evidência de PASS e **zero registros sintéticos residuais**. O cleanup ainda não foi confirmado. A J1 continua **NÃO HOMOLOGADA**; a homologação administrativa pela Patty também segue pendente.

## J1.02–03 — recuperação do resíduo e resultado da segunda execução de navegador (2026-10-14)

A run [38636904607](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38636904607) foi executada **contra o commit `7ab8f9da` publicado em Production**, com CI do mesmo SHA. Os logs confirmaram que o usuário e cliente de teste residual foram reconciliados por Auth/email/client ID exatos e que a fixture desta run também foi limpa. Consulta SQL somente leitura retornou **0** contas e clientes de `e2e-onboarding-%@example.invalid` recentes. Resultado da jornada: **FALHA em seletor ambíguo do teste** ao validar a página Anamnese, não evidência de defeito da página. Corrigido por `exact: true`, sem alterar aplicativo ou banco. Removida a recuperação especial do resíduo após confirmação do cleanup; permanece o `finally` protegido para fixtures futuras. Próximo E2E deverá comprovar Cadastro Atual, reabertura da Anamnese e novo login. A J1 integral continua NÃO HOMOLOGADA.

## J1.02–03 — evidência do primeiro browser E2E e incidente de cleanup (2026-10-14)

- **CI e deployment:** SHA `862758de` validado, runtime de produção equivalente `32c9c4fa` READY.
- **Playwright realmente executado:** workflow [38635848243](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38635848243), no banco de produção com fixture sintética.
- **Resultado:** FALHOU por timeout geral padrão de 30 s; erro de encerramento do contexto ocultou a etapa original e impediu executar a limpeza. Consulta de integridade restrita confirmou um cadastro/Auth fictício residual daquela run, sem dados de Anamnese ou protocolo. Isso **não** é homologação.
- **Correção sob teste:** timeout explícito de 180 s, cleanup sempre tentado após `Promise.allSettled` dos contextos mesmo se Playwright já os tiver fechado; reconciliação da fixture residual **por IDs/email exatos previamente auditados**, não por busca ou exclusão de clientes em geral. Erro de cleanup deve falhar o teste, nunca ser ignorado.
- **Próxima evidência obrigatória:** depois do próximo teste, verificar que o resíduo anterior foi removido e que nenhuma nova fixture restou, que Cadastro Atual persistiu, anamnese ficou retomável e login novo funcionou. Não alegar PASS com base em CI de um PR.

## J1 — usar runtime publicado equivalente para executar teste real da cliente (2026-10-14)

**Verificação factual:** `32c9c4faf807a2fc083c30b9f6f3ad97677ef051` é o último commit confirmado pela Vercel como **Ready/Production**. A comparação GitHub `32c9c4fa..d9642ce4` mostrou exatamente dois commits e oito arquivos modificados: workflow e spec E2E da cliente, workflow E2E administrativo, teste do gate e docs ARCHITECTURE/DECISIONS/JOURNEY_HOMOLOGATION/PROJECT_STATUS — **nenhuma modificação ao aplicativo, ao banco, RLS, Auth ou dependências**.

O preflight J1 usa esse **commit publicado específico** como fallback com allowlist exata, valida CI do SHA atual, status Vercel `success` do commit publicado, merge-base, total de commits e arquivos não-runtime. Qualquer alteração de runtime, arquivo não previsto ou histórico divergente impede a execução e não será ignorada por CI verde. A URL/produto efetivamente testados continuam sendo o runtime publicado de 32c9, enquanto o HEAD do CI é documentado separadamente. Isso não autoriza testes administrativos automáticos com MFA da Patty.

**Próximo marco real:** execução do Playwright `E2E client onboarding activation smoke`, contendo ativação móvel, Cadastro Atual, anamnese e novo login de cliente estritamente sintética, com cleanup por identidade. CI desta alteração e merge **não** equivalem à execução do browser. J1 inteira continua NÃO HOMOLOGADA; passos da Patty exigem sessão humana autorizada.

## J1 — Fluxo real da cliente com Supabase de produção e nenhuma segunda admin (2026-10-14)

**Em implementação até o CI e a execução serem verificados.** O fluxo automático da cliente foi ampliado a partir de `e2e/client-onboarding-activation.spec.mjs` e usa apenas identidade `e2e-onboarding-<hex>@example.invalid` temporária, criada por script servidor com validação de vínculo ao identificador Auth/Client. A mesma cliente fictícia é ativada em viewport móvel, efetua login novamente, salva o **Cadastro Atual** e confere a persistência por reload e pelo banco, inicia a Anamnese versionada e retoma exatamente o rascunho. O cleanup só elimina a identidade sintética verificada, confere exclusões por IDs e **se recusa a apagar qualquer Anamnese enviada ou protocolo profissional**.

**Automação:** `.github/workflows/e2e-client-onboarding-activation.yml` roda após CI do `master`/status Vercel de sucesso e como verificação programada ou manual, mas somente se `j1-production-preflight.mjs` confirmar build/deploy do commit em produção (ou equivalência de runtime validada) antes de carregar credenciais. Usa `E2E_BASE_URL`, email já existente da admin **apenas para vincular a fixture à Patty** e chave server-side protegida para essa operação, nunca senha/sessão/MFA da Patty. Não cria papel `admin` novo. O teste não envia Anamnese final nem publica protocolo.

**Administração:** o workflow anterior `e2e-j1-invitation-handoff.yml`, que tentava automatizar login da Patty exigindo `E2E_ADMIN_TOTP_SECRET`, foi retirado dos gatilhos automáticos. Agora registra apenas **pendência de evidência humana** quando invocado manualmente; não acessa Auth, banco ou segredos. J1.01 (convite real pela Patty) e J1.05–07 (análise, avaliação, aprovação/publicação) continuam **BLOQUEADAS** até execução pela Patty em sessão autorizada, com dado sintético, sem exportação de MFA.

**Estados:** testes estáticos/CI não equivalem a E2E real. Após o primeiro run automático, registrar URL e SHA, eventual defeito, limpeza da fixture, e estados distintos. A J1 integral segue **NÃO HOMOLOGADA**. O teste do cliente cobre somente parte de J1.02–03, sem autorização para afirmar conclusão da jornada profissional.

## Decisão operacional vigente — J1 no Supabase de produção (2026-10-14)

**Banco único, sem staging.** O responsável decidiu manter o Supabase de produção existente. A Jornada 1 poderá usar registros exclusivamente sintéticos, com controle de identidade, autorização e cleanup. **Nenhum segundo admin técnico será criado em produção**: a exceção vigente de acesso administrativo a arquivos privados pressupõe a Patty como única administradora.

**Modelo de homologação:** etapas administrativas devem ser percorridas com a sessão pessoal da Patty, por ela, sem compartilhar senha, MFA TOTP ou sessão com GitHub Actions/automação. O restante pode usar testes não administrativos seguros, dados sintéticos e verificações determinísticas. Evidência manual e automatizada serão registradas separadamente. Sem acesso administrativo autorizado, os passos de administração continuam BLOQUEADOS, nunca PASS.

**Workflow administrativo legado:** o acionamento automático que exigia `E2E_ADMIN_TOTP_SECRET` foi desativado. Não inserir a chave MFA da Patty; o fluxo administrativo permanece pendente de evidência humana, enquanto um workflow independente testa automaticamente apenas a cliente sintética.

**Critério de segurança:** nenhuma homologação poderá apagar ou expor dados reais, compartilhar dados sensíveis ou usar service role em browser. Não fabricar evidência de execução.

## J1 — Uso estrito do último deployment READY quando master mudou somente testes/CI (2026-10-14)

A tela da Vercel confirmou em Production o deployment `f0cbfcf6b6967755d3a6a614d418b1dd0f9bb529` como **Ready** para o PR #834, com o teste J1.01–03 já incorporado. O commit seguinte de master (`2cbe9d1060d8659a418491759ba9b73c75f6f7e6`, PR #835) modificou somente workflow de testes, documentação e teste de contrato; **não alterou app, autenticação, renderização, migrations ou dependências**.

O gate de J1 não reclassifica o master como publicado. Quando o master mais novo continua bloqueado por cota Vercel, ele pode executar **somente o teste de runtime J1.01–03** contra o deployment f0cb já Ready, após provar cumulativamente: CI de master aprovado no SHA exato; status Vercel `success` para f0cb; comparação GitHub entre f0cb e HEAD com ancestralidade e todos os commits contados; absolutamente todos os arquivos alterados pertencem à pequena whitelist de documentação, testes e workflow J1. Qualquer mudança no aplicativo, Supabase, segredo, dependência, migration ou script de auto-merge bloqueia imediatamente esse uso. O SHA **publicado e testado** será f0cb, e o SHA de **CI atual** será reportado separadamente.

Isso permite obter evidência real sem forçar deployments apenas para ajustar testes. **Não** significa homologação J1 integral nem publicação de master mais recente. O teste ainda não foi executado; registrar run e cleanup depois da primeira execução real. O pin f0cb é temporário, não um fallback genérico para produção desatualizada.

# Contrato operacional e homologação de jornadas — Projeto Patty

**Decisão do responsável (2026-10-14):** desenvolvimento por jornadas completas, sem contadores de blocos, sem solicitações repetidas de "prossiga" ou "mergeado". Merge automático autorizado para PRs de baixo risco após CI e checagem de elegibilidade.

## Definições obrigatórias

| Estado | Evidência mínima | Não significa |
| --- | --- | --- |
| IMPLEMENTADO | Commit do código identificado | Testado ou publicado |
| CI VALIDADO | Run do `Validate application` concluído com sucesso no SHA exato | Fluxo real validado |
| MERGEADO | SHA confirmado no `master` | Deployment de produção |
| PUBLICADO | Status Vercel `success` ou `READY` do SHA correto | E2E ou homologação |
| E2E AUTENTICADO | Execução ponta a ponta com contas/arquivos sintéticos, limpeza e evidências | Aprovação clínica |
| HOMOLOGADO | E2E autenticado + mobile + leitura/edição/persistência + RLS/escopo + runtime publicado correspondentes à jornada | Liberação de IA com dados de saúde ou regra profissional aberta |
| BLOQUEADO | Impedimento documentado, proprietário e condição de retomada | Concluído |

Nenhuma jornada passa a HOMOLOGADA com CI verde ou merge apenas.

## J1 — Atendimento completo de uma nova cliente

**Início:** Patty inicia um convite de cliente sintética.  
**Fim:** cliente autenticada vê protocolo e conteúdo efetivamente publicados pela Patty, e Patty consegue retomar o histórico do mesmo atendimento, sem perder contexto.  
**Estado:** **EM PREPARAÇÃO / NÃO HOMOLOGADA**.

### Casos a executar com evidência (nenhum considerado PASS ainda nesta rodada)

| ID | Caminho real a percorrer | Evidência requerida | Estado |
| --- | --- | --- | --- |
| J1.01 | Patty inicia onboarding, convite/link manual, conta e assignment da cliente | Identidade, sessão e assignment sob AAL2 com fixture sintética | PENDENTE de E2E integrado |
| J1.02 | Cliente ativa conta, acessa, recupera acesso se necessário | Login/logout, redirect seguro, recuperação sem enumeração | PENDENTE |
| J1.03 | Cliente preenche e salva Cadastro Atual e anamnese v1 | Rascunho retomado após reload, aplicabilidade versionada, ANAM-046 e envio final | PENDENTE de E2E integrado |
| J1.04 | Cliente envia foto/exame/documento privado | Upload, leitura autorizada, tentativa de outra cliente negada, nenhum URL público | PENDENTE |
| J1.05 | Patty vê pendências da cliente e retorna entre áreas | Anamnese original, esclarecimento/revisão profissional, links/filtros/página preservados | PENDENTE |
| J1.06 | Patty registra/finaliza avaliação e observa histórico | Persistência/snapshot, sem editar medidas finalizadas silenciosamente | PENDENTE |
| J1.07 | Patty prepara, revisa, aprova e publica protocolo | A mesma versão foi aprovada e publicada exclusivamente por ação humana; histórico preservado | PENDENTE |
| J1.08 | Cliente visualiza a versão publicada correta | Rascunhos e versões não liberadas invisíveis, dados de outra cliente inacessíveis | PENDENTE |
| J1.09 | Navegação completa em viewport móvel e teclado | Celular ~360px, desktop, foco, textos/erros/recuperação de contexto | PENDENTE |
| J1.10 | Retorno, cleanup e rastreabilidade | Evidência do SHA efetivamente publicado, screenshots com dados sintéticos e nenhum resíduo | PENDENTE |

Os workflows E2E existentes de onboarding, anamnese, arquivos privados, MFA, esclarecimentos e runtime pós-migration fornecem **evidência parcial** quando executados para o SHA publicado. Não somar automaticamente passes parciais e declarar a J1 concluída; o percurso encadeado ainda precisa ser verificado. Dados reais são proibidos nos testes.

## J1.01–03 — Primeiro cenário autenticado encadeado (preparado, não homologado)

**Evidência existente na base:** os E2E antigos de convite gerado diretamente pelo Supabase e de cliente canônica pré-criada testam partes isoladas, mas **não comprovam** o caminho Patty usando a tela real de convite até o rascunho da mesma cliente. Esta lacuna motivou o teste `e2e/j1-manual-invitation-handoff.spec.mjs`.

**Cobertura do cenário novo:** login profissional com MFA; escolha do convite manual pela UI; criação de Auth/Profile/Client/assignment; leitura restrita do link de ativação; ativação da cliente com viewport móvel 390×844; persistência do Cadastro Atual; início e retorno ao mesmo rascunho versionado da Anamnese; novo login; verificação de isolamento da fixture e limpeza explícita. Não simula preenchimento/envio completo da Anamnese, avaliação, protocolo, publicação ou biblioteca — esses casos permanecem J1.03–10 pendentes.

**Execução:** `.github/workflows/e2e-j1-invitation-handoff.yml` disponível no master após merge, acionado por CI do master concluído, novo status Vercel de sucesso para o mesmo SHA, execução manual ou agendamento em dias úteis. Eventos de PR, deploy com falha e status de SHA antigo não liberam a execução. Antes de qualquer credencial ou escrita com dados sintéticos, `.github/scripts/j1-production-preflight.mjs` exige CI do `master` aprovado no SHA exato e status de deployment Vercel `success` do mesmo SHA. Se a Vercel estiver limitada, o workflow gera evidência **BLOCKED** e não usa o Supabase. A execução real também depende dos secrets já definidos para testes: `E2E_BASE_URL`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_ADMIN_TOTP_SECRET` e `SUPABASE_SECRET_KEY` (ou fallback `E2E_SUPABASE_SECRET_KEY`). Nenhum valor vai à documentação ou logs.

**Segurança:** o teste cria uma identidade única `e2e-j1-<hex>@example.invalid` e só remove dados quando verifica a identidade/Auth e vínculo exatos. Aborta a limpeza destrutiva se encontrar Anamnese submetida ou protocolo profissional. Se o token de ativação não for consumido, o teste gera erro sem imprimir a URL sensível. Um erro de limpeza é um bloqueio para investigar, nunca motivo para apagar dados genéricos.

**Regra de conclusão:** o commit do workflow, seu CI e um agendamento não representam execução. Anotar URL da run e commit publicado após o primeiro resultado real. Este cenário representa somente J1.01–03 e **não muda** o estado NÃO HOMOLOGADA da J1.

## Prioridade e bloqueios confirmados em 2026-10-14

- **Deploy:** commit `2589b128e3667cb9c3493fe9b52a9e4c85e7a02b` do `master` obteve status GitHub `Vercel: failure — Deployment rate limited — retry in 24 hours`. Sem confirmação de deploy correspondente não há homologação nova em produção.
- **Uso de dados de saúde pela IA:** gate de privacidade `OPENAI_HEALTH_DATA_GATE.md` fechado. Testar IA apenas com fixtures sintéticas; nunca ativar processamento de dados reais sem os controles e aprovação aplicáveis.
- **SMTP/convite automático:** infraestrutura real de Gmail/Custom SMTP exige configuração e teste sintético; link de convite manual é fallback existente, não substitui a evidência de envio automático.
- **Biblioteca do Drive:** primeiro vídeo no Vercel Private Blob ainda requer upload, integridade SHA-256/MIME, revisão, publicação e liberação humana.
- **Método:** regras profissionais abertas permanecem pendentes, não podem ser inferidas para completar a jornada.

## Procedimento de desenvolvimento

1. Selecionar uma única jornada com início/fim reais; reconciliar `AGENTS.md`, `PROJECT_STATUS.md` e documentação normativa antes de escrever.
2. Levantar caminhos UI, server actions, queries autorizadas, RLS, documentos, erros e recuperação. Não presumir que teste unitário é E2E.
3. Executar os E2E autenticados existentes quando o ambiente e o SHA de produção forem verificáveis. Sempre com fixtures sintéticas e cleanup auditável.
4. Corrigir em lote os defeitos dessa mesma jornada, manter branch/PR até passar CI; proibir novos PRs para corrigir o anterior.
5. Cada PR elegível à automação deve conter quatro linhas no corpo, sem inventar evidência:
   - `Jornada: J1` (ou outro identificador J2, J3...)
   - `Critérios: ...`
   - `E2E: pendente`, `E2E: bloqueado` ou `E2E: executado` com referência à evidência quando executado
   - `Riscos: ...`
6. O workflow `auto-merge-journeys.yml` atua apenas sobre PR interno `codex/*` do mantenedor, de baixo risco, com CI PASS no SHA exato, branch atualizada com master e arquivos fora das áreas sensíveis; usa squash e dispara validação do master. Não executa código de PR privilegiado.
7. Alterações de RLS, Auth, migrations, política de segurança, workflows, IA de saúde e deleções demandam revisão específica; falha da automação é bloqueio técnico, nunca autorização para pular gates.
8. Registrar estados `implementado / testado / mergeado / publicado / E2E / homologado` separadamente e evidência exata (SHA, workflow URL, runtime, quem executou, data, defeitos e limpeza).
9. Ao encerrar, continuar a **mesma jornada** se houver bloqueios corrigíveis. Não iniciar outra série de pequenos PRs cosméticos.
10. A aprovação profissional da Patty continua exclusiva, especialmente em alimentação, treino e conteúdo; IA não aprova ou publica automaticamente.

## Troca opcional para auto-merge nativo do GitHub

A opção nativa `Settings → General → Pull Requests → Allow auto-merge` atualmente está **desligada** (`allow_auto_merge=false` no endpoint do repositório em 2026-10-14), apesar de o merge **via GitHub Actions** já ter sido comprovado no PR #832 (run `38621662629`, executado por `github-actions[bot]`). Isso não é um bloqueio do GitHub, apenas uma preferência administrativa que a integração disponível não consegue editar via API de configuração.

Se for ativada futuramente, são requisitos operacionais:
- proteção de `master` com `Validate application / validate` obrigatório, atualizado com a base e sem bypass indevido;
- ativar auto-merge por PR elegível pelo agente após revisar arquivos sensíveis e critérios da jornada;
- evitar dupla execução: o worker interno consulta `allow_auto_merge` e **não** executa merge quando a opção nativa estiver ligada;
- não interpretar merge, PR CI ou build como deploy ou homologação autenticada;
- caso não haja proteção exigindo checks, a opção por PR pode ficar indisponível ou permitir merge imediato; configurar os gates antes de depender exclusivamente do nativo.

Até a configuração nativa estar efetivamente pronta, a automação comprovada do Actions segue ativa. A leitura de regras/proteção do `master` apresentou `403 Resource not accessible by integration`; isso **não** prova que inexista proteção, apenas impede comprovação pelo conector atual.

## Convenções de reporte

Informar objetivamente: jornada, falhas observadas no percurso, correções agrupadas, CI, E2E real, deploy, riscos e próximos impedimentos. **Não pedir ao responsável para operar merges comuns ou ler logs de CI.** Quando não houver ambiente de execução autônoma contínua disponível, não prometer trabalho em segundo plano; a automação do GitHub executa apenas os gatilhos implementados.
