# Decisoes

Registro cronologico de decisoes confirmadas do Projeto Patty.

## 2026-09-15 - Formulario atual como baseline de migracao, nao especificacao definitiva

### DECISAO CONFIRMADA

As capturas do formulario atual da Patty sao evidencia do processo existente e devem ser preservadas como referencia de levantamento e migracao.

### DECISAO CONFIRMADA

Campos, textos, obrigatoriedade, tipos de controle, opcoes, validacoes, ordem e agrupamento do formulario atual nao sao automaticamente aprovados como especificacao final do novo aplicativo.

### DECISAO CONFIRMADA

Um campo marcado como obrigatorio no Google Forms historico nao define `required` futuro, validacao obrigatoria ou bloqueio de submissao no novo aplicativo sem decisao propria.

### DECISAO CONFIRMADA

Restricoes tecnicas observadas no Google Forms, como quantidade de arquivos, tamanho maximo, tipos apresentados e impossibilidade de edicao/remocao apos envio, nao devem ser herdadas automaticamente pelo novo aplicativo.

### DECISAO CONFIRMADA

O uso de cada campo da anamnese pela IA exige decisao propria. O formulario atual nao autoriza envio automatico de todos os campos para analise por IA.

## 2026-09-14 - Modelo conceitual inicial de identidade, clientes e autorizacao

### DECISAO CONFIRMADA

`auth.users` nao sera cadastro principal do cliente.

### DECISAO CONFIRMADA

Identidade, perfil da aplicacao e cliente da consultoria sao conceitos separados.

### DECISAO CONFIRMADA

Cliente pode existir sem conta Auth ativa.

### DECISAO CONFIRMADA

Historico de cliente nao depende da existencia permanente do login.

### DECISAO CONFIRMADA

RLS e obrigatoria.

### DECISAO CONFIRMADA

Autenticacao sozinha nao concede acesso a dados.

### DECISAO CONFIRMADA

Autorizacao client-scoped devera verificar vinculo com o cliente.

### DECISAO CONFIRMADA

Roles nao serao armazenados em `user_metadata`.

### DECISAO CONFIRMADA

Dados cadastrais sao separados de dados clinicos/operacionais.

### DECISAO CONFIRMADA

Cliente nao pode administrar papeis ou assignments.

## 2026-09-14 - Inicializacao da aplicacao frontend

### DECISAO CONFIRMADA

Esta autorizada a criacao da aplicacao web Next.js dentro do repositorio do Projeto Patty.

### DECISAO CONFIRMADA

A aplicacao deve usar Next.js com App Router e TypeScript.

### DECISAO CONFIRMADA

A inicializacao deve ser minima e nao deve implementar funcionalidades de negocio, conectar ao Supabase, implementar autenticacao, criar regras clinicas, implementar IA, gerar dieta ou treino, instalar bibliotecas de UI sem necessidade, instalar bibliotecas de estado, formularios ou icones preventivamente, introduzir n8n ou LangGraph, ou utilizar dados reais de clientes.

### DECISAO CONFIRMADA

A estrutura deve permanecer simples e auditavel, permitir evolucao posterior para as areas `/admin` e `/cliente`, priorizar Server Components quando aplicavel e manter acessibilidade e responsividade como requisitos desde a fundacao.

### DECISAO CONFIRMADA

Documentos que afirmavam que nao deveria ser criada aplicacao, UI ou dependencias descreviam a fase anterior de documentacao. Essa restricao foi substituida exclusivamente quanto a inicializacao e fundacao do frontend.

## 2026-09-14 - Fundacao documental inicial

### DECISAO CONFIRMADA

O repositorio comeca pela fundacao documental, sem implementar aplicacao, banco ou Supabase nesta tarefa.

### DECISAO CONFIRMADA

O Projeto Patty sera um aplicativo para digitalizar e automatizar parte do atendimento da Consultoria Corpo e Mente da Patricia Torres.

### DECISAO CONFIRMADA

Cada cliente tera conta propria.

### DECISAO CONFIRMADA

O produto tera anamnese, medidas, fotos, exames, protocolos, avaliacoes, conteudos, exercicios e painel administrativo da Patty.

### DECISAO CONFIRMADA

A IA sera assistiva e nao publicara protocolos automaticamente.

### DECISAO CONFIRMADA

A Patty sempre revisara e aprovara protocolos antes da publicacao.

### DECISAO CONFIRMADA

A arquitetura definida usa Next.js, Vercel e Supabase para PostgreSQL, Auth, Storage e RLS.

### DECISAO CONFIRMADA

A VPS Hostinger fica disponivel apenas para servicos persistentes quando realmente necessario.

### DECISAO CONFIRMADA

n8n fica disponivel para automacoes quando houver necessidade.

### DECISAO CONFIRMADA

LangGraph sera usado somente para fluxos de IA que realmente justifiquem essa complexidade.

### DECISAO CONFIRMADA

Nao introduzir FastAPI ou outros servicos neste momento.

### DECISAO CONFIRMADA

RLS e obrigatoria. Cliente so acessa os proprios dados. Patty/admin acessa clientes sob sua responsabilidade.

### DECISAO CONFIRMADA

Dados de saude sao sensiveis. Fotos, exames e documentos devem ser privados.

### DECISAO CONFIRMADA

Secrets nao devem ser armazenados no repositorio. Dados reais nao devem ser usados no desenvolvimento inicial.

### DECISAO CONFIRMADA

Autenticacao, perfil, cliente e dados clinicos/operacionais devem ser separados. `auth.users` nao sera a tabela principal de clientes.

### DECISAO CONFIRMADA

Preservar historico, nao sobrescrever versoes antigas e registrar auditoria de acoes criticas.

### DECISAO CONFIRMADA

Todo o conteudo atual do Google Drive deve ser preservado.

### DECISAO CONFIRMADA

A biblioteca educacional deve ser separada da biblioteca de exercicios.

### DECISAO CONFIRMADA

O aplicativo substituira gradualmente o Drive para os clientes.
