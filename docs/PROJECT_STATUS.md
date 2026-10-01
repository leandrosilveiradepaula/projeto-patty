> Escopo atual: **sistema completo, de ponta a ponta**. O projeto nao e mais conduzido como MVP. Referencias historicas a MVP devem ser lidas como legado documental, nao como reducao de escopo.

# Estado Atual do Projeto Patty

Ultima atualizacao documental: 2026-09-30.

Este arquivo e o ponto de entrada operacional para novos chats e agentes. Ele resume o estado do projeto e aponta para as fontes de verdade detalhadas.

Ele **nao substitui** `BUSINESS_RULES.md`, `DECISIONS.md`, `OPEN_QUESTIONS.md`, `DATA_MODEL.md`, `RBAC_RLS.md`, `ARCHITECTURE.md`, `MVP.md`, `MVP_READINESS.md` ou `ANAMNESE.md`.

Se houver conflito:
1. a decisao documentada mais recente prevalece;
2. regras profissionais confirmadas ficam em `BUSINESS_RULES.md` e `DECISIONS.md`;
3. questoes realmente nao resolvidas ficam em `OPEN_QUESTIONS.md`;
4. este arquivo deve ser corrigido para voltar a refletir essas fontes.

## Como iniciar uma nova sessao

Antes de propor ou executar qualquer tarefa:

1. ler `AGENTS.md`;
2. ler este `docs/PROJECT_STATUS.md`;
3. verificar branch/HEAD e working tree quando houver checkout;
4. ler os documentos de fonte de verdade relevantes para a tarefa;
5. verificar migrations/estado remoto antes de qualquer alteracao de schema;
6. nao recriar estruturas existentes;
7. nao transformar exemplo historico em regra;
8. separar decisao, implementacao, teste, aplicacao, commit, push, merge e publicacao.

## Referencia de repositorio e baseline validada

A baseline de **codigo de aplicacao** validada em producao para o fluxo canonico da Anamnese e:

`bf49254edb9292801eb9ed80a83e1d68262b7b11`

Esse commit incorpora o PR #189, que elimina a corrida de refresh que podia reenviar o valor antigo em um segundo save de resposta do draft canonico. O CI do PR, o CI do push ao `master`, o deployment correspondente e o smoke de producao passaram.

Nao tratar esse SHA como o HEAD permanente do repositorio: merges documentais posteriores podem avancar `master` sem alterar a baseline de aplicacao. Todo novo chat deve revalidar o HEAD remoto antes de implementar qualquer mudanca.

## Legenda de estado

- **DEFINIDO**: regra ou decisao documentada.
- **IMPLEMENTADO**: codigo/schema existe no repositorio.
- **TESTADO**: existe evidencia documentada de teste.
- **APLICADO**: alteracao correspondente foi aplicada ao ambiente indicado.
- **PUBLICADO**: codigo correspondente esta efetivamente no deployment de producao.
- **PARCIAL**: somente parte do fluxo esta pronta.
- **PENDENTE**: ainda requer implementacao, decisao ou operacao.
- **BLOQUEADO**: existe dependencia externa ou operacional conhecida.

## Estado de producao Vercel

### FATO OPERACIONAL

O deployment de producao correspondente ao `master` `bf49254edb9292801eb9ed80a83e1d68262b7b11` e `dpl_BVK9vpL7t4cGyoFjrv393xWPxHsb` e esta `READY`.

Em 2026-09-26, o workflow manual `E2E canonical Anamnesis start smoke`, run `36257567841` (run number 16), executou contra esse mesmo SHA e terminou `SUCCESS`. O teste consolidado validou um unico login com fixture sintetica efemera, criacao e retomada do mesmo draft, INSERT de Cidade, UPDATE da mesma resposta sem duplicacao, ativacao/desativacao de pergunta condicional, persistencia do detalhe quando aplicavel e permanencia da submission como draft. O cleanup efemero tambem terminou `SUCCESS`.

O fail anterior do run `36170455838` foi diagnosticado como corrida de UI: o segundo PATCH autenticado chegava ao Supabase com HTTP 200, mas carregava novamente o valor antigo porque um `router.refresh()` assincrono podia remontar o formulario entre o primeiro save e a segunda edicao. O PR #189 removeu refresh pos-save de respostas comuns e manteve navegacao explicita somente para perguntas controladoras de aplicabilidade. PostgreSQL, grants, RLS e schema nao precisaram ser alterados.

Estado atual revalidado em 2026-10-01: a producao Vercel mais recente `READY` esta no commit `d7c131d398174a6486d3b0d760afe4bec08b6d7d`, enquanto o `master` remoto esta em `a274b7fafb2e3aa32276833c38f583a132feba73`. Portanto, `master` e producao estao temporariamente desencontrados. Nao tratar alteracoes posteriores a `d7c131d` como publicadas ate existir novo deployment `READY` validado.

## Estado operacional resumido

| Area | Definido | Implementado | Testado | Aplicado/publicado | Principal pendencia |
| --- | --- | --- | --- | --- | --- |
| Identidade Auth / Profile / Client | SIM | SIM | SIM em fluxos sinteticos relevantes | Fundacao operacional | Preservar separacao entre Auth, profile, client, Cadastro Atual e Anamnese |
| Login | SIM | SIM | E2E sintetico de login posterior aprovado | Email + senha | Recuperacao de acesso ainda precisa de regras operacionais completas |
| Onboarding por convite | SIM | SIM | E2E sintetico de ativacao aprovado | PARCIAL / BLOQUEADO OPERACIONALMENTE | Gmail da Patty definido como Custom SMTP do MVP; configuracao manual de 2FA/App Password/SMTP/template ficou PENDENTE; validar entrega real depois; expiracao/reenvio continuam abertos |
| MFA administrativo | SIM | SIM | Smoke AAL1/AAL2 documentado | Enforcement RLS aplicado no SaaS | Leaked Password Protection bloqueada pelo plano atual |
| RBAC / RLS / assignments | SIM | SIM | Smokes documentados | Fundacao e fluxos administrativos principais operacionais | Novos papeis ficam fora do MVP; assignment continua regra geral para dados client-scoped |
| Cadastro Atual | SIM como entidade separada | leitura + edicao controlada cliente/Patty IMPLEMENTADAS | validacao deterministica + boundary server-only no CI | Backend existente; sem migration nova | formulario ampliado/historico cadastral continuam fora do escopo atual |
| Anamnese versionada | SIM | SIM + aplicabilidade + `single_choice` + mapa v1 + submissao final + consentimento checkbox | Smoke SQL completo + consent E2E `36072067063` + start/resume E2E `36074218960` + fluxo consolidado E2E `36257567841` | `client-anamnesis` v1 publicada pela migration `20260924230322`; runtime atual validado | Evolucoes futuras exigem nova versao e nao podem inferir regras abertas |
| Rascunho da Anamnese | SIM | SIM para salvar/retomar/editar/enviar dentro dos tipos v1 suportados | E2E consolidado `36257567841` PASS para start/resume/INSERT/UPDATE/condicional + cleanup | Publicado no deployment `dpl_BVK9vpL7t4cGyoFjrv393xWPxHsb` | Nao repetir smoke sem nova evidencia; manter fixture efemera e um unico login |
| Obrigatoriedade da Anamnese | SIM | Regra + UI + validacao deterministica no banco | Smoke SQL completo PASS; consentimento browser PASS no run `36072067063` | `20260924142453` + definicao canonica v1 aplicadas; campo nao aplicavel nao bloqueia | Alteracoes futuras de questionario/consentimento devem ser versionadas |
| Correcao pos-envio da Anamnese | SIM | SIM | E2E administrativo de producao PASS em 2026-09-24 | Schema aplicado e rota/UI publicadas e validadas em producao | Resposta original continua separada de correcoes e esclarecimentos |
| Esclarecimentos pos-Anamnese | SIM | SIM | E2E autenticado admin -> cliente -> admin PASS no run `36053370894` | Schema e UI publicados; workflow E2E versionado no PR #155 | Lifecycle sem estado formal/prazo/notificacao continua aberto |
| Arquivos privados | SIM | PARCIAL/AVANCADO | Smokes cliente/admin + auditoria estatica | Acesso da Patty sem assignment confirmado em RLS/Storage/rotas, com MFA AAL2 | Politica de retencao/hard delete |
| Avaliacoes e medidas | Fundacao + cadencia profissional parcial definida | Lifecycle operacional de rascunho/finalizacao implementado | CI/build PASS no PR #210 + pre-apply `ROLLBACK` PASS | `20260927002227_create_assessment_draft_lifecycle` APLICADA NO SAAS | Avaliacao Basica ocorre no meio do intervalo entre Completas; Avaliacao Completa usa catalogo confirmado de peso, medidas e fotos; regra de calendario para ancora 29/30/31 continua aberta |
| Protocolos versionados | SIM | Lifecycle manual implementado | CI/validacoes existentes | Backend/SaaS correspondente existente | Criacao/edicao profissional completa conforme regras ainda abertas |
| Conteudo educacional / exercicios | SIM como dominios separados | Fundacao/release + metadata de asset preparada | Inventario 89/89 revalidado; smoke transacional de assets PASS | Vercel Private Blob definido para midia; store/upload ainda nao executados | Criar/conectar store privado, migrar video aprovado, verificar hash e publicar/liberar explicitamente |
| Metodo da Patty | PARCIALMENTE DEFINIDO | Motor determinístico existente/parcial; regras profissionais devem migrar para configuração versionada e editável | CI | Fluxo confirmado inclui Cutting 3 Linear -> Dia 1/Dia 2 -> 2 Low/1 High -> Up Metabolico; meta de liquidos 60 mL/kg e equivalencia 2 doses de legumes = 1 dose de carbo confirmadas | Fases 5/6, numeros da planilha por peso do Cutting 3, pos-Up Metabolico, Bulking, Consolidacao, suplementacao, treino, parametros restantes do check-in e criterios objetivos de estagnacao |
| IA assistiva | SIM como principio e arquitetura; provider OpenAI confirmado | PARCIAL/AVANCADO | Adapter OpenAI + Structured Outputs + aliases + UI de revisao humana; default tecnico `gpt-5.6-terra` / reasoning `medium` | Prompt v1 aplicado; PR #151 publicado READY; chamada externa bloqueada | Credencial OpenAI, avaliacao sintetica e conclusao do gate de dados de saude |
| Failure handling de IA | SIM | SIM no schema + boundary server-side | CI + invariantes deterministicas | `20260922160058` aplicada; provider adapter publicado, mas chamada real segue gated | Manter gate fechado ate avaliacao sintetica/controles de dados; recovery automatico segue aberto |
| n8n | SIM: nao usar inicialmente | N/A | N/A | Nao usado | Introduzir somente com caso concreto |
| LangGraph | SIM: nao usar inicialmente | N/A | N/A | Nao usado | Introduzir somente se fluxo de IA justificar |
| VPS Hostinger | SIM: nao usar inicialmente | N/A | N/A | Nao usada | Introduzir somente por necessidade tecnica concreta |

