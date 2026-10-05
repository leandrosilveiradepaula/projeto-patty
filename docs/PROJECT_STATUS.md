> Escopo atual: **sistema completo, de ponta a ponta**. O projeto nao e mais conduzido como MVP. Referencias historicas a MVP devem ser lidas como legado documental, nao como reducao de escopo.

# Estado Atual do Projeto Patty

Ultima atualizacao documental: 2026-10-04.

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

## Atualizacao operacional 2026-10-02

### Repositorio e CI

O `master` remoto inclui o PR #272 (hardening da finalizacao de arquivos privados por cliente) e o PR #273 (compatibilidade configuravel de hidratacao). O PR #273 foi reconstruido sobre o master atual para preservar as regressões de seguranca e teve os workflows `Validate application` e `Validate method configuration foundation` aprovados antes do merge.

O workflow de migrations continua com separacao deliberada entre preview e apply: pushes ao `master` executam `migration list` + `db push --dry-run`; apply de producao continua exclusivo de `workflow_dispatch` com `mode=apply` e confirmacao textual exata `APPLY`.

### Supabase / fila de migrations

O projeto `Projeto Corpo e Mente` permanece `ACTIVE_HEALTHY`. A verificacao direta pos-apply confirmou no SaaS:

- `20261001235018_seed_higher_fat_protein_limit_template.sql`: APLICADA;
- template `nutrition.protein.higher_fat_daily_limit`: ativo;
- `20261002005720_hydrate_client_targets_from_configuration.sql`: APLICADA;
- template `hydration.daily_target`: ativo, baseline 60 mL/kg com arredondamento `round`;
- RPC `create_hydration_target_from_method_snapshot`: presente como SECURITY INVOKER;
- EXECUTE da RPC: negado a `anon` e `authenticated`, permitido a `service_role`.

O advisor de seguranca pos-apply nao apontou regressao da migration de hidratacao. Permanece o warning independente e ja conhecido de Leaked Password Protection desabilitado.

A camada configuravel de hidratacao esta aplicada e integrada ao fluxo administrativo: a resolucao usa template ativo e override client-scoped sob RLS; a persistencia privilegiada ocorre em boundary server-only pela RPC atomica; novas metas preservam snapshot da configuracao e resultado. A leitura usa `resolved_target_ml` para o modo configurado e `target_ml` apenas como compatibilidade do historico legado. O caminho historico permanece preservado e questoes abertas de hidratacao continuam sem automacao.



## Atualizacao operacional 2026-10-03

### Snapshots e hardening de Avaliacoes/Liquidos

- PR #293 conectou os consumidores de avaliacao e liquidos às boundaries atomicas de snapshot;
- migration `20261002224033_snapshot_assessment_and_liquid_consumers.sql` esta aplicada no Supabase SaaS;
- PR #295 introduziu o hardening pos-rollout;
- migration `20261002231111_harden_snapshot_consumers.sql` esta aplicada e verificada no SaaS;
- novas finalizacoes de avaliacao exigem snapshot sem invalidar avaliacoes historicas;
- `authenticated` nao possui INSERT direto em `client_liquid_intake_events`;
- `authenticated` nao possui UPDATE amplo em `client_assessments`, mantendo somente os campos de rascunho permitidos;
- a funcao de lifecycle de avaliacao nao e executavel por `anon` nem `authenticated`.

### Reconciliacao do metodo

A rodada de confirmacoes de 2026-10-04 ampliou e reconciliou o fluxo profissional vigente:

```text
Reconhecimento Metabolico
-> Cutting 1
-> Up Metabolico
-> Cutting 2
-> Up Metabolico
-> Cutting 3
-> Up Metabolico
```

O Cutting 3 repete Linear -> Dia 1/Dia 2 -> Carb Cycle 2 Low/1 High. Bulking, Consolidacao e Manutencao existem como caminhos profissionais, mas suas escolhas e ajustes permanecem manuais/contextuais quando nao houver regra deterministica confirmada.

Na hidratacao, o template profissional vigente e 35 mL/kg/dia, com orientacao 70% agua pura / 30% outros liquidos zero calorias. A meta e recalculada prospectivamente quando novo peso e registrado; historico nao e reescrito.

O warning `auth_leaked_password_protection` continua conhecido e foi adiado; o projeto permanece no plano Free, no qual esse recurso nao esta disponivel.

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

Estado atual revalidado em 2026-10-01: o PR #246 restaurou o baseline verde e foi mergeado no `master` `407ecf24c192fa5ec5ec3a83b58ae6203f9ffe00`. O Vercel publicou esse mesmo commit em producao com estado `READY`. O gap temporario entre `master` e producao foi resolvido.

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
| Avaliacoes e medidas | Fundacao + cadencia profissional definida | Lifecycle operacional de rascunho/finalizacao implementado | CI/build PASS no PR #210 + pre-apply `ROLLBACK` PASS | `20260927002227_create_assessment_draft_lifecycle` APLICADA NO SAAS | Completa preferencialmente proxima de sexta/sabado; Basica no meio do intervalo; agenda nao fica presa ao mesmo dia numerico do mes |
| Protocolos versionados | SIM | Lifecycle manual implementado | CI/validacoes existentes | Backend/SaaS correspondente existente | Criacao/edicao profissional completa conforme regras ainda abertas |
| Conteudo educacional / exercicios | SIM como dominios separados | Fundacao/release + metadata de asset preparada | Inventario 89/89 revalidado; smoke transacional de assets PASS; pre-flight de integridade do primeiro video registrado | Vercel Private Blob privado `projeto-patty-blob` criado/conectado em `iad1`; upload ainda nao executado | Migrar controladamente o video aprovado, reverificar hash e validar entrega >100 MB antes de publicar/liberar explicitamente |
| Metodo da Patty | AMPLAMENTE DEFINIDO / ainda com pontos manuais | Motor determinístico existente/parcial; regras profissionais migram para configuração versionada e editável | CI | Fluxo confirmado ate Cutting 3 + Ups; hidratacao 35 mL/kg, equivalencias, catalogos e Carb Cycle 1-3 versionados | Parametrizar regras novas confirmadas, implementar treino prescrito configuravel e agenda/canais configuraveis do Feedback Semanal; Fases 4-6 e outros refinamentos seguem abertos |
| IA assistiva | SIM como principio e arquitetura; provider OpenAI confirmado | PARCIAL/AVANCADO | Adapter OpenAI + Structured Outputs + aliases + UI de revisao humana; avaliacao sintetica 5/5 PASS com `gpt-5.6-terra` / reasoning `medium`; latencia media 2.922 ms e 4.076 tokens totais no run `37135047413` | Prompt v1 aplicado; chamada com dados reais segue bloqueada | Controles efetivos de retencao/ZDR-MAM, projeto/credencial definitiva e conclusao do gate de dados de saude |
| Failure handling de IA | SIM | SIM no schema + boundary server-side | CI + invariantes deterministicas | `20260922160058` aplicada; provider adapter publicado, chamada com dados reais segue gated | Manter gate fechado ate controles organizacionais de dados; recovery automatico segue aberto |
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
- o fluxo principal confirmado segue Reconhecimento -> Cutting 1 -> Up -> Cutting 2 -> Up -> Cutting 3 -> Up;
- Cutting 3 repete Linear -> Dia 1/Dia 2 -> Carb Cycle 2 Low/1 High;
- existem regras confirmadas de refeicoes/jejum, macros/doses, grupos de proteina, legumes na contagem de carboidrato, meta de liquidos 35 mL/kg/dia e regras contextuais do Up Metabolico;
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
   - ESTADO REVALIDADO 2026-10-02: producao `READY` no commit `87b3830edd2c5a846f431164132347da8806aeef`, deployment `dpl_7iTtbWg9Mpafwq5RXenGEd27JGGD`; o deployment anterior do PR #270 tambem esta `READY`. Nao ha gap observado entre o ultimo `master` revalidado e producao.

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
- valores/formulas de qualquer etapa posterior ao Cutting 2, se vier a ser confirmada;
- definicao da etapa imediatamente posterior a Cutting 2: 2 Low / 1 High;
- Bulking detalhado;
- Consolidacao;
- eventual proporcao-alvo de agua pura, recalculo por mudanca de peso e cadencia dos lembretes;
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
5. CONCLUIDO: avaliacao sintetica operacional do fluxo OpenAI, run `37135047413`, 5/5 PASS; latencia total 14.611 ms, media 2.922 ms e 4.076 tokens. Proximo gate: controles efetivos de retencao/ZDR-MAM, definicao do projeto/credencial de producao e aprovacao explicita antes de dados reais.
6. Infraestrutura de midia educacional DEFINIDA e store privado `projeto-patty-blob` CRIADO/CONECTADO em `iad1`; proximo passo operacional e migrar controladamente o video aprovado da balanca, reverificar integridade e validar a entrega privada >100 MB antes de qualquer release.
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

