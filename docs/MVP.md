# Sistema completo

## Objetivo do sistema completo

### DECISAO CONFIRMADA

O sistema completo deve apoiar a digitalizacao e automacao parcial do atendimento da Consultoria Corpo e Mente, mantendo revisao profissional nos pontos sensiveis.

O sistema completo deve concentrar informacoes, conteudos, avaliacoes e protocolos em um ambiente privado, com historico preservado e controle da Patty sobre publicacao.

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

## Escopo funcional confirmado

### ESCOPO CONFIRMADO DO SISTEMA

O sistema completo deve incluir a fundacao necessaria para operar com seguranca:

- autenticacao;
- cadastro de clientes;
- perfis/permissoes;
- banco de dados;
- RLS;
- Storage privado;
- auditoria.

### ESCOPO CONFIRMADO DO SISTEMA

O sistema completo deve incluir anamnese e acompanhamento inicial:

- anamnese digital estruturada;
- historico de medidas;
- fotos de avaliacao;
- upload de exames e documentos;
- preservacao de historico.

### ESCOPO CONFIRMADO DO SISTEMA

O sistema completo deve incluir organizacao de conteudos:

- migracao e preservacao do conteudo atual do Google Drive;
- biblioteca educacional;
- trilhas de conteudo;
- progresso do cliente;
- biblioteca de exercicios separada.

### ESCOPO CONFIRMADO DO SISTEMA

O sistema completo deve incluir protocolos com controle humano:

- criacao de protocolos pela Patty;
- versionamento;
- revisao;
- aprovacao;
- publicacao controlada para o cliente.

A primeira versao nao deve depender de geracao automatica por IA.

### ESCOPO CONFIRMADO DO SISTEMA

No sistema completo, a IA assistiva pode apoiar:

- resumo de informacoes;
- identificacao de pendencias;
- preparacao de contexto;
- alertas preliminares quando houver regras confirmadas;
- rascunhos para revisao humana.

A IA nunca publica diretamente o protocolo final.

### ESCOPO CONFIRMADO DO SISTEMA

O sistema completo deve incluir avaliacoes:

- avaliacoes e reavaliacoes;
- comparacao de evolucao;
- preservacao das avaliacoes anteriores;
- possibilidade de criacao de nova versao de protocolo.

## Escopo completo da Patty e da cliente

### DECISAO CONFIRMADA

O projeto nao usa mais "primeiro lancamento" para decidir o que entra ou fica para depois. Todos os fluxos confirmados para Patty e clientes fazem parte do sistema completo.

Para a Patty, isso inclui todos os itens administrativos ja confirmados: onboarding/convite, Cadastro Atual, Anamnese e correcoes historicas, esclarecimentos, arquivos privados, avaliacoes e comparacao, protocolos e versionamento, revisao/aprovacao/publicacao, liberacao de conteudos, solicitacoes de treino, painel de pendencias e assistencia de IA dentro dos gates aplicaveis.

Para a cliente, isso inclui Perfil/Cadastro Atual, Anamnese, fotos, exames/documentos, avaliacoes/medidas, protocolo alimentar, conteudos educacionais, biblioteca de exercicios, solicitacao e visualizacao de treino quando aplicavel, esclarecimentos, evolucao e os check-ins confirmados de liquidos e atividade fisica.

A ordem tecnica de implementacao pode ser priorizada, mas nao deve ser confundida com retirada de escopo.

## Estado operacional do sistema em 2026-09-24

### FATO TECNICO/OPERACIONAL

O escopo acima descreve o que o sistema completo deve contemplar; ele nao significa que todos os itens ja estejam concluidos.

Estado resumido nesta data:
- autenticacao, identidade, clientes, RBAC/RLS e assignments possuem fundacao operacional;
- login por email + senha esta definido e o lifecycle sintetico de onboarding/ativacao passou E2E;
- MFA administrativo esta implementado e o enforcement em RLS foi aplicado no Supabase SaaS;
- a Anamnese versionada possui rascunho persistente, `text`, `single_choice`, aplicabilidade condicional versionada e submissao final deterministica aplicados;
- a migration `20260924142453_anamnesis_final_submission_foundation.sql` consta no historico remoto; smoke pos-apply confirmou bloqueio de incompletude aplicavel e aceite de campo oculto;
- a `client-anamnesis` v1 esta publicada e validada; ANAM-046 integra a versao canonica como consentimento obrigatorio no envio final;
- correcoes posteriores da Anamnese pela Patty estao implementadas como historico append-only, sem sobrescrever a resposta original;
- arquivos privados possuem upload, validacao, visualizacao/download e auditoria; a excecao de acesso da Patty sem assignment esta implementada e a politica de retencao/hard delete continua aberta;
- avaliacoes possuem lifecycle de rascunho/finalizacao, catalogos configuraveis e snapshot/hardening aplicados; protocolos, conteudos e exercicios possuem fundacoes operacionais com pendencias profissionais/operacionais ainda abertas;
- a IA permanece assistiva; provider OpenAI, boundary server-side, prompt v1, Structured Outputs e revisao humana existem, mas chamada com dados reais continua bloqueada por credencial, avaliacao sintetica e gate de dados de saude;
- o `master` atual esta publicado como deployment de producao `READY`; merges exclusivamente documentais posteriores devem continuar distinguindo merge de validacao funcional em runtime.

Para o estado operacional detalhado e os bloqueios atuais, consultar `PROJECT_STATUS.md`.

## Regras e detalhes pendentes da Patty

### QUESTAO ABERTA

Parte do metodo ja possui regras confirmadas e documentadas em `BUSINESS_RULES.md` e `DECISIONS.md`, incluindo Reconhecimento Metabolico, a sequencia principal confirmada ate `Cutting 2: 2 Low / 1 High`, referencias iniciais de macros, conversoes de doses, limite do grupo de proteina com maior teor de gordura, equivalencia de legumes na contagem de carboidrato, regras confirmadas de Cutting Dia 1 / Dia 2, meta de liquidos de 60 mL/kg/dia e a existencia da refeicao livre semanal no Up Metabolico.

Tambem esta confirmado que, no inicio do acompanhamento, relatos de comportamento, doencas informadas ou alteracoes em exames nao disparam alerta, bloqueio, encaminhamento ou revisao obrigatoria automaticamente; a Patty inicia o processo normalmente e decide intervencoes posteriores por julgamento humano.

Continuam pendentes, sem automacao alem do que ja foi explicitamente confirmado:

- Fases 5 e 6 da Planilha Carb Cycle;
- etapas posteriores a `Cutting 2: 2 Low / 1 High`, incluindo qualquer eventual Cutting posterior, e seus valores/formulas;
- Bulking detalhado;
- Consolidacao;
- proporcao minima de agua pura, regra de recalculo da meta de liquidos e cadencia dos lembretes;
- suplementacao e manipulados;
- montagem e progressao definitiva de treino;
- cardio quando nao coberto por regra confirmada;
- janela/limiar de estagnacao e combinacoes conflitantes de indicadores;
- criterios de resultado para objetivos diferentes de emagrecimento/reducao de gordura;
- criterios completos de mudanca de fase alem do fluxo ja confirmado;
- demais regras profissionais ainda nao formalizadas.

Essas pendencias nao devem ser resolvidas por inferencia, exemplo individual ou recomendacao tecnica. Devem ser registradas e validadas pela Patty antes de virar regra do produto.

## Fora do sistema completo

### FORA DO ESCOPO ATUAL

Nao fazem parte do sistema completo:

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

## Criterios de sucesso do sistema

### DECISAO CONFIRMADA

O sistema sera considerado bem-sucedido quando:

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
