# Arquitetura

## Stack definida

### DECISAO CONFIRMADA

A arquitetura definida para o projeto e:

- Next.js para a aplicacao;
- Vercel para hospedagem da aplicacao;
- Supabase para PostgreSQL, Auth, Storage e RLS;
- VPS Hostinger disponivel apenas para servicos persistentes quando realmente necessario;
- n8n disponivel para automacoes quando houver necessidade;
- LangGraph somente para fluxos de IA que realmente justifiquem essa complexidade.

## Restricoes atuais

### DECISAO CONFIRMADA

Nao introduzir FastAPI ou outros servicos neste momento.

Esta autorizada a inicializacao minima da aplicacao web Next.js para a fundacao do frontend.

Essa autorizacao nao inclui banco, Supabase, autenticacao, APIs de negocio, UI de negocio, IA, regras clinicas, n8n, LangGraph ou servicos adicionais.

### DECISAO HISTORICA SUBSTITUIDA

A restricao anterior de nao criar aplicacao, UI ou dependencias pertencia a fase inicial de documentacao e foi substituida em 2026-09-14 exclusivamente para a inicializacao e fundacao do frontend.

## Principios arquiteturais

### RECOMENDACAO TECNICA

Usar a menor quantidade de servicos necessaria para atender aos requisitos confirmados.

Preferir recursos nativos do Supabase e da Vercel antes de introduzir servicos persistentes adicionais.

Usar a VPS Hostinger somente quando houver necessidade real de processo persistente, worker, servico de longa duracao ou componente que nao se encaixe bem na Vercel/Supabase.

Usar n8n somente quando automacoes externas ou orquestracoes justificarem a ferramenta.

Usar LangGraph somente quando o fluxo de IA exigir estado, ramos, revisoes ou orquestracao complexa que nao sejam bem atendidos por uma chamada simples.

## Seguranca arquitetural

### DECISAO CONFIRMADA

RLS sera obrigatoria.

Fotos, exames e documentos devem ser privados.

Secrets nao devem ser armazenados no repositorio.

Dados reais nao devem ser usados no desenvolvimento inicial.

### RECOMENDACAO TECNICA

Toda funcionalidade que exponha dados de clientes deve ser desenhada com verificacao explicita de autorizacao, logs de auditoria e testes de isolamento de acesso.

## Questoes abertas

### QUESTAO ABERTA

Ainda e necessario definir se havera necessidade real de VPS na primeira versao operacional.

### QUESTAO ABERTA

Ainda e necessario definir quais automacoes justificarao n8n.

### QUESTAO ABERTA

Ainda e necessario definir quais fluxos de IA justificarao LangGraph.