A chamada externa para dados reais continua bloqueada por padrao. O default tecnico e `gpt-5.6-terra` com reasoning `medium`. A credencial para avaliacao sintetica foi configurada como GitHub Actions secret e o run `37135047413` aprovou 5/5 cenarios sinteticos, com latencia total de 14.611 ms, media de 2.922 ms e 4.076 tokens totais; para uso com dados reais ainda faltam confirmacao dos controles efetivos de privacidade/retencao e ZDR/MAM, definicao do projeto/credencial de producao, aprovacao humana e habilitacao explicita do gate `OPENAI_HEALTH_DATA_PROCESSING_ENABLED`.


## Rollout OpenAI controlado

O PR #151 foi mergeado no commit `3412c4f` e o deployment correspondente ficou `READY` em producao. A consulta de logs `error/fatal` da janela observada nao retornou eventos.

A chamada com dados reais continua desabilitada sem `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=true`. A `OPENAI_API_KEY` existe como secret do GitHub Actions para o workflow sintetico; isso nao habilita o runtime de producao nem autoriza dados de saude.

Foi criado `docs/OPENAI_HEALTH_DATA_GATE.md` como checklist operacional antes de dados reais e `npm run eval:ai:openai` como avaliacao do modelo usando somente fixtures sinteticas. Em 2026-10-03, o workflow manual `Evaluate OpenAI anamnesis review`, run `37135047413`, terminou SUCCESS com 5 cenarios aprovados e 0 falhas. O mesmo run mediu latencia e uso de tokens; a evidencia detalhada e a referencia oficial de preco estao registradas no gate.

O harness foi ampliado no PR #303 para coletar latencia e uso de tokens sem registrar prompt/resposta. Uma nova execucao manual ainda e necessaria para produzir essa evidencia operacional.

A revisao da documentacao oficial da OpenAI confirmou que `/v1/responses` e elegivel a ZDR, mas elegibilidade do endpoint nao significa ZDR ativo. A configuracao efetiva da organizacao/projeto/modelo ainda precisa ser verificada no OpenAI Platform. Para dados reais de saude, a recomendacao tecnica atual e preferir ZDR quando elegivel; sem confirmacao do controle de retencao, o gate permanece fechado.


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

O manifesto preserva o original, exige path opaco sem PII, armazenamento `vercel_blob` privado, verificacao de tamanho/MIME/SHA-256 e a sequencia explicita draft -> asset -> revisao humana -> publicacao -> release. Em 2026-10-03 foi feito um pre-flight somente leitura diretamente do arquivo aprovado no Drive: tamanho 123.262.796 bytes, MIME `video/mp4`, duracao 141,162667 s, video H.264 1920x1080, audio AAC e SHA-256 `ee05d6c12ea02db283234f5d69a09ff60c4d831183fe6715d7aa9848e76905b1`. Esse hash e apenas referencia esperada: o arquivo devera ser baixado e hasheado novamente antes do upload ao Blob. O teste deterministico compara os metadados da fonte com o inventario original e continua falhando fechado enquanto store, asset, publicacao e release nao existirem.

### PROVISIONAMENTO DO STORE CONCLUIDO / UPLOAD PENDENTE

Em 2026-10-03 o store `projeto-patty-blob` foi criado pelo dashboard do projeto Vercel, com acesso `private`, regiao `iad1` e conexao OIDC sem token read-write persistente. A integracao desta sessao continua sem operacao direta de Storage, portanto a criacao foi executada manualmente pelo usuario e verificada pela tela do projeto.

Estado preservado:
- nenhuma copia persistente do arquivo do Drive foi mantida; o pre-flight local temporario foi removido apos a verificacao de integridade;
- nenhum Blob foi enviado;
- nenhum `educational_content`, versao, asset ou release foi criado no Supabase;
- nenhuma publicacao foi realizada;
- os demais arquivos do Drive continuam fora deste lote.

O store privado ja esta criado/conectado. Em 2026-10-03 foi criada no Supabase a primeira versao educacional em draft para `Como utilizar a BALANCA DE ALIMENTOS` (`educational_content_id` `610df135-7c00-47a3-b978-2ba44411ae43`, `educational_content_version_id` `ae45c5db-e6af-46db-9230-b05bc4f5a5bd`). A versao permanece nao publicada, sem asset e sem release. A fonte foi baixada novamente do Drive em 2026-10-03 e reconfirmou 123.262.796 bytes e SHA-256 `ee05d6c12ea02db283234f5d69a09ff60c4d831183fe6715d7aa9848e76905b1`. O pathname opaco definido para o objeto e `educational-610df135-7c00-47a3-b978-2ba44411ae43-ae45c5db-e6af-46db-9230-b05bc4f5a5bd-primary.mp4`. A proxima operacao de midia e baixar novamente a fonte aprovada, reverificar tamanho/MIME/SHA-256, gerar path opaco e executar o upload privado. Como o arquivo aprovado possui ~117,6 MiB e a documentacao atual da Vercel recomenda cautela para servir Private Blob acima de 100 MB, publicacao/release fica adicionalmente condicionada a uma validacao de entrega/transferencia em producao; isso nao autoriza tornar o objeto publico.

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

