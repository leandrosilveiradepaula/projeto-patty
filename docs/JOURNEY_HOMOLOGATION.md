## 2026-10-20 — J3 cliente mobile: avaliações finalizadas, correção histórica e navegação factual

**Objetivo:** complementar o E2E J3 já aprovado para ações profissionais AAL2 em mobile com a navegação **cliente** em 390 px. Dados criados no banco descartável: duas avaliações finalizadas da titular, uma avaliação ainda rascunho e outra finalizada de cliente estrangeira, além de uma correção profissional registrada pela UI que preserva valor original. **Nenhum desses valores é prescrição clínica.**

**Verificações novas:** login de conta cliente própria; somente avaliações finalizadas atribuídas à identidade correta; abertura do registro histórico exato por hash; observação corrigida vigente; link de histórico da medida no touch; seleção de `janela=3`, ligação profunda à avaliação exata e retorno à mesma medida/filtro mesmo após reload; largura total sem overflow; link de avaliação forjado não gera acesso nem retorno autorizado; outra cliente autenticada não recebe o histórico alheio. Nenhuma leitura gera nova correção, follow-up ou protocolo publicado.

**Escopo:** exclusivamente `e2e/j3-assessment-evolution-lifecycle.spec.mjs` e documentos de estado. Fora de escopo: Auth/RLS/schema, migrations, dados reais, imagens clínicas, mudanças de método, autorização por email, publicação e homologação humana. Exigir `Validate application`, J3 Playwright e todas regressões iniciadas `SUCCESS` no mesmo SHA, diff revisado e PR mergeável; depois verificar CI pós-merge e Vercel produção READY no commit integrado. A homologação operacional conjunta da Patty será realizada por último.

**Status inicial:** implementação enviada para validação técnica, não homologada profissionalmente.

---

## 2026-10-20 — J1: preview privada no celular e negação de acesso AAL2 fora do assignment

**OBJETIVO:** fechar a lacuna entre download privado já testado e a pré-visualização inline real (`?preview=1`) da cliente e da Patty. A suíte J1 usa dois PNGs locais físicos e cria a segunda profissional administrativa **sem assignment**, mas com autenticação MFA AAL2 válida, para provar `404` tanto em preview quanto em download. A versão liberada pela profissional exige clique humano na UI; antes disso, nem a própria cliente recebe uma URL de prévia. A prévia é aberta pelo link `Visualizar` em viewport 390 px e nova aba, sem expor tokens nos logs.

