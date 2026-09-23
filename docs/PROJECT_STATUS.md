# Estado Atual do Projeto Patty

Ultima atualizacao documental: 2026-09-23.

Este arquivo e o ponto de entrada operacional para novos chats e agentes. Ele resume o estado do projeto e aponta para as fontes de verdade detalhadas.

Ele **nao substitui** `BUSINESS_RULES.md`, `DECISIONS.md`, `OPEN_QUESTIONS.md`, `DATA_MODEL.md`, `RBAC_RLS.md`, `ARCHITECTURE.md`, `MVP.md` ou `ANAMNESE.md`.

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
8. separar decisao, implementacao, teste, aplicacao, commit, push e publicacao.

Enquanto este estado ainda nao estiver incorporado ao `master`, a referencia documental desta rodada e a branch:

`codex/document-existing-draft-ui`

Um novo agente deve resolver o HEAD atual dessa branch antes de trabalhar. Nao assumir que o `master` contem as decisoes mais recentes.

## Legenda de estado

- **DEFINIDO**: regra ou decisao documentada.
- **IMPLEMENTADO**: existe implementacao no repositorio.
- **TESTADO**: existe evidencia documentada de teste.
- **APLICADO**: alteracao correspondente foi aplicada ao ambiente indicado.
- **PARCIAL**: somente parte do fluxo esta pronta.
- **PENDENTE**: ainda requer implementacao, decisao ou operacao.
- **BLOQUEADO**: existe dependencia externa ou operacional conhecida.

## Estado operacional resumido

| Area | Definido | Implementado | Testado | Aplicado/operacional | Principal pendencia |
| --- | --- | --- | --- | --- | --- |
| Identidade Auth / Profile / Client | SIM | SIM | SIM em fluxos sinteticos relevantes | Fundacao operacional | Preservar separacao entre Auth, profile, client, Cadastro Atual e Anamnese |
| Login | SIM | SIM | E2E sintetico de login posterior aprovado | Email + senha | Recuperacao de acesso ainda precisa de regras operacionais completas |
| Onboarding por convite | SIM | SIM | E2E sintetico de ativacao aprovado | PARCIAL | Email real de convite depende de upgrade Supabase ou SMTP customizado; regras de expiracao/reenvio continuam abertas |
| MFA administrativo | SIM | SIM | Smoke AAL1/AAL2 documentado | Migration de enforcement RLS aplicada no SaaS | Leaked Password Protection bloqueada pelo plano atual |
| RBAC / RLS / assignments | SIM | SIM | Smokes documentados | Fundacao e fluxos administrativos principais operacionais | Novos papeis ficam fora do MVP; manter assignment como regra geral para dados client-scoped |
| Cadastro Atual | SIM como entidade separada | SIM | Fundacao testada | Backend existente | Fluxo final de edicao cadastral pela cliente/Patty ainda aberto |
| Anamnese versionada | SIM | SIM | Fundacao testada | Backend existente | Questionario final, tipos de input, condicionais e regras de aplicabilidade ainda precisam ser fechados |
| Rascunho da Anamnese | SIM | PARCIAL | Smoke de persistencia documentado | Migration aplicada no SaaS; UI retoma rascunho existente e salva respostas `text` | Criacao/inicio automatico da submission, demais tipos de input, autosave definitivo e submissao final |
| Obrigatoriedade da Anamnese | SIM | Regra refletida na fundacao | N/A | Todos os campos aplicaveis sao obrigatorios apenas no envio final | Formalizar aplicabilidade de perguntas condicionais |
| Correcao pos-envio da Anamnese | SIM | SIM | Smoke administrativo documentado | `anamnesis_answer_corrections` aplicada no SaaS | Workflow administrativo completo de revisao alem de notas/correcoes |
| Arquivos privados | SIM | PARCIAL/AVANCADO | Ha smokes e decisoes de upload/download | Storage privado e varias migrations/rotas operacionais documentadas | Politica de retencao/hard delete; confirmar estado final da excecao de acesso da Patty sem assignment em todas as RLS/rotas |
| Avaliacoes e medidas | Fundacao definida | SIM na fundacao | Parcial | Backend existente | Catalogo profissional, unidades, obrigatoriedade e fluxo de correcao |
| Protocolos versionados | SIM | Fundacao existente | Parcial | Backend existente | Completar fluxos reais e regras profissionais ainda abertas |
| Conteudo educacional / exercicios | SIM como dominios separados | Fundacao existente | Parcial | Backend existente | Migracao gradual do Drive, taxonomias e regras finais de progresso/liberacao |
| Metodo da Patty | PARCIALMENTE DEFINIDO | Apenas regras matematicas confirmadas podem ser automatizadas | N/A | Regras confirmadas documentadas | Fases 5/6, etapas posteriores ao Cutting 2, Bulking, Consolidacao, hidratacao, suplementacao, treino, alertas e criterios finais |
| IA assistiva | SIM como principio e arquitetura | PARCIAL | Validador deterministico de output documentado | Fundacao interna existente | Integracao real com provider, UX de revisao e demais boundaries operacionais |
| Failure handling de IA | Contrato tecnico definido | PENDENTE | Static gates anteriores documentados em tarefas relacionadas | NAO considerar migration final aplicada | Criar/aplicar migration de `failure_stage`, `failure_code`, `failure_message` e failure response conforme contrato mais recente |
| n8n | SIM: nao usar inicialmente | N/A | N/A | Nao usado | Introduzir somente com caso concreto |
| LangGraph | SIM: nao usar inicialmente | N/A | N/A | Nao usado | Introduzir somente se fluxo de IA realmente justificar |
| VPS Hostinger | SIM: nao usar inicialmente | N/A | N/A | Nao usada | Introduzir somente por necessidade tecnica concreta |