Para `anamnesis_review`, OpenAI, prompt v1, Structured Outputs, aliases efemeros, contrato v1 de findings, boundary server-side e failure handling ja existem. O modelo `gpt-5.6-terra` com reasoning `medium` passou a avaliacao sintetica operacional (5/5); custo e latencia iniciais foram medidos no run `37135047413`. A configuracao permanece tecnica inicial ate os controles de dados reais serem concluidos.

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

A finalizacao de avaliacao usa a definicao ativa configuravel para validar prontidao e persiste snapshot da configuracao utilizada. Os codigos tecnicos historicos permanecem por compatibilidade; a regra de calendario para ancoras 29/30/31 continua aberta.

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
- estado revalidado posteriormente em 2026-10-01: PR #246 mergeado; `master` e producao Vercel alinhados em `407ecf24c192fa5ec5ec3a83b58ae6203f9ffe00`;
- PRs #242, #243, #244 e #245 permanecem abertos em draft nesta revalidacao;
- historicamente houve runs encerrados antes de receber steps (`steps: null`), mas em 2026-10-01 o runner voltou a executar normalmente; diagnosticos atuais devem usar os steps/logs reais.

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

### GITHUB ACTIONS - BLOQUEIO EXTERNO HISTORICO / RESOLVIDO

Em uma janela anterior, `Validate application` encerrava antes de receber runner e retornava `steps: null`; o diagnostico controlado do PR #236 reproduziu o comportamento com `ubuntu-24.04` e `ubuntu-latest`.

Em 2026-10-01 o runner voltou a executar normalmente. O PR #246 expôs e corrigiu tres problemas reais de baseline (nullability de RPC gerada, contagem estrutural do catalogo historico e inventario/revisao de security boundaries) e depois passou integralmente por typecheck, testes e build.

Conclusao operacional atual: o bloqueio externo nao esta ativo. Novas falhas devem ser tratadas pelos steps/logs reais; nao reutilizar o diagnostico antigo de `steps: null` sem nova evidencia.

### BLOQUEIOS EXTERNOS QUE PERMANECEM

- avaliacao sintetica inicial da OpenAI: CONCLUIDA com `OPENAI_API_KEY` em GitHub Actions; dados reais continuam dependentes da conclusao do gate de dados de saude;
- o Vercel Private Blob ja foi criado/conectado; o primeiro video educacional aprovado agora depende do upload controlado, verificacao pos-upload e validacao de entrega privada >100 MB;
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

- `docs/METHOD_CONFIGURATION_FOUNDATION_MIGRATION_PROPOSAL_V2.sql`;
- `docs/METHOD_CONFIGURATION_FOUNDATION_PGTAP_PROPOSAL_V2.sql`;
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

A proposta V2 `docs/METHOD_CONFIGURATION_FOUNDATION_MIGRATION_PROPOSAL_V2.sql` foi validada diretamente no Supabase SaaS dentro de transacao com `ROLLBACK`.

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


## CI baseline real - 2026-10-01

### DIAGNOSTICADO / CORRECAO ISOLADA EM PR #246

A revalidacao do GitHub Actions mostrou que o runner voltou a executar normalmente e a falha atual nao deve mais ser classificada apenas como problema externo de infraestrutura.

No PR #245, o workflow `Validate application` chegou ao typecheck e falhou em `lib/ai/ai-execution-persistence.ts` porque o typegen do Supabase registrou quatro parametros anulaveis da RPC `fail_ai_execution` como `string` em vez de `string | null`.

A correcao foi isolada no PR #246, sem alterar SQL, runtime behavior, RLS ou SaaS.

Ao avancar o pipeline do #246, foi identificado um segundo baseline stale: `lib/content/food-equivalent-source.test.ts` esperava 11 grupos, enquanto a fonte historica fail-closed atual possui 12. O teste foi alinhado para 12 sem alterar o catalogo historico ou promover qualquer item para conteudo ativo.

Consequencia:
- nao duplicar essas correcoes nos PRs #242-#245;
- PR #246: MERGEADO e baseline verde restaurado;
- PR #245: sincronizado com o novo `master` e em revalidacao;
- PRs #242-#244: devem ser atualizados/revalidados contra o novo baseline antes de qualquer merge;
- nenhuma dessas correcoes muda regra profissional.


### RESOLVIDO - PR #246 E VERCEL

O PR #246 passou integralmente por `Validate application` (typecheck, testes, security boundary e build) e foi mergeado no `master`.

Commit atual desse baseline: `407ecf24c192fa5ec5ec3a83b58ae6203f9ffe00`.

O Vercel criou deployment de producao correspondente e o estado e `READY`.

O PR #245 foi sincronizado por merge commit com esse baseline, sem duplicar as correcoes de CI em seu diff funcional.


## Parametrizacao - reconciliacao final do contrato de snapshot - 2026-10-01

### DOCUMENTADO

O contrato de snapshot foi reconciliado com a foundation V2: `method_configuration_snapshots` nao possui mais um unico `override_version_id` conceitual. A cadeia completa de overrides aplicados pertence a `method_configuration_snapshot_overrides`, com ordem por `precedence` e FKs concretas.

O PR #245 foi mergeado no `master` `1a404c501fc75c96caf78ef84f2f34909b33a461` e o deployment Vercel correspondente esta `READY`.

A foundation continua apenas documentada/dry-run/static-gate: nenhuma migration oficial foi criada ou aplicada no Supabase SaaS.


## Engine deterministico configuravel v1 - 2026-10-01

### IMPLEMENTADO NA BRANCH / AINDA NAO CONSUMIDO POR FLUXOS

Foi adicionado `lib/method/config-engine.ts` com validator/evaluator puro para a AST segura inicial e `lib/method/config-engine.test.ts` com dados exclusivamente sinteticos.

Escopo implementado:
- validacao fail-closed de configuracao;
- inputs e parametros com unidades explicitas;
- operadores `literal/input/parameter/add/subtract/multiply/divide/min/max/ceil/floor/round`;
- algebra de unidades limitada e explicita;
- divisao por zero bloqueada;
- numeros nao finitos bloqueados;
- limite de profundidade 32 e 256 nodes;
- arredondamento inteiro com empate afastando de zero;
- nenhum valor profissional hardcoded;
- nenhum acesso a Supabase;
- nenhum fluxo atual alterado.

Fora de escopo:
- resolver templates/overrides persistidos;
- criar snapshots;
- migrar doses/Reconhecimento/Carb Cycle;
- qualquer migration;
- UI administrativa;
- escolha de fase/protocolo.


## Desktop admin UX - PR #243 revalidado em 2026-10-01

### SINCRONIZADO COM O MASTER ATUAL