## Migrations relevantes confirmadas no SaaS

Nesta rodada, o workflow versionado confirmou no historico remoto:

- `20260922160058_ai_execution_failure_handling.sql`;
- `20260923113230_anamnesis_draft_write_foundation.sql`;
- `20260923113835_admin_mfa_rls_enforcement.sql`;
- `20260923114643_anamnesis_answer_corrections_foundation.sql`;
- `20260923150743_optimize_anamnesis_correction_rls.sql`;
- `20260923191554_fix_anamnesis_draft_delete_trigger.sql`;
- `20260924105003_add_anamnesis_question_applicability_foundation.sql`;
- `20260924142453_anamnesis_final_submission_foundation.sql`;
- `20260924153808_create_anamnesis_clarification_flow.sql`;
- `20260924165942_harden_ai_execution_boundary.sql`;
- `20260924193339_seed_openai_anamnesis_review_prompt.sql`;
- `20260924210600_create_educational_content_assets.sql`;
- `20260924215415_add_ai_failure_retention_constraints.sql`;
- `20260924230322_publish_canonical_anamnesis_v1.sql`.

O apply de `20260923191554` terminou com sucesso e o `migration list` pos-apply mostrou o mesmo timestamp local/remoto. Em seguida, um smoke transacional com dados sinteticos e `ROLLBACK` confirmou: draft nao submetido pode ser excluido; submission enviada continua bloqueada com SQLSTATE `55000`; cliente A nao consegue ler submission da cliente B. Em 2026-09-24, o E2E de producao confirmou a retomada e persistencia de um rascunho existente no runtime publicado. A criacao inicial da Anamnese canonica v1 esta publicada e foi validada em producao; o run `36257567841` confirmou criacao, retomada e edicao do draft sem residuo.

## 2026-09-26 - Update do draft canonico corrigido e validado

### PRODUCAO VALIDADA

O fail do run `36170455838` foi investigado antes de novo rerun. Os logs do Supabase mostraram que o UPDATE nao era bloqueado por RLS: houve `PATCH 200` autenticado para `anamnesis_answers`, mas o payload tinha o mesmo tamanho do valor antigo. O codigo da UI confirmou uma corrida entre a segunda edicao e o `router.refresh()` disparado apos o primeiro save.

O PR #189:
- removeu refresh pos-save do formulario de texto;
- removeu refresh pos-save de `single_choice` comum;
- manteve navegacao explicita somente para perguntas que controlam aplicabilidade;
- adicionou regressao para impedir reintroducao do refresh assincrono nesses saves;
- nao alterou migration, schema, RLS ou grants.

Evidencia final:
- CI do PR #189: PASS;
- merge no `master`: `bf49254edb9292801eb9ed80a83e1d68262b7b11`;
- deployment: `dpl_BVK9vpL7t4cGyoFjrv393xWPxHsb`, `READY`;
- workflow: `E2E canonical Anamnesis start smoke`;
- run: `36257567841`;
- Playwright: `1 passed (25.7s)`;
- cleanup da fixture efemera: SUCCESS.

Nao existe justificativa para novo rerun desse smoke sem nova evidencia de regressao.

## Regras profissionais que nao devem ser reabertas

Consultar `BUSINESS_RULES.md` para detalhes.

Resumo:
- todo acompanhamento comeca pelo Reconhecimento Metabolico;
- o fluxo principal confirmado agora segue ate Cutting 3 Linear -> Dia 1/Dia 2 -> 2 Low/1 High -> Up Metabolico;
- existem regras confirmadas de refeicoes/jejum, macros/doses, grupos de proteina, legumes na contagem de carboidrato, Cutting Dia 1/Dia 2, meta de liquidos 60 mL/kg/dia e refeicao livre do Up Metabolico;
- no inicio, relatos de saude/comportamento nao geram alerta, bloqueio ou encaminhamento automatico;
- para emagrecimento/reducao de gordura, cintura e abdomen sao referencias fortes e fotos podem confirmar evolucao mesmo com peso estavel;
- adesao e central e nao existe score automatico de adesao;
- exemplos historicos individuais nao viram regra geral;
- fórmulas profissionais confirmadas entram como configuração versionada; o código contém o motor determinístico, não os valores do método.

## Anamnese: regras que nao devem ser reabertas

- o inicio de uma nova Anamnese da cliente usa exclusivamente o formulario canonico `form_key = client-anamnesis`; nao selecionar genericamente qualquer versao publicada, porque fixtures E2E podem existir no mesmo schema;
- entre as versoes publicadas desse formulario canonico, o inicio usa a maior `version_number` e reaproveita um draft ativo da mesma versao quando existir;
- enquanto o formulario canonico nao estiver publicado, a UI nao oferece criacao de novo rascunho;
- todos os campos **aplicaveis** sao obrigatorios para o envio final;
- rascunho pode permanecer incompleto e ser retomado;
- depois do envio final, a cliente nao altera as respostas;
- somente a Patty pode registrar correcao posterior;
- correcao nao sobrescreve a resposta original;
- `missing_answer` possui validador deterministico e so aceita target previamente classificado pelo caller como aplicavel e sem resposta; campo oculto nao pode ser tratado como ausente;
- resposta original, interpretacao de IA, notas/correcoes e artefatos posteriores permanecem separados.

## Onboarding e autenticacao: regras que nao devem ser reabertas

- nao existe cadastro publico/autonomo de cliente no MVP;
- Patty inicia o onboarding usando o email que ja possui da cliente;
- o fluxo envia link de convite/ativacao;
- a cliente define a senha durante a ativacao;
- login normal do MVP e email + senha;
- MFA e obrigatorio para Patty/admin;
- magic link nao e o metodo normal de login.

## Pendencias de infraestrutura conhecidas

1. **Deployment Vercel**
   - HISTORICO: `master` `bf49254edb9292801eb9ed80a83e1d68262b7b11` foi publicado como `READY` e o smoke canonico `36257567841` foi aprovado naquele baseline.
   - ESTADO ATUAL 2026-10-01: producao `READY` em `d7c131d398174a6486d3b0d760afe4bec08b6d7d`; `master` remoto em `a274b7fafb2e3aa32276833c38f583a132feba73`. Existe gap de publicacao a resolver antes de considerar o HEAD atual publicado.

2. **Email real de convite**
   - lifecycle tecnico e E2E sintetico existem;
   - template real esta bloqueado no plano/configuracao atual;
   - decidir entre upgrade do Supabase e SMTP customizado.

