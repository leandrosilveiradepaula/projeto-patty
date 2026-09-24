# Estado Atual do Projeto Patty

Ultima atualizacao documental: 2026-09-24.

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

## Referencia atual de repositorio

O HEAD confirmado do `master` nesta atualizacao e:

`17876bfe33d49a037bf0aaf62bbcfe893f51941f`

Esse commit incorpora o PR #165, que adiciona observabilidade central de executions de IA nao terminais. Novos chats devem sempre revalidar o HEAD remoto antes de implementar qualquer mudanca.

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

O bloqueio temporario de `build-rate-limit` deixou de ser o estado atual.

Os gates funcionais foram executados com o codigo de aplicacao do commit `19d216bf2148e983d452f0555a2d1e740e1027ca`, que permanece contido no `master`. Merges exclusivamente documentais posteriores nao alteram essa evidencia. O deployment de producao do `master` permanece `READY`.

Em 2026-09-24, a validacao runtime contra `/login` confirmou os headers de seguranca esperados. O smoke E2E de producao do rascunho da Anamnese e o smoke administrativo de correcoes tambem passaram no run `35985899621`, depois de corrigidos dois seletores Playwright ambiguos. Consulta pos-smoke no Supabase confirmou `0` drafts E2E ativos e `0` correcoes E2E residuais.

Nao existe bloqueio atual de deployment Vercel para o `master`.

## Estado operacional resumido

| Area | Definido | Implementado | Testado | Aplicado/publicado | Principal pendencia |
| --- | --- | --- | --- | --- | --- |
| Identidade Auth / Profile / Client | SIM | SIM | SIM em fluxos sinteticos relevantes | Fundacao operacional | Preservar separacao entre Auth, profile, client, Cadastro Atual e Anamnese |
| Login | SIM | SIM | E2E sintetico de login posterior aprovado | Email + senha | Recuperacao de acesso ainda precisa de regras operacionais completas |
| Onboarding por convite | SIM | SIM | E2E sintetico de ativacao aprovado | PARCIAL / BLOQUEADO OPERACIONALMENTE | Gmail da Patty definido como Custom SMTP do MVP; configuracao manual de 2FA/App Password/SMTP/template ficou PENDENTE; validar entrega real depois; expiracao/reenvio continuam abertos |
| MFA administrativo | SIM | SIM | Smoke AAL1/AAL2 documentado | Enforcement RLS aplicado no SaaS | Leaked Password Protection bloqueada pelo plano atual |
| RBAC / RLS / assignments | SIM | SIM | Smokes documentados | Fundacao e fluxos administrativos principais operacionais | Novos papeis ficam fora do MVP; assignment continua regra geral para dados client-scoped |
| Cadastro Atual | SIM como entidade separada | SIM | Fundacao testada | Backend existente | Fluxo final de edicao cadastral pela cliente/Patty ainda aberto |
| Anamnese versionada | SIM | SIM + aplicabilidade + `single_choice` + mapa nao juridico v1 + submissao final | CI + smoke SQL pos-apply PASS | Tipos nao juridicos, 10 condicionais, ordem, ANAM-044 e envio final definidos/aplicados | ANAM-046 isolado em gate juridico objetivo (`ANAMNESE_CONSENT_GATE.md`) antes de materializar/publicar |
| Rascunho da Anamnese | SIM | SIM para salvar/retomar/enviar dentro dos tipos v1 suportados | Smoke pos-apply PASS; E2E anterior PASS para retomada `text`; UI final passou CI/build | Migration `20260924142453` aplicada; producao Vercel do commit `6b88dce` READY | ANAM-046 e publicacao da versao canonica para E2E completo |
| Obrigatoriedade da Anamnese | SIM | Regra + UI + validacao deterministica no banco | CI + smoke pos-apply PASS | `20260924142453` aplicada no SaaS; campo nao aplicavel nao bloqueia; incompleto aplicavel bloqueia | Validar E2E completo quando a primeira `client-anamnesis` for publicada |
| Correcao pos-envio da Anamnese | SIM | SIM | E2E administrativo de producao PASS em 2026-09-24 | Schema aplicado e rota/UI publicadas e validadas em producao | Resposta original continua separada de correcoes e esclarecimentos |
| Esclarecimentos pos-Anamnese | SIM | SIM | E2E autenticado admin -> cliente -> admin PASS no run `36053370894` | Schema e UI publicados; workflow E2E versionado no PR #155 | Lifecycle sem estado formal/prazo/notificacao continua aberto |
| Arquivos privados | SIM | PARCIAL/AVANCADO | Smokes cliente/admin + auditoria estatica | Acesso da Patty sem assignment confirmado em RLS/Storage/rotas, com MFA AAL2 | Politica de retencao/hard delete |
| Avaliacoes e medidas | Fundacao + cadencia profissional parcial definida | SIM na fundacao | Parcial | Backend existente | Quinzenal: cintura/abdomen/quadril/peso; mensal: todas as medidas + peso + fotos; falta catalogo mensal completo, unidades e correcao |
| Protocolos versionados | SIM | Lifecycle manual implementado | CI/validacoes existentes | Backend/SaaS correspondente existente | Criacao/edicao profissional completa conforme regras ainda abertas |
| Conteudo educacional / exercicios | SIM como dominios separados | Fundacao/release + metadata de asset preparada | Inventario 89/89 revalidado; smoke transacional de assets PASS | Vercel Private Blob definido para midia; store/upload ainda nao executados | Criar/conectar store privado, migrar video aprovado, verificar hash e publicar/liberar explicitamente |
| Metodo da Patty | PARCIALMENTE DEFINIDO | Regras matematicas confirmadas em codigo testavel | CI | Fluxo confirmado agora inclui Cutting 3 Linear apos Cutting 2: 2 Low / 1 High | Fases 5/6, regras internas/pos-Cutting 3, Bulking, Consolidacao, hidratacao, suplementacao, treino, alertas e criterios finais |
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
- `20260924215415_add_ai_failure_retention_constraints.sql`.