A branch do PR #243 foi reconciliada com o master apos a fundacao de parametrizacao e o engine deterministico v1, sem restaurar a versao antiga de PROJECT_STATUS.

O escopo continua exclusivamente de UX desktop administrativa:
- dashboard mais enxuto e orientado a acoes;
- linguagem operacional simplificada;
- navegacao/sidebar desktop;
- busca e estados vazios em modulos administrativos;
- apresentacao de datas em America/Sao_Paulo;
- ajustes visuais de upload e metricas.

Nao altera schema, RLS, regras profissionais, configuracao parametrizada ou migrations.

O antigo bloqueio de build-rate-limit do Vercel nao esta ativo; o gate atual passa a ser CI/build da branch sincronizada e validacao visual do deployment de producao apos merge.


## Migration oficial da foundation configuravel - 2026-10-01

### MATERIALIZADA NO REPOSITORIO / APLICADA NO SAAS

O filename oficial foi gerado pelo Supabase CLI em CI com:

`supabase migration new create_method_configuration_foundation`

Arquivo gerado:

`supabase/migrations/20261001213333_create_method_configuration_foundation.sql`

O pgTAP V2 foi promovido para:

`supabase/tests/database/method_configuration_foundation_v2.test.sql`

A branch desta etapa testa a migration commitada diretamente, sem recriar/copiá-la dentro do runner.

Estado:
- migration oficial no repositorio: SIM;
- filename gerado pelo CLI: SIM;
- pgTAP oficial no repositorio: SIM;
- apply no Supabase SaaS: SIM;
- migration history remota: `20261001213333` registrada;
- runtime da aplicacao alterado pela migration: NAO.

Gate antes de qualquer apply:
- db reset local completo;
- db lint --level error;
- pgTAP oficial;
- CI geral;
- advisors;
- revisao final de diff/migrations.


## Divergencia de migration history detectada - 2026-10-01

### RESOLVIDO NO REPOSITORIO / SAAS INALTERADO

A comparacao entre `supabase/migrations` e `supabase_migrations.schema_migrations` encontrou quatro migrations antigas com o mesmo nome logico e efeitos ja presentes no schema remoto, mas timestamps locais diferentes dos timestamps registrados no SaaS.

A reconciliacao foi executada no Git renomeando somente os arquivos locais para os timestamps remotos ja aplicados:

- `20260930131848_clone_protocol_version_draft.sql`
- `20260930151722_create_ai_finding_actions.sql`
- `20260930152158_harden_ai_finding_action_boundary.sql`
- `20260930152248_enforce_single_ai_finding_action.sql`

Cada rename foi validado comparando o blob SHA antes/depois; o conteudo SQL permaneceu byte a byte identico.

Nenhum `supabase migration repair` foi executado. Nenhuma linha de `supabase_migrations.schema_migrations` foi alterada. Nenhum SQL dessas quatro migrations foi reaplicado.

O schema remoto continua confirmando os efeitos esperados dessas migrations:
- `clone_protocol_version_draft(uuid,jsonb)`;
- tabela `ai_finding_actions`;
- RPC `record_ai_finding_action_server(...)`;
- constraint `ai_finding_actions_one_human_decision_per_finding`;
- trigger imutavel de `ai_finding_actions`;
- policy MFA AAL2.

A migration `20261001213333_create_method_configuration_foundation.sql` foi aplicada com sucesso no SaaS em 2026-10-01.

Proximo gate: validar a lista local/remota e executar o dry-run oficial da migration nova antes de qualquer apply.


## PWA instalavel - PR #242 revalidado em 2026-10-01

### MERGEADO / PUBLICADO

O PR #242 foi reconciliado com o master atual, passou pelo CI e foi mergeado. O deployment correspondente no Vercel ficou `READY` e assumiu o alias de producao `projeto-patty.vercel.app`.

Fundacao preparada:
- Web App Manifest em `app/manifest.ts`;
- modo `standalone`;
- icones 192x192, 512x512 e maskable gerados pelo Next.js;
- icone Apple;
- metadata mobile/theme;
- rotas de metadata e icones excluidas do proxy de sessao;
- sem service worker;
- sem cache offline de dados privados;
- sem push notification.

O monograma `C&M` continua sendo asset tecnico provisorio, nao identidade visual definitiva.

Gate atual: CI/build da branch sincronizada. Publicacao somente apos merge e deployment de producao `READY`.


## Foundation configuravel aplicada no SaaS - 2026-10-01

### APLICADA / VERIFICADA

O workflow manual `Deploy Supabase migrations` foi executado em duas etapas sobre o `master` `967ab68216d29a0b62489da4f6b2911b1f23ace1`.

Dry-run:
- workflow run `36937089977`: SUCCESS;
- `supabase migration list`: historico local/remoto alinhado;
- unica migration pendente: `20261001213333_create_method_configuration_foundation.sql`;
- `supabase db push --dry-run`: PASS;
- nenhuma alteracao persistida.

Apply:
- workflow run `36937276221`: SUCCESS;
- gate de confirmacao literal `APPLY`: PASS;
- preview: PASS;
- apply: PASS;
- verificacao de migration history apos apply: PASS.

Verificacao direta no Supabase SaaS apos o apply:
- migration `20261001213333` registrada: SIM;
- tabelas da foundation: 6/6;
- RLS habilitada: 6/6;
- policies RESTRICTIVE `admin_mfa_aal2_required`: 6/6;
- triggers de lifecycle/imutabilidade esperados: 6/6.

As seis tabelas aplicadas sao:
- `method_configuration_templates`;
- `method_configuration_versions`;
- `client_method_configuration_override_versions`;
- `method_configuration_snapshot_sets`;
- `method_configuration_snapshots`;
- `method_configuration_snapshot_overrides`.

Advisors de seguranca apos apply:
- nenhum novo finding critico decorrente da foundation;
- permanece o warning conhecido de Leaked Password Protection desabilitado.

Advisors de performance reportam FKs sem indice e indices ainda nao usados. Esses findings sao informativos e nao autorizam alteracao em massa sem carga/uso real e tarefa especifica.

Estado:
- IMPLEMENTADO NO REPOSITORIO: SIM;
- TESTADO EM CI/pgTAP: SIM;
- DRY-RUN OFICIAL: PASS;
- APLICADO NO SAAS: SIM;
- RLS/MFA/LIFECYCLE VERIFICADOS: SIM;
- runtime consumindo todos os templates: NAO;
- hardcodes profissionais totalmente migrados: NAO.

Manifest e icones publicos foram validados em producao com HTTP 200 para `/manifest.webmanifest`, `/pwa/icon-192`, `/pwa/icon-512`, `/pwa/maskable-512` e `/apple-icon`.


## Primeira migração de hardcodes profissionais - PR #253

### MERGEADA / APLICADA NO SAAS

Escopo desta etapa:
- doses de proteína, carboidrato e gordura;
- referência de macros do Reconhecimento Metabólico;
- proveniência explícita para baselines criados por migration.

