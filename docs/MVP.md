# MVP

## Objetivo do MVP

### DECISAO CONFIRMADA

O MVP deve apoiar a digitalizacao e automacao parcial do atendimento da Consultoria Corpo e Mente, mantendo revisao profissional nos pontos sensiveis.

O MVP deve concentrar informacoes, conteudos, avaliacoes e protocolos em um ambiente privado, com historico preservado e controle da Patty sobre publicacao.

## Capacidades do produto

### DECISAO CONFIRMADA

O produto completo deve contemplar:

- conta propria para cada cliente;
- anamnese;
- medidas;
- fotos;
- exames e documentos;
- protocolos;
- avaliacoes e reavaliacoes;
- conteudos educacionais;
- exercicios;
- painel administrativo da Patty;
- IA assistiva;
- revisao e aprovacao da Patty antes da publicacao de protocolos.

## Escopo preliminar confirmado do MVP

### ESCOPO PRELIMINAR DO MVP

O MVP inicial deve incluir a fundacao necessaria para operar com seguranca:

- autenticacao;
- cadastro de clientes;
- perfis/permissoes;
- banco de dados;
- RLS;
- Storage privado;
- auditoria.

### ESCOPO PRELIMINAR DO MVP

O MVP inicial deve incluir anamnese e acompanhamento inicial:

- anamnese digital estruturada;
- historico de medidas;
- fotos de avaliacao;
- upload de exames e documentos;
- preservacao de historico.

### ESCOPO PRELIMINAR DO MVP

O MVP inicial deve incluir organizacao de conteudos:

- migracao e preservacao do conteudo atual do Google Drive;
- biblioteca educacional;
- trilhas de conteudo;
- progresso do cliente;
- biblioteca de exercicios separada.

### ESCOPO PRELIMINAR DO MVP

O MVP inicial deve incluir protocolos com controle humano:

- criacao de protocolos pela Patty;
- versionamento;
- revisao;
- aprovacao;
- publicacao controlada para o cliente.

A primeira versao nao deve depender de geracao automatica por IA.

### ESCOPO PRELIMINAR DO MVP

Em etapa posterior do MVP, a IA assistiva pode apoiar:

- resumo de informacoes;
- identificacao de pendencias;
- preparacao de contexto;
- alertas preliminares quando houver regras confirmadas;
- rascunhos para revisao humana.

A IA nunca publica diretamente o protocolo final.

### ESCOPO PRELIMINAR DO MVP

O MVP deve incluir avaliacoes:

- avaliacoes e reavaliacoes;
- comparacao de evolucao;
- preservacao das avaliacoes anteriores;
- possibilidade de criacao de nova versao de protocolo.

## Estado operacional do MVP em 2026-09-23

### FATO TECNICO/OPERACIONAL

O escopo acima descreve o que o MVP deve contemplar; ele nao significa que todos os itens ja estejam concluidos.

Estado resumido nesta data:
- autenticacao, identidade, clientes, RBAC/RLS e assignments possuem fundacao operacional;
- login por email + senha esta definido e o lifecycle sintetico de onboarding/ativacao passou E2E;
- MFA administrativo esta implementado e o enforcement em RLS foi aplicado no Supabase SaaS;
- Anamnese versionada possui fundacao de backend;
- rascunho da Anamnese possui persistencia no SaaS e integracao parcial de UI para retomar rascunho existente e salvar respostas `text`;
- a migration `20260923191554_fix_anamnesis_draft_delete_trigger.sql` existe e passou dry-run, mas ainda precisa ser aplicada no SaaS antes de repetir o smoke de rascunho;
- submissao final da Anamnese ainda nao esta implementada/liberada, embora a regra de produto ja esteja definida: todos os campos aplicaveis sao obrigatorios no envio final;
- correcoes posteriores da Anamnese pela Patty estao implementadas como historico append-only, sem sobrescrever a resposta original;
- arquivos privados possuem upload, validacao, visualizacao/download e auditoria; a excecao de acesso da Patty sem assignment esta implementada e a politica de retencao/hard delete continua aberta;
- avaliacoes, protocolos, conteudos e exercicios possuem fundacoes de backend, mas seus fluxos completos do MVP ainda nao estao concluidos;
- a IA permanece assistiva; a fundacao interna e partes deterministicas existem, mas a integracao real com provider e o fluxo completo de revisao/publicacao ainda nao estao concluidos;
- o `master` esta a frente do deployment de producao da Vercel por limite de builds; mudancas posteriores ao ultimo deploy bem-sucedido nao devem ser tratadas como publicadas/validadas em producao.

Para o estado operacional detalhado e os bloqueios atuais, consultar `PROJECT_STATUS.md`.

## Regras e detalhes pendentes da Patty

### QUESTAO ABERTA

Parte do metodo ja possui regras confirmadas e documentadas em `BUSINESS_RULES.md` e `DECISIONS.md`, incluindo Reconhecimento Metabolico, sequencia principal ate Cutting 2: 2 Low / 1 High, referencias iniciais de macros, conversoes de doses, limite do grupo de proteina com maior teor de gordura, regras confirmadas de Cutting Dia 1 / Dia 2 e a existencia da refeicao livre semanal no Up Metabolico.

Continuam pendentes, sem automacao enquanto nao houver confirmacao documentada:

- Fases 5 e 6 da Planilha Carb Cycle;
- etapas posteriores ao Cutting 2;
- Bulking detalhado;
- Consolidacao;
- hidratacao;
- suplementacao e manipulados;
- montagem e progressao definitiva de treino;
- cardio quando nao coberto por regra confirmada;
- criterios profissionais finais de avaliacao;
- regras de alertas/bloqueios profissionais;
- criterios completos de mudanca de fase alem do fluxo ja confirmado;
- demais regras clinicas/metodologicas ainda nao formalizadas.

Essas pendencias nao devem ser resolvidas por inferencia, exemplo individual ou recomendacao tecnica. Devem ser registradas e validadas pela Patty antes de virar regra do produto.

## Fora do MVP inicial

### FORA DO MVP INICIAL

Nao fazem parte do MVP inicial:

- publicacao automatica de dieta ou treino pela IA;
- mudanca automatica de fase;
- diagnostico medico automatico;
- interpretacao laboratorial completa automatica;
- fine-tuning de modelos;
- aplicativo mobile nativo;
- pagamentos;
- assinaturas;
- marketplace;
- integracoes extensas com WhatsApp;
- wearables;
- academias;
- complexidade com n8n ou LangGraph sem necessidade concreta.

## Criterios de sucesso do MVP

### DECISAO CONFIRMADA

O MVP sera considerado bem-sucedido quando:

- Patty conseguir localizar informacoes de uma cliente em um unico lugar;
- cliente conseguir preencher anamnese pelo celular;
- cliente conseguir enviar fotos e documentos de forma privada;
- conteudo atual do Drive puder ser disponibilizado de forma organizada;
- protocolos possuirem historico de versoes;
- protocolos exigirem aprovacao humana antes da publicacao;
- avaliacoes preservarem historico;
- IA reduzir trabalho de leitura e preparacao sem retirar o controle da Patty;
- cliente nao conseguir acessar dados de outra cliente;
- acoes criticas e aprovacoes puderem ser auditadas.

## Criterios para tarefas futuras

### RECOMENDACAO TECNICA

Tarefas futuras devem separar claramente descoberta, documentacao, implementacao, teste e publicacao.

Cada incremento deve ser pequeno o suficiente para revisao objetiva.
