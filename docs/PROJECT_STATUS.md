# Estado Atual do Projeto Patty

Ultima atualizacao documental: 2026-09-23.

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

O merge do PR #120, commit:

`602c6d5129b093fc092f7b87209f21d1eab574ca`

recebeu status Vercel `success` com a descricao `Deployment has completed` em 2026-09-23.

Isso confirma que um deployment de producao voltou a ser aceito para o estado incorporado ao `master`. Ainda nao marcar headers, correcoes administrativas ou rascunho como PRODUCAO VALIDADA apenas com esse status: os gates de runtime correspondentes permanecem pendentes.

## Estado operacional resumido

| Area | Definido | Implementado | Testado | Aplicado/publicado | Principal pendencia |
| --- | --- | --- | --- | --- | --- |
| Identidade Auth / Profile / Client | SIM | SIM | SIM em fluxos sinteticos relevantes | Fundacao operacional | Preservar separacao entre Auth, profile, client, Cadastro Atual e Anamnese |
| Login | SIM | SIM | E2E sintetico de login posterior aprovado | Email + senha | Recuperacao de acesso ainda precisa de regras operacionais completas |
| Onboarding por convite | SIM | SIM | E2E sintetico de ativacao aprovado | PARCIAL | Email real de convite depende de upgrade Supabase ou SMTP customizado; expiracao/reenvio continuam abertos |
| MFA administrativo | SIM | SIM | Smoke AAL1/AAL2 documentado | Enforcement RLS aplicado no SaaS | Leaked Password Protection bloqueada pelo plano atual |
| RBAC / RLS / assignments | SIM | SIM | Smokes documentados | Fundacao e fluxos administrativos principais operacionais | Novos papeis ficam fora do MVP; assignment continua regra geral para dados client-scoped |
| Cadastro Atual | SIM como entidade separada | SIM | Fundacao testada | Backend existente | Fluxo final de edicao cadastral pela cliente/Patty ainda aberto |
| Anamnese versionada | SIM | SIM | Fundacao testada | Backend existente | Questionario final, tipos de input, condicionais e aplicabilidade |
| Rascunho da Anamnese | SIM | PARCIAL | Smoke transacional pos-apply PASS; CI e smokes anteriores existentes | Persistencia aplicada; `20260923191554` aplicada e validada no banco | E2E de UI depende de deployment Vercel atualizado; depois continuar inicio automatico, tipos, autosave e submissao |
| Obrigatoriedade da Anamnese | SIM | Regra refletida na fundacao | N/A | Todos os campos aplicaveis sao obrigatorios no envio final | Formalizar aplicabilidade de perguntas condicionais |
| Correcao pos-envio da Anamnese | SIM | SIM | Smoke administrativo documentado | `anamnesis_answer_corrections` aplicada no SaaS | Workflow administrativo completo alem de notas/correcoes |
| Arquivos privados | SIM | PARCIAL/AVANCADO | Smokes cliente/admin + auditoria estatica | Acesso da Patty sem assignment confirmado em RLS/Storage/rotas, com MFA AAL2 | Politica de retencao/hard delete |
| Avaliacoes e medidas | Fundacao definida | SIM na fundacao | Parcial | Backend existente | Catalogo profissional, unidades, obrigatoriedade e correcao |
| Protocolos versionados | SIM | Lifecycle manual implementado | CI/validacoes existentes | Backend/SaaS correspondente existente | Criacao/edicao profissional completa conforme regras ainda abertas |
| Conteudo educacional / exercicios | SIM como dominios separados | Fundacao e releases parciais | Parcial | Backend existente | Migracao gradual do Drive, taxonomia, direitos e progresso |
| Metodo da Patty | PARCIALMENTE DEFINIDO | Regras matematicas confirmadas em codigo testavel | CI | Regras confirmadas documentadas | Fases 5/6, pos-Cutting 2, Bulking, Consolidacao, hidratacao, suplementacao, treino, alertas e criterios finais |
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
- `20260923191554_fix_anamnesis_draft_delete_trigger.sql`.

O apply de `20260923191554` terminou com sucesso e o `migration list` pos-apply mostrou o mesmo timestamp local/remoto. Em seguida, um smoke transacional com dados sinteticos e `ROLLBACK` confirmou: draft nao submetido pode ser excluido; submission enviada continua bloqueada com SQLSTATE `55000`; cliente A nao consegue ler submission da cliente B. O E2E de UI ainda depende de um deployment Vercel atualizado para validar o fluxo publicado.

## Regras profissionais que nao devem ser reabertas

Consultar `BUSINESS_RULES.md` para detalhes.

Resumo:
- todo acompanhamento comeca pelo Reconhecimento Metabolico;
- o fluxo principal confirmado vai ate Cutting 2: 2 Low / 1 High;
- existem regras confirmadas de refeicoes/jejum, macros/doses, grupos de proteina, Cutting Dia 1/Dia 2 e refeicao livre do Up Metabolico;
- adesao e central e nao existe score automatico de adesao;
- exemplos historicos individuais nao viram regra geral;
- formulas so entram em codigo quando confirmadas e documentadas.

## Anamnese: regras que nao devem ser reabertas

- todos os campos **aplicaveis** sao obrigatorios para o envio final;
- rascunho pode permanecer incompleto e ser retomado;
- depois do envio final, a cliente nao altera as respostas;
- somente a Patty pode registrar correcao posterior;
- correcao nao sobrescreve a resposta original;
- `missing_answer` continua bloqueado enquanto a aplicabilidade de perguntas condicionais nao estiver formalizada;
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
   - `master` esta a frente do deployment atual por limite de builds;
   - quando a Vercel voltar a aceitar build, confirmar SHA publicado e repetir gates de runtime relevantes.

2. **Email real de convite**
   - lifecycle tecnico e E2E sintetico existem;
   - template real esta bloqueado no plano/configuracao atual;
   - decidir entre upgrade do Supabase e SMTP customizado.

3. **Leaked Password Protection**
   - tentativa de habilitacao retornou limitacao de plano;
   - nao criar fallback inseguro.

## Pendencias profissionais principais

A lista autoritativa esta em `OPEN_QUESTIONS.md`.

Entre as principais:
- Fases 5 e 6 da Planilha Carb Cycle;
- etapas posteriores ao Cutting 2;
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

## Proximas frentes recomendadas

Ordem operacional sugerida, sujeita a revalidacao do HEAD:

1. executar os gates de runtime no deployment Vercel atual: headers HTTP, correcoes administrativas e rascunho da Anamnese;
2. concluir aplicabilidade/condicionais e questionario final da Anamnese;
3. concluir fluxo de submissao final da Anamnese;
4. resolver infraestrutura do email real de convite;
5. continuar integracao UI <-> backend real;
6. preparar execution real de IA com provider/modelo explicitamente definidos;
7. migrar conteudos do Drive gradualmente, apos direitos/taxonomia;
8. ampliar automacao de alimentacao/treino somente depois das regras profissionais correspondentes estarem documentadas.

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