Migration oficial:
- filename gerado pelo Supabase CLI no CI: `20261001230751_seed_initial_method_templates.sql`;
- não foi inventado timestamp;
- aplicada no Supabase SaaS em 2026-10-01 pelo workflow manual `Deploy Supabase migrations`.

Templates iniciais previstos:
- `nutrition.dose.protein` -> 15 g/dose;
- `nutrition.dose.carbohydrate` -> 12 g/dose;
- `nutrition.dose.fat` -> 6 g/dose;
- `nutrition.recognition.macros` -> proteína 2 g/kg, carboidrato 2 g/kg e gordura 50 g/dia.

Os valores acima são o baseline atual versionado e editável; não são constantes permanentes do runtime.

Proveniência:
- baselines de migration usam `created_by_kind = system`;
- `created_by_profile_id = null`;
- versões usam `source_kind = system_baseline`;
- não atribuir criação/ativação do baseline à Patty ou a um usuário real;
- alterações profissionais futuras continuam exigindo autoria humana.

Runtime:
- `lib/method/doses.ts` recebe configuração escalar; não contém mais 15/12/6;
- `lib/method/recognition.ts` executa configuração via engine; não contém mais 2/2/50;
- `lib/method/scalar-parameter.ts` valida configuração escalar fail-closed;
- golden tests reproduzem o baseline atual e valores alternativos.

Fora de escopo:
- limite do grupo de proteína com maior teor de gordura;
- hidratação;
- Carb Cycle;
- resolver server-side de overrides;
- snapshots em artefatos consumidores;
- UI de edição de templates.

Gate antes de merge/apply:
- application CI;
- db reset local;
- db lint;
- pgTAP da foundation;
- pgTAP dos templates iniciais;
- revisão de advisors e dry-run oficial antes de apply.


## Dry-run da primeira migracao de hardcodes - PR #253

### PASS / ROLLBACK CONFIRMADO

A migration `20261001230751_seed_initial_method_templates.sql` foi executada no Supabase SaaS dentro de `BEGIN ... ROLLBACK`.

O gate confirmou:
- alteracoes de proveniencia aceitas pelo schema atual;
- quatro templates iniciais criaveis;
- quatro versoes ativas com `created_by_kind = system`;
- `created_by_profile_id = null` para baseline de sistema;
- `source_kind = system_baseline`;
- ativacao de baseline de sistema sem impersonar perfil humano.

Validacao pos-rollback confirmou:
- coluna `created_by_kind` persistida: NAO;
- templates persistidos: 0;
- migration `20261001230751` registrada: NAO.

Portanto, o dry-run de compatibilidade com o SaaS real passou sem alteracao persistida.


## Aplicacao da primeira migracao de hardcodes - 2026-10-01

### APLICADA / VERIFICADA

A migration `20261001230751_seed_initial_method_templates.sql` foi aplicada em producao pelo workflow manual `Deploy Supabase migrations`.

Workflow:
- dry-run oficial: run `36941341151` — SUCCESS;
- apply oficial: run `36941886185` — SUCCESS;
- confirmation gate `APPLY`: PASS;
- preview: PASS;
- apply: PASS;
- verificacao de migration history: PASS.

Verificacao direta no Supabase SaaS:
- migration `20261001230751` registrada: SIM;
- coluna `created_by_kind` em templates: SIM;
- coluna `created_by_kind` em versions: SIM;
- templates seedados: 4/4;
- versoes ativas `system_baseline`: 4/4;
- autoria de sistema sem impersonar perfil: SIM;
- `activated_by_profile_id = null` somente para baseline de sistema: SIM.

Templates ativos:
- `nutrition.dose.protein` = 15 g/dose;
- `nutrition.dose.carbohydrate` = 12 g/dose;
- `nutrition.dose.fat` = 6 g/dose;
- `nutrition.recognition.macros` = proteina 2 g/kg, carboidrato 2 g/kg e gordura 50 g/dia.

Esses valores sao baseline versionado atual, nao constantes permanentes do runtime.

Advisors de seguranca apos apply:
- nenhum novo finding critico;
- permanece apenas o warning conhecido de Leaked Password Protection desabilitado.

Estado:
- runtime de doses parametrizado: SIM;
- runtime de Reconhecimento parametrizado: SIM;
- templates iniciais no SaaS: SIM;
- migration history atualizada: SIM;
- snapshots em consumidores operacionais: AINDA NAO;
- limite de proteina com maior teor de gordura: PARAMETRIZADO NO PR #255 / MIGRATION AINDA NAO APLICADA;
- hidratacao: AINDA HARDCODED.


## Migracao do limite de proteina com maior teor de gordura - PR #255

### IMPLEMENTADA NA BRANCH / AINDA NAO APLICADA NO SAAS

Escopo:
- somente o limite diario do grupo de proteina com maior teor de gordura;
- regra confirmada preservada: metade das doses totais de proteina, arredondando para cima.

Runtime:
- `lib/method/doses.ts` nao contem mais `Math.ceil(totalProteinDoses / 2)`;
- o helper executa `method_engine_v1`;
- input: `total_protein_doses` em dose;
- parametro: `higher_fat_ratio` em ratio;
- output: `max_higher_fat_protein_doses` em dose;
- arredondamento `ceil` pertence a AST da configuracao.

Golden tests:
- baseline: 8 -> 4, 7 -> 4, 9 -> 5;
- ratio alternativo: comprovado sem mudanca de codigo;
- arredondamento alternativo: comprovado sem mudanca de codigo;
- valores negativos/nao finitos continuam fail-closed.

Migration oficial:
- filename gerado pelo Supabase CLI em CI: `20261001235018_seed_higher_fat_protein_limit_template.sql`;
- template: `nutrition.protein.higher_fat_daily_limit`;
- baseline atual: ratio 0.5 + `ceil`;
- proveniencia: `system_baseline`;
- ainda nao aplicada no Supabase SaaS.

Fora de escopo:
- hidratacao;
- Carb Cycle;
- legumes;
- snapshots em consumidores operacionais;
- UI administrativa de configuracao.

Gate antes de merge/apply:
- application CI;
- db reset local;
- db lint;
- foundation pgTAP;
- initial-template pgTAP;
- higher-fat protein pgTAP;
- dry-run transacional no SaaS;
- dry-run oficial antes de apply.


## Dry-run do limite de proteina com maior teor de gordura - PR #255

### PASS / ROLLBACK CONFIRMADO

A migration `20261001235018_seed_higher_fat_protein_limit_template.sql` foi executada no Supabase SaaS dentro de `BEGIN ... ROLLBACK`.

O gate confirmou:
- template `nutrition.protein.higher_fat_daily_limit` criavel;
- versao 1 ativa com proveniencia `system_baseline`;
- `higher_fat_ratio = 0.5`;
- operador de arredondamento `ceil` preservado na configuracao.