3. **Leaked Password Protection**
   - tentativa de habilitacao retornou limitacao de plano;
   - nao criar fallback inseguro.

4. **Higiene de branches / protecao do master**
   - a limpeza administrativa das branches historicas foi autorizada, mas o conector GitHub atual nao expoe exclusao de branch;
   - nao mover refs nem usar force-update como substituto de delete;
   - o `master` permanece sem protecao ativa observavel;
   - a consulta de rulesets retornou que esse recurso exige GitHub Pro para este repositorio privado, e a integracao atual tambem nao possui permissao administrativa para gravar branch protection.

## Pendencias profissionais principais

A lista autoritativa esta em `OPEN_QUESTIONS.md`.

Entre as principais:
- Fases 5 e 6 da Planilha Carb Cycle;
- valores/formulas exatos das tabelas por peso usadas no Cutting 3;
- etapas posteriores ao Up Metabolico que sucede o Cutting 3;
- Bulking detalhado;
- Consolidacao;
- proporcao minima de agua pura, recalculo por mudanca de peso e cadencia dos lembretes;
- suplementacao/manipulados;
- montagem/progressao definitiva de treino e cardio ainda nao coberto por regra confirmada;
- janela/limiar de estagnacao e combinacoes conflitantes de indicadores;
- criterios de resultado para objetivos diferentes de emagrecimento/reducao de gordura;
- demais regras ainda nao formalizadas.

Nao automatizar esses pontos antes de confirmacao da Patty e atualizacao documental.

## Tarefas/documentacao recentes

Nesta reconciliacao de 2026-09-23, incorporada ao `master` pelo PR #120:
- `AGENTS.md` passou a exigir leitura e manutencao deste handoff;
- `ANAMNESE.md` foi alinhado a obrigatoriedade confirmada e ao limite de `missing_answer`;
- `DATA_MODEL.md` foi alinhado ao historico append-only de correcoes;
- `PRODUCT.md` foi alinhado ao onboarding por convite e login email + senha;
- `OPEN_QUESTIONS.md` deixou de tratar obrigatoriedade geral da Anamnese como aberta;
- `MVP.md` agora separa escopo do MVP de estado operacional;
- `RBAC_RLS.md` foi reconciliado com MFA aplicado, rascunho e excecao de arquivos privados;
- `MVP_READINESS.md` foi reconciliado com o estado do SaaS e com a auditoria de arquivos;
- `SUPABASE_MIGRATION_DEPLOYMENT.md` foi atualizado com as migrations confirmadas;
- `DECISIONS.md` registra o apply mais recente e a confirmacao remota do failure handling;
- `BRANCH_INVENTORY.md` registra a auditoria de branches e a estrategia de higiene.
- `VERCEL_PRODUCTION_GATE.md` registra o checklist de recuperacao de producao sem disparar build adicional nesta rodada.
- `DRIVE_CONTENT_INVENTORY_REVIEW.md` revalidou os 89 itens originais sem divergencias e registrou um delta de 21 arquivos/158,9 MiB; livros de terceiros ficaram em hold de direitos, imagens operacionais ficaram pendentes de privacidade/likeness e nenhum item novo foi autorizado para migracao.
- `DRIVE_CONTENT_REVIEW_WAVE_1.md` registrou a primeira revisao controlada de balanca, sugestao de refeicoes e formulas; as respostas posteriores da Patty atualizaram o status desses tres itens sem alterar o historico da triagem.

## Proximas frentes recomendadas

Ordem operacional sugerida, sujeita a revalidacao do HEAD:

1. CONCLUIDO: ANAM-046 definido, versionado e validado no browser no run `36072067063`.
2. CONCLUIDO: primeira `client-anamnesis` v1 publicada e fluxo de inicio/retomada/edicao/condicionais validado em producao; run consolidado `36257567841` PASS no `master` `bf49254edb9292801eb9ed80a83e1d68262b7b11`.
3. RETOMAR quando houver acesso operacional: configurar Gmail Custom SMTP e validar convite real.
4. CONCLUIDO: fluxo autenticado admin <-> cliente de esclarecimentos validado em producao com fixture sintetica no run `36053370894`.
5. Executar a avaliacao sintetica do fluxo OpenAI quando houver credencial de ambiente; provider, prompt v1 e contrato `anamnesis_review` ja estao implementados, mas dados reais continuam bloqueados pelo `OPENAI_HEALTH_DATA_GATE.md`.
6. Infraestrutura de midia educacional DEFINIDA como Vercel Private Blob; proximo passo operacional e criar/conectar store privado e migrar controladamente o video aprovado da balanca.
7. Fechar apenas as lacunas reais ainda abertas da Anamnese/Avaliacoes sem reabrir consentimento, publicacao da v1 ou o fluxo de draft ja validados.
8. Ampliar automacao de alimentacao/treino somente depois das regras profissionais correspondentes estarem documentadas.

## Regra de manutencao deste arquivo

Uma tarefa que altere materialmente o estado do projeto deve atualizar este arquivo antes de ser considerada concluida.

Atualizar quando houver, por exemplo:
- nova decisao;
- nova regra confirmada pela Patty;
- questao aberta resolvida;
- migration criada/aplicada;
- fluxo implementado;
- teste relevante aprovado/falhado;
- bloqueio novo/removido;
- mudanca de prioridade;
- merge ou publicacao que altere a referencia oficial.

Nao marcar um item como:
- implementado apenas porque foi decidido;
- testado apenas porque foi implementado;
- aplicado apenas porque a migration existe;
- merged apenas porque existe commit;
- publicado apenas porque foi merged.

A atualizacao deve ser curta e apontar para os documentos detalhados em vez de duplicar regras extensas.


## Smoke E2E de condicionalidade e envio final

Existe um smoke manual dedicado em `e2e/client-anamnesis-conditional-submit.spec.mjs`, acionado por `.github/workflows/e2e-client-anamnesis-conditional-submit.yml`.

O teste usa somente a cliente sintetica persistente de E2E e cria uma definicao temporaria publicada com:
- uma pergunta `single_choice`;
- uma pergunta `text` dependente de resposta exata `"Sim"`;
- um campo obrigatorio adicional que garante que a tentativa de envio permaneça bloqueada e a submission continue eliminavel no cleanup.

O smoke valida no runtime:
- persistencia de `single_choice`;
- pergunta dependente oculta com `Nao`;
- pergunta dependente visivel com `Sim`;
- mensagem de bloqueio no envio incompleto;
- `submitted_at` permanece nulo;
- cleanup completo da fixture temporaria.

O caminho de envio completo continua coberto pelo smoke SQL transacional pos-apply, que pode usar `ROLLBACK` sem deixar submission enviada imutavel como residuo.


## Esclarecimentos pos-Anamnese

A fundacao foi preparada no repositorio para preservar separadamente pedido da Patty e complementos da cliente, sem alterar a resposta original.

Escopo:
- pedido textual em Anamnese enviada;
- vinculo opcional a resposta original;
- complementos textuais append-only;
- leitura client-scoped;
- criacao administrativa exige assignment ativo + AAL2;
- sem estado formal, prazo, expiracao ou notificacao automatica.

A migration `20260924153808_create_anamnesis_clarification_flow.sql` foi aplicada no Supabase SaaS em 2026-09-24 e o historico remoto foi confirmado com o mesmo version ID. O smoke pos-apply com fixture sintetica e `ROLLBACK` confirmou request AAL2, resposta da cliente correta, isolamento entre clientes, multiplos complementos, resposta original inalterada e imutabilidade. A UI passou CI/build, foi mergeada no PR #146 e o deployment de producao do commit `492a7ab` ficou `READY`.

O E2E autenticado completo passou em producao no workflow `E2E anamnesis clarification flow`, run `36053370894`: Patty/admin com MFA criou pedido vinculado a resposta original; a cliente correta leu e registrou complemento; outra cliente recebeu isolamento/404; a Patty releu o complemento; e a verificacao direta confirmou que a resposta original permaneceu `"Original E2E answer"`. O teste foi versionado pelo PR #155. A primeira tentativa do smoke falhou somente por seletor Playwright ambiguo depois de criar um pedido sintetico; esse pedido permanece no historico E2E sem complemento porque o dominio e append-only, sem impacto em dados reais.


## Hardening da execution boundary de IA

A branch de hardening prepara:
- vinculo direto `ai_executions -> anamnesis_submission` para `anamnesis_review`;
- prompt key compativel com o purpose;
- sources restritas a answers da submission selecionada;
- congelamento de sources apos estado terminal;
- RPCs `SECURITY INVOKER` exclusivas de `service_role` para start/complete/fail atomicos;
- construtor deterministico de contexto com aplicabilidade e minimizacao;
- identidade administrativa derivada de sessao AAL2 em camada `server-only`.

