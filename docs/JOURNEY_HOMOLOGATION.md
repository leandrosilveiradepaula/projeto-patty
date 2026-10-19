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