Validacao pos-rollback confirmou:
- migration `20261001235018` registrada: NAO;
- template persistido: 0.

Validacao local do mesmo estado de codigo:
- db reset: PASS;
- db lint --level error: PASS;
- foundation pgTAP: PASS;
- initial-template pgTAP: PASS;
- higher-fat protein limit pgTAP: PASS.

Portanto, a migration esta validada mas ainda nao aplicada no SaaS.


## Atualizacao 2026-10-03 - Produto navegavel e Feedback Semanal real

A prioridade operacional foi ajustada para aproximar o sistema de uma avaliacao real pela Patty, evitando rotas demonstrativas paralelas.

Concluido nesta rodada:
- PR #313 de "demo workspace" foi fechado sem merge; nenhuma rota fake entrou no `master`;
- a tela real `/admin/clientes/[clienteId]` foi consolidada para mostrar o estado real de Anamnese, Avaliacoes, Protocolos, Arquivos, Conteudos, Check-ins e Treino, com navegacao para os fluxos existentes;
- migration `20261003202254_create_weekly_feedback_flow` aplicada no Supabase SaaS;
- migration `20261003202404_validate_weekly_feedback_submission` aplicada no Supabase SaaS;
- Feedback Semanal v1 publicado com 21 perguntas;
- telas reais administrativas e da cliente implementadas na branch `codex/weekly-feedback-flow`;
- smoke transacional com fixture sintetica e `ROLLBACK` confirmou: rascunho parcial permitido, envio incompleto rejeitado, envio completo aceito e imutabilidade apos envio;
- Security Advisor pos-apply nao apresentou regressao nova; permanece somente o warning conhecido de Leaked Password Protection do plano atual.

Pendente operacional que nao bloqueia o restante do desenvolvimento:
- executar o bootstrap controlado da identidade Auth real da Patty e vincular `Profile -> role admin`; o procedimento automatizado foi integrado ao `master` e depende apenas da execucao manual com o email real.

Automacao externa do Feedback Semanal ainda nao foi ativada. Agenda, prazo operacional, elegibilidade, email/WhatsApp e lembretes permanecem configuracoes/decisoes abertas; o produto ja possui o nucleo real de solicitacao/resposta para ser exercitado assim que houver acesso administrativo real.


## Atualizacao 2026-10-04 - Visao factual de evolucao da cliente

### MERGEADA / PUBLICADA

PR #317 mergeado no `master`; deployment Vercel correspondente validado com sucesso.

Objetivo:
- tornar o acompanhamento longitudinal mais navegavel para a Patty usando exclusivamente fatos ja registrados nas avaliacoes finalizadas.

Implementado:
- nova rota `/admin/clientes/[clienteId]/evolucao`;
- agrupamento longitudinal por `measurement_key` e unidade;
- uso do valor corrigido vigente quando houver correcao append-only;
- ordenacao cronologica;
- diferenca matematica contra o registro anterior da mesma medida/unidade;
- link de cada ponto para a avaliacao de origem;
- entrada `Evolucao` na navegacao da cliente administrativa;
- atalho a partir da pagina de Avaliacoes;
- teste deterministico para ordenacao, delta e separacao de unidades.

Invariantes preservadas:
- nenhuma classificacao automatica de melhora, piora, sucesso ou estagnacao;
- nenhuma regra de adesao ou mudanca de protocolo;
- nenhuma nova migration;
- nenhuma alteracao de RLS;
- nenhuma exposicao das avaliacoes para a cliente;
- nenhuma conversao automatica entre unidades diferentes.


## Atualizacao 2026-10-04 - Recuperacao de senha

### MERGEADA / PUBLICADA

PR #319 mergeado no `master`; deployment Vercel correspondente validado com sucesso.

Implementado:
- link `Esqueci minha senha` no login;
- solicitacao de recuperacao por email com `resetPasswordForEmail`;
- resposta neutra quanto a existencia da conta;
- callback PKCE server-side em `/auth/recovery` usando `exchangeCodeForSession`;
- tela `/redefinir-senha` para nova senha;
- mesma regra tecnica de senha minima ja usada na ativacao inicial;
- encerramento da sessao de recuperacao apos a troca e retorno ao login.

Invariantes:
- sem nova tabela, migration ou RLS;
- sem revelar se o email informado possui conta;
- sem secret no browser;
- fluxo serve tanto admin quanto cliente;
- validacao real do email continua dependente da configuracao hospedada de Auth/SMTP e da redirect allowlist.


## Atualizacao 2026-10-04 - Bootstrap controlado da Patty admin

### INTEGRADO AO MASTER / EXECUTADO COM SUCESSO

Workflow integrado ao `master` pelo PR #320.

Foi preparado um procedimento manual e idempotente de bootstrap da unica admin de negocio:
- workflow `Bootstrap Patty admin`, restrito ao `master` e com confirmacao literal;
- reutiliza o secret server-side de Supabase ja usado pelos E2E;
- email e fornecido somente na execucao e nao fica commitado no repositorio;
- procura identidade Auth existente antes de convidar;
- cria `profile` somente se ausente;
- cria role `admin` somente quando nao ha role existente;
- recusa promover perfil ligado a `clients`;
- recusa role `client` ou estado ambiguo;
- em convite novo, tenta compensar Auth/profile/role se o provisionamento falhar;
- nao cria assignment nem acesso client-scoped automaticamente.

O workflow foi executado manualmente no `master` em 2026-10-04 e concluiu com sucesso. A identidade Auth real da Patty foi criada, o `profile` correspondente existe e a role `admin` foi confirmada no Supabase SaaS.


## Atualizacao 2026-10-04 - Solicitacao de treino pela cliente

### MERGEADA / PUBLICADA / POLICY APLICADA NO SAAS

A migration remota `20261004132337_allow_client_training_request_self_service` foi aplicada no Supabase SaaS e materializada no repositorio com o mesmo timestamp e SQL.

Implementado:
- cliente autenticada pode ler somente solicitacoes vinculadas ao proprio `client_id`;
- cliente pode inserir solicitacao somente em proprio nome;
- historico continua append-only, sem UPDATE/DELETE;
- nova rota `/cliente/treino` com formulario e historico;
- area inicial da cliente passa a expor o modulo Treino;
- Patty continua visualizando o mesmo historico administrativo ja existente.

Limite:
- solicitar treino nao cria prescricao, nao seleciona exercicios e nao altera protocolo automaticamente.


## Atualizacao 2026-10-04 - Avaliacoes e evolucao para a cliente

### MERGEADA / PUBLICADA / RPC SEGURA APLICADA NO SAAS

Migrations aplicadas no Supabase SaaS:
- `20261004132649_allow_client_finalized_assessment_read` — etapa inicial, posteriormente substituida;
- `20261004132902_secure_client_assessment_effective_read` — introduziu leitura de valor vigente;
- `20261004132955_move_client_assessment_reader_to_private_schema` — estado final, com SECURITY DEFINER em schema nao exposto e wrapper publico SECURITY INVOKER.