A migration `20260924165942_harden_ai_execution_boundary.sql` foi aplicada no Supabase SaaS. O smoke pos-apply com dados sinteticos e `ROLLBACK` confirmou vinculo da submission, deduplicacao de sources, bloqueio cross-submission, congelamento pos-terminal, completion/failure atomicos, preservacao de resposta bruta quando aplicavel e RPCs inacessiveis a `anon`/`authenticated`. O advisor de seguranca nao trouxe finding novo; permanece apenas Leaked Password Protection ja conhecido. O advisor de performance passou a listar a nova FK composta de `ai_executions` como sem indice de cobertura exata; nenhuma migration extra foi criada apenas para zerar esse lint sem workload. O PR #149 foi mergeado no commit `9b7bbba` e o deployment correspondente ficou `READY` em producao. A consulta de logs `error/fatal` da janela observada nao retornou eventos.


## Integracao OpenAI da revisao de Anamnese

Provider confirmado: OpenAI.

A branch atual prepara:
- Responses API server-side;
- `store: false`;
- Structured Outputs;
- aliases efemeros para nao enviar UUIDs internos;
- prompt v1 versionado no banco;
- historico de execution/output/failure;
- tela administrativa de revisao humana;
- opt-in explicito da capacidade financeira;
- nenhuma acao automatica sobre cliente/protocolo.

A migration `20260924193339_seed_openai_anamnesis_review_prompt.sql` foi aplicada no Supabase SaaS. A verificacao pos-apply confirmou exatamente um prompt `anamnesis_review` v1 e zero `ai_executions`.

A chamada externa continua bloqueada por padrao. O default tecnico e `gpt-5.6-terra` com reasoning `medium`; para uso com dados reais ainda faltam credencial, avaliacao sintetica e habilitacao explicita do gate `OPENAI_HEALTH_DATA_PROCESSING_ENABLED` apos revisao de privacidade/retencao aplicavel.


## Rollout OpenAI controlado

O PR #151 foi mergeado no commit `3412c4f` e o deployment correspondente ficou `READY` em producao. A consulta de logs `error/fatal` da janela observada nao retornou eventos.

A chamada real continua desabilitada sem `OPENAI_API_KEY` e sem `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=true`.

Foi criado `docs/OPENAI_HEALTH_DATA_GATE.md` como checklist operacional antes de dados reais e `npm run eval:ai:openai` como avaliacao do modelo usando somente fixtures sinteticas.


## Gmail SMTP do MVP

Status atual: **PENDENTE / BLOQUEADO OPERACIONALMENTE** porque a configuracao manual no Google/Supabase nao pode ser concluida nesta sessao.

A infraestrutura de email real do onboarding foi definida: Gmail pessoal da Patty via Custom SMTP do Supabase Auth.

O codigo de convite existente ja usa `admin.auth.admin.inviteUserByEmail`, portanto nao exige mudanca de provider no codigo. O envio passara automaticamente pelo Gmail quando o Custom SMTP estiver configurado.

Pendente operacional:
- habilitar 2FA na conta Google, se ainda nao estiver habilitado;
- gerar App Password exclusiva;
- configurar `smtp.gmail.com` no Supabase;
- configurar o template `Invite user` com `TokenHash` / `type=invite` para `/auth/confirm`;
- validar convite real com conta sintetica;
- manter App Password fora de repositorio/chat/logs.

Detalhes: `docs/GMAIL_SMTP_SETUP.md`.


## Midia educacional >50 MB

A escolha tecnica foi fechada: Vercel Private Blob privado para binarios educacionais, mantendo Supabase para metadata/versionamento/releases/autorizacao.

A migration `20260924210600_create_educational_content_assets.sql` foi aplicada no Supabase SaaS. Smoke pos-apply com `ROLLBACK` confirmou:
- asset somente em versao draft;
- bloqueio de mutacao/delete apos publicacao;
- bloqueio de novo asset apos publicacao;
- cliente liberada le metadata;
- outra cliente nao le;
- admin AAL1 e bloqueado;
- admin AAL2 le;
- anon nao le;
- provider diferente de `vercel_blob` e rejeitado.

O advisor de seguranca nao trouxe finding novo; permanece apenas Leaked Password Protection ja conhecido. O advisor de performance marcou o novo indice como ainda nao usado, esperado antes de workload.

O PR #157 foi mergeado no commit `857daed` e o deployment correspondente ficou `READY` em producao. A consulta de runtime `error/fatal` da janela observada nao retornou eventos.

Criar/conectar o Blob store e copiar o video continuam operacoes separadas.

## 2026-09-24 - Preparacao controlada do primeiro lote de midia educacional

### FATO DE IMPLEMENTACAO

O primeiro lote de migracao fisica foi preparado de forma machine-readable em `docs/educational_media_migration_batch_1.json`, limitado exclusivamente ao video aprovado `MovaviClips_Video_20220217-143151.mp4` (Drive file ID `1z61DpJfwp-6DMhYMpCRNafkSwX6h9LBE`, `video/mp4`, 123.262.796 bytes).

O manifesto preserva o original, exige path opaco sem PII, armazenamento `vercel_blob` privado, verificacao de tamanho/MIME/SHA-256 e a sequencia explicita draft -> asset -> revisao humana -> publicacao -> release. Um teste deterministico compara os metadados da fonte com o inventario original e falha fechado enquanto store, SHA-256, asset, publicacao e release nao existirem.

### PENDENCIA OPERACIONAL / BLOQUEADA NESTA SESSAO

A integracao Vercel disponivel nesta sessao permite consultar projeto, deployments, logs e documentacao, mas nao expoe operacao de criacao/listagem/conexao de Blob stores. Portanto, nenhum Vercel Private Blob store foi criado ou conectado por esta tarefa.

Estado preservado:
- nenhum arquivo do Drive foi copiado;
- nenhum Blob foi enviado;
- nenhum `educational_content`, versao, asset ou release foi criado no Supabase;
- nenhuma publicacao foi realizada;
- os demais arquivos do Drive continuam fora deste lote.

A proxima operacao de midia continua dependendo da criacao/conexao manual de um Blob store privado ao projeto Vercel. Depois disso, o lote deve seguir a ordem registrada no manifesto, sem pular verificacoes de integridade ou gates humanos.

## 2026-09-24 - Visibilidade de executions de IA sem estado terminal

### IMPLEMENTADO NA APLICACAO

A tela administrativa de revisao assistida passa a sinalizar executions que permanecem `started` sem `completed_at` e sem `failed_at`. A classificacao e deterministica e possui teste unitario.

A mitigacao e somente de observabilidade:
- nao define timeout;
- nao converte `started` em `failed`;
- nao cria failure response;
- nao dispara retry automatico;
- nao publica resultado.

A consulta ao Supabase SaaS nesta rodada encontrou 0 executions `started` sem output/failure response. O mecanismo futuro de recovery/watchdog continua aberto.

## 2026-09-24 - Limites de retencao de falhas de IA

### IMPLEMENTADO NA APLICACAO

A persistencia interna de falhas de IA passou a aplicar limites determinísticos antes do RPC privilegiado:

- resposta bruta recebida do provider: maximo de 128 KiB em bytes UTF-8;
- mensagem sanitizada de falha: maximo de 1.024 code points;
- whitespace de `failure_message` e normalizado;
- caracteres NUL sao substituidos;
- resposta truncada deixa de ser rotulada como JSON e recebe marcador explicito de truncamento.

A regra fica em modulo `server-only` e e coberta por testes unitarios e regressao de seguranca.

### ESTADO DO SAAS ANTES DA MUDANCA

A consulta ao Supabase SaaS encontrou 0 registros em `ai_execution_failure_responses` e 0 `failure_message` nao nulas. Nenhuma migration ou transformacao retroativa foi necessaria.

## 2026-09-24 - Identidade estavel da pergunta financeira

### IMPLEMENTADO

A pergunta historica ANAM-033 passa a ter sua identidade tecnica tratada por contrato unico no codigo:

- source code: `ANAM-033`;
- `question_key`: `financial_capacity_for_supplements`;
- default para IA: excluido;
- inclusao somente por selecao explicita da Patty.

O mesmo identificador agora e reutilizado pelo construtor de contexto da IA e pela UI administrativa. Um teste liga a constante ao mapa machine-readable da Anamnese v1 para detectar drift futuro.

Nenhuma migration ou mudanca de schema foi necessaria; o schema ja garante `unique(form_version_id, question_key)`.

## 2026-09-24 - Reconciliacao do estado do primeiro fluxo de IA

### FATO DOCUMENTAL

Foi removida a divergencia entre trechos antigos que ainda tratavam provider, prompt e contrato do primeiro fluxo como indefinidos e o estado real ja implementado.

