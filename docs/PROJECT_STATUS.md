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

A reconciliacao documental foi incorporada ao `master` pelo PR #120 em 2026-09-23.

Merge commit:

`602c6d5129b093fc092f7b87209f21d1eab574ca`

A partir desse merge, novos chats devem usar `master` como referencia inicial para `AGENTS.md`, `docs/PROJECT_STATUS.md` e os demais documentos de fonte de verdade.

Antes de qualquer nova implementacao, revalidar o HEAD atual do `master` porque novos commits podem ter sido incorporados depois desse merge.

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
| Onboarding por convite | SIM | SIM | E2E sintetico de ativacao aprovado | PARCIAL | Email real de convite depende de upgrade Supabase ou SMTP customizado; expiracao/reenvio continuam abertos |
| MFA administrativo | SIM | SIM | Smoke AAL1/AAL2 documentado | Enforcement RLS aplicado no SaaS | Leaked Password Protection bloqueada pelo plano atual |
| RBAC / RLS / assignments | SIM | SIM | Smokes documentados | Fundacao e fluxos administrativos principais operacionais | Novos papeis ficam fora do MVP; assignment continua regra geral para dados client-scoped |
| Cadastro Atual | SIM como entidade separada | SIM | Fundacao testada | Backend existente | Fluxo final de edicao cadastral pela cliente/Patty ainda aberto |
| Anamnese versionada | SIM | SIM + aplicabilidade + `single_choice` + mapa nao juridico v1 + submissao final | CI + smoke SQL pos-apply PASS | Tipos nao juridicos, 10 condicionais, ordem, ANAM-044 e envio final definidos/aplicados | ANAM-046 isolado em gate juridico objetivo (`ANAMNESE_CONSENT_GATE.md`) antes de materializar/publicar |
| Rascunho da Anamnese | SIM | SIM para salvar/retomar/enviar dentro dos tipos v1 suportados | Smoke pos-apply PASS; E2E anterior PASS para retomada `text`; UI final passou CI/build | Migration `20260924142453` aplicada; producao Vercel do commit `6b88dce` READY | ANAM-046 e publicacao da versao canonica para E2E completo |
| Obrigatoriedade da Anamnese | SIM | Regra + UI + validacao deterministica no banco | CI + smoke pos-apply PASS | `20260924142453` aplicada no SaaS; campo nao aplicavel nao bloqueia; incompleto aplicavel bloqueia | Validar E2E completo quando a primeira `client-anamnesis` for publicada |
| Correcao pos-envio da Anamnese | SIM | SIM | E2E administrativo de producao PASS em 2026-09-24 | Schema aplicado e rota/UI publicadas e validadas em producao | Apos envio, entra direto em analise; falta definir UX/lifecycle do pedido de esclarecimento a cliente |
| Arquivos privados | SIM | PARCIAL/AVANCADO | Smokes cliente/admin + auditoria estatica | Acesso da Patty sem assignment confirmado em RLS/Storage/rotas, com MFA AAL2 | Politica de retencao/hard delete |
| Avaliacoes e medidas | Fundacao + cadencia profissional parcial definida | SIM na fundacao | Parcial | Backend existente | Quinzenal: cintura/abdomen/quadril/peso; mensal: todas as medidas + peso + fotos; falta catalogo mensal completo, unidades e correcao |
| Protocolos versionados | SIM | Lifecycle manual implementado | CI/validacoes existentes | Backend/SaaS correspondente existente | Criacao/edicao profissional completa conforme regras ainda abertas |
| Conteudo educacional / exercicios | SIM como dominios separados | Fundacao e releases parciais | Inventario original 89/89 revalidado; segunda passada metadata-only concluida | Video da balanca aprovado, mas arquivo original tem ~117,6 MiB e excede limite de 50 MB do Supabase Free; nenhuma migracao fisica feita | Decidir infraestrutura de midia educacional; depois copiar/versionar/publicar explicitamente |
| Metodo da Patty | PARCIALMENTE DEFINIDO | Regras matematicas confirmadas em codigo testavel | CI | Fluxo confirmado agora inclui Cutting 3 Linear apos Cutting 2: 2 Low / 1 High | Fases 5/6, regras internas/pos-Cutting 3, Bulking, Consolidacao, hidratacao, suplementacao, treino, alertas e criterios finais |
| IA assistiva | SIM como principio e arquitetura | PARCIAL | Validador deterministico de output | Fundacao de banco existente | Provider/modelo, execution boundary, UX de revisao |
| Failure handling de IA | SIM | SIM no schema versionado | Static gate aprovado | `20260922160058` confirmada no historico remoto do Supabase | Integrar execution real com provider sem quebrar invariantes |
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
- `20260924142453_anamnesis_final_submission_foundation.sql`.

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
- `missing_answer` so pode ser implementado consultando a aplicabilidade versionada ja formalizada; campo oculto nao pode ser tratado como ausente;
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
3. resolver infraestrutura do email real de convite;
4. continuar integracao UI <-> backend real;
5. preparar execution real de IA com provider/modelo explicitamente definidos;
6. decidir a infraestrutura de midia educacional para arquivos acima de 50 MB; depois preparar a migracao controlada do video aprovado da balanca;
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