O apply de `20260923191554` terminou com sucesso e o `migration list` pos-apply mostrou o mesmo timestamp local/remoto. Em seguida, um smoke transacional com dados sinteticos e `ROLLBACK` confirmou: draft nao submetido pode ser excluido; submission enviada continua bloqueada com SQLSTATE `55000`; cliente A nao consegue ler submission da cliente B. Em 2026-09-24, o E2E de producao confirmou a retomada e persistencia de um rascunho existente no runtime publicado. A criacao inicial de nova Anamnese continua separada e depende da primeira versao canonica `client-anamnesis`.

## Regras profissionais que nao devem ser reabertas

Consultar `BUSINESS_RULES.md` para detalhes.

Resumo:
- todo acompanhamento comeca pelo Reconhecimento Metabolico;
- o fluxo principal confirmado agora segue ate Cutting 3 Linear;
- existem regras confirmadas de refeicoes/jejum, macros/doses, grupos de proteina, Cutting Dia 1/Dia 2 e refeicao livre do Up Metabolico;
- adesao e central e nao existe score automatico de adesao;
- exemplos historicos individuais nao viram regra geral;
- formulas so entram em codigo quando confirmadas e documentadas.

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
   - RESOLVIDO nesta rodada: `master` atual publicado como `READY`, headers validados e smokes de rascunho/correcoes aprovados em producao.

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
- regras detalhadas do Cutting 3 Linear e etapas posteriores a ele;
- Bulking detalhado;
- Consolidacao;
- hidratacao;
- suplementacao/manipulados;
- montagem/progressao definitiva de treino e cardio ainda nao coberto por regra confirmada;
- criterios profissionais finais de avaliacao/reavaliacao;
- alertas profissionais;
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

1. obter e documentar as respostas do gate `ANAMNESE_CONSENT_GATE.md` para fechar ANAM-046;
2. materializar a primeira `client-anamnesis`, revisar, publicar explicitamente e validar inicio, preenchimento condicional e envio final E2E;
3. RETOMAR quando houver acesso operacional: configurar Gmail Custom SMTP e validar convite real;
4. CONCLUIDO: fluxo autenticado admin <-> cliente de esclarecimentos validado em producao com fixture sintetica no run `36053370894`;
5. executar a avaliacao sintetica do fluxo OpenAI quando houver credencial de ambiente; provider, prompt v1 e contrato `anamnesis_review` ja estao implementados, mas dados reais continuam bloqueados pelo `OPENAI_HEALTH_DATA_GATE.md`;
6. infraestrutura de midia educacional DEFINIDA como Vercel Private Blob; proximo passo operacional e criar/conectar store privado e migrar controladamente o video aprovado da balanca;
7. ampliar automacao de alimentacao/treino somente depois das regras profissionais correspondentes estarem documentadas.

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