Para `anamnesis_review`, OpenAI, prompt v1, Structured Outputs, aliases efemeros, contrato v1 de findings, boundary server-side e failure handling ja existem. O modelo `gpt-5.6-terra` com reasoning `medium` permanece configuracao tecnica inicial, ainda sujeita a avaliacao sintetica antes de qualquer liberacao com dados reais.

O gate de dados de saude continua fechado.

## 2026-09-24 - Hardening de retencao de falhas de IA no banco

### APLICADO NO SUPABASE SAAS

A migration `20260924215415_add_ai_failure_retention_constraints` foi aplicada e confirmada no historico remoto.

Ela adiciona defesa em profundidade no banco para os limites ja existentes no boundary server-side:
- `ai_execution_failure_responses.content`: no maximo 131072 bytes via `octet_length`;
- `ai_executions.failure_message`: no maximo 1024 caracteres via `char_length`.

Antes do apply existiam 0 failure responses e 0 failure messages reais, portanto nao houve transformacao retroativa.

Pos-apply:
- constraints confirmadas por introspeccao;
- advisor de seguranca sem novo finding alem do warning conhecido de Leaked Password Protection;
- advisor de performance lista FKs sem indice preexistentes como frente separada.

## 2026-09-24 - Observabilidade central de executions de IA

### IMPLEMENTADO

Foi adicionada a area administrativa `/admin/ia` para listar, em um unico lugar, executions acessiveis que permanecem `started` sem timestamps terminais.

O dashboard administrativo tambem exibe a contagem atual. A consulta usa o cliente normal do Supabase e depende das policies de RLS/assignment existentes; nao usa `service_role`.

A funcionalidade e somente observacional: nao altera status, nao define timeout e nao dispara retry.

## 2026-09-24 - ANAM-046 simplificado e definido

### REGRA CONFIRMADA

O consentimento do MVP sera um checkbox obrigatorio na finalizacao da Anamnese. Rascunho pode ser salvo sem aceite; envio final exige o checkbox.

A evidencia usa a propria resposta versionada da Anamnese, sem IP, fingerprint ou tabela juridica adicional. O aceite nao libera OpenAI com dados reais.

Com isso, ANAM-046 deixou de bloquear a materializacao da primeira `client-anamnesis`. Estado atual: a v1 ja foi materializada, publicada e validada em producao.

## 2026-09-24 - Primeira client-anamnesis publicada

### APLICADO / PUBLICADO NO SUPABASE SAAS

A primeira versao canonica `form_key = client-anamnesis`, versao 1, foi materializada e publicada pela migration `20260924230322_publish_canonical_anamnesis_v1`.

Validacao pos-apply:
- 1 versao canonica publicada;
- 10 secoes;
- 51 perguntas;
- 10 condicionais;
- 1 ANAM-046 obrigatorio com `answer_type = single_choice` e `options = ["Concordo"]`;
- advisor de seguranca sem novo finding alem do warning conhecido de Leaked Password Protection.

A UI do checkbox ja estava publicada na Vercel antes do apply do formulario canonico.

### PROXIMO GATE

Validacao operacional concluida por gates complementares: browser para inicio/retomada/edicao/condicionais e consentimento; SQL transacional com `ROLLBACK` para o envio final completo. Nao criar submission sintetica enviada apenas para um E2E, porque o historico submetido e intencionalmente imutavel.

## 2026-09-24 - Smoke transacional da Anamnese canonica v1

### TESTADO NO SUPABASE SAAS

A versao publicada `client-anamnesis` v1 passou por smoke transacional com dados sinteticos e `ROLLBACK`.

Cenario exercitado:
- cliente sintetica existente;
- nova submission da versao canonica publicada;
- respostas validas para todas as perguntas aplicaveis;
- controladoras das 10 condicionais respondidas com valores que mantiveram os detalhes nao aplicaveis;
- ANAM-046 persistido como `Concordo`;
- update de `submitted_at` concluido pelo fluxo de validacao do banco;
- evidencia de consentimento presente na submission enviada;
- `ROLLBACK` ao final, sem residuo.

Esse smoke valida a definicao canonica e o trigger de envio final em conjunto. O browser cobre separadamente os fluxos que podem ser limpos sem residuo. Um submit final sintetico em producao nao e exigido como gate adicional porque deixaria historico artificial imutavel.

## 2026-09-24 - E2E canônico de consentimento preparado

### IMPLEMENTADO / AINDA NAO EXECUTADO

Foi versionado um smoke E2E manual para a `client-anamnesis` v1 publicada:

- workflow: `.github/workflows/e2e-client-anamnesis-canonical-consent.yml`;
- spec: `e2e/client-anamnesis-canonical-consent.spec.mjs`.

A versao inicial do teste usava fixture sintetica persistente. Estado atual: o workflow cria Auth user/profile/client efemero por run e limpa tudo em `always()`. O teste cria um draft temporario da versao canonica, preenche programaticamente todas as perguntas aplicaveis exceto um campo obrigatorio de guarda e o consentimento, e valida no browser:

- ANAM-046 aparece como checkbox obrigatorio;
- sem marcar, nenhuma resposta de consentimento e persistida;
- marcado, `Concordo` e persistido pela boundary server-side;
- o campo obrigatorio de guarda impede `submitted_at`, mantendo o registro limpavel;
- cleanup remove answers e draft no `finally`;
- o cliente efemero completo e removido pelo cleanup compartilhado ao final.

A execucao continua manual via `workflow_dispatch`; o conector GitHub desta sessao nao expoe acao para iniciar workflows manuais.

## 2026-09-24 - E2E canônico de consentimento aprovado

### PRODUCAO VALIDADA

O workflow `E2E canonical Anamnesis consent smoke` passou em producao no run `36072067063`, sobre o `master` `abadca9eb71447ca6fd7eca482ff83b1e0763e61`.

Resultado:
- job `smoke`: SUCCESS;
- Playwright: `1 passed (15.3s)`;
- ANAM-046 renderizado como checkbox obrigatorio;
- sem marcar, nenhuma resposta de consentimento e persistida;
- marcado, `Concordo` e persistido pela boundary server-side;
- submission incompleta permanece rascunho;
- cleanup removeu o draft/answers sinteticos;
- consulta pos-run confirmou 0 drafts canonicos residuais.

Com isso, o consentimento da `client-anamnesis` v1 esta validado no runtime de producao.

## 2026-09-24 - E2E de inicio da Anamnese canonica preparado

### IMPLEMENTADO / EXECUCAO MANUAL PENDENTE

Foi versionado o workflow `E2E canonical Anamnesis start smoke` para validar o fluxo inicial da `client-anamnesis` v1 publicada.

O teste:
- estado atual: usa cliente sintetica efemera por run;
- remove previamente qualquer draft canonico residual dessa fixture;
- confirma que a tela oferece `Começar Anamnese` para a versao 1 publicada;
- cria o draft via UI;
- confirma no Supabase que o draft pertence a cliente sintetica e a form version canonica v1;
- confirma `submitted_at = null`;
- volta a lista e comprova que a acao passa de criar para `Continuar rascunho`;
- reabre exatamente o mesmo draft;
- remove o draft no `finally`;
- remove Auth user/profile/client efemeros no cleanup `always()`;
- confirma 0 drafts canonicos residuais ao final.

A copia antiga dizendo que o envio final nao estava disponivel tambem foi removida da tela do cliente.

## 2026-09-24 - E2E de inicio da Anamnese canonica aprovado

### PRODUCAO VALIDADA

O workflow `E2E canonical Anamnesis start smoke` passou em producao no run `36074218960`, sobre o `master` `aa6969a174e67312ddcd3e23c41a114fa00dd45e`.

Resultado:
- job `smoke`: SUCCESS;
- Playwright: `1 passed (15.2s)`;
- `Começar Anamnese` criou draft da `client-anamnesis` v1 publicada;
- o draft foi vinculado a cliente sintetica e a form version canonica corretas;
- `submitted_at` permaneceu nulo;
- a lista passou a oferecer `Continuar rascunho`;
- o mesmo draft foi retomado;
- cleanup removeu o draft e respostas sinteticas;
- consulta pos-run confirmou 0 drafts canonicos residuais.

Com isso, o fluxo de inicio e retomada da primeira Anamnese canonica esta validado no runtime de producao.

## 2026-09-26 - Smoke legado de rascunho removido

### COBERTURA CONSOLIDADA

O workflow `E2E client anamnesis draft smoke` e o spec `e2e/client-anamnesis-draft.spec.mjs` foram removidos. Eles dependiam da antiga fixture sintetica persistente e de rotacao de senha, enquanto a cobertura equivalente de start/resume, INSERT, UPDATE e cleanup ja esta no smoke canonico consolidado com fixture efemera.

A evidencia operacional permanece o run `36257567841`, que validou o fluxo atual em producao. A remocao reduz duplicidade e evita retorno acidental ao modelo persistente de fixture.