Estado final:
- a cliente nao recebe SELECT direto nas tabelas de avaliacoes, medidas ou correcoes por causa desta feature;
- a RPC publica retorna somente avaliacao, data, tipo historico, chave da medida, valor vigente e unidade;
- autoria e nota de correcao nao sao retornadas;
- somente avaliacoes finalizadas da propria cliente entram na leitura;
- novas rotas `/cliente/avaliacoes` e `/cliente/evolucao`;
- evolucao e puramente numerica e nao classifica melhora, piora, sucesso ou estagnacao;
- fotos de avaliacao e follow-ups profissionais continuam fora da leitura da cliente nesta etapa.


## Atualizacao 2026-10-04 - Biblioteca de exercicios para a cliente

### MERGEADA / PUBLICADA / POLICY APLICADA NO SAAS

A migration `20261004133243_allow_client_published_exercise_read` foi aplicada no Supabase SaaS.

Escopo:
- cliente autenticada pode ler somente `exercise_versions` publicadas;
- drafts continuam invisiveis;
- nenhuma escrita foi aberta;
- nova rota `/cliente/exercicios`;
- a biblioteca mostra somente os campos existentes e confirmados da foundation atual: nome, versao e data de publicacao;
- a UI explicita que biblioteca de exercicios nao equivale a treino prescrito.

A biblioteca esta vazia no SaaS neste momento. Migracao/autoria de exercicios reais continua separada e sujeita a revisao/taxonomia/direitos.


## Atualizacao 2026-10-04 - Link manual de ativacao de cliente

### MERGEADO / PUBLICADO / SEM ALTERACAO DE SCHEMA

Foi adicionado fallback de onboarding que usa `auth.admin.generateLink({ type: "invite" })` sem enviar email.

Fluxo:
- Patty/admin informa o email de autenticacao;
- Supabase gera um `hashed_token` de convite sem disparar email;
- o mesmo provisionamento relacional do onboarding automatico cria profile, role client, client e assignment;
- a Server Action monta um link para `/auth/confirm?token_hash=...&type=invite`;
- o link aparece apenas no estado da pagina administrativa autenticada para copia manual;
- a cliente abre o link, a rota confirma o OTP e segue para `/ativar-conta` para definir a senha;
- token/link nao e persistido nem registrado em logs.

Esse fallback remove SMTP como bloqueio do primeiro onboarding. SMTP continua recomendado para automacao, recuperacao de senha por email e melhor operacao em escala.


## Atualizacao 2026-10-04 - Link manual de recuperacao de acesso

### MERGEADO / PUBLICACAO EM VALIDACAO / SEM ALTERACAO DE SCHEMA

Foi adicionado fallback administrativo de recuperacao que usa `auth.admin.generateLink({ type: "recovery" })`.

Fluxo:
- Patty/admin abre a cliente ja acessivel por assignment;
- o servidor usa `profile_id` para localizar a identidade Auth e o email de autenticacao, sem pedir ou expor esse email na URL;
- Supabase gera `hashed_token` de recovery sem enviar email;
- a Server Action monta link para `/auth/recovery-token?token_hash=...&type=recovery`;
- a rota valida o token com `verifyOtp` e redireciona para `/redefinir-senha`;
- a propria cliente define a nova senha;
- token/link nao e persistido nem registrado em logs.

Isso remove SMTP como bloqueio para suporte manual de recuperacao de senha. O fluxo automatico `Esqueci minha senha` continua disponivel quando email estiver configurado.


## Atualizacao 2026-10-04 - Compatibilidade com convite implicito do Supabase

### IMPLEMENTADA NA BRANCH

O convite real enviado pelo Supabase no bootstrap administrativo foi observado chegando em `/login#access_token=...&refresh_token=...&type=invite`.

Como fragmentos `#...` nao sao enviados ao servidor, a pagina de login agora:
- detecta somente fragmentos com `type=invite`;
- remove imediatamente o fragmento sensivel da barra de endereco;
- cria a sessao com `supabase.auth.setSession` no browser;
- redireciona para `/ativar-conta`;
- rejeita convite incompleto/invalido;
- nao registra tokens em logs.

Essa compatibilidade existe para convites implicitos ja emitidos. O fluxo preferido continua sendo TokenHash/PKCE/manual link controlado.


## Atualizacao 2026-10-04 - Recuperacao implicita do Supabase

### MERGEADA / PUBLICADA

Os logs reais mostraram que o fluxo hospedado de recovery pode retornar ao aplicativo com tokens no fragmento `#access_token=...&refresh_token=...&type=recovery`, alem do fluxo PKCE.

Ajuste:
- novos pedidos de recovery usam `redirectTo=/redefinir-senha`;
- a pagina `/redefinir-senha` detecta se ja existe sessao server-side;
- sem sessao, o browser processa somente fragmentos `type=recovery`;
- o fragmento sensivel e removido imediatamente da barra de endereco;
- `setSession` cria a sessao em cookies e a pagina e recarregada;
- somente depois disso o formulario de nova senha aparece;
- links incompletos ou sem fragmento valido caem em estado invalido.

Todos os links de recovery emitidos antes desta correcao devem ser descartados durante o reteste.


## Atualizacao 2026-10-04 - Recovery PKCE confirmado em producao

### MERGEADA / PUBLICADA

Logs reais do Supabase mostraram que os links de recovery enviados em producao foram aceitos por `/verify` com status 303 e retornaram ao aplicativo em PKCE, usando `?code=...`.

Causa do falso "Link invalido ou expirado":
- `/redefinir-senha` nao processava o parametro `code`;
- o link era valido no Supabase, mas o aplicativo descartava o Auth Code antes de trocar por sessao.

Correcao:
- `/redefinir-senha` detecta `code` e encaminha para `/auth/recovery`;
- `/auth/recovery` chama `exchangeCodeForSession`;
- `sb_flow_id`, quando presente, e preservado;
- depois da troca, o usuario volta para `/redefinir-senha` com sessao em cookie;
- o fallback de fragmento implicito continua preservado para compatibilidade.

O reteste deve usar um link de recovery novo; Auth Codes anteriores sao single-use.


## Atualizacao 2026-10-04 - Gate final de redefinicao de senha

### MERGEADO / PUBLICADO

A pagina de redefinicao prioriza um fragmento de recovery novo sobre qualquer sessao antiga do navegador. O formulario de nova senha somente e liberado quando existe uma sessao valida criada pelo fluxo de recovery atual.

Isso evita trocar a senha da identidade errada em navegadores que ainda tenham sessao residual de teste. O PR #332 passou CI e foi publicado na Vercel.


## Atualizacao 2026-10-04 - Hidratacao v2 em 35 mL/kg

### APLICADO NO SUPABASE SAAS

A regra profissional de hidratacao confirmada pela Patty foi promovida por versionamento, sem alterar a migration historica nem reescrever snapshots:

- migration SaaS `20261004234325_activate_hydration_35_ml_per_kg` registrou a troca inicial usando a admin provisionada como ator;
- migration portavel `20261004235059_allow_system_config_retirement_and_reconcile_hydration_35` foi aplicada para tornar a mesma transicao reproduzivel em bancos novos sem criar usuario fake;
- `hydration.daily_target` v1 (60 mL/kg) aposentada e preservada;
- `hydration.daily_target` v2 ativa com 35 mL/kg;
- origem da v2 registrada como `confirmed_professional_rule`;
- dry-run transacional com `ROLLBACK` passou antes de cada apply;
- a reconciliacao portavel e idempotente: aceita v1/60 para promover v2/35 ou reconhece v2/35 ja ativa;
- verificacao pos-apply confirmou somente a v2 como ativa;
- Security Advisor sem nova regressao; permanece apenas o warning conhecido de Leaked Password Protection.

Novas metas resolvidas pelo runtime configuravel passam a usar a versao ativa. Historico legado de 60 mL/kg permanece intacto.

## Atualizacao 2026-10-04 - Rodada profissional encerrada e parametrizacao reforcada

### DEFINIDO / DOCUMENTADO

A rodada de levantamento profissional foi encerrada na pergunta 37.

Confirmacoes relevantes desta rodada incluem:
- Cutting 3 e fluxo posterior contextual;
- regras de Up, Bulking, Consolidacao e Manutencao;
- hidratacao 35 mL/kg e composicao 70/30 como orientacao;
- recalculo prospectivo por novo peso;
- correcao de check-ins pela cliente e pela Patty com auditoria;
- treino com estrutura inicial, campos por exercicio e progressao manual;
- agenda de Avaliacao Completa preferencialmente proxima de sexta/sabado;
- Feedback Semanal apos primeiro protocolo, toda segunda-feira, template 08:00, lembrete na quarta e canal configuravel por paciente;
- suplementacao/manipulados manuais;
- encerramento do acompanhamento contextual/manual.

### DIRECAO DE ARQUITETURA

O sistema deve ser parametrizavel para futura comercializacao. Valores atuais da Patty sao templates iniciais versionados, nunca constantes universais. A futura arquitetura de tenant/organizacao ainda nao foi definida e nao deve ser antecipada por inferencia.

### PROXIMO FOCO

Transformar as novas regras confirmadas em configuracoes versionadas e fluxos reais, priorizando funcionalidades navegaveis para Patty sem criar telas demonstrativas paralelas.


## Atualizacao 2026-10-04 - Edicao versionada de parametros profissionais

### IMPLEMENTADO NA BRANCH / BOUNDARY APLICADO NO SAAS

A area real `/admin/configuracoes` foi evoluida de consulta para edicao segura dos parametros numericos dos schemas atualmente suportados.

Implementacao:
- `scalar_parameter_v1` e `method_engine_v1` expoem apenas valores numericos reconhecidos;
- unidades, formulas e expressoes permanecem protegidas;
- salvar nunca altera uma versao ativa in-place: cria nova versao, aposenta a anterior e preserva historico;
- a acao administrativa exige Patty/admin autenticada com AAL2;
- o browser nao recebe service role nem INSERT/UPDATE direto nas tabelas de configuracao;
- concorrencia usa `expected_active_version_id`; alteracao stale e rejeitada;
- valores nao finitos ou nao positivos sao recusados neste editor v1;
- schemas estruturados, como Carb Cycle, Avaliacoes e taxonomia de liquidos, continuam somente leitura ate possuirem editor proprio.

### APLICADO NO SUPABASE SAAS

A migration `20261004235422_create_method_configuration_activation_boundary` foi aplicada.

O RPC interno `activate_method_configuration_version_server`:
- e `SECURITY INVOKER`;
- aceita apenas ator com role admin;
- e executavel somente por `service_role`;
- rejeita `anon` e `authenticated`;
- trava a versao ativa e rejeita escrita concorrente stale;
- preserva autoria, source reference e lifecycle versionado.

Dry-run transacional passou antes do apply. A verificacao pos-apply confirmou `service_role=true`, `authenticated=false` e `anon=false`. O Security Advisor nao apresentou nova regressao; permanece apenas o warning conhecido de Leaked Password Protection.

### ESTADO

A UI esta implementada nesta branch, mas ainda precisa passar CI, merge e publicacao antes de ser tratada como disponivel para Patty.


## Atualizacao 2026-10-05 - Feedback Semanal elegivel e agenda versionada

### APLICADO NO SUPABASE SAAS

- migration `20261005001804_gate_weekly_feedback_after_first_protocol_publication` aplicada;
- `client_weekly_feedbacks` so pode ser criado apos existir `protocol_publications` para a cliente;
- migration `20261005002026_seed_weekly_feedback_schedule_configuration` aplicada;
- template `weekly_feedback.schedule` v1 ativo com segunda-feira 08:00, lembrete quarta e fuso America/Sao_Paulo.

### MERGEADO NO MASTER

PR #339 mergeado no commit `d7ce9c2a00c24eb3ecc34c558db8caab672ce21c`.

- UI administrativa mostra se a cliente esta elegivel;
- botao manual fica indisponivel antes do primeiro protocolo publicado;
- action faz pre-check amigavel alem da barreira final de RLS;
- schema fechado `weekly_feedback_schedule_v1` criado e testado;
- area `/admin/configuracoes` ganhou editor especifico de dia/horario do feedback e dia do lembrete;
- cada alteracao cria nova versao pelo boundary de configuracao ja existente.

### RESOLVIDO EM 2026-10-05

A Patty confirmou a semana anterior completa, de segunda-feira a domingo, como periodo de referencia automatico.


## Atualizacao 2026-10-05 - Geracao automatica do Feedback Semanal

### APLICADO NO SUPABASE SAAS

- migration `20261005032000_generate_scheduled_weekly_feedback_requests` aplicada;
- Supabase Cron habilitado;
- job `weekly-feedback-generate-due` consulta a configuracao ativa a cada minuto e so gera quando o dia/horario local configurado coincide;
- migration `20261005032046_audit_scheduled_weekly_feedback_origin` aplicada;
- solicitacoes automaticas registram `request_source = schedule`, versao da agenda usada e nenhum falso autor humano.

### REGRA PROFISSIONAL RESOLVIDA

O periodo automatico e a semana anterior completa, de segunda a domingo.

Exemplo:
- geracao: 05/10/2026;
- periodo: 28/09/2026 a 04/10/2026.

### MERGEADO NO MASTER

PR #341 mergeado no commit `c9400cba703f4a76978081d178ac908883b538c1`.

- pgTAP cobre horario, periodo, origem, configuracao usada e idempotencia;
- tipos TypeScript atualizados para os novos campos do Feedback Semanal;
- historico administrativo mostra origem Manual/Automatica;
- CI de aplicacao e banco passaram antes do merge.