**ESCOPO:** `e2e/j1-local-onboarding.spec.mjs`, este documento e `docs/PROJECT_STATUS.md`; J1 CI existente com banco/Storage/Auth descartáveis. Sem mudanças em aplicação, backend, RLS, workflow, migrations, ACL hospedada ou bibliotecas. Conferir `307`, `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, origem localhost do redirect, PNG idêntico, `404` da cliente sem liberação/outra cliente e `404` da profissional sem vínculo nos dois arquivos.

**LIMITAÇÃO:** não confundir autorização na emissão do signed URL com revogação de links já assinados, que expiram após seu próprio TTL; a J1 não testa servidor de produção nem visualização de documento real. Testes synthetic CI não substituem cliente autorizada, MFA real e verificações visuais finais no dispositivo. Homologação com Patty permanece a última tarefa.

**ACEITE:** `Validate application` e browser J1 verdes no head exato, PR mergeável, diff revisado, depois CI pós-merge e Vercel READY no commit de merge. Estado inicial: enviado à verificação técnica, não homologado profissionalmente.

---

## 2026-10-20 — Índice vigente do aceite técnico das sete jornadas

A **[matriz J1–J7](PREHOMOLOGATION_MATRIX.md)** é o quadro consolidado de alcance e limites dos E2E. Os registros cronológicos abaixo permanecem preservados como evidências históricas, inclusive casos inicialmente falhos, sem converter descrições de “PR pendente” daquele momento em estado atual.

**GATE INTEGRAL:** a PR que cria a matriz deve ter `Validate application` + J1, J2, J3, J4, J5, J6 e J7 com sucesso **no mesmo head exato** (o primeiro precedente, PR #934, já passou em SHA anterior, mas não vale para o código posterior). Qualquer mudança na matriz é gatilho intencional dos sete workflows; edições rotineiras em documentação sem esse arquivo não forçam todas as jornadas. Conferir RLS/MFA, PR mergeável e workflows sensíveis antes de integrar. Depois confirmar CI pós-merge e Vercel produção READY no SHA de merge.

**LIMITES:** nenhuma jornada é homologada profissionalmente por CI; não criar contas, publicações ou releases fictícios no Supabase SaaS. A última tarefa segue sendo a sessão operacional conjunta com a Patty, com aprovação humana e registro das pendências. O teste J6 de bytes usa emissor e provedor simulados, não distribuição real a clientes pela Vercel Blob.

---

## 2026-10-20 — J6: bytes reais sintéticos após liberação humana e URL privada assinada simulada

**BASE:** PR #943 mergeada em `7efa6c441226d54069d3600006ee40097903b984`, `Validate application` pós-merge `success`, Vercel produção READY no mesmo commit. J6 já exercita rascunhos, publicação manual de versões, releases exatos para uma cliente, isolamento RLS e metadata de mídia. A sessão real administrativa do vídeo da balança está documentada em `CONTENT_LIBRARY.md`; a mídia real permanece rascunho, sem release a cliente.

**LACUNA E OBJETIVO:** a suíte J6 verificava que os caminhos de metadata inexistentes falhavam em abrir; isso não demonstrava bytes entregues por uma URL temporária após release autorizado. Estender o mesmo fluxo sintético: (1) publicar material sem asset e negar release; (2) manter um MP4 de metadata propositalmente inexistente e provar que assinatura não cria objeto; (3) cadastrar PDF fictício com hash e tamanho computados dos bytes que um servidor local realmente transmite; (4) negar leitura da cliente antes da liberação e de não titular/anon; (5) realizar release pelo formulário administrativo autenticado/AAL2; (6) verificar redirect `307` da rota da cliente para localhost com cache privado/no-store, `GET 200` com bytes e SHA-256 exatos, `Range 206`, faixa inválida `416`, assinatura ausente/adulterada recusada, leitura administrativa e ausência de escrita de progresso; (7) preservar a versão liberada quando uma nova versão do material é publicada.

**AMBIENTE E SEGURANÇA:** exclusivamente GitHub Actions J6 + Next.js/Supabase descartáveis em localhost; configuração temporária **não comitada** substitui somente `@vercel/blob` do build CI por um emissor read-only de tickets HMAC e servidor de PDF gerado em memória em `127.0.0.1:54329`. Segredos gerados no próprio job; nenhum Blob real, arquivo de cliente, dado de saúde, Cloud SaaS nem modificação de grants, Auth, RLS ou migrations. A liberação continua por ação explícita da profissional; o PDF é apenas teste de transporte, **não decisão de publicar PDF ou regra profissional**. Verificar que workflow e mock se recusam a rodar com credenciais externas.

**LIMITES DE EVIDÊNCIA:** a simulação não verifica SDK verdadeiro, OIDC, signed tokens reais do Vercel, CDN, performance/seek do vídeo >100 MB ou aceite profissional. Essas validações reais continuam na rodada operacional final, sem criar cliente artificial no SaaS. Diferenciar simulação de mediação HTTP e distribuição real na documentação.

**ARQUIVOS/TESTES/ACEITE:** `e2e/j6-educational-release-lifecycle.spec.mjs`, `e2e/j6-blob-fixture/**`, `.github/workflows/validate-j6-educational-release-browser.yml`, `docs/PROJECT_STATUS.md`, este documento. Requer `Validate application`, Playwright J6, pgTAP J6 e todas regressões disparadas aprovados no mesmo SHA; revisão específica do workflow sensível, diff sem alterações de produção, merge somente se elegível, CI pós-merge e Vercel READY no SHA exato. **Estado inicial: implementação enviada à validação, não homologado pela Patty.**

---

## 2026-10-20 — J5: encerramento de assignment sob MFA preserva o treino publicado

**FATO BASE:** `master` `fc2aa2a9b52e1d5b536b8cb964f3c49f14811040` (PR #942) com `Validate application` pós-merge `success` e Vercel produção READY no mesmo commit. O histórico de treinos J5 já conta com solicitação da cliente, v1/v2 publicadas manualmente, v3 em rascunho e negação de profissional sem vínculo, mas faltava provar revogação de um vínculo que era válido antes.

**OBJETIVO:** estender `e2e/j5-training-lifecycle.spec.mjs` para fechar a atribuição real pela UI administrativa autenticada (AAL2) e comprovar transição `client_assignments.ended_at: NULL → timestamp`, `clients.status: active → inactive`, revogação imediata do acesso da antiga profissional aos treinos v1/v2/v3 e exercícios, mesmo com sessão antiga, com negativa pela UI, SELECT autenticado e RLS de PostgreSQL. Confirmar preservação de todas as versões, histórico da cliente e ausência de publicação da v3. Sem automatizar decisão profissional de encerrar: o clique humano explícito faz parte do teste.

**ESCOPOS PERMITIDOS:** `e2e/j5-training-lifecycle.spec.mjs`, `.github/workflows/validate-j5-training-browser.yml`, `docs/PROJECT_STATUS.md` e este documento. Servidor Next.js local, Supabase Auth/Storage/PostgreSQL descartáveis, contas sintéticas e MFA efêmero. A Server Action existente usa `SUPABASE_SECRET_KEY` server-only: o workflow J5 a alimenta somente com chave localhost gerada no próprio runner, mascarada e jamais exposta ao navegador; replica somente grants SELECT/UPDATE da `service_role` das tabelas de vínculo e clientes cujo ACL foi conferido no catálogo de produção. `authenticated`/ `anon` permanecem sem UPDATE, e RLS deve continuar ativa. Nenhuma migration.

**FORA DE ESCOPO:** regras clínicas ou de treino, fechamento automático de cliente, alteração permanente de Auth/RLS/grants, schema, mudanças de dados reais, teste de arquivo real ou homologação profissional. A sessão conjunta com a Patty será a última tarefa.

**ACEITE E RISCOS:** `Validate application` e Playwright J5 + regressões verdes no SHA exato, com evidência de persistência/autorização e verificação de layout móvel. Revise especificamente o workflow sensível, sua contenção a localhost, qualquer erro de permissão e o ciclo de UI; não relaxar RLS para obter CI verde. Após merge permitido, confirmar CI pós-merge, Vercel READY no mesmo SHA e registrar status. **Estado: pacote enviado para execução técnica, aguardando CI; homologação operacional pendente.**

---

## 2026-10-20 — Integração J3 → J4 → J2 (envio definitivo) → J3

**BASE CONSOLIDADA:** PR [#940](https://github.com/leandrosilveiradepaula/projeto-patty/pull/940) mergeada no commit `d6d330090347b0b5445fe353800c9ac0028f76fb`: avaliação inicial e reavaliação criadas/finalizadas via interface MFA AAL2, com medição, foto privada vinculada e snapshots originais versionados. PR [#941](https://github.com/leandrosilveiradepaula/projeto-patty/pull/941) mergeada como `c520f490516665a5aad3e233202af34f9d73279e`: histórico da correção de medida testado pela UI; todos checks exigidos verdes, CI pós-merge success e Vercel READY no mesmo SHA. Estados de "aguardando CI/merge" nos registros anteriores são históricos e foram superados.

**LACUNA IDENTIFICADA:** a suíte integrada `e2e/j4-nutrition-protocol-lifecycle.spec.mjs` exercitava a solicitação J2 depois de publicação real J4, o rascunho da cliente e a prevenção de duplicidade, mas terminava sem o ato de envio definitivo; o envio e a leitura profissional eram exercitados apenas na suíte isolada J2 com publicação sintética previamente criada.

**OBJETIVO / ESCOPO DO PACOTE:** depois do protocolo J4 realmente aprovado e publicado e da solicitação semanal, preencher a versão vigente do formulário J2 pela interface autenticada da mesma cliente, exigir tela de revisão e clique explícito de envio, persistir `submitted_at`, exigir todas as chaves originais do formulário versionado, navegar ao histórico enviado e conferir leitura original pela profissional MFA. Negar leitura à outra cliente; preservar exatamente duas publicações J4, sem gatilho de publicação ou alteração implícita. Concluir a segunda avaliação J3 no mesmo cliente e comprovar que ela não modifica respostas já enviadas nem a data de envio. O material fictício das respostas é apenas fixture de teste, não critério clínico. Preparação de identidades/ambiente continua local e descartável.

**FORA DE ESCOPO:** alterar formulário profissional, regras clínicas, IA, relatórios, migrations, Auth, schema, RLS, Storage de produção e dados reais. Não substituir navegação por inserção SQL para a operação sob teste. **RISCO:** aumento do tempo da suíte J4 e dependência da versão ativa de perguntas; manter validações reais e corrigir eventuais falhas na mesma branch.

**ACEITE:** `Validate application`, `Validate J4 local nutrition lifecycle browser` e regressões disparadas `success` no SHA exato da PR; revisão do diff, merge elegível, `Validate application` pós-merge e Vercel produção READY no commit final. A homologação profissional da Patty continua por último. **Estado inicial deste pacote: implementação enviada à PR e aguardando CI; não homologado operacionalmente.**

---

## 2026-10-20 — J3: prova de correção histórica pela interface autenticada

**BASE VERIFICADA:** PR #940 já integrada no `master` `d6d330090347b0b5445fe353800c9ac0028f76fb`; `Validate application` pós-merge success e Vercel produção READY no mesmo SHA. O teste J4 integrado agora cria e finaliza ambas avaliações J3 pela UI administrativa, preservando snapshots originais e isolamento.

**LACUNA COBERTA NESTE PACOTE:** na suíte `e2e/j3-assessment-evolution-lifecycle.spec.mjs`, substituir a inserção SQL da correção histórica por fluxo real da UI AAL2 de avaliação finalizada. Validar que não aparecem controles de edição do rascunho ou nova finalização; abrir a correção do peso, fornecer valor, unidade e observação sintéticos, confirmar a única linha append-only, autoria e permanência do valor original em PostgreSQL descartável. Depois, exigir histórico visível pela UI, comparação corrigida (71 → 69 kg) e RLS já existente. Criação de identidades, fotos e avaliações sintéticas para pré-condições permanecem fixtures locais como antes.

**OBJETIVO E ACEITE:** `Validate application` e `Validate J3 local assessment browser journey` no mesmo head de PR, revisar diff e riscos antes do merge. Após integração, verificar CI pós-merge e Vercel READY no commit exato.

**FORA DE ESCOPO:** alterações de schema, grants, RLS, Auth, regras profissionais ou correções de dados reais; homologação operacional da Patty. Este teste não autoriza publicar ou diagnosticar automaticamente.

**RISCO:** comportamento assíncrono do `router.refresh` e localização do formulário no mobile. Corrigir eventual falha na mesma branch, sem relaxar a checagem da autoria, persistência, isolamento e original imutável. **Estado inicial: alteração enviada ao PR, aguardando CI; não homologado profissionalmente.**

---

## 2026-10-20 — J3 → J4 → J2 → J3: completar operações da avaliação na interface

**FATO CONFIRMADO:** PR #939 mergeado como `7cabd679a35c9211f244badbefaed2eabddb53bf`, com cinco checks pré-merge aprovados, `Validate application` pós-merge success e Vercel produção READY no mesmo commit. A integração J3 → J4 → J2 → J3 é comprovada no banco descartável; no #939 a avaliação inicial e a reavaliação foram criadas e finalizadas por fixtures SQL locais, enquanto a comparação foi feita pelo browser.

**OBJETIVO / ESCOPO DO NOVO PACOTE:** substituir no Playwright `e2e/j4-nutrition-protocol-lifecycle.spec.mjs` a criação/finalização SQL da J3 por operações reais, na mesma sessão admin MFA AAL2 e na mesma cliente sintética. Executar formulário `Nova avaliação`, persistir rascunho e autoria, salvar medidas obrigatórias reconhecidas pelo catálogo ativo, vincular arquivos PNG sintéticos privados previamente criados no Storage descartável, exigir confirmação explícita da finalização e verificar snapshot versionado persistido, autoria, única avaliação nova e congelamento. Repetir na reavaliação após o protocolo humano J4 v1/v2 e o rascunho J2, então comparar as duas pela interface. Continuar verificando RLS/negação a outra cliente e profissional não atribuído, e que a reavaliação não altera as publicações nem submete feedback. Medidas adicionais para comparação, somente quando fora do catálogo visível, podem continuar como fixtures locais declaradas; **nunca** regras clínicas.

**EVIDÊNCIA DA PRIMEIRA EXECUÇÃO DO PR #940:** Validate application/J1/J6/J7 passaram no head `8c01c242b3e2849561af0a6a345cbdffaf49406b`; a J4 criou o rascunho inicial e avançou até o clique real de finalização, mas `finalized_at` permaneceu nulo (run [#39442082412](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39442082412)). O código de finalização chama `createAdminClient()` e requer `SUPABASE_SECRET_KEY` server-only, variável ausente do ambiente do Next.js na suíte local J4. Corrigido **apenas no workflow descartável**, propagando a chave gerada pelo próprio Supabase CLI para o processo server-side, sob URL localhost, máscara de secrets e ausência de token remoto. Não há alteração no runtime, grants ou produção. **Hipótese de correção, aguardando nova CI no head exato; falha não pode ser considerada resolvida antes do novo PASS.**

**CAUSA FUNCIONAL CONFIRMADA NA J3 (ALÉM DO AMBIENTE LOCAL):** o seed versionado contém, por exemplo, `aliases: ["weight"]` para `peso`, mas `parseAssessmentDefinitionConfiguration` inclui a própria chave canônica na lista normalizada de aliases. A ação de finalização enviava essa representação normalizada à função SQL `finalize_assessment_from_method_snapshot`, que exige igualdade com o JSONB original da versão ativa e, portanto, recusava o snapshot. Correção estreita em `lib/evaluations/assessment-configuration-loader.ts` e `app/admin/avaliacoes/[avaliacaoId]/actions.ts`: manter o JSON bruto separado do modelo normalizado da interface; a finalização encaminha **o original versionado**, enquanto os requisitos de coleta continuam derivados da validação normalizada. Teste unitário comprova a diferença; E2E exige `resolved_configuration` igual à fonte original após finalizar. Sem editar valores profissionais ou suavizar a checagem SQL. O workflow local ainda verifica grants específicos da `service_role` já presentes na produção (metadados ACL, sem acessar clientes) e proíbe execução da RPC por `anon`/`authenticated`. **Corretivo sujeito ao CI do HEAD; não considerar resolvido até verde.**

**FORA DE ESCOPO:** alterar código do produto, autorização, schema, migrations, grants ou RLS; produção, upload de fotos reais, fornecedor externo de saúde, diagnóstico, inferência de decisão da Patty ou homologação operacional. Dados sintéticos não equivalem a critérios profissionais. Ambiente local protegido por `J4_E2E_LOCAL_ONLY`, login AAL2, Storage não público e destruição sem backup.

**ACEITE:** Validate application, J4 Playwright e regressões acionadas em success no mesmo HEAD de PR; corrigir na mesma branch sem reduzir asserções; revisar mergeabilidade e diff, realizar merge elegível, comprovar CI pós-merge e Vercel READY no SHA publicado. **Estado inicial: implementado, aguardando CI; não homologado pela Patty.**

---

## 2026-10-20 — Pré-homologação integrada J3 → J4 → J2 → J3

**BASE VERIFICADA:** PR #938 mergeado no `master` `344b7a40c29a8ef5196a605eba6130ca9787ce6e`, `Validate application` pós-merge `success` e Vercel produção `READY` no mesmo SHA. Fluxo de upload administrativo e liberação humana comprovado com dados sintéticos; a Patty ainda não realizou homologação operacional.

**OBJETIVO / ACEITE:** na MESMA cliente sintética e no MESMO Supabase/PostgreSQL descartável do teste J4, criar uma avaliação J3 inicial finalizada com o catálogo/método versionado ativo; comprovar que avaliação não publica protocolo ou cria feedback. Executar a J4 real por navegador (rascunho → revisão → aprovação → publicação das versões 1 e 2), depois J2 real (solicitação manual, rascunho persistido, retomada, bloqueio de repetição) e finalmente finalizar reavaliação J3 distinta. Pela UI de comparação autenticada, conferir as duas avaliações e valores sintéticos distintos, enquanto exatamente duas versões nutricionais permanecem publicadas e o feedback original permanece não submetido e inalterado. Verificar também negativa de acesso de cliente estrangeira (RLS) e profissional não atribuído (AAL2), sem decisões clínicas automáticas.

**ESCOPO:** `e2e/j4-nutrition-protocol-lifecycle.spec.mjs`, documentação e validação J4. A finalização de avaliações usa a função de snapshot já existente e o mesmo modelo de dados que a suíte J3; os cadastros sintéticos exigidos são inseridos somente no banco local e as fotos descartáveis ficam em Storage local privado. `74/72 kg` e outras medidas são dados de laboratório, **não regras nem resultados do método Patty**. Fora de escopo: código de produção, schema, grants, migrations, RLS, novos passos do método, IA externa e qualquer cliente de produção.

**SEGURANÇA / PORTAS:** ambientes localhost obrigatórios, contas efêmeras, MFA, RLS e bucket privado. O PR só pode ser mergeado com `Validate application`, Playwright J4 e demais checks disparados em `success` no HEAD exato, seguido de CI pós-merge e Vercel READY no SHA publicado. Registro escrito não equivale a teste: **status inicial = implementação aguardando CI**. Homologação humana conjunta da Patty será a última tarefa do projeto.

---

## 2026-10-20 — Pré-homologação: arquivo administrativo oculto → liberação explícita → download da cliente

**BASE TÉCNICA CONFIRMADA:** PR #937 mergeado como `04bb4980ae28b20549495ea54be6048b62344585`; seus checks pré-merge Validate application/J1/J6/J7 passaram, CI pós-merge success e Vercel READY no SHA correspondente. Homologação profissional da Patty não realizada.

**OBJETIVO:** ampliar o teste J1 autenticado e descartável, na mesma cliente sintética e no mesmo Storage privado, para executar o upload pelo formulário administrativo real com MFA AAL2. Exigir um registro `client_files` e sessão `client_file_upload_sessions` aceitos com bytes reais no bucket privado, autor profissional, visibilidade inicial nula, download disponível só ao admin autorizado e ocultação da listagem/rota da própria cliente. Em seguida exigir confirmação humana `Liberar para cliente`, autor/timestamp de liberação persistidos, transição pendente → histórico, download da cliente com conteúdo exato e não titular ainda bloqueado. Comprovar também que não foi criada duplicata.

**ESCOPO:** `e2e/j1-local-onboarding.spec.mjs`, workflow `validate-j1-local-onboarding-browser.yml` e docs de acompanhamento. Os metadados de ACL do Supabase publicado (sem ler clientes ou arquivos) confirmam `service_role` SELECT/INSERT/UPDATE em sessões e SELECT/INSERT/UPDATE em arquivos. O workflow só reproduz os grants técnicos faltantes no Docker local e confirma RLS ativa, `anon` e `authenticated` sem permissão de gravação. Nenhum grant remoto, Auth, schema, migration, regra profissional, arquivo real ou gate IA modificado. Smokes legados remotos continuam fora de escopo.

**EVIDÊNCIA COMPLEMENTAR:** a segunda execução após CSS continuou com pointer intercept no ponto escolhido automaticamente pelo Playwright; porém `document.elementFromPoint` aplicado ao **centro geométrico** do botão retornou o próprio alvo. A próxima execução usa `locator.click({ position: centro })`, preservando o hit-test, o evento físico do browser e todas as asserções de autorização e persistência, sem `force: true` ou submit programático. Em eventual erro, registra apenas tags e retângulos numéricos da interface, sem dados pessoais ou credenciais. Não declarar corrigido até sucesso da J1.

**FALHA E CORREÇÃO EM TESTE:** o primeiro run da suíte ampliada chegou ao arquivo pendente e ao checkbox de aprovação, mas o Playwright não conseguiu clicar em `Liberar para cliente`: metadados anteriores e o rótulo de confirmação interceptavam o ponteiro na tela móvel, até esgotar o timeout. A reparação é da **interface real**, não do teste: ações do arquivo passam a um grid de coluna única em até 640px, e o botão de aprovação recebe uma camada interativa própria. Permanecem exigidos clique humano nativo, persistência e RLS; nenhum `force` no Playwright. A validação no novo head continua obrigatória.

**CRITÉRIOS DE ACEITAÇÃO:** `Validate application` e `Validate J1 local client onboarding browser` (mais regressões J6/J7 acionadas) devem concluir success no head exato. Corrigir falha na mesma branch; revisar diff; merge somente se elegível; conferir CI master e Vercel READY no commit integrado. **Estado no início da execução: em validação, não homologado.**

---

## 2026-10-20 — Pré-homologação de arquivos privados: cliente → Patty MFA → cliente não titular

**FATO DE BASE:** PR #936 integrado no `master` `09d16bd22fbe27a4c907553ac60c4de57d0f5d44`, `Validate application` pós-merge concluído em success e deployment Vercel READY no mesmo SHA. O upload/download sintético da cliente foi demonstrado em Supabase local, não em produção.

**OBJETIVO DESTE PACOTE:** no mesmo teste J1 descartável que ativou uma cliente real de laboratório e criou fisicamente um PNG privado, comprovar que uma sessão admin AAL1 é redirecionada para MFA ao tentar baixá-lo, que Patty/admin com TOTP AAL2 visualiza o registro e recupera exatamente os bytes do Storage, que consultar o arquivo não altera sua autoria/visibilidade, e que outra cliente autenticada não consegue encontrá-lo nem obter o download. O acesso administrativo a arquivos privados sem assignment tem exceção MVP documentada em `RBAC_RLS.md`; este cenário usa assignment ativo e **não cria regra nova**.

**ESCOPO/ARQUIVOS:** somente `e2e/j1-local-onboarding.spec.mjs`, `.github/workflows/validate-j1-local-onboarding-browser.yml` e documentação de status. A configuração TOTP é alterada **apenas** no arquivo descartável do runner, antes de `supabase start`. Contas/objetos são sintéticos em localhost, excluídos com `supabase stop --no-backup`. Sem migrations, Auth, RLS, novas permissões, dados no SaaS, fornecedor externo ou decisão profissional.

**ACEITE:** Validate application, J1 browser e regressões J6/J7 (se acionadas) em success no SHA exato; GitHub mergeável, diff revisado, merge seguro, CI do master e deployment READY no commit publicado. Qualquer falha deve ser corrigida na mesma branch, sem reduzir asserções. **Estado durante desenvolvimento: aguardando evidência de CI; não é homologação operacional da Patty.**

---

## 2026-10-20 — Arquivo privado: upload, finalização e download real no Supabase descartável

**OBJETIVO:** ampliar exclusivamente a suíte de ativação sintética J1 para, após criar a sessão real da cliente, enviar um PNG de um pixel pelo próprio formulário de arquivos privados. Aceite exige exatamente uma linha em client_files vinculada ao ID da cliente, conteúdo físico exato no bucket client-private (public=false), visibilidade após reload, download via URL assinada apenas localhost, rejeição de arquivo inválido sem novo upload e navegação anônima redirecionada ao login. RLS, Auth, consentimento, revisão da Patty e limites de dados continuam inalterados; nenhum conteúdo de saúde real é utilizado.

**DIAGNÓSTICO E SEGURANÇA:** a primeira falha no E2E foi seletor ambíguo, corrigido; a segunda chegou à etapa de envio sem linha persistida e o servidor registrou apenas a categoria `permission denied`. As ACLs do Supabase publicado foram consultadas **somente como metadados**, confirmando `service_role` SELECT/UPDATE em sessões e SELECT/INSERT/DELETE em `client_files`, com RLS ativa. A suíte agora alinha essas operações somente para `service_role` no Supabase Docker descartável, exige preservação das negativas de `anon`/`authenticated` e RLS e classifica erros por categorias seguras. Nenhum grant foi alterado em produção; não confundir nova tentativa ainda pendente de CI com conclusão validada.

**ESCOPO:** E2E e documentação. Fora de escopo: novo schema/grants/RLS, uploads reais no SaaS, credenciais de produção, workflows legados de smoke remotos, IA e homologação operacional. Corrigir eventuais erros verificáveis apenas na mesma branch, sem flexibilizar asserções nem segredos.

**BASE CONFIRMADA:** PR #935 mergeado 15809a5b5aaa9ba086a8229aa082bd4f618b1ccf, CI pós-merge success e Vercel READY no mesmo commit. Novo teste exige Validate application e Playwright J1 no HEAD exato, regressões acionadas, merge elegível, CI e Vercel no SHA publicado. Não é homologação humana.

---
## 2026-10-20 — Integração J4 → J2: protocolo publicado habilita feedback, sem criação implícita

**OBJETIVO / ACEITE TÉCNICO:** no mesmo teste Playwright e na mesma cliente sintética do PostgreSQL descartável, conferir o bloqueio de solicitação de Feedback Semanal quando a versão alimentar ainda é rascunho; publicar explicitamente a v1 e a v2 pelo fluxo profissional J4; confirmar que publicações não criam feedback por conta própria; então solicitar manualmente o Feedback Semanal pela interface autenticada, comprovar uma linha persistida, abrir na sessão da cliente, salvar e retomar rascunho, negar leitura por outra cliente, repetir o período sem duplicar linha nem modificar respostas/protocolos. MFA, RLS, localhost e teardown permanecem obrigatórios; não inclui diagnóstico, IA externa, nova regra do método, migration ou dado real. Teste detalhado de J2 continua independente e já foi validado.

**EVIDÊNCIA BASE:** PR [#934](https://github.com/leandrosilveiradepaula/projeto-patty/pull/934) mergeado como b19854b9bae00c2be99ba631576f2194eca7a4a3, oito workflows J1–J7/Validate verdes no head exato, [CI pós-merge](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39357713854) aprovado e Vercel produção READY com o mesmo commit. Isto **não** é homologação humana.

**PRÓXIMO GATE:** nova integração J4→J2 exige Validate application + Validate J4 local nutrition lifecycle browser verdes no head exato, inspeção do diff e merge seguro, seguido de CI pós-merge e Vercel no SHA integrado. Homologação operacional da Patty continua reservada para o final.

---
## 2026-10-20 — Consolidação pré-homologação: regressões J2–J5 no HEAD integrado

**OBJETIVO TÉCNICO:** executar novamente as suítes Playwright autenticadas J2, J3, J4 e J5 sobre um único HEAD com PostgreSQL/Supabase local descartável, contas sintéticas, MFA, RLS e navegação móvel. As evidências históricas de cada jornada continuam válidas para seus commits originais, mas não substituem execução na revisão atual.

**ESCOPO:** ampliar a asserção de notificações próprias da J2 (não titular); tornar obrigatório distinguir falta de linhas sob RLS de erro inesperado de leitura nas J3/J4; confirmar que publicação nutricional na J4 não cria feedback semanal automaticamente; na J5 confirmar prevenção de segunda solicitação involuntária, acesso a itens versionados limitado ao perfil/assignment e ausência de publicação nutricional ou feedback incidental. Atualizar `test:e2e-helpers` para verificar sintaxe J2–J7. Nenhum dado real, migration, regra profissional, permissão ou gate de IA será alterado.

**ACEITE:** `Validate application` + Playwright J2/J3/J4/J5 com conclusão `success` no SHA final do PR; merge somente quando elegível e CI/release pós-merge verificados. Mudanças em testes/workflows exigem inspeção específica por não entrarem no gate simplificado de auto-merge. **Estado atual: aguardando execução do CI; NÃO homologado.** A homologação humana da Patty continuará sendo a última tarefa do projeto.

---

## 2026-10-20 — J1: gravação confirmada, teste ajustado para evidência durável

**FATO VERIFICADO:** no Playwright local [#39353118526](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39353118526), a mudança da Cidade foi **gravada corretamente** (`persistedCityMatches=true`) e o botão de salvar ficou desabilitado, sem alteração pendente. A asserção anterior exigia uma mensagem de sucesso transitória; `router.refresh()` após confirmação pode remontar a Server Component e remover essa mensagem antes da observação. Os testes J6/J7 e a validação geral continuaram verdes no head investigado. Isso é um problema de **observabilidade do teste**, não prova de falha de gravação.

**CRITÉRIO CORRIGIDO SEM ABRANDAMENTO:** a E2E aguarda (1) o valor sintético exato no PostgreSQL descartável, (2) fim do `aria-busy` no formulário, (3) estado visível `Nenhuma mudança em relação aos dados salvos.`, (4) botão de salvamento desabilitado, (5) o mesmo campo exibido corretamente na UI e (6) a persistência após recarregar a página. Elimina a exigência de capturar um toast efêmero, mas **adiciona** comprovação de commit e assentamento do formulário. Remove probe de escrita administrativa na exceção de teste, para não alterar o dado que deveria ser verificado. Nenhuma mudança no runtime ou em banco de produção.

**ESTADO:** PR #931 em CI; não mergear até J1, J6, J7 e validação geral aprovados no SHA exato. Homologação profissional da Patty permanece a última tarefa global.

---

## 2026-10-20 — J1: paridade explícita de grants do service_role no Supabase descartável

**DIAGNÓSTICO CONFIRMADO:** após a correção do handoff por convite, o Playwright J1 chegou à edição de Cadastro Atual e falhou na operação real com `42501` (`localServiceRead=42501`, `localServiceInsert=42501`) no runner local [#39350786746](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39350786746). Foi verificado em consulta **somente de metadados de permissões**, sem ler qualquer cliente, que o banco publicado já possui `SELECT`, `INSERT` e `UPDATE` para `service_role` sobre `public.client_registration`; a tabela segue com RLS ativa. O Supabase descartável da CLI não reproduz essa autorização técnica nos fixtures.

**CORREÇÃO ESTRITAMENTE NO TESTE LOCAL:** a nova etapa do workflow J1, após o `supabase db reset`, aplica somente `grant select, insert, update on public.client_registration to service_role` no container Docker local do banco descartável, reproduzindo os direitos técnicos **já existentes no banco publicado**. Falha imediatamente se qualquer operação requerida estiver ausente, se `anon`/ `authenticated` puderem escrever, se RLS estiver desligada ou se houver token de acesso remoto configurado. Não altera nenhuma migration, schema/RLS, grants remotos, production data, cliente real ou autorização frontend. A aplicação mantém a decisão de serviço técnico no backend somente após `requireRole('client')` e escopo de cliente. Contratos verificam que não é possível abrir escrita aos usuários regulares.

**ESTADO:** o PR #931 continua **NÃO MERGEADO / NÃO HOMOLOGADO** até `Validate application`, Playwright J1 e regressões J6/J7 verdes no SHA exato, seguido de merge/deploy verificado. A homologação operacional pela Patty permanece a **última tarefa global**.

---

## 2026-10-19 — J1: callback corrigido, validação avançou até Cadastro Atual (ainda não aprovado)

**EVIDÊNCIA LOCAL:** na execução [#39349343021](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39349343021), o Playwright passou pela geração/consumo de convite, entrega de cookie OTP e ativação de senha após trocar o redirect absoluto reconstruído por `Location` relativa com a mesma origem. A falha anterior de autorização da tela de ativação **não se reproduziu nesta execução**. O teste avançou à gravação da Cidade no **Cadastro Atual** sintético, onde a asserção de persistência expirou com valor nulo. Portanto, J1 **ainda está em validação**, não implantada nem homologada.

**DIAGNÓSTICO EM CURSO:** o formulário controlado de edição do Cadastro Atual agora espera botão habilitado após hidratação, verifica uma confirmação explícita do resultado da ação (salvo/erro/conflito) e **somente então** verifica a linha no banco. Não inserir dado fictício no Supabase de produção; não eliminar a asserção de persistência. A escrita é uma Server Action com `requireRole('client')`, cliente escopado e operador de versão, que permanece inalterada. O teste de contrato de callback foi alinhado à nova assinatura `uncachedRedirect(true)`; contrato de segurança e regressões J6/J7 continuam obrigatórios.

**STATUS:** correção submetida na mesma branch do PR #931; CI/E2E do novo head pendente. Homologação operacional pela Patty continua expressamente a última etapa global.

---

## 2026-10-19 — J1: causa raiz confirmada — redirect alterava host e perdia cookie de sessão

**FATO REPRODUZIDO (sem dados reais):** o Playwright local da PR #931, execução [#39348786932](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39348786932), comprovou: conta e convite confirmados, papel client existente sob RLS, cookie presente com `secure=false`, `httpOnly=false`, `sameSite=Lax`, `path=/` e domínio loopback `127.0.0.1`, porém `pageIsLoopback=false` na tela de ativação. A chamada `fetch` do navegador não transmitiu cookie (`cookie-sent=false`) e recebeu `role:null`; o request de teste ao host de origem obteve o papel corretamente e novo `goto` corrigiu. **Causa:** construir `NextResponse.redirect` a partir de `request.nextUrl.clone()` pode usar o host interno da execução Next.js, diferente do host efetivo usado para receber o cookie. Isto é um defeito real da navegação de callback, não timeout, token inválido, RLS ou falha do método da Patty.

**CORREÇÃO TÉCNICA SOB ACEITE:** o callback `/auth/confirm` retorna um `NextResponse` status 303 com `Location` **relativa e fixa** (`/ativar-conta` ou `/ativar-conta?error=invalid`), preservando a origem real do navegador sem confiar em cabeçalho Host, Referer, query ou URL externa. Cookies produzidos por `verifyOtp` continuam aplicados **na mesma resposta** e `Cache-Control: private, no-store`/ `Referrer-Policy: no-referrer` permanecem. Token_hash não integra a URL de destino. Ações de senha permanecem verificadas no servidor, e a consulta de papel auxilia apenas a recuperar sessão válida, nunca concede privilégios. Regressão E2E exige origem exata `127.0.0.1:3000` após callback e cookie no redirect; confirma o fluxo completo sintético J1 e RLS. Sem schema, migrations, segredos, dados reais, alteração de MFA ou chamadas externas.

**PENDENTE:** CI completo J1/J6/J7 + Validate application no head final, merge seguro, pós-merge e implantação. Homologação profissional operacional da Patty será a última tarefa global.

---

## 2026-10-19 — J1: callback de convite entrega cookies no próprio redirect (sob validação)

**EVIDÊNCIA NOVA:** o Playwright local [run #39339372178](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39339372178) confirmou conta sintética, login, papel `client` sob RLS e resposta `200:not-authorized` nas chamadas `fetch` do navegador durante a ativação, mas `role` autorizado na requisição de teste e na navegação posterior. O problema persistiu após quatro releituras rápidas da rota e **não pode ser atribuído a um token inválido, papel inexistente ou uma necessidade de timeout maior**. Repetir polling sem diagnosticar a entrega dos cookies é insuficiente.

**CORREÇÃO TÉCNICA:** `/auth/confirm` usa agora um Supabase SSR client associado à **mesma instância** `NextResponse.redirect` que retorna ao browser. O `setAll` instala os cookies da sessão OTP naquele redirect e propaga cabeçalhos de cache; `Cache-Control: private, no-store` e `Referrer-Policy: no-referrer` são preservados. O token_hash é removido da URL de destino. Convites ausentes ou rejeitados retornam um redirect próprio sem cookies de autenticação novos; nenhuma permissão é inferida do navegador ou query. `getCurrentAuthContext` + RLS continuam autorizando o formulário, a Server Action valida novamente a identidade e o MFA do admin continua obrigatório.

**ACEITE / TESTES:** novo contrato exige `response.cookies.set` no objeto exato retornado e o teste Playwright descobre apenas a **presença** de `Set-Cookie` na resposta OTP (nunca valor, segredo ou e-mail), além do fluxo completo J1 e regressões J6/J7; CI verde no SHA exato antes de merge. Banco PostgreSQL e Auth continuam **somente locais e descartáveis**; nenhum dado real ou escrita na produção. Homologação operacional da Patty permanece **a última atividade global**.

---

## 2026-10-19 — J1: confirmação de corrida de cookie pós-convite no Playwright descartável

**DIAGNÓSTICO REPRODUZIDO:** a execução [J1 local #39337587280](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39337587280) confirmou `sessionEndpointResponses=200:not-authorized` no primeiro GET uncached de autorização, seguido de `probeHttp=200` com papel autorizado **na mesma sessão**, antes mesmo do GET de navegação. Auth confirmou o convite, login e cookie; RLS confirmou `client`. Portanto, existe uma janela observável na propagação das credenciais de convite para requisições subsequentes. Não é evidência de falha de RLS nem de token inválido. Esta corrida explica a renderização inicial desatualizada, mas não antecipa aceitação de correção.

**CORREÇÃO DETERMINÍSTICA SOB TESTE:** quando a primeira Server Component veio sem papel, o client consulta uma rota de **leitura** server-side `/ativar-conta/session`, com `cache: no-store` e cookies same-origin, em no máximo 4 tentativas (imediata, após 250 ms, 750 ms e 1.500 ms). **Somente** `role: null` permite aguardar nova conferência; formato inesperado, erro HTTP e falta persistente de papel continuam falhando fechado. Cada resposta é autorizada novamente pelo servidor via `getCurrentAuthContext`/RLS e a ação de senha continua protegida no servidor. Nenhum intervalo infinito, papel controlado pelo browser, bypass MFA ou saída original modificada.

**TESTE/ACEITE:** workflow J1 com Supabase/Next descartáveis e cliente sintética percorre token de convite → autorização conferida após propagação → senha → Cadastro Atual → rascunho único da Anamnese versionada → retomada/resposta original → isolamento; regressões J6/J7, `Validate application` e boundary tests verdes no head exato. Não usar o smoke legado com usuários fictícios na produção. **PENDENTE:** comprovar CI verde e merge/deployment; homologação operacional da Patty permanece a última tarefa do projeto.

---

## 2026-10-19 — J1: evitar renderização stale após convite com consulta de sessão autenticada (PR #931)

**EVIDÊNCIA CONFIRMADA DO TESTE LOCAL:** no último head anterior do PR #931, o browser recebeu cookie de sessão e a identidade sintética estava confirmada em Auth, com papel `client` consultável sob RLS. A tela de ativação ainda falhou no handoff (`phase=auth-error`), mas um GET fresco com o mesmo cookie exibia o formulário. A tentativa anterior de somente uma recarga da página foi insuficiente. **Não classificar como falha de token, schema ou RLS sem prova adicional.**

**CORREÇÃO TÉCNICA EM VALIDAÇÃO:** após o callback de convite, quando a primeira Server Component ainda apresenta papel nulo, `ActivationSessionGate` faz **uma única consulta GET same-origin**, sem cache e sem mutação, em `/ativar-conta/session`. O handler deriva `role` exclusivamente da sessão Supabase conferida em servidor (`getCurrentAuthContext`/`getClaims` e leitura de `user_roles` sob RLS), devolve somente papel autorizado ou `null` e responde `Cache-Control: private, no-store`, `Vary: Cookie`. Nem fragmento, URL, requisição do browser ou localStorage concedem papel; se não houver sessão válida o formulário continua bloqueado e o erro aparece. A renderização principal também é dinâmica; a escrita da senha permanece uma ação de servidor protegida independentemente do estado visual. Nenhum bypass Auth/MFA/RLS, segredo, migration ou produção alterado.

**ACEITE OBRIGATÓRIO:** `Validate application`, `Validate J1 local client onboarding browser` e regressões J6/J7 verdes no head exato do PR #931; o browser autentica com convite sintético, confirma `role:null` antes e `role:client` após o callback, preenche senha, salva Cadastro Atual e uma única Anamnese versionada, retoma rascunho e recusa acesso cruzado. Supabase descartável somente `127.0.0.1`, OpenAI externa desabilitada, teardown obrigatório. A homologação operacional pela Patty **continua a última tarefa global**, depois de toda a consolidação técnica; não iniciar agora.

---

## 2026-10-19 — J1: confirmação do convite e recuperação segura de papel após sessão

**EVIDÊNCIA NOVA:** Playwright local do PR #931 isolou `phase=invalid-invite`, mas o callback não marcou o token como inválido; Auth confirmou o convite, registrou login, o navegador recebeu cookie de sessão, o papel `client` ficou visível sob a política RLS existente e um segundo GET genuíno para `/ativar-conta` tornou o formulário visível. Conclusão: o problema reproduzido é a **primeira renderização desatualizada de identidade após a confirmação**, não expiração de convite nem perda da autorização RLS.

**CORREÇÃO TÉCNICA SOB TESTE:** quando a página recebe papel nulo sem fragmento de convite, a interface requisita novamente sua identidade ao próprio servidor. Sem confiar no estado ainda desatualizado de `auth.getUser()` no navegador, faz **um único GET novo** com marcador `session_refresh=1`. O marcador não concede papel, não contém token e não libera formulário: a página refaz `getCurrentAuthContext()` no servidor e exige as mesmas políticas; na segunda leitura ainda sem role, apresenta erro e **não entra em loop nem ignora a autorização**. Sem sessão válida mantém o erro de convite, sem persistir ou expor credenciais. O início do rascunho continua ação server-side única com estado de pending.

**TESTES/ACEITE:** contrato de segurança verifica a limitação do refresh e a validação server-side; teste J1 sintético percorre convite real, senha, cadastro, Anamnese versionada, duplicidade, retomada e isolamento no Supabase descartável; J6/J7 são regressões adicionais. Não alterar RLS/Auth/grants/migrations, banco de produção ou gate da IA. **Não declarar o defeito sanado nem a homologação concluída antes de CI completo e publicação no SHA exato.** O PR #933 foi encerrado sem merge por ser somente aumento de timeout; a triagem dos PRs antigos foi concluída, com #698 substituído pela PR #932 implantada. A homologação profissional da Patty permanece a **última tarefa global**.

---

## 2026-10-19 — Consolidação pré-homologação: J1 local e aposentadoria do smoke em produção

**FATO CONFIRMADO:** no mesmo `master` `fe261cec051ff843ffc72b66c5329552b6634628`, o workflow de onboarding da J1 passou na run `39312400602` e falhou na run `39312497722`. A falha aconteceu após clicar em `Começar Anamnese`: a URL permaneceu em `/cliente/anamnese` durante a asserção de 5 segundos, sem alcançar `/cliente/anamnese/{uuid}`. O mesmo código ter passado antes **não** comprova inexistência de defeito intermitente; os logs disponíveis também não provam causa raiz (hidratação, redirect, backend ou condição de corrida).

**DECISÃO DE SEGURANÇA:** o workflow legado `e2e-client-onboarding-activation.yml`, que criava e apagava contas sintéticas no **Supabase de produção**, foi aposentado. O script legado é conservado para auditoria e bloqueado contra execução direta. A nova suíte `validate-j1-local-onboarding-browser.yml` usa exclusivamente Next.js local e Supabase descartável `127.0.0.1`, sem secrets de produção, sem agendamento/trigger de deploy e sem OpenAI externa. Cria identidades e formulário **exclusivamente sintéticos** locais; destrói integralmente os serviços após a execução. Verifica convite, ativação, Cadastro Atual, um único rascunho versionado, resposta informativa persistida, retomada no mobile e isolamento anônimo/AAL1. Não altera a RLS, Auth ou migrations aplicadas.

**MELHORIA FUNCIONAL DELIMITADA:** o botão `Começar Anamnese` ganhou indicador de envio e bloqueio de clique duplicado enquanto o server action está pendente, preservando a ação já existente e o redirect. A interface expõe sinal de hidratação para o teste aguardá-la antes de interagir. Isso evita falsos positivos de clique antecipado, mas **não** substitui a validação do backend nem permite declarar a falha original resolvida sem execução do cenário descartável.

**CRITÉRIOS DE ACEITE:** `Validate application` incluindo os contratos de segurança, `Validate J1 local client onboarding browser` e regressões relevantes aprovados no SHA exato; CI pós-merge e deployment conferidos. **FORA DE ESCOPO:** Auth/RLS/grants, schema, bases de produção, formulários reais da Patty, dados reais, provider externo e homologação final. Os oito PRs legados abertos serão triados em pacote separado antes do teste operacional conjunto, que **será a última atividade do projeto**, não desta etapa técnica.

---

## 2026-10-19 — J7 encerrada tecnicamente no escopo assistivo e sintético (NÃO HOMOLOGADA)

**ESTADO:** `J7 IMPLEMENTADA / TESTADA COM DADOS SINTÉTICOS / MERGEADA / PUBLICADA COMO CÓDIGO`. A homologação profissional conjunta e a autorização para processar dados reais de saúde na OpenAI **não foram realizadas**. Não interpretar CI ou deployment `READY` como homologação de uso profissional.

**EVIDÊNCIAS VERIFICADAS:** os PRs [#920](https://github.com/leandrosilveiradepaula/projeto-patty/pull/920) a [#929](https://github.com/leandrosilveiradepaula/projeto-patty/pull/929) foram integrados. A conclusão técnica mais recente é o PR #929 com head validado `082396feadf42bb5ebcc7a382b6b75c5060421a0` e squash de `master` `d6d9d1af5c171cbe3c47eceed05df1f950d2f71b`. Os workflows [Validate application](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39310848705), [J7 local AI review lifecycle browser](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39310848628) e [J6 educational release regression](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39310848712) terminaram em `success` no mesmo head exato. A Vercel confirmou produção `READY` para o mesmo squash, deployment `dpl_BQMuS1fpSaoY6X84M5ik8nUykBR2`, servido pelo alias `projeto-patty.vercel.app`. O `master` foi confirmado nesse SHA antes de registrar a evidência.

**FUNCIONALIDADE FECHADA NESTE ESCOPO:** Anamnese enviada e versionada → minimização e fontes imutáveis por execução → output persistido com diferenciação entre ausente, inválido e válido → achados por resposta/pergunta aplicável → acesso exato à fonte original → observação interna ou anotação profissional por decisão humana → autoria, data, histórico e vínculo auditáveis. Resultados sem proveniência, com snapshot divergente, pergunta já respondida ou condicional não aplicável são preservados sem oferecer decisões incorretas. Execuções `started` podem ser encerradas manualmente como falhas, sem reenvio automático. A IA não diagnostica, escolhe protocolo, publica ou envia mensagens.

**SEGURANÇA/TESTES:** Playwright com Supabase local descartável, identidades e dados inteiramente sintéticos, MFA AAL2, RLS, assignment vigente, cliente não titular e profissional não designada, visualização mobile, registro de decisão humana, imutabilidade e referência ao conteúdo original. Nenhuma fixture real em produção; nenhuma migration/RLS/secret/gate externo alterado para encerrar a jornada. O gate `OPENAI_HEALTH_DATA_PROCESSING_ENABLED` continua desabilitado e a liberação depende integralmente de `docs/OPENAI_HEALTH_DATA_GATE.md` (retenção efetiva, elegibilidade ZDR/MAM e aprovação humana, dentre outras pendências).

**PENDÊNCIAS EXPLÍCITAS, NÃO DEFEITOS TÉCNICOS DA J7:** homologação profissional autenticada conjunta no ambiente real, teste de uso acompanhado pela Patty e controles/autorizações externas de tratamento de dados de saúde antes de qualquer análise real. Não habilitar IA externa para suprir falta de homologação. Eventuais regressões verificáveis reabrem a implementação com escopo delimitado. Não existe J8 numerada e aprovada nestes documentos; a continuidade deverá usar as prioridades já documentadas, sem inventar jornada ou regra profissional.

---

## 2026-10-19 — J7: perguntas ausentes validadas contra aplicabilidade original

**FATO TÉCNICO:** o histórico de resultados da IA anteriormente passava **todos** os IDs das perguntas da versão como `allowedMissingTargetQuestionIds` em `presentStoredAiReview`. Isso podia classificar como válido um achado `missing_answer` que se referisse a uma pergunta já respondida, condicional não aplicável ou informativa. A validação inicial feita antes de persistir um resultado já possui uma regra determinística mais restritiva em `buildAnamnesisReviewContext`.

**CORREÇÃO FUNCIONAL:** o histórico da IA e ambos os comandos de decisão humana reconstruem o conjunto de perguntas realmente aplicáveis, ainda não respondidas e permitidas, com o **mesmo helper** já usado na preparação do contexto minimizado. Campos informativos e capacidade financeira seguem excluídos das perguntas ausentes. Inconsistência de submissão, versão ou respostas gera allowlist nula e saída não acionável; não há reinterpretação do texto original, apagamento de decisões ou publicação automática. A proveniência de respostas incluídas por execução e as regras RLS/MFA continuam separadas e obrigatórias.

**ESCOPO:** `lib/ai/anamnesis-review-context.ts`, `lib/ai/anamnesis-review-history.ts`, página/ações administrativas J7, testes unitários/contratuais e Playwright sintético com uma pergunta já respondida e outra condicional não aplicável. **FORA DE ESCOPO:** schema, migrations, Auth/RLS/grants, Supabase de produção, provider OpenAI, dados reais, envio externo, mensagens, diagnósticos, protocolos e regras clínicas novas. **ACEITE:** `Validate application`, `Validate J7 local AI review lifecycle browser` e regressão J6 verdes no SHA exato; somente a pergunta sintética aplicável e realmente ausente permanece acionável. O gate externo de saúde segue **NÃO LIBERADO** e a homologação profissional continua reservada ao encerramento conjunto.

---

## 2026-10-19 — J7: conferir proveniência contra fontes imutáveis por execução

**FATO TÉCNICO:** `start_anamnesis_review_execution` já grava em `ai_execution_sources` as respostas efetivamente incluídas na execução (confirmação por catálogo SQL, sem consultar dados reais). Antes deste pacote, a exibição e a ação administrativa validavam IDs contra **todas as respostas da mesma Anamnese**, o que era insuficiente para demonstrar que uma resposta participou de determinada execução (ex.: inclusão financeira opt-in).

**CORREÇÃO DETERMINÍSTICA:** leitura paginada por IDs das fontes de resposta sob sessão autenticada, RLS, AAL2 e assignment vigente; cada execução considera apenas IDs de respostas que pertençam à submissão autorizada **e** estejam no respectivo ledger imutável. Tanto a UI quanto os dois comandos de decisão aplicam essa fronteira antes de mostrar achados ou chamar a RPC privilegiada. Saída que alega origem em resposta não incluída é classificada como inválida, sem achados acionáveis e sem publicação; fonte ausente não é inventada. Registros de execução, respostas originais e decisões anteriores permanecem preservados.

**ESCOPO/TESTES:** `lib/supabase/data-access.ts`, página/ações da J7, testes unitários e de contrato e Playwright de MFA/RLS com fixtures sintéticas; o cenário novo cria duas execuções sobre a **mesma** Anamnese, mas com subconjuntos diferentes de fontes, validando a recusa de referência que não participou daquela execução. `Validate application`, `Validate J7 local AI review lifecycle browser` e regressão J6 exigidos no SHA do PR. **FORA DE ESCOPO:** migrations, schema, Supabase SaaS write, alteração de RLS/Auth, dado real, fornecedor de IA ou gate, diagnóstico, mensagens e protocolos. **RISCO/COMPATIBILIDADE:** registros históricos sem proveniência suficiente são apresentados como saída inválida para ação, nunca reinterpretados ou apagados; investigar o ledger com autorização apropriada antes de qualquer correção. Gate `OPENAI_HEALTH_DATA_PROCESSING_ENABLED` permanece fechado e homologação profissional conjunta continua pendente.

---

## 2026-10-19 — J7: conciliação de snapshots de decisões e próximos achados pendentes

**FATO CONFIRMADO:** cada ação de `ai_finding_actions` persiste `finding_index` e `finding_snapshot`; o histórico administrativo anterior associava a decisão exclusivamente pelo índice. O schema de produção mantém `UNIQUE (execution_id, finding_index)`, auditado por catálogo, e nenhum dado real foi consultado. **RISCO POTENCIAL (não incidente confirmado):** uma ação histórica órfã ou uma divergência no conteúdo de saída pode tornar o índice insuficiente para atribuir a decisão corretamente.

**DECISÃO TÉCNICA:** usar verificação determinística e exata dos campos permitidos do snapshot JSONB versus o achado validado (ordem das chaves do objeto irrelevante; ordem das fontes relevante). A interface só marca uma decisão como vinculada quando snapshot e índice conferem. Divergências e decisões sem saída válida são preservadas separadamente para auditoria, sem expor conteúdo bruto de saúde ou simular decisão; um índice já ocupado por registro divergente fica bloqueado a novas ações até conferência técnica. A UI mostra contagens factuais (decisões vinculadas e achados ainda sem ação) e navegação direta ao primeiro achado pendente, sem score clínico ou automação.

**GUARDA DE SERVIDOR ADICIONAL:** a validação do histórico antes era aplicada à interface; ações de servidor com identificadores vinculados diretamente poderiam alcançar a RPC privilegiada apenas com execução `completed` e índice numérico. Os dois comandos de decisão agora revalidam o resultado armazenado, sua submissão, fontes e índice no servidor, usando leituras autenticadas sob RLS antes de qualquer RPC com service role. Uma saída ausente, inválida, cruzada ou índice inexistente falha fechado, sem nota, decisão ou publicação. Recuperação humana de execução `started` permanece ação separada. Teste contratual afirma que a validação ocorre antes da mutação.

**OBJETIVO/ESCOPO:** concluir integridade e orientação operacional da J7. Arquivos: função pura de auditoria e testes unitários, página/CSS de revisão assistiva, testes de contrato e Playwright J7 com histórico **inteiramente sintético** divergente injetado somente pelo PostgreSQL local descartável, documentos de status. **FORA DE ESCOPO:** migrations aplicadas, schema, RLS/grants, Auth, Supabase SaaS write, provider OpenAI, credenciais, dados reais, diagnóstico, protocolo, comunicação ou publicação automática. **CRITÉRIOS/TESTES:** `Validate application`, `Validate J7 local AI review lifecycle browser` e regressão J6 verdes no SHA exato; evidência de que snapshot divergente não vira decisão legítima, não habilita formulário duplicado e permanece consultável; navegação mobile, AAL2 e acesso client-scoped mantidos. **PENDÊNCIAS:** gate contratual de processamento externo de saúde e homologação profissional conjunta continuam separados e fechados.

---

## 2026-10-19 — J7: autoria rastreável das decisões humanas sobre achados da IA

**FATO CONFIRMADO:** `ai_finding_actions.acted_by_profile_id` é uma FK para `profiles.id` e registra o ator da decisão sem modificar a saída da IA. Consulta somente de metadados confirmou que a política RLS de `profiles` permite ao admin AAL2 seu próprio perfil e perfis das clientes sob assignment, **não** uma lista indiscriminada de todas as profissionais. Não houve leitura ou alteração de dados reais.

**DECISÃO TÉCNICA:** a UI administrativa associa a cada ação já persistida sua data e o nome profissional **somente quando visível por RLS**, obtido por consulta autenticada separada após as ações client-scoped. Na ausência de nome autorizado, o texto é `Nome não disponível`; o identificador original `acted_by_profile_id` continua acessível num `details` recolhido para auditoria. O nome não pode substituir ou alterar o ID original, não é enviado à IA e não aparece na cliente. Consulta de atores usa lotes paginados e não utiliza service role. Não há novo direito de acesso, atribuição automática ou regra profissional.

**OBJETIVO/ESCOPO:** completar a autoria auditável da Anamnese assistida J7; arquivos: consulta read-only das ações de IA, apresentação/CSS, contratos de RLS e Playwright local sintético com MFA AAL2, status de jornada. **FORA DE ESCOPO:** Auth, schema, migrations, RLS/grants, credenciais, dados reais, provider/prompt OpenAI, comunicações, protocolos e publicações. **CRITÉRIOS/TESTES:** CI `Validate application`, `Validate J7 local AI review lifecycle browser`, TypeScript/build, RLS e teste sintético de autoria após observação/nota profissional; PR no SHA exato. Como o pacote toca `lib/ai` e E2E, exige merge específico conforme `AGENTS.md`. **RISCO:** nomes de outros atores podem estar corretamente ocultos pela política RLS; não inferir nomes a partir de IDs ou permissões adicionais. Homologação conjunta e gate de saúde continuam pendentes.

---

## 2026-10-19 — J7: navegação exata às fontes da IA e integridade das decisões

**FATO CONFIRMADO:** consulta somente ao catálogo do PostgreSQL do Projeto Corpo e Mente mostrou que a constraint vigente `ai_finding_actions_one_human_decision_per_finding` exige `UNIQUE (execution_id, finding_index)`. Isso não permite duas decisões humanas sobre o mesmo achado, mesmo se forem de tipos diferentes. A declaração anterior do PR #924 de que o banco permite múltiplas decisões para um achado estava incorreta; a apresentação defensiva do histórico é mantida sem mudança na constraint.

**ESCOPO:** achados de IA com fontes validadas oferecem navegação por UUID da pergunta para sua resposta original exata na mesma submissão autorizada; perguntas ausentes levam à pergunta correspondente, sem inventar uma resposta. A interface original tem âncoras identificáveis, destaque por alvo, foco e leitura mobile. O nome do cadastro profissional prioriza `clients.full_name`. Testes de contrato e Playwright local sintético exercitam os links.

**LIMITES E ACEITE:** nenhuma migration, RLS, Auth, alteração de banco ou saída original, dados reais, nova chamada OpenAI, protocolo, mensagem ou publicação automática. Gate de saúde continua fechado. Exigir `Validate application` e `Validate J7 local AI review lifecycle browser` verdes no SHA final antes de integrar. Homologação conjunta permanece pendente.

---

## 2026-10-19 — J7: preservar múltiplas decisões humanas sobre o mesmo achado

**FATO TÉCNICO:** a tabela `ai_finding_actions` permite registros de ações distintas (observação interna e anotação profissional) para um mesmo par execução/índice; a tela anterior usava `Map.set` com um único valor, apagando **apenas visualmente** uma decisão anterior quando ambas existiam. Os dados originais nunca foram apagados do banco.

**CORREÇÃO DE INTERFACE:** agrupar todas as ações persistidas por execução/achado, exibi-las individualmente em ordem do histórico com suas datas e os links da nota exata, indicar explicitamente quando houver mais de uma decisão e impedir novos botões quando já existir qualquer decisão. Não altera regras de unicidade nem permite que a IA aceite decisões.

**ESCOPO:** `app/admin/anamneses/[anamneseId]/ia/page.tsx`, teste de regressão `lib/operations/anamnesis-ai-review-guards.test.ts` e documentos de status. **FORA DE ESCOPO:** migrations, RLS, Auth, providers de IA, prompts, dados de saúde reais, regras profissionais, publicações e liberação a clientes. **ACEITE:** CI `Validate application` aprovado no commit exato, nenhuma ação passada descartada da UI, ausência de novas ações automáticas. Teste de navegador autenticado e homologação profissional permanecem separados.

---

## 2026-10-19 — J7: prova integrada local aprovada e PR #921 implantado

**FATOS CONFIRMADOS:** [PR #921](https://github.com/leandrosilveiradepaula/projeto-patty/pull/921) mergeado no `master` em `72fd2fbf076aa82e6bc489cc1c08f8936775ac51`. Os checks `Validate application`, `Validate method configuration foundation`, `Validate J6 local educational release lifecycle browser` e `Validate J7 local AI review lifecycle browser` terminaram em **success** no head exato revisado `316d9b24b477e8212a464fe643b238d139e3a698`. O deployment Vercel de produção desse merge foi confirmado como **READY**.

**ESCOPO EFETIVAMENTE TESTADO (local/descartável):** no Supabase local + Next.js local, com dados inteiramente sintéticos e TOTP MFA, o Playwright J7 validou análise sintética historizada, zero achados, saída com referência cruzada inválida, decisão profissional separada de aceitação/anotação, histórico original imutável, recuperação humana de execução iniciada, visão mobile e restrição de leitura a cliente/admin sem assignment. O resultado de acesso negado é conferido pela UI de `registro indisponível`, ausência de conteúdo sensível e RLS: o streaming Next.js pode retornar status HTTP 200 mesmo quando a Server Component renderiza not-found. A suíte pgTAP incluiu os 16 asserts existentes.

**ISOLAMENTO DA CORREÇÃO DE TESTES:** grants mínimos para `service_role` foram reproduzidos **somente** no Supabase descartável do runner para igualar os grants que já existem em produção; schema, RLS, roles `anon`/`authenticated` e SaaS não foram alterados. A execução requereu URL local fixa, recusou ambiente remoto, manteve `OPENAI_API_KEY` vazio e `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=false`. Sem dados reais, geração de protocolo, publicação ou liberações.

**CLASSIFICAÇÃO:** fundação técnica e teste integrado **implementados, testados, mergeados e publicados como código**. **J7 não homologada** e execução com dados reais não autorizada: pendem validação profissional no mobile e no ambiente real, autorização/verificação de retenção de dados de saúde do provider (ZDR/MAM ou equivalente aprovado), credenciais e aprovação da Patty, antes de habilitar a chamada externa. CI sintético não prova conformidade contratual de IA nem autoriza publicar conteúdo.

---

## 2026-10-19 — J7: teste de ciclo completo de revisão assistiva, local e sintético (PR em validação)

**OBJETIVO:** demonstrar o caminho de ponta a ponta da J7 sem ativar IA externa nem processar dados reais: Anamnese submetida em banco descartável → registros de execução e resultados exclusivamente sintéticos → leitura autenticada de admin com MFA AAL2 → decisões humanas separadas → persistência imutável → isolamento de acesso de outra conta e cliente.

**ESCOPO:** novo `e2e/j7-ai-review-lifecycle.spec.mjs` e workflow `.github/workflows/validate-j7-ai-review-browser.yml`, com identidade e formulário sintéticos criados somente no Supabase local `127.0.0.1:54321`, Next.js local `127.0.0.1:3000` e dados `@example.invalid`. A execução testa findings válidos, saída com array vazio, saída com fonte de outra cliente recusada na interface, execução `started` com recuperação profissional manual, aceitação como observação interna, criação de nota da Patty com link da revisão exata, histórico original preservado, MFA obrigatório, RLS, acesso negado a admin sem assignment e cliente não titular. Os comandos do teste recusam qualquer ambiente não local. Os únicos segredos disponíveis ao backend no CI são chaves **do banco descartável**, mascaradas pelo GitHub; `OPENAI_API_KEY` vazio e `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=false`.

**ARQUIVOS PERMITIDOS:** script Playwright J7, workflow J7, fixture pgTAP existente `supabase/tests/database/ai_execution_boundary.test.sql` e estes documentos de status/homologação. **FORA DO ESCOPO:** alterações em migrations, Supabase SaaS, Auth/RLS/políticas, schema, usuário/arquivo real, modelo/prompt da IA, envio de dados de saúde ao provider, liberação a cliente, publicação, diagnóstico e escolha de protocolo.

**CRITÉRIOS DE ACEITE:** `Validate application` e `Validate J7 local AI review lifecycle browser` aprovados no commit exato; a segunda suíte inclui pgTAP `ai_execution_boundary.test.sql` e Playwright com DB descartável, checa objeto persistido e suas permissões; sem registrar histórico de clientes reais. Resultado do teste de integração **a confirmar no GitHub Actions**; CI verde não é homologação profissional. A J7 como um todo continua com gate de saúde fechado e homologação conjunta pendente.

**RECONCILIAÇÃO DE TESTE EXISTENTE:** o primeiro run do PR encontrou uma fixture de pgTAP anterior ao endurecimento de `clients.status`/`clients.full_name`: `ai_execution_boundary.test.sql` tentava inserir cliente sem campos agora obrigatórios. A fixture foi atualizada para cliente sintética com `active` e nome, além de criar o prompt de teste como v2 para não colidir com o v1 real semeado. Nenhum schema/constraint ou política foi relaxado. Os 16 asserts originais foram preservados; rerun necessário.

**ACL LOCAL IDENTIFICADA NO PLAYWRIGHT:** A verificação de recuperação manual retornou SQLSTATE `42501` no runner: a role `service_role` do Supabase descartável não tinha grants de `SELECT/UPDATE` sobre `ai_executions` nem `SELECT` sobre `user_roles` e `client_assignments`, embora essas permissões estejam presentes no SaaS de produção (consulta de metadados, sem acessar linhas). O workflow aplica **somente ao contêiner `supabase_db_projeto-patty`**, com URL obrigatória `127.0.0.1:54321`, os grants mínimos do backend para igualar a produção, incluindo leitura das tabelas `ai_execution_outputs` e `ai_execution_failure_responses` consultadas pelo trigger de integridade da execução. Há verificações fail-closed de `service_role` BYPASSRLS e proibição de `UPDATE` para `anon`/`authenticated`. Nenhuma migration, RLS ou permissão de produção foi alterada. Confirmação do teste completo ainda depende do próximo CI.

**RISCOS:** alteração em workflow e testes de segurança/IA exige integração específica conforme `AGENTS.md`. O teste manipula dados sintéticos diretamente no DB descartável para simular saída histórica sem chamar provider; isso não equivale a aceitar uma resposta OpenAI real. A versão aprovada de qualquer protocolo ou conteúdo continua sob controle humano.

---

## 2026-10-19 — J7: auditabilidade visível das decisões humanas

**ESCOPO:** o histórico da IA exibe estados de execução em português e a data registrada de cada decisão profissional já persistida, ao lado da observação aceita ou anotação criada. A fonte da data é `ai_finding_actions.created_at`; datas legadas inválidas usam fallback neutro. A saída original permanece imutável.

**FORA DE ESCOPO:** nenhuma alteração em banco, RLS, Auth, execução de IA, modelo, gate de saúde, textos originais, publicações, atribuições ou liberações. Testes apenas sintéticos. O gate de dados reais permanece fechado. **CRITÉRIOS:** CI verde no SHA exato, data exibida somente para ação humana existente, nenhuma inferência de resultado ou decisão. Homologação profissional continua conjunta.

---

## 2026-10-19 — Início técnico da J7: Anamnese assistida por IA, revisão humana e histórico auditável

**ESCOPO TÉCNICO PROPOSTO (não regra profissional):** após a J6, a J7 fica delimitada à análise assistiva da Anamnese e às decisões internas da Patty. O fluxo-alvo é Anamnese originalmente submetida → contexto minimizado → execução assistiva somente quando o gate externo estiver autorizado → saída validada e historizada → achados exibidos em separado → observação/anotação da Patty independente → auditoria. **A IA nunca publica, diagnostica, decide fase, cria protocolo ou envia comunicação automática.**

**PRIMEIRO PACOTE:** tratar a visualização do histórico sem confundir três casos diferentes: (1) execução `completed` com `findings: []` válido, (2) `completed` sem output persistido e (3) output inválido, inconsistente ou com referências fora da Anamnese. Somente o primeiro e resultados válidos com achados podem aparecer como revisão concluída. Estados `started`/`failed` jamais oferecem aceitação de achados. Referências precisam pertencer à Anamnese acessível e sua versão. A tela administrativa prioriza `clients.full_name` sobre o fallback de Profile e usa data neutra quando o histórico legível contém data inválida. Quando um achado já gerou uma anotação humana, a UI oferece link para a nota exata no histórico profissional autorizado (sem colocar texto sensível na URL). A saída original não é sobrescrita; mudanças são de apresentação, parser determinístico e testes.

**ESCOPO/ARQUIVOS:** `lib/ai/anamnesis-review-history.ts` e testes unitários, `app/admin/anamneses/[anamneseId]/ia/page.tsx`, contrato de regressão `lib/operations/anamnesis-ai-review-guards.test.ts` e esta documentação. O parser reutiliza o validador determinístico existente, conferindo posse dos IDs de fontes e perguntas; **não reinterpreta a aplicabilidade clínica histórica**, que já foi validada na execução original.

**FORA DO ESCOPO:** nenhum dado real ou chamada nova à OpenAI; nenhuma mudança em schema, RLS, Auth, permissões, migrations, segredos, prompt, modelo, cálculos nutricionais, IA-publicação, liberação a clientes ou dados históricos. `OPENAI_HEALTH_DATA_PROCESSING_ENABLED` permanece desabilitado para dados reais, conforme `docs/OPENAI_HEALTH_DATA_GATE.md`.

**CRITÉRIOS/TESTES:** CI `Validate application`, `test:ai`, `test:operations`, typecheck e build no SHA exato; fixtures sintéticas para `ready`, `missing_output`, `invalid_output`, `not_completed`, IDs cruzados, histórico cronologicamente inválido e ausência de ação automática. Registro de testes ≠ deploy nem homologação. O restante da J7 ainda requer integração browser → API → dados → interface e validação com contas autorizadas, sem usar dados reais antes do gate.

**RISCOS E PENDÊNCIAS:** a J7 não estava numerada nos documentos anteriores; esta é **decisão técnica de planejamento**, não fase do método da Patty. A política de retenção efetiva da organização/projeto OpenAI (ZDR/MAM), elegibilidade do modelo, credenciais de produção e aprovação humana explícita continuam abertas. Qualquer PR que toque os controles de IA/dados de saúde deve seguir a exigência de merge específico de `AGENTS.md`. Homologação profissional permanece conjunta ao final das jornadas.

---

## 2026-10-19 — J6: reprodução inline e avanço do vídeo confirmados na interface de produção (homologação conjunta pendente)

**EVIDÊNCIA OBSERVADA:** após o merge do [PR #917](https://github.com/leandrosilveiradepaula/projeto-patty/pull/917), commit `c9317f80ae4f627917d7c4fc8960650bd5966e31`, o deployment da Vercel foi confirmado como `READY`. A captura compartilhada pelo operador mostra o player HTML5 do asset `primary` reproduzindo no próprio aplicativo (posição `0:01` de `2:21`) e botão de download separado. Em seguida, o operador confirmou explicitamente **“Functional”** em resposta ao teste de avançar a reprodução para aproximadamente `1:10`. A confirmação é suficiente como evidência operacional relatada de **reprodução e busca no navegador** naquela sessão, mas **não** equivale a inspeção independente dos headers HTTP `206 Content-Range`, prova de isolamento de cliente em produção ou aceite profissional.

**CONFERÊNCIA REMOTA NO MESMO DIA:** Vercel `projeto-patty-blob` segue **privado e disponível**, com 1 objeto / 123.262.796 bytes. Supabase: 1 asset associado à versão `ae45c5db-e6af-46db-9230-b05bc4f5a5bd`; migration J6 `20261018143000` registrada, versão **não publicada**, **0 client releases**. Os workflows `Validate application` e `Validate J6 local educational release lifecycle browser` passaram no PR #917; o último usa apenas dados sintéticos e não prova mídia real. A interface estava identificada como `E2E Admin` na captura: **não presumir que a sessão é a conta profissional real da Patty**.

**CLASSIFICAÇÃO:** fluxo técnico do vídeo (upload, integridade, registro, visualização, avanço) concluído na sessão observada; **J6 implantada tecnicamente com ressalvas de aceite**. Permanecem para a homologação conjunta: login da Patty com MFA, cliente autorizada x terceira cliente, verificação de acesso/Range em produção com instrumentação quando necessário, mobile, publicação e liberação por decisão humana. **Não publicar, liberar ou homologar automaticamente.** O original no Drive permanece preservado.

---

## 2026-10-19 — J6: player para vídeo educacional privado (validação da reprodução pendente)

**FATO OBSERVADO:** após upload do MP4 de 123.262.796 bytes ao Vercel Blob privado e registro do asset `primary`, o link administrativo **Abrir arquivo privado** iniciou o download do MP4 no navegador. Isso comprova acesso ao arquivo naquela sessão, **não** comprova reprodução inline nem busca/Range. O arquivo permanece no store `projeto-patty-blob` privado, a versão 1 permanece **rascunho**, sem publicação nem liberações a clientes.

**DECISÃO TÉCNICA DE INTERFACE:** apresentar um player HTML5 (`video controls`, `playsInline`, `preload="none"`) para assets cujo MIME registrado seja `video/mp4`, tanto na página administrativa como, futuramente, apenas na lista das versões explicitamente liberadas para a própria cliente. Manter o download como opção separada e usar **somente** as rotas autenticadas `/admin/conteudos/assets/[assetId]` e `/cliente/conteudos/assets/[assetId]`, que já exigem role, RLS e acesso à versão correta antes de redirecionar ao link Blob privado temporário. Sem novas URLs públicas, sem alterar Auth/RLS, sem migração, sem novas permissões, sem reupload, sem publicação/release.

**CRITÉRIOS / TESTES / LIMITES:** testes de estrutura garantem fontes internas e carregamento sob demanda; a suíte de navegador J6 usa **apenas metadados sintéticos com objeto inexistente** para verificar a exibição do player em admin/cliente autorizada e negar acesso a terceira cliente. O teste com Blob real requer Play no novo player e avanço do vídeo em sessão administrativa legítima na Vercel após deploy, incluindo verificação observável de Range/seek. **Não** declarar reprodução técnica aprovada ou homologação profissional antes dessa evidência. Homologação conjunta permanece ao final das jornadas.

---

## 2026-10-19 — J6: vídeo privado enviado e asset registrado (reprodução pendente)

**FATOS CONFERIDOS EM PRODUÇÃO:** upload autenticado de `MovaviClips_Video_20220217-143151.mp4` para o store privado Vercel `projeto-patty-blob` (região `iad1`) concluído; o store mostra **1 objeto**, total **123.262.796 bytes**. A versão `ae45c5db-e6af-46db-9230-b05bc4f5a5bd` tem **1 asset `primary` registrado** no Supabase, com path real `educational/81cc75c9-8c68-471e-856c-54fe588f62e4.mp4`, MIME `video/mp4`, 123.262.796 bytes, SHA-256 `ee05d6c12ea02db283234f5d69a09ff60c4d831183fe6715d7aa9848e76905b1`, idêntico ao original aprovado no Google Drive. A ação de registro da aplicação exige autorização de admin e, para novo asset, chama `verifyPrivateBlobAsset`, que verifica o objeto privado por GET e recalcula digest, assinatura MP4 e tamanho antes de inserir os metadados. O manifesto `docs/educational_media_migration_batch_1.json` registra o path realmente gerado e preserva o path inicialmente planejado.

**LIMITES DO ACEITE:** versão **ainda em rascunho**, **0 publicações**, **0 liberações para clientes**. O screenshot do operador mostra sessão identificada como `E2E Admin`; **não** tratar como aceite profissional da Patty ou homologação. Ainda falta verificar o link **Abrir arquivo privado** em sessão administrativa legítima, reprodução e busca/Range do vídeo e, na rodada conjunta posterior, autorização/isolamento de clientes. Não executar publicação ou liberação para fabricar teste. A mídia original continua preservada no Drive. **Implantação do binário e registro técnico concluídos; entrega autenticada real e homologação profissional pendentes.**

---

## 2026-10-18 — J6: merge, Vercel e migration de RLS aplicados (mídia privada pendente)

**FATOS CONFIRMADOS:** PR [#911](https://github.com/leandrosilveiradepaula/projeto-patty/pull/911) integrado ao `master` no commit `4802f2ef72f555d59a0e9d12cde9c873f1b221cb`. GitHub Actions `Validate application` e prévia `Deploy Supabase migrations` passaram no SHA integrado ([validação](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39169643192), [prévia](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39169643195)); o status `Vercel` no GitHub é `success` para esse SHA. Esse status não substitui um teste do vídeo em produção.

**BANCO APLICADO E CONFERIDO:** SQL exato do arquivo `supabase/migrations/20261018143000_fix_client_content_releases_insert_rls_recursion.sql` aplicado com sucesso ao Supabase SaaS `hqanoskwjvpbgavppcud` pela integração administrativa. O mecanismo de aplicação registrou inicialmente a versão temporal `20261019004359`; após conferir nome, comprimento e digest do SQL, o histórico oficial foi reconciliado de forma condicional para a versão do repositório `20261018143000`. O catálogo remoto confirma **90 migrations**, uma entrada J6 correspondente ao arquivo, função privada `SECURITY INVOKER`, RLS ativa em versões/assets/liberações, MFA `RESTRICTIVE`, autoria, assignment vigente, grants mínimos e trigger de publicação/asset ativo. Nenhuma cliente ou conteúdo foi alterado para teste; zero assets e zero liberações no SaaS.

**PENDÊNCIA PARA IMPLANTAÇÃO TÉCNICA INTEGRAL:** transferência do vídeo aprovado ao Vercel Blob privado, verificação de tamanho/MIME/SHA-256 no objeto destino e entrega autenticada/isolamento/Range/reprodução. A integração operacional Vercel ainda não estava conectada no ChatGPT no momento desta consulta; **não** declarar mídia migrada, J6 integralmente implantada ou homologada. Publicação e liberação de conteúdos reais permanecem decisões exclusivas da Patty. Homologação profissional será conjunta após as jornadas.

---

## Decisão operacional de 2026-10-18 — homologação profissional conjunta

A decisão do responsável é realizar a homologação profissional em uma **rodada única após completar as jornadas técnicas**, inclusive J6. Os roteiros existentes abaixo continuam válidos, mas **não são executados nem considerados aprovados antecipadamente**. A execução futura exige sessão real da Patty com MFA, autorização de cliente, visualização mobile, validação de releases/versões e aceite específico por jornada; não registrar dados pessoais nos artefatos.

**Gates técnicos continuam obrigatórios antes da rodada conjunta:** CI no SHA final, revisão específica de RLS/workflows/segurança, merge elegível, migration aplicada e conferida no SaaS quando pertinente, Vercel deployment concluído e prova da entrega de arquivos privados com integridade. A decisão de adiar homologação profissional **não** autoriza a IA a publicar conteúdos, criar clientes de teste em produção nem passar por cima de autorização humana para mudanças sensíveis.

**Controle:** J1 e J2 encerradas para avanço; J3/J4/J5 mantêm seus estados técnicos descritos; J6 depende do PR #911, migration e vídeo real para fechamento de implantação. Nenhuma jornada é reclassificada como homologada sem evidência da sessão conjunta.

---

## J6 — Biblioteca educacional: versões e liberação por cliente (validação em branch, 2026-10-18)

**OBJETIVO:** Patty cria rascunho → revisa e publica a versão conscientemente → asset privado verificado deve acompanhar liberação → Patty seleciona versão exata e cliente atribuída → cliente vê somente o liberado → versões futuras não alteram releases anteriores. Nenhuma liberação por fase, progresso implícito ou publicação por IA.

**TESTE LOCAL EXECUTADO NO SHA DE CÓDIGO `01df05c8`:** PR [#911](https://github.com/leandrosilveiradepaula/projeto-patty/pull/911), `e2e/j6-educational-release-lifecycle.spec.mjs` e `.github/workflows/validate-j6-educational-release-browser.yml`. UI/admin e cliente autenticados, MFA AAL2, assignment, isolamento RLS, histórico e mobile foram exercitados com Supabase/Next.js descartáveis. [J6 #39136636563](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39136636563) PASS. O ramo positivo utiliza **somente metadados sintéticos** em `educational_content_assets` com path inexistente no Blob; verifica autorização/registro da liberação, não upload, bytes reais, SHA-256, licenciamento ou entrega de mídia. O ramo sem asset bloqueia release, e a rota privada de arquivo inexistente devolve 404.

**ACEITAÇÃO TÉCNICA PARCIAL COMPROVADA:** [Validate application #39136636582](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39136636582) PASS; [fundação banco #39136636562](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39136636562) PASS; [pgTAP + Playwright J6 #39136636563](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39136636563) PASS, 23 asserts pgTAP e Playwright 1/1 (16,6s), com teardown `supabase stop --no-backup`. Rascunhos e versões publicadas não liberadas não aparecem para a cliente; admin sem assignment e cliente terceira não acessam releases; admin precisa AAL2; apenas a v2 manualmente liberada é visível; v1/v3 não são liberadas automaticamente. Estes são resultados do SHA de código `01df05c820bc6dfb79dbde53077373d17cb291ba`; o commit documental posterior deve ter seu próprio CI confirmado.

**CORREÇÃO DE RLS VALIDADA NO BANCO DESCARTÁVEL:** o INSERT em `client_content_releases` reproduziu recursão de policy via `educational_content_versions` no ambiente local e foi corrigido pela migration `20261018143000_fix_client_content_releases_insert_rls_recursion.sql`. A função privada de consulta é PL/pgSQL `SECURITY INVOKER`, preservando RLS; publicação, autor `auth.uid()`, admin, assignment ativo, MFA AAL2, trigger e grants de tabelas permanecem. Teste pgTAP e Playwright autenticado passaram no SHA `01df05c8`, com acesso negado a não titulares e profissionais sem assignment. **Migration não aplicada ao SaaS e revisão humana específica de SQL/RLS ainda pendente.**

**DEFESA EM PROFUNDIDADE COMPROVADA (SHA de código `746f8e42fd9bab4dd8a9eb569c409de0b14b5d8f`):** [Validate application #39156822166](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39156822166), [fundação #39156822160](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39156822160) e [J6 #39156822151](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39156822151) **PASS**; 26 asserts pgTAP e Playwright 1/1 (17,9 s), teardown descartável concluído. O trigger existente exige versão publicada e asset registrado também em INSERT direto (`23514`); fixture publicada sem asset e fixture publicada com asset são independentes, provando negação por falta de arquivo e por RLS/MFA/assignment/autoria sem confundir SQLSTATE. A correção mantém `SECURITY INVOKER`, sem novas permissões nem mudança de liberações históricas. Metadata sintética **não equivale** a upload, integridade física ou direitos/licenciamento. A revisão humana de migration e workflow e todos os gates de produção permanecem.

**SEGUNDA LIBERAÇÃO MANUAL NA MESMA TELA — REGRESSÃO CORRIGIDA E VALIDADA EM CÓDIGO `7137b018`:** o estado de sucesso da primeira Server Action antes mantinha a seleção administrativa bloqueada; a form agora é reinicializada com a mudança do histórico de releases autorizado (`client.id` + quantidade de releases), mantendo confirmação independente a cada ação. O teste Playwright mobile acrescenta um segundo conteúdo publicado com asset **somente sintético** em banco descartável; após liberar v2 do primeiro conteúdo, o admin seleciona, revisa e libera o segundo, sem reload manual; a cliente vê ambos, a terceira cliente e profissional sem assignment permanecem isolados, e v3 publicada posteriormente não substitui nem libera nada automaticamente. [J6 #39160246149](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39160246149) PASS em 17,1 s, 26 pgTAP e teardown sem backup; [Validate #39160246147](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39160246147) e [fundação #39160246174](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39160246174) PASS. Estes são resultados do SHA de código `7137b018c23c450d7c760cd1fdebfd144a4fa600`, anterior à reconciliação documental. Sem validação de bytes/Blob reais, direitos ou uso em produção.

**FONTE DE MÍDIA VERIFICADA EM 2026-10-18, SEM DISTRIBUIÇÃO:** download read-only do original aprovado `MovaviClips_Video_20220217-143151.mp4` e SHA-256 recomputado de todos os 123.262.796 bytes (`ee05d6c12ea02db283234f5d69a09ff60c4d831183fe6715d7aa9848e76905b1`), igual ao hash esperado. `video/mp4`, arquivo original preservado. Verificação de catálogo SaaS: rascunho v1 identificado, não publicado, zero asset e zero release. **Não** houve upload Vercel, verificação do Blob de destino, publicação ou liberação; o conteúdo real permanece fora da homologação da J6. O manifesto preserva esta evidência de pré-transferência.

**PENDÊNCIA DE HOMOLOGAÇÃO INTEGRAL:** revisão humana específica **da migration RLS e do workflow** antes do merge; aplicação posterior e controlada da migration no Supabase SaaS; cópia autorizada e privada do material ao Vercel Blob; conferência de SHA-256/tamanho/MIME real, direitos/licenciamento e entrega do vídeo original de 123.262.796 bytes; versão e liberação reais aprovadas pela Patty, sessão legítima de cliente em mobile e aceite profissional. O PR não faz uploads, não contorna verificação e **J6 permanece NÃO HOMOLOGADA**. Não criar identidades de teste ou conteúdos fictícios em produção.

---

## J5 — Treino individual: integrado, migration aplicada, homologação profissional pendente (2026-10-18)

**OBJETIVO E FLUXO:** cliente solicita treino na própria sessão → Patty/admin com MFA AAL2 cria versão manual com exercício → revisão explícita → publicação deliberada da versão exata → cliente acessa somente o publicado → v2 independente pode copiar exercícios da v1 sem alterá-la, exige nova revisão/publicação e mantém histórico. Nenhuma decisão profissional é automatizada.

**EVIDÊNCIAS INTEGRADAS:** PR [#909](https://github.com/leandrosilveiradepaula/projeto-patty/pull/909) mergeado no `master` `2c363c98687c7dd14745f39a91bf9e3ec509c4c6`; [Validate pós-merge #39132547136](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39132547136) PASS e Vercel `success` nesse commit. Head pré-merge `d7839c02`: [Validate #39085576486](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39085576486), [foundation #39085576477](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39085576477) e [Playwright J5 #39085576476](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39085576476) PASS, 1 teste em 17,2s, limpeza local concluída. O navegador móvel e as sessões sintéticas testaram MFA, assignment, titular/terceira, rascunho, revisão, publicação e histórico. Duas criações simultâneas por AAL2 autorizado resultaram em somente uma versão v3, com a segunda negada por draft aberto; outro admin sem assignment foi negado.

**MIGRATION DE CORREÇÃO APLICADA EM 2026-10-18:** `20261018005000_fix_training_draft_concurrency_lock.sql` está presente no Supabase SaaS Projeto Corpo e Mente; número oficial reconciliado (sem duplicatas, 89 versões locais e remotas). A RPC anteriormente usava `SELECT FOR UPDATE` em tabela sem grant UPDATE para `authenticated` (`42501`). Substituída por `pg_advisory_xact_lock` transacional por cliente, mantendo `SECURITY INVOKER`, RLS, MFA, assignments e privilégio UPDATE negado. Verificação pós-apply foi de metadados, sem acessar dados de clientes. O workflow [#39132547148](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39132547148) foi somente dry-run.

**HOMOLOGAÇÃO PROFISSIONAL PENDENTE — roteiro:**
1. Patty acessa o aplicativo publicado com sua sessão pessoal e MFA; confirmar a versão publicada do sistema sem compartilhar senha, TOTP ou cookies.
2. Em uma necessidade legítima de treino de uma cliente sob assignment vigente, conferir solicitação, campos do rascunho, inclusão/edição de exercícios e preservação do conteúdo.
3. Revisar e publicar somente quando a Patty decidir profissionalmente; a cliente autorizada deverá ver apenas a versão exata liberada. Sem publicar artificialmente para testar.
4. Caso haja versão posterior legítima, confirmar cópia explícita, independência das versões, manutenção do histórico e isolamento dos rascunhos.
5. Conferir em mobile com sessão autorizada da cliente; se a sessão não estiver disponível, registrar **não executado**, não PASS. Não expor dados de saúde em relatórios/tickets.
6. Registrar aceite com data, operador, SHA implantado e evidências sem dados pessoais; não confundir CI sintético, merge/deploy, migration aplicada e homologação.

**STATUS:** implementação, CI local, merge/deploy e migration aplicados. **J5 NÃO HOMOLOGADA PROFISSIONALMENTE**. Qualquer alteração futura de método/treino exige regra confirmada pela Patty e documentação antes de automação.

---

## J4 — Protocolo alimentar: integrado e aplicado; homologação profissional pendente (2026-10-17)

**OBJETIVO:** comprovar o percurso profissional existente: criar versão alimentar manualmente → montar plano, refeição e doses → submeter para revisão → aprovação explícita → publicação da versão exata → cliente vê apenas o publicado → clonar v2 independente e preservar v1/histórico. IA não toma decisões de protocolo nem publica.

**ESTADO TÉCNICO VERIFICADO:** PR [#907](https://github.com/leandrosilveiradepaula/projeto-patty/pull/907) mergeado no `master` `5fce2a6820a80324af987a6cc2d9863cb72f7a63`, deployment Vercel `success` nesse SHA e [Validate pós-merge #39071270975](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39071270975) PASS. No HEAD de desenvolvimento `a7b19184`, [Validate #39070861589](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39070861589), [foundation #39070861627](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39070861627) e [Playwright J4 #39070861572](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39070861572) passaram. O teste Playwright (38,4s, banco local descartado) percorreu v1/v2, revisão/aprovação/publicação humanas, mobile sintético, MFA AAL1/AAL2, cliente titular/terceira, admin sem assignment e revogação de assignment antes ativo. Esses resultados **não** comprovam a operação profissional na produção.

**MIGRATION EM PRODUÇÃO (2026-10-17):** `20261017203000_optimize_meal_dose_select_rls.sql` foi aplicada diretamente via integração administrativa autorizada no Supabase SaaS Projeto Corpo e Mente, com versão reconciliada para corresponder ao repositório. A execução GitHub Actions [#39071270929](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39071270929) foi somente prévia, não aplicou a migration. Registro remoto existe uma vez; 88 versões remotas = 88 locais. A função `app_private.can_select_meal_doses_for_meal` é `SECURITY INVOKER`, delega `SELECT` à policy de `meals`; RLS, policy MFA `RESTRICTIVE`, grants (`anon` negado) e policies de INSERT/UPDATE/DELETE foram conferidos. `EXPLAIN` autenticado com IDs fictícios e sem executar linhas retornou custo estimado `6,74`, índice de `meal_id`, sem timeout em 4s. Esse valor não é benchmark de uso real.

**HOMOLOGAÇÃO PROFISSIONAL PENDENTE — roteiro mínimo, somente em operação legítima:**

1. **Identidade e versão:** confirmar que o ambiente publicado corresponde ao commit autorizado; Patty entra com sua conta administrativa pessoal, completa MFA AAL2, sem compartilhar senha/TOTP ou fornecer credenciais para CI.
2. **Cliente autorizada:** selecionar uma cliente real sob assignment vigente e com necessidade legítima de protocolo; não criar clientes fictícias/admins de teste em produção e não copiar dados sensíveis para tickets, logs ou capturas públicas.
3. **Rascunho e revisão:** quando houver atividade profissional apropriada, criar/editar um rascunho legítimo; verificar salvamento de variação, refeições/doses e vínculo da versão; submeter e conferir que o conteúdo ainda não foi publicado. Aprovação e publicação dependem exclusivamente da Patty.
4. **Publicação e histórico:** somente se a Patty decidir publicar de fato, confirmar versão exata aprovada, visibilidade da cliente autorizada, isolamento de rascunho/v2 e preservação da versão anterior. Não alterar um protocolo vigente apenas para criar evidência de teste.
5. **Acesso e mobile:** na sessão legítima da cliente, quando disponível e autorizado, conferir exibição em tela móvel e ausência de dados de outra cliente; se essa sessão não estiver disponível, marcar a validação como **não executada** — nunca simulá-la com service role ou credenciais da Patty.
6. **Registro do aceite:** registrar operador, data, SHA publicado, observações não sensíveis, etapas feitas/não feitas e aceite explícito da Patty no controle apropriado; preservar IDs e dados de saúde apenas na aplicação privada.

**CLASSIFICAÇÃO:** J4 tem código implementado, CI técnico local aprovado, merge, deploy e migration aplicada, porém **NÃO HOMOLOGADA PROFISSIONALMENTE**. Não inventar regras nutricionais, não publicar por IA, não alterar Auth/RLS para facilitar o aceite. Pendências e controle: [PROJECT_STATUS.md](./PROJECT_STATUS.md).

---


## J3 — Evolução, reavaliações e comparação histórica: CI local aprovado e código publicado (2026-10-17)

**FATO ATUAL CONFIRMADO:** os PRs #902 a [#906](https://github.com/leandrosilveiradepaula/projeto-patty/pull/906) foram mergeados no `master`. No HEAD `df1d3cff` do PR #906, [Validate #38921177840](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38921177840) e [Playwright J3 #38921178037](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38921178037) passaram. Merge commit `affe5b727150f15e359a24811890f06a781bac52` teve deployment Vercel `success`. Evidências históricas posteriores intituladas "em validação" retratam o estado anterior à integração, não a situação vigente.

**ESCOPO VALIDADO NO AMBIENTE SINTÉTICO:** evolução filtrada → avaliação específica → retorno com filtro, comparação de duas avaliações finalizadas, medidas corrigidas em trilha auditável, seleção de fotos privadas das duas avaliações, navegação ao detalhe e volta ao par/fotos, leitura sob RLS/MFA, cliente terceira/admin sem assignment bloqueados, sem publicação clínica ou mutação de protocolos. Supabase local descartado; fotos PNG e identidades exclusivamente sintéticas.

**HOMOLOGAÇÃO PROFISSIONAL AINDA PENDENTE:** sessão legítima da Patty com MFA e contexto de cliente autorizado no site publicado, conferência mobile de comparação e fotos privadas, navegação/retorno, preservação de original/correção e registro do aceite. Não criar clientes fictícias nem exportar imagens de saúde para logs/tickets; se não for possível verificar a etapa, registrar como não executada, não como PASS.


---

## J2 — Feedback Semanal e acompanhamento profissional: pronta para homologação técnica do percurso principal (2026-10-16)

**CLASSIFICAÇÃO:** implementada, E2E local autenticado aprovado, mergeada e publicada; **homologação profissional em produção ainda NÃO executada**. Este bloco é o estado atual e substitui anotações históricas abaixo intituladas “em validação”, sem reescrever as evidências da época.

| Dimensão | Evidência confirmada | Estado |
| --- | --- | --- |
| Código integrado | PRs #898, #899 e #900 mergeados; `master` `266ffba76f52b79383dcc0686a4000a174a0ce87` | INTEGRADO |
| Validação do #900 | `Validate application` [run 38898606333](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38898606333) no HEAD `4c81f4459cb84a075d2f1eb7b6e0ae205d68468b` | PASS |
| Fluxo autenticado | [Playwright J2 38898606608](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38898606608): admin com MFA, cliente sintética no celular, isolamento por assignment/RLS, histórico, avaliação manual, geração agendada e lembrete in-app; banco local descartado | PASS LOCAL, NÃO HOMOLOGAÇÃO |
| Pós-merge | [Validate 38899139789](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38899139789) e [onboarding smoke 38899190943](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38899190943) no mesmo SHA do `master` | PASS |
| Runtime | Status GitHub `Vercel: success — Deployment has completed` no `master` `266ffba7` | PUBLICADO |
| RPC de preferência | Consulta **somente leitura** a privilégios no catálogo de produção: `service_role` autorizado na função e tabelas necessárias; `anon` e `authenticated` sem EXECUTE na RPC | METADADOS CONFERIDOS, SEM TESTE DE ESCRITA REAL |
| Aprovação da Patty | Sessão e aceite profissional no runtime publicado | **PENDENTE** |

**Início do percurso:** após primeira publicação legítima de protocolo, Patty solicita Feedback Semanal ou a agenda versionada cria a semana anterior. **Fim do percurso:** cliente responde e envia; Patty consulta o registro original, compara semanas sem interpretação clínica, registra decisão manual na avaliação existente ou cria rascunho conscientemente, preserva contexto, autoria e histórico. Um lembrete in-app de quarta-feira para solicitação agendada e ainda pendente é evidência de disponibilidade no aplicativo, não leitura da cliente.

**Checklist mínimo ainda pendente, a executar pela profissional:** (1) confirmar que a versão publicada permanece a esperada e entrar com sua própria sessão administrativa/MFA; (2) percorrer uma solicitação elegível e a visão móvel autorizada da cliente, sem compartilhar credenciais ou inserir fixture sintética em produção; (3) conferir rascunho, envio definitivo, recebimento e histórico da semana exata; (4) verificar comparação, persistência da decisão manual e retorno ao filtro sem alterar protocolo; (5) conferir permissão negada a perfis sem assignment em ambiente de teste seguro; (6) observar aviso agendado e canal configurado quando houver solicitação real elegível, distinguindo ausência de evento de falha; (7) registrar quem executou, data, SHA, resultado e pendências, com aceite explícito da Patty. Nunca tratar CI, credenciais de serviço ou dados reais improvisados como substitutos desse processo.

**Limites conhecidos / fora de escopo:** email depende de SMTP/configuração e validação de entrega externa; WhatsApp não tem provedor ativado. Não inferir revisão profissional concluída, classificação de adesão, suspensão de atendimento, diagnóstico, mudança de fase ou publicação automática. Regras e perguntas profissionais ainda abertas em `docs/WEEKLY_FEEDBACK.md` e `docs/OPEN_QUESTIONS.md` não são fechadas por este aceite. O PR #900 concedeu os privilégios estritamente necessários **somente ao PostgreSQL descartável do runner**, sem modificar migrations ou permissões de produção.

---
## 2026-10-16 — J2: da comparação filtrada à decisão profissional e retorno (em validação)

**OBJETIVO:** na análise factual, Patty abre uma avaliação previamente finalizada e decide manualmente usando o formulário de acompanhamento já existente, podendo voltar à mesma dupla de semanas com a visualização *Somente respostas diferentes* preservada. A ação não vincula automaticamente o feedback à decisão e não indica revisão concluída; decisão, motivo e observações ficam no histórico da avaliação, não nas respostas originais.

**CRITÉRIOS DE ACEITAÇÃO TÉCNICA:** helper de navegação aceita somente IDs válidos e estado da visualização em whitelist. Filtragem ambígua ou adulterada não gera redirecionamento nem amplia acesso. Playwright autenticado local cria a cliente/protocolo e dois feedbacks sintéticos, prepara avaliação finalizada **exclusivamente como fixture** no Supabase descartável, submete ambos os feedbacks pela UI, compara as semanas, seleciona visualização de respostas diferentes, abre avaliação com MFA, registra decisão manual e justifica, verifica persistência, volta ao mesmo par e confirma filtro, ausência de publicação adicional e negação a administrador sem assignment. A limpeza local é obrigatória. O CI `Validate application` e `weekly-feedback-browser` deve passar no commit exato.

**ESTADO:** implementação em branch ainda não integrada, testada no CI, publicada ou homologada. PR #897 foi mergeado no `master` `049dae99`; status Vercel deste SHA: rate limit, não publicado. Homologação real por Patty continua pendente mesmo que o E2E sintético passe.

---

## 2026-10-16 — J2: seleção histórica explícita para comparação (branch em teste)

A comparação atual oferece a semana submetida anterior mais próxima. A melhoria proposta permite abrir o histórico original de uma semana enviada, escolher outro período anterior também submetido e comparar exatamente os dois registros, sem mudar dados ou estado profissional. A lista deriva somente da cliente autorizada e não inclui rascunhos, outras clientes, semanas iguais ou posteriores. A comparação continua revalidando UUIDs, client ID, `submitted_at` e ordem de períodos via consulta exata RLS/MFA. Para versões diferentes do questionário, não realizar correspondência entre perguntas. Respostas não aparecem em URLs ou no seletor.

**CRITÉRIOS:** (1) teste unitário garante ordem decrescente de períodos anteriores, exclusão de rascunho/outra cliente/semana igual/futura e não alteração da entrada; (2) E2E com duas semanas sintéticas submetidas via UI prova escolha consciente por formulário GET, acesso profissional e ausência de respostas na URL; (3) testes já existentes da comparação e de permissões seguem verdes; (4) Supabase de testes é descartado e a homologação em produção permanece pendente. **Status:** implementação em branch, ainda sem checks, merge ou deployment. O PR #896 foi mergeado em `deaf6f31`, com CI pós-merge e Vercel aprovados.

---

## 2026-10-16 — J2: identificar diferenças textuais entre semanas sem decisão automatizada (em validação)

**ESCOPO DA MELHORIA:** duas respostas de cliente, ambas definitivamente submetidas e autorizadas pela RLS/admin MFA, podem ser exibidas com todas as perguntas ou somente aquelas cujos textos originais diferem. A versão do questionário deve coincidir; caso contrário, preservar enunciados históricos independentes sem comparar nem produzir contagem. A contagem é estritamente factual, **não score de adesão, classificação clínica, revisão ou recomendação**. A Patty escolhe manualmente qualquer avaliação posterior; não se registra revisão nem mudança de protocolo.

**TESTE REQUERIDO:** criar duas solicitações pela UI autenticada; enviar cada uma com respostas sintéticas ao mesmo questionário versionado, variando apenas a questão sintética `q17`; confirmar persistência de ambas; visualizar 21 perguntas, ativar "Somente respostas diferentes" e ver 1 pergunta, retornar às 21; assegurar somente IDs no URL, sem respostas e sem deslocar autorização. `Validate application` e `weekly-feedback-browser` devem concluir no head com limpeza local. Também verificar versões distintas via testes unitários. **STATUS:** implementação em branch, CI, merge, deploy e homologação ainda pendentes.

**REFERÊNCIA ANTERIOR:** PR #895 mergeado no `master` `38d03d56`; Validate pós-merge e status Vercel `success`. A publicação não substitui homologação profissional.

---

## 2026-10-16 — J2: preenchimento móvel e revisão corrigível (em validação)

**OBJETIVO:** concluir a usabilidade do Feedback Semanal de 21 perguntas no celular, sem comprometer rascunhos, envio definitivo e autorização. Na versão em branch, a cliente encontra uma pergunta por seletor acessível com estado factual de preenchimento, pode saltar diretamente para ela, recebe foco na revisão final e pode voltar a editar uma resposta específica. O seletor não envia dados, não calcula adesão e não usa armazenamento de navegador. Os campos e as ações autenticadas existentes permanecem intactos.

**CRITÉRIOS DE ACEITAÇÃO:** (1) salvar rascunho e recarregar preserva valores; (2) navegar à pergunta 21 foca o campo exato, não modifica o banco ou a URL e não salta para outro feedback; (3) revisão recebe foco para leitura por teclado/leitor de tela; (4) editar a pergunta 17 antes de confirmar mantém o registro não enviado; (5) a confirmação persiste a resposta editada e permanece auditável; (6) `Validate application` e Playwright E2E autenticado local passam com fixture sintética e limpeza do Supabase; (7) homologação profissional e produção são avaliadas separadamente.

**STATUS:** implementação em branch, testes CI ainda pendentes. O PR #894 foi mergeado em `afb6eda9` com Vercel `success` pós-merge; nenhuma homologação profissional de J2 foi realizada. Sem migrations, RLS, publicação IA, alteração de questionário ou regra clínica.

---

## 2026-10-16 — J2: proveniência do lembrete e continuidade de filtros (branch em validação)

**STATUS CONFIRMADO PR #893:** merge `5a339f897a8b03682b7066b6601d326d71904134`; `validate` e Playwright autenticado local passaram no HEAD pré-merge `ff481d1b`; CI pós-merge `validate` PASS; Vercel limitada por frequência (não publicada). Homologação profissional pendente.

**OBJETIVO DO PACOTE NOVO:** em solicitação manual sem evento, explicar ausência de lembrete automático (a geração existente limita o job a `request_source = schedule`). Em agendada sem evento, reconhecer somente a ausência de evento registrado. Quando houver evento real, mostrar o **último evento registrado**, sem afirmar estado atual do canal ou prova de leitura. Preservar `caixaRetorno` após filtrar, paginar ou navegar no histórico individual da cliente. **CRITÉRIOS:** testes unitários de origem/evento e E2E manual com filtro→retorno, checks `Validate application` e `weekly-feedback-browser` com cleanup sintético. Sem dados reais, mudanças de schema/RLS, automação de notificações ou decisão clínica. **Ainda não integrado, validado pelo CI nem publicado nesta anotação.**

---

## 2026-10-15 — J2: evidência operacional do lembrete na caixa administrativa (proposta)

**ESCOPO TÉCNICO:** renderizar na listagem pendente somente o último evento persistido do lembrete ligado a uma solicitação efetivamente pendente da página autorizada; restringir por cliente e por feedback exato, não carregar respostas sensíveis, não confundir SMTP aceito com leitura da cliente e não presumir falha por ausência de evento. Oferecer atalhos para Cadastro Atual e configuração individual quando a causa persistida os indicar. Preservar retorno à caixa com contexto somente por URL local validada. **CRITÉRIOS DE ACEITAÇÃO:** testes unitários de seleção/ordenamento por timestamp, descarte de eventos de outra cliente/feedback submetido/fora da página; testes de proteção da leitura RLS/metadata-only; Playwright local com cliente sintética, admin MFA e retorno após consulta; limpeza do banco local. **STATUS:** em branch; CI/E2E, merge, deployment e homologação profissional ainda não comprovados. Sem alterações de migrations, RLS, ações de envio ou regras clínicas.

---

## 2026-10-15 — J2: PR #890 integrado, testes aprovados e Vercel publicada

**FATO CONFIRMADO:** PR #890 foi mergeado no `master` `217f66695cc86e5a4fdafeaae39473bcd2c58d35`. No HEAD `220e6d08b21aec058ae9f71635fa4672cf6f36f6` os checks `validate` e `weekly-feedback-browser` concluíram com sucesso. No commit de merge, `validate` concluiu com sucesso e o status Vercel retornou `success` (`Deployment has completed`). A confirmação persistente de envio definitivo e o retorno ao registro exato foram integrados e publicados. **Não houve homologação profissional autenticada pela Patty em produção**; testes locais com dados sintéticos não substituem essa etapa. O status histórico dos PRs anteriores permanece abaixo como registro temporal, não como estado atual do #890.

---

## 2026-10-15 — J2: diagnóstico e correção de confirmação após envio (PR #890, em validação)

**FATO TESTADO:** no SHA `09837fe7`, `Validate application` concluiu com sucesso; o Playwright local gravou e verificou todas as 21 respostas sintéticas, mas não encontrou a confirmação da UI. A action revalidava a página, removendo o componente antes de seu efeito de redirecionamento. **CORREÇÃO IMPLEMENTADA NA BRANCH:** redirecionamento exclusivamente no caminho de sucesso da action autenticada, após escrita CAS confirmada e invalidação da rota. Ao abrir o histórico, o servidor reautoriza o ID submetido antes de mostrar confirmação. Falhas e rascunhos não navegam. CI e E2E do novo commit ainda precisam passar; merge, deploy e homologação profissional permanecem pendentes.

---
## 2026-10-15 — J2: fechamento de confirmação e navegação exata (PR em validação)

**FATO CONFIRMADO:** PR #889 mergeado no `master` `ff2f05b991f9d19735bda09e55b348cb8af92ce8`; no HEAD do PR (`06ee99b5`) tanto `Validate application` quanto `Validate J2 local browser lifecycle` foram aprovados. O CI pós-merge foi iniciado. Vercel ainda responde `build-rate-limit` e a versão de produção não está demonstrada.

**CORREÇÃO DE PRODUTO EM BRANCH:** após envio definitivo da cliente, a interface navegará ao registro confirmado no histórico em vez de perder a mensagem quando o formulário sai da lista de pendentes. O parâmetro contém somente ID; a confirmação e a página certa dependem de `submitted_at` e da lista previamente autorizada do Supabase. Ações administrativas de abrir uma solicitação existente e abrir registros pendentes usarão âncoras precisas. Playwright local será ampliado para confirmar o recebimento real e recusar confirmação por ID não autorizado. **Ainda não integrado, publicado ou homologado.** O conjunto não modifica migrations, permissões, decisões clínicas ou publicações.

---
## 2026-10-15 — J2: validação autenticada local concluída; produção pendente

**FATO CONFIRMADO:** PR #887 mergeado no `master` `0bd84021d0af39ef11a254253fda9406a173052c`; [Validate application pós-merge #38814525538](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38814525538) = PASS. [Playwright E2E J2 local #38813434552](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38813434552) = PASS no SHA pré-merge, inclusive encerramento/limpeza do banco descartável. A execução percorreu login administrativo MFA, solicitação após publicação sintética prévia, cliente móvel, rascunho, persistência, CAS, envio de 21 respostas sintéticas, história original e negação a acesso cruzado; nenhuma resposta real foi utilizada. São evidências de **J2 TESTADA EM AMBIENTE LOCAL**, não de publicação/homologação profissional em produção.

**BLOQUEIO DE RELEASE:** Vercel ainda informa `build-rate-limit` no SHA do merge, portanto a versão publicada mais recente não foi comprovada. A homologação com Patty/admin real, leitura por cliente real autorizada e evidência do SHA efetivamente deployado **permanecem pendentes**, sem suspender o desenvolvimento de melhorias localmente.

**CORREÇÃO FUNCIONAL IMPLEMENTADA/TESTADA EM BRANCH:** PR #888 (`b41adfce`) resolve perda de respostas locais no refresh de uma edição concorrente: o formulário mantém identidade estável e comparação com fingerprint anterior, exige escolha explícita para divergências e só grava com ação consciente após reconciliar. [CI completo #38816639283](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38816639283) = PASS, [E2E local com duas sessões #38816639406](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38816639406) = PASS, cleanup de Supabase local = PASS. **PR ainda aberto; não publicado ou homologado em produção**. RLS/MFA/CAS intactos; nenhum estado de revisão profissional, regra clínica ou publicação foi criado.

---
## 2026-10-15 — J1 encerrada por aceite do responsável; início de J2

### DECISÃO DE GESTÃO DO PROJETO (RESPONSÁVEL)

O responsável autorizou encerrar o ciclo de implementação J1 e avançar à J2, deixando para outra ocasião a homologação profissional presencial/autenticada.

### STATUS TÉCNICO DISTINTO DO ACEITE

O `master` `ef75722c3778400fe72004b64f1b127d458db999` teve `Validate application` PASS [#38767824936](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38767824936), E2E cliente PASS [#38767986491](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38767986491) e Vercel deployment concluído. A aprovação e publicação reais pela Patty com MFA, seguidas de leitura da exata versão publicada pela cliente, **não foram executadas**. Portanto, J1 = **ENCERRADA POR ACEITE PARA AVANÇAR**, **HOMOLOGAÇÃO PROFISSIONAL PENDENTE**. Não reclassificar testes não feitos como PASS.

### ESCOPO TÉCNICO INICIAL DE J2 (PROPOSTO, NÃO REGRA PROFISSIONAL NOVA)

Iniciar pela continuidade após primeiro protocolo publicado: solicitação e resposta do Feedback Semanal, pendências/revisão e retorno da cliente. A elegibilidade pelo primeiro `protocol_publications` e o agendamento parametrizado já são regras confirmadas documentadas em `WEEKLY_FEEDBACK.md`. Preservar dados originais, histórico, autorização de cliente e decisões humanas. Nenhuma regra de adesão, IA ou envio externo adicional é inferida.

## J1.05–10 — bloqueio de prova profissional fim a fim (2026-10-15 UTC)

**FATO CONFIRMADO por consulta read-only ao Supabase de produção:** 2 clientes, 1 Anamnese submetida, **0 avaliações, 0 protocolos, 0 versões, 0 aprovações e 0 publicações**. O `master` `0eac9b72` tem CI PASS [#38757814943](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38757814943) e Playwright cliente PASS [#38757884934](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38757884934), mas **não** executou aprovação/publicação pela Patty autenticada. Ausência de publicação impede conferir a leitura de um protocolo realmente aprovado; não prova defeito no fluxo.

**DECISÃO TÉCNICA:** roteiro objetivo e restrito de homologação profissional em `docs/J1_PROFESSIONAL_RELEASE_HOMOLOGATION.md`. Não criar aprovações sintéticas via SQL, não contornar MFA/RLS e não publicar dados fictícios para clientes reais. J1.05–10 continuam **NÃO HOMOLOGADAS**, condicionadas a uma execução legitimamente autorizada e observável.

---

## J1.04 — prova autenticada de upload de foto privada: PASS parcial (2026-10-15 UTC)

**FATO CONFIRMADO:** `master` `870848146afb931d8209f18656b738e4036d7c8d` concluiu `Validate application` com PASS ([38670537867](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38670537867)). O workflow Playwright [38670631202](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38670631202) concluiu **1 PASS (39,3 s)** na jornada móvel sintética. Além de ativação/Cadastro Atual/Anamnese retomável, percorreu a interface `/cliente/arquivos`, selecionou um PNG inteiramente sintético, confirmou upload, verificou no banco metadados do único arquivo, dono, escopo privado, sessão `accepted`, e confirmou o registro após reload.

**RUNTIME VERIFICADO:** Vercel limitou novos deployments do SHA atual; o preflight de J1 aceitou especificamente o último SHA com Vercel success `35304fec723f011ec8c113938e2700a45cdfe132`, pois comparou `master` atual e confirmou mudanças estritamente limitadas aos arquivos de teste/CI autorizados, sem diferença no aplicativo. Não confundir runtime publicado com commit atual mergeado.

**LIMPEZA E PRIVACIDADE:** o próprio browser logou `J1 synthetic fixture cleanup completed`; o processo independente logou `J1 exact-fixture cleanup: already-clean`. Consulta SQL somente leitura posterior retornou **zero** contas Auth, Clients, `client_files` com filename `e2e-j1-<hex16>.png` e `client_file_upload_sessions` correspondentes. A rotina recusa exclusão de registro auditado, liberação profissional ou identidade não sintética. Não foram usadas fotos reais, nova conta administrativa, credenciais MFA da Patty ou alterações em schema/RLS.

**CLASSIFICAÇÃO:** **PASS apenas para upload de uma foto privada sintética, aceite, persistência e cleanup**, não homologação integral da J1.04. Ainda faltam verificar prévia/download com trilha de auditoria preservada, autorização cruzada, falhas/recovery e demais formatos. J1.01 convite pela interface da Patty e J1.05–10 (revisão e publicação humana, acesso exato cliente e continuidade) seguem **NÃO HOMOLOGADAS**. Os relatos abaixo são histórico e não substituem esta evidência mais recente.

---

## J1.03 — evidência real de retorno da cliente e próxima prova de respostas (2026-10-14)

**FATO EXECUTADO NO HEAD `71a5d11c`:** workflow [38658460493](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/38658460493) percorreu Chromium móvel com uma cliente estritamente sintética e **1 PASS em 28,4 segundos**. Cobriu ativação, senha, login, Cadastro Atual persistido, abertura/retomada do rascunho de Anamnese, login independente, negação de áreas privadas a visitante e de área administrativa a cliente, além de verificação de largura das telas. O log confirma `J1 synthetic fixture cleanup completed` e o processo separado confirma `J1 exact-fixture cleanup: already-clean`. Consulta posterior somente leitura no Supabase de produção retornou **0 Auth, 0 Clients e 0 assignments sintéticos** com email `e2e-onboarding-<hex16>@example.invalid`. Isto constitui PASS **apenas do escopo executado**, sem garantir convite na UI da Patty, envio final ou avaliação e publicação.

**PR em desenvolvimento:** ampliação da mesma jornada, sem novos usuários administrativos, para preencher via interface uma pergunta exclusivamente informativa (`city`) da versão publicada realmente vinculada ao rascunho da cliente fictícia. O navegador deverá comprovar gravação, atualização sem duplicatas, reload, novo login e `submitted_at` nulo; o cleanup existente remove somente o rascunho sintético e suas respostas. Critérios protegidos por regressões estruturais. **Ainda não chamar esta ampliação de PASS até nova execução Playwright com limpeza confirmada.**

**PENDÊNCIAS:** J1.01 convite enviado pela UI da Patty e J1.04–10 — uploads privados, submissão final, avaliação/revisão/publicação humana e visualização da versão liberada — continuam sem homologação integral; ações profissionais permanecem exclusivamente na sessão autorizada da Patty.

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