## 2026-09-26 - E2E de edicao consolidado no smoke canonico

### PRODUCAO VALIDADA / WORKFLOW ANTIGO REMOVIDO

A cobertura de edicao do draft canonico foi incorporada ao workflow `E2E canonical Anamnesis start smoke`, usando uma unica fixture efemera e um unico login. O run `36257567841` validou start/resume, INSERT/UPDATE de `city`, condicional `has_health_plan -> health_plan_details`, persistencia do detalhe quando aplicavel e cleanup sem residuo.

O antigo workflow separado `E2E canonical Anamnesis draft edit smoke` ficou orfao depois da remocao do spec duplicado `e2e/client-anamnesis-canonical-draft-edit.spec.mjs`. O arquivo `.github/workflows/e2e-client-anamnesis-canonical-draft-edit.yml` foi removido para evitar uma Action manual quebrada e cobertura duplicada.

Nenhuma migration, policy RLS ou regra de produto foi alterada.

## 2026-09-26 - Auditoria de seguranca de producao e credenciais E2E

### AUDITADO / HARDENING PREPARADO

Auditoria sem mudanca de schema confirmou:
- nenhuma tabela `public` sem RLS;
- nenhum bucket Supabase Storage publico;
- nenhum grant de escrita para `anon` nas tabelas publicas;
- unica funcao `SECURITY DEFINER` em `public` = `rls_auto_enable`, executavel apenas por `postgres`/`service_role`;
- Vercel sem runtime errors na janela observada de 24 horas;
- advisor de seguranca sem finding novo alem de Leaked Password Protection ja conhecido;
- lints de performance continuam informativos; nenhuma migration de indice deve ser criada apenas para zerar lint sem evidencia de workload.

Foi identificado um ponto de hardening no setup do smoke canonico: email e senha da fixture efemera eram exportados por `GITHUB_ENV` antes de estarem registrados como valores mascarados do GitHub Actions. Embora a conta seja sintetica, efemera e removida no cleanup, credenciais nao devem aparecer em logs.

A branch `codex/mask-ephemeral-e2e-credentials` adiciona `::add-mask::` para email e senha antes do export e uma regressao estatica que exige essa ordem. Nenhuma alteracao de banco, RLS, segredo persistente ou fluxo de produto.

## 2026-09-26 - Conditional submit usa fixture efemera

### HARDENING DE E2E

O smoke `E2E client anamnesis conditional submit smoke` foi preservado porque cobre uma verificacao distinta: tentativa de envio incompleto permanece bloqueada e a submission continua em draft.

A implementacao antiga dependia da fixture persistente `E2E Correction Client` e rotacionava senha. O workflow/spec foram migrados para reutilizar `setup-canonical-anamnesis-client.mjs` e `cleanup-canonical-anamnesis-client.mjs`, com cliente Auth/profile/client efemero por run, credenciais mascaradas e cleanup `always()`.

Nenhuma regra de submissao, migration, schema ou RLS foi alterada.

## 2026-09-26 - Consent smoke usa fixture efemera

### HARDENING DE E2E

O smoke `E2E canonical Anamnesis consent smoke` foi migrado da antiga fixture persistente `E2E Correction Client` para o mesmo cliente efemero usado pelo smoke canonico principal.

O workflow agora cria Auth user/profile/client efemero por run, mascara email/senha antes do export, executa o spec com `E2E_CANONICAL_*` e sempre chama `cleanup-canonical-anamnesis-client.mjs` em `always()`. O spec nao faz mais lookup por `display_name` nem rotacao de senha.

A evidencia historica do run `36072067063` permanece valida para o comportamento de consentimento; esta mudanca endurece apenas a fixture do teste. Nenhuma migration, schema/RLS ou regra de produto foi alterada.

## 2026-09-26 - Helper legado de cleanup removido

### LIMPEZA DE E2E

O helper `e2e/cleanup-canonical-anamnesis-drafts.mjs` foi removido porque nao era mais referenciado por workflows, scripts de pacote ou documentacao ativa. Ele dependia da antiga fixture persistente `E2E Correction Client`.

Os smokes canonicos atuais usam `cleanup-canonical-anamnesis-client.mjs`, que remove drafts/answers do cliente efemero, client/profile/role e Auth user do proprio run, recusando cleanup destrutivo se encontrar submission ja enviada.

Nenhuma migration, schema/RLS ou regra de produto foi alterada.

## 2026-09-26 - Excecoes persistentes de E2E delimitadas

### REGRA TECNICA DE TESTE

Depois da migracao dos smokes canonicos para fixtures efemeras, o uso da fixture persistente `E2E Correction Client` fica restrito a dois fluxos que precisam de uma Anamnese ja submetida e portanto historica/imutavel:
- `e2e/admin-anamnesis-corrections.spec.mjs`;
- `e2e/anamnesis-clarifications.spec.mjs`.

Esses dois casos nao devem ser convertidos ingenuamente para cliente efemero, porque criar uma submission final sintetica apenas para o teste deixaria historico artificial permanente em producao. Uma regressao de seguranca falha se qualquer outro spec E2E voltar a usar `E2E Correction Client` ou rotacao de senha.

Essa excecao nao transforma fixture persistente em padrao; novos E2E devem usar fixture efemera sempre que o dominio permitir cleanup completo.

## 2026-09-26 - Esclarecimentos E2E restrito a execucao manual

### HARDENING DE HISTORICO IMUTAVEL

A auditoria do `e2e/anamnesis-clarifications.spec.mjs` confirmou que o fluxo grava `anamnesis_clarification_requests` e `anamnesis_clarification_responses` ligados a uma Anamnese ja submetida. Esses registros representam historico append-only e nao sao removidos no cleanup de credenciais.

A consulta ao Supabase SaaS encontrou 2 pedidos E2E e 1 resposta E2E historicos existentes. Eles foram preservados; nenhum hard delete foi executado.

O workflow `.github/workflows/e2e-anamnesis-clarifications.yml` deixou de disparar em `pull_request` e passa a aceitar apenas `workflow_dispatch`. Uma regressao de seguranca rejeita `pull_request`, `push` ou `schedule` nesse workflow.

Nao executar esse smoke como rotina de CI. Nova execucao manual so deve ocorrer no `master`, quando houver mudanca material no fluxo de esclarecimentos que justifique novo historico sintetico permanente, e exige digitar `CREATE_E2E_HISTORY` no input de confirmacao do workflow.

## 2026-09-26 - Smokes E2E de producao restritos ao master

### HARDENING DE EXECUCAO

Todos os workflows `.github/workflows/e2e-*.yml` que exercitam o ambiente de producao passam a exigir `github.ref == 'refs/heads/master'` no job.

Motivo: um workflow manual disparado a partir de branch de desenvolvimento faria checkout do spec/codigo daquela branch, mas continuaria apontando `E2E_BASE_URL` e Supabase para producao. Isso poderia misturar codigo nao mergeado com dados/estado de producao.

Uma regressao de seguranca varre todos os workflows E2E e falha se algum deixar de conter o gate de `master`.

Nenhuma migration, schema/RLS ou regra de produto foi alterada.
## 2026-09-26 - Rodada ampliada do metodo da Patty incorporada

### DOCUMENTACAO PROFISSIONAL ATUALIZADA

O roteiro `Metodo de Atendimento e Tomada de Decisao` preenchido pela Patty em 2026-09-26 foi reconciliado com a documentacao oficial.

Foram promovidos como regras/praticas confirmadas apenas os pontos suficientemente claros sobre leitura holistica da Anamnese, adaptacao de refeicoes, solicitacao de treino, uso de medidas/fotos e atencao a comportamento/relacao com comida.

Permaneceram explicitamente abertas e nao automatizaveis as afirmacoes sobre contagem de gordura/legumes, gordura saturada, suplementacao/manipulados, criterios de encaminhamento, minimo de treino, estagnacao e revisao em 30 dias.

A fonte interpretada desta rodada esta em `docs/PATTY_METHOD_SURVEY_20260926.md`.
## 2026-09-26 - Visao profissional da Anamnese

### IMPLEMENTADO

A leitura administrativa da Anamnese ganhou uma visao de trabalho agrupada conforme a pratica confirmada pela Patty:
- rotina, sono e alimentacao;
- saude, exames e uso de substancias;
- comportamento, contexto e autoimagem;
- atividade e objetivos.

A organizacao usa somente perguntas/respostas originais ja persistidas. Nao cria score, diagnostico, severidade, alerta clinico ou interpretacao automatica. A secao original completa continua disponivel abaixo da visao de trabalho.

A logica de agrupamento esta isolada em `lib/anamnesis/professional-review.ts` e possui teste deterministico.
## 2026-09-26 - Evolucao operacional a partir da rodada da Patty

### IMPLEMENTADO NA BRANCH DE PRODUTO