## Regras profissionais que nao devem ser reabertas

Nao duplicar aqui os detalhes. Consultar `BUSINESS_RULES.md`.

Estado resumido:
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

1. **Email real de convite**
   - lifecycle tecnico e E2E sintetico existem;
   - template real esta bloqueado no plano/configuracao atual;
   - decidir entre upgrade do Supabase e SMTP customizado.

2. **Leaked Password Protection**
   - tentativa de habilitacao retornou limitacao de plano;
   - nao criar fallback inseguro.

3. **Failure handling de IA**
   - migration final permanece pendente;
   - nao assumir aplicada ate verificacao explicita de migrations local/remoto e SaaS.

## Pendencias profissionais principais

A lista autoritativa esta em `OPEN_QUESTIONS.md`. Entre as principais:
- Fases 5 e 6 da Planilha Carb Cycle;
- etapas posteriores ao Cutting 2;
- Bulking detalhado;
- Consolidacao;
- hidratacao;
- suplementacao/manipulados;
- montagem/progressao definitiva de treino e cardio ainda nao coberto por regra confirmada;
- criterios profissionais finais de avaliacao/reavaliacao;
- alertas profissionais;
- regras finais ainda nao formalizadas.

Nao automatizar esses pontos antes de confirmacao da Patty e atualizacao documental.

## Tarefas/documentacao recentes

Nesta rodada documental de 2026-09-23:
- `BUSINESS_RULES.md` ja contem as regras confirmadas do metodo;
- `OPEN_QUESTIONS.md` foi reconciliado para nao reabrir obrigatoriedade e correcao da Anamnese;
- `ANAMNESE.md` distingue inventario historico da regra atual de obrigatoriedade;
- `DATA_MODEL.md` foi alinhado ao modelo append-only de correcoes;
- `PRODUCT.md` foi alinhado ao onboarding por convite, ativacao e login por email + senha;
- `MVP.md` e `RBAC_RLS.md` devem permanecer alinhados a este estado e as decisoes mais recentes.

## Tarefa bloqueada conhecida

### Failure handling de IA

O contrato tecnico esta documentado, mas a migration final nao deve ser considerada criada/aplicada apenas com base em conversa.

Antes de retomar:
- verificar HEAD/branch;
- verificar migrations locais/remotas;
- confirmar schema atual de `ai_executions` e entidades relacionadas;
- preservar triggers, RLS, grants e imutabilidade;
- nao alterar migrations ja aplicadas.

## Proximas frentes recomendadas

Ordem operacional sugerida, sujeita a revalidacao pelo HEAD e pelas decisoes mais recentes:

1. manter documentacao coerente e este arquivo atualizado;
2. concluir reconciliacao de `MVP.md` e `RBAC_RLS.md`;
3. concluir fluxo de submissao final da Anamnese quando condicionais/aplicabilidade estiverem formalizadas;
4. fechar questionario final da Anamnese;
5. resolver infraestrutura do email real de convite;
6. retomar failure handling de IA quando o ambiente de desenvolvimento estiver acessivel;
7. continuar integracao UI <-> backend real;
8. migrar conteudos do Drive gradualmente;
9. ampliar automacao de alimentacao/treino somente depois das regras profissionais correspondentes estarem documentadas.

## Regra de manutencao deste arquivo

Uma tarefa que altere de forma material o estado do projeto deve atualizar este arquivo antes de ser considerada concluida.

Atualizar quando houver, por exemplo:
- nova decisao;
- nova regra confirmada pela Patty;
- questao aberta resolvida;
- migration criada/aplicada;
- fluxo implementado;
- teste relevante aprovado/falhado;
- bloqueio novo/removido;
- mudanca de prioridade;
- merge/publicacao que altere a referencia oficial.

Nao marcar um item como:
- implementado apenas porque foi decidido;
- testado apenas porque foi implementado;
- aplicado apenas porque a migration existe;
- pushed/merged apenas porque existe commit local;
- publicado apenas porque foi merged.

A atualizacao deve ser curta e apontar para os documentos detalhados em vez de duplicar regras extensas.