As seis frentes autorizadas foram implementadas sem ampliar regras profissionais abertas:
1. visao profissional agrupada da Anamnese, preservando respostas originais;
2. cadencia corporal confirmada + comparacao factual com a avaliacao anterior, sem interpretar tendencia/estagnacao;
3. historico append-only de solicitacao de treino, com admin/AAL2/assignment ativo e sem geracao automatica;
4. apoio ao rascunho alimentar com contexto alimentar da Anamnese e resumo das doses ja persistidas, sem redistribuicao automatica;
5. area de atencao comportamental para revisao humana, sem score, severidade ou diagnostico;
6. contexto de saude + exames/documentos recentes na revisao administrativa, sem recomendacao automatica.

As migrations desta rodada estao aplicadas no Supabase SaaS e alinhadas ao historico remoto: `20260926233725_create_client_training_requests.sql` e `20260926233849_optimize_client_training_request_rls.sql`. A primeira cria o historico append-only; a segunda remove a reavaliacao por linha de `auth.jwt()` das policies permissivas, mantendo AAL2 na policy `RESTRICTIVE` transversal. O advisor deixou de reportar `auth_rls_initplan` para `client_training_requests`. Smoke transacional pos-apply com fixtures sinteticas e `ROLLBACK` confirmou: admin AAL2 com assignment ativo consegue inserir/ler; AAL1 nao enxerga a linha; outro admin AAL2 sem assignment para a cliente nao enxerga a linha; residuos finais = 0.


## 2026-09-26 - Lifecycle operacional de Avaliacoes

### IMPLEMENTADO / CI PASS / APLICADO NO SAAS

Foi implementado o fluxo `rascunho -> finalizada` para Avaliacoes:
- criacao de rascunho quinzenal ou mensal por admin atribuido;
- ajuste de data/tipo enquanto draft;
- inclusao/atualizacao/remocao de medidas com chave e unidade explicitas;
- vinculo/desvinculo de fotos privadas existentes sem apagar o arquivo original;
- finalizacao explicita com imutabilidade posterior;
- decisoes profissionais vinculadas a avaliacao somente depois da finalizacao.

A migration passou em transacao com `ROLLBACK` antes do merge, o PR #210 fechou CI/build totalmente verde e o Supabase registrou o apply como `20260927002227_create_assessment_draft_lifecycle`. O arquivo local foi imediatamente reconciliado para esse version ID remoto, sem alterar o SQL aplicado. O smoke transacional pos-apply com `ROLLBACK` confirmou: admin AAL2 + assignment ativo cria/edita rascunho, atualiza medida, vincula foto e finaliza; AAL1 ve 0; outro admin AAL2 sem assignment ve 0; follow-up ligado a draft e bloqueado; avaliacao e medida finalizadas ficam imutaveis; residuos finais = 0.

Registros historicos existentes serao preservados como finalizados sem inventar `created_by_profile_id` ou `finalized_by_profile_id` quando esses atores historicos nao forem conhecidos.

O sistema nao valida automaticamente a completude quinzenal/mensal por chaves, porque catalogo mensal e unidades continuam abertos.

## 2026-09-27 - Cadastro Atual editavel

### IMPLEMENTADO

O fluxo de Cadastro Atual foi fechado para os quatro campos ja existentes:
- Cidade;
- Telefone;
- Email de contato;
- Instagram.

A cliente edita o proprio cadastro em `/cliente/perfil`. Patty/admin edita pela tela administrativa da cliente, mantendo assignment ativo + MFA AAL2 como pre-condicao.

A tabela `client_registration` continua com grant direto apenas de SELECT para `authenticated`. INSERT/UPDATE nao foram liberados ao browser. A escrita passa por Server Actions que primeiro resolvem ownership/assignment com o cliente autenticado normal e so depois usam uma boundary privilegiada `server-only`.

Email de login e email de contato permanecem independentes; editar Cadastro Atual nao altera Auth nem Anamnese historica.

Nenhuma migration foi necessaria.

## 2026-09-27 - Painel de pendencias operacionais

### IMPLEMENTADO NA BRANCH

A rota `/admin/pendencias` passa a consolidar somente estados operacionais explicitamente demonstraveis pelo backend acessivel a Patty/admin:

- Anamnese criada sem `submitted_at`;
- Anamnese enviada sem nota interna de revisao registrada;
- pedido de esclarecimento sem resposta registrada;
- avaliacao ainda em rascunho;
- versao de protocolo submetida sem aprovacao;
- versao de protocolo aprovada sem publicacao;
- execution de IA em `started` sem estado terminal.

Os itens sao ordenados pela data factual mais antiga primeiro, apenas para navegacao. Essa ordem nao representa prioridade profissional.

O painel nao calcula atraso, adesao, estagnacao, urgencia, risco clinico ou prioridade; nao transforma solicitacao de treino ou arquivo recebido em pendencia por inferencia.

A montagem usa somente consultas RLS ja existentes sob as atribuicoes ativas da Patty. Nao usa service role, nao cria tabela de pendencias e nao duplica estado derivavel.



## Atualizacao operacional - 2026-09-30

- PR #216 de reconciliacao documental foi mergeado no `master`;
- PR #217 integrou clonagem/comparacao de versoes de protocolo e readiness de Avaliacoes sobre o master reconciliado;
- migration remota `20260930131848_clone_protocol_version_draft` aplicada;
- fundacao de check-ins aplicada pelas migrations `20260930132221` e `20260930132354`;
- meta de liquidos usa snapshot de peso e 60 mL/kg, sem recalculo automatico;
- eventos de liquidos e atividade fisica sao append-only e nao geram score;
- resolucao manual de esclarecimentos foi materializada separadamente da resposta da cliente;
- GitHub Actions continua com falha operacional de runner: jobs encerram sem steps; nao tratar como falha de codigo;
- Vercel do master `b1986e7` estava READY antes desta branch e sem erros de runtime nas ultimas 24h;
- advisor de seguranca do Supabase continua sem novo finding alem do warning conhecido de Leaked Password Protection.


## Atualizacao operacional consolidada - 2026-09-30

### PRODUCAO

- estado registrado naquela reconciliacao: `master` em `c56d6752c119ee873fcc39bb2b3d4c3af73cb224` e deployment `dpl_BiMMHaAutcYZJBpxQzwCdcv9LScz` `READY`;
- esse bloco e historico e nao representa o HEAD atual;
- estado revalidado em 2026-10-01: `master` em `a274b7fafb2e3aa32276833c38f583a132feba73`, producao `READY` mais recente em `d7c131d398174a6486d3b0d760afe4bec08b6d7d`;
- PRs #242, #243, #244 e #245 permanecem abertos em draft nesta revalidacao;
- GitHub Actions dos PRs atuais continua apresentando jobs encerrados antes de steps (`steps: null`), portanto nao usar esses fails isoladamente como evidencia de falha de codigo.

### SUPABASE SAAS

Migrations novas aplicadas nesta rodada:
- `20260930131848_clone_protocol_version_draft`;
- `20260930132221_create_client_checkins`;
- `20260930132354_add_anamnesis_clarification_resolutions`;
- `20260930134443_create_assessment_measurement_corrections`;
- `20260930151722_create_ai_finding_actions`;
- `20260930152158_harden_ai_finding_action_boundary`;
- `20260930152248_enforce_single_ai_finding_action`.

Advisor de seguranca apos os applies:
- nenhum novo finding de RLS/boundary;
- permanece somente o warning conhecido `auth_leaked_password_protection`.

### FUNCIONALIDADES EVOLUIDAS

- clonagem de versao de protocolo para novo draft sem copiar aprovacao/publicacao;
- Avaliacao Basica/Completa alinhadas aos nomes e catalogos confirmados;
- correcao append-only de medidas finalizadas, preservando valor original;
- check-in de liquidos com meta snapshot de `60 mL/kg`, eventos de ingestao e check-in diario de atividade fisica;
- resolucao manual append-only de esclarecimentos;
- indicador factual de primeiro lembrete devido em `created_at + 24h`, sem inferir canal ou envio;
- calculador isolado da Planilha Carb Cycle para fases numericas confirmadas, sem selecao automatica de Cutting;
- acoes humanas auditaveis de finding de IA: observacao interna ou anotacao propria, sem comunicacao automatica com cliente;
- snapshot historico alimentar desidentificado + validador fail-closed, sem importacao no catalogo ativo;
- fila historica de revisao da biblioteca de exercicios: 74 videos, 9 titulos genericos e 16 grupos de possivel duplicidade, todos ainda nao autorizados para publicacao.

### GITHUB ACTIONS - BLOQUEIO EXTERNO CONFIRMADO

O workflow `Validate application` continua sendo criado, mas o job encerra antes de receber runner e retorna `steps: null`.

Foi feito um diagnostico controlado no PR #236 trocando somente `ubuntu-24.04` por `ubuntu-latest`. O run `36737265951` apresentou exatamente o mesmo comportamento e o PR foi fechado sem merge.

Conclusao operacional: a falha nao esta demonstrada no YAML nem no label do runner; depende de intervencao de conta/quota/alocacao do GitHub Actions. Nao fazer reruns cegos.

### BLOQUEIOS EXTERNOS QUE PERMANECEM

- avaliacao sintetica real da OpenAI exige `OPENAI_API_KEY` em ambiente apropriado e conclusao do gate de dados de saude antes de dados reais;
- o primeiro video educacional aprovado continua bloqueado ate criacao/conexao de Vercel Private Blob, operacao nao exposta pela integracao disponivel;
- Leaked Password Protection permanece dependente da configuracao/plano do Supabase;
- canal real dos lembretes de esclarecimento continua sem decisao.


## Sistema totalmente parametrizável - 2026-09-30

### DECISÃO CONFIRMADA

O sistema deve ser totalmente parametrizável para regras de negócio, método, cálculos, templates e workflows.

Os valores atuais dos Excels e das regras confirmadas passam a ser templates iniciais versionados.

A Patty deve poder alterar esses valores globalmente e também sobrescrevê-los por cliente/protocolo/treino.

Exemplo:
- template: 3 séries x 12 repetições;
- cliente A: override para 4 x 12;
- cliente B continua usando o template vigente.

Exemplo:
- template: 1 g a cada 5 kg;
- Patty pode criar nova versão com 1,5 g a cada 5 kg;
- históricos anteriores continuam vinculados à versão usada.

Documento de referência: `docs/CONFIGURABLE_RULES.md`.

### CONSEQUÊNCIA TÉCNICA

Será necessário inventariar regras profissionais hoje hardcoded e migrá-las gradualmente para a camada configurável, preservando comportamento e histórico até a transição estar validada.


## Inventário de hardcodes profissionais - 2026-10-01

### AUDITADO / DOCUMENTADO

Foi criado `docs/PROFESSIONAL_RULE_HARDCODE_INVENTORY.md` com o primeiro inventário técnico da dívida de parametrização sobre o `master` `a274b7fafb2e3aa32276833c38f583a132feba73`.

Hardcodes ativos confirmados incluem:
- coeficientes e estrutura fixa do Carb Cycle;
- gramas por dose e limite do grupo proteico de maior gordura;
- macros de referência do Reconhecimento Metabólico;
- fator de hidratação de 60 mL/kg, inclusive em generated column/constraint de migration já aplicada;
- regra de 2 doses de legumes = 1 dose de carbo no validador da fonte histórica;
- tipos e catálogo obrigatório de Avaliação Básica/Completa;
- lembrete de esclarecimento em 24 horas;
- taxonomia atual de líquidos.

Também foi confirmado que não existe prescrição ativa de treino com valores como séries/repetições hardcoded; esse domínio deve nascer já parametrizado quando for implementado.

Nenhuma migration, schema, RLS ou runtime foi alterado por este inventário. Próximo passo técnico: desenhar o contrato de dados/motor configurável preservando compatibilidade com os snapshots e constraints já aplicados.


## Contrato tecnico da camada configuravel - 2026-10-01

### DOCUMENTADO / NAO IMPLEMENTADO

Foi criado `docs/METHOD_CONFIGURATION_CONTRACT.md`.

O contrato define:

- identidade logica de templates;
- versoes imutaveis apos ativacao;
- overrides versionados por cliente/protocolo;
- resolucao de precedencia;
- snapshot sets e snapshot items;
- JSON validado por schema conhecido;
- AST segura de formulas sem codigo arbitrario;
- unidades semanticas explicitas;
- RLS separado para templates globais, overrides e snapshots;
- estrategia incremental de compatibilidade para hidratacao, Avaliacoes e Carb Cycle;
- golden tests para provar equivalencia antes de remover hardcodes.

Nenhuma migration, schema, RLS ou runtime foi alterado nesta etapa.

Proximo passo tecnico recomendado: transformar esse contrato em uma proposta de migration pequena para a fundacao **sem conectar nenhum fluxo existente ainda**, incluindo RLS/grants e testes de banco, para revisao antes de qualquer apply.


## Proposta da foundation migration de configuracao - 2026-10-01

### DOCUMENTADA / NAO APLICADA

Foram criados, fora de `supabase/migrations`, tres artefatos de revisao:

- `docs/METHOD_CONFIGURATION_FOUNDATION_MIGRATION_PROPOSAL.sql`;
- `docs/METHOD_CONFIGURATION_FOUNDATION_PGTAP_PROPOSAL.sql`;
- `docs/METHOD_CONFIGURATION_FOUNDATION_MIGRATION_REVIEW.md`.

A proposta cria somente a fundacao relacional para templates, versoes, overrides e snapshots, com RLS e grants minimos. Nenhum fluxo atual passa a depender dela.

O Supabase CLI nao esta disponivel no ambiente desta sessao; portanto nenhum timestamp de migration foi inventado e nenhum arquivo oficial foi criado em `supabase/migrations`.

Estado:
- IMPLEMENTADO no repositorio: NAO;
- TESTADO em banco: NAO;
- APLICADO no Supabase SaaS: NAO;
- runtime alterado: NAO;
- migration antiga alterada: NAO.

Proximo gate: gerar a migration oficial com `supabase migration new create_method_configuration_foundation`, copiar o SQL revisado, adaptar o pgTAP, executar static gate/testes/advisors e somente depois considerar apply.


## Dry-run da foundation configuravel - 2026-10-01

### PASS / NENHUMA ALTERACAO PERSISTIDA

A proposta `docs/METHOD_CONFIGURATION_FOUNDATION_MIGRATION_PROPOSAL.sql` foi validada diretamente no Supabase SaaS dentro de transacao com `ROLLBACK`.

O gate confirmou criacao das 5 tabelas, RLS, policy MFA restritiva e grants minimos esperados. Consulta pos-rollback confirmou `0` tabelas da foundation persistidas.

Estado:
- proposta SQL validada no schema real: SIM;
- migration oficial criada: NAO;
- pgTAP oficial executado: NAO;
- migration history alterada: NAO;
- schema SaaS alterado: NAO;
- runtime alterado: NAO.

O warning de seguranca conhecido do projeto continua independente desta proposta; nao houve novo finding causado pelo dry-run.


### CHANGES REQUIRED - cadeia de overrides

Na revisao comportamental da foundation foi identificado que a proposta SQL atual possui apenas um `override_version_id` por snapshot. Esse desenho nao preserva a cadeia completa quando cliente e protocolo contribuem simultaneamente para a configuracao resolvida.

Correcao documentada: usar entidade associativa imutavel de overrides por snapshot com `precedence` e FKs concretas.

Consequencia operacional:
- a proposta atual NAO esta pronta para virar migration oficial;
- o dry-run anterior vale somente para a versao anterior;
- depois da correcao do SQL, o dry-run deve ser repetido;
- nada foi aplicado no SaaS;
- nenhuma migration history foi alterada.


## Foundation configuravel V2 - 2026-10-01

### DRY-RUN PASS / NAO APLICADA

A proposta V2 corrigiu o gap de auditoria da cadeia de overrides por snapshot por meio de entidade associativa imutavel com `precedence`.

Arquivos canonicamente candidatos:
- `docs/METHOD_CONFIGURATION_FOUNDATION_MIGRATION_PROPOSAL_V2.sql`;
- `docs/METHOD_CONFIGURATION_FOUNDATION_PGTAP_PROPOSAL_V2.sql`.

Dry-run no Supabase SaaS: PASS.
Pos-rollback: 0 tabelas da foundation persistidas.
Migration history: inalterada.

A V1 continua somente como historico de revisao e nao deve ser usada para gerar migration oficial.

Proximo gate: executar o companion pgTAP V2 em ambiente de teste apropriado e, somente depois, gerar a migration oficial pelo fluxo do Supabase CLI.


## Static gate V2 - 2026-10-01

### PASS / PGTAP AINDA NAO EXECUTADO

A foundation V2 recebeu novo static gate depois da correcao da cadeia de overrides e do companion pgTAP.

Cobertura confirmada: 6 tabelas, RLS/MFA, grants minimos, FKs client-scoped, cadeia cliente + protocolo, `precedence`, unicidade e imutabilidade.

Foi corrigido um erro de sintaxe no companion pgTAP V2 nos `throws_ok` de snapshot, usando dollar-quoting nomeado `$sql$...$sql$`.

Pendencia restante: executar o pgTAP V2 em ambiente de teste apropriado com pgTAP disponivel. O SaaS de producao nao foi alterado para instalar extensao ou criar usuarios sinteticos.
