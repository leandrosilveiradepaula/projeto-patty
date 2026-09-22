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

## Ambientes e acesso administrativo

### DECISAO TECNICA

No MVP, os ambientes definidos sao somente desenvolvimento e producao. Nao ha staging nesta etapa; um terceiro ambiente so sera criado mediante necessidade concreta e documentada.

### DECISAO DE SEGURANCA

MFA e obrigatorio para contas administrativas, incluindo Patty/admin.

### DECISAO DE PRODUTO E SEGURANCA

Contas de clientes sao criadas somente por convite ou ativacao controlada. Nao existe cadastro publico/autonomo de clientes no MVP.

Os detalhes operacionais de convite, expiracao, reenvio, ativacao, recuperacao e encerramento de conta permanecem abertos.

## Restricoes atuais

### DECISAO CONFIRMADA

Nao introduzir FastAPI ou outros servicos neste momento.

VPS, n8n e LangGraph so devem ser introduzidos quando houver necessidade concreta e documentada.

### FATO CONFIRMADO DE IMPLEMENTACAO

A aplicacao Next.js ja esta integrada ao Supabase para Auth, PostgreSQL, Storage privado e RLS.

A UI de negocio ja possui leitura real do backend para areas administrativas e da cliente, incluindo clientes atribuidos, Cadastro Atual, Anamnese versionada, avaliacoes, protocolos publicados, conteudos, exercicios e arquivos privados administrativos.

Ja existem tambem boundaries server-side de escrita para notas internas de revisao de Anamnese, acompanhamento profissional append-only, liberacao manual de conteudo e lifecycle manual de protocolos. Essas escritas reutilizam a sessao autenticada, grants, RLS e constraints existentes, sem `service_role` no browser e sem publicacao automatica.

A rota raiz usa o contexto autenticado para encaminhar admin, cliente ou login.

Esses fatos de implementacao nao significam que todos os fluxos de escrita estejam definidos. Preenchimento final da Anamnese, uploads, operacoes administrativas ainda abertas, automacoes e integracao real com provider de IA continuam sujeitos as decisoes e questoes abertas correspondentes.

### DECISAO HISTORICA SUBSTITUIDA

As restricoes anteriores que limitavam o repositorio a documentacao ou apenas a fundacao visual pertencem a fases historicas do projeto e nao descrevem o estado atual da aplicacao.

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

## Infraestrutura Supabase atual

### FATO CONFIRMADO DE INFRAESTRUTURA

O projeto Supabase SaaS atual e `Projeto Corpo e Mente`, na regiao `us-west-2`.

## Integracao de aplicacao com Supabase

### DECISAO CONFIRMADA

A aplicacao Next.js usa clientes Supabase tipados, um para browser e outro para servidor, configurados com URL e publishable key. A sessao SSR usa cookies e `proxy.ts` no Next.js 16 para atualizar tokens. O codigo server-side verifica identidade com `getClaims()`; autorizacao de dados continua sob responsabilidade de grants e RLS, sem `service_role`, `user_metadata` ou papel local no browser.

### DECISAO CONFIRMADA

`/login` e uma rota publica de entrada por email e senha, sem cadastro publico. As areas `/admin/*` e `/cliente/*` exigem identidade validada com `getClaims()` e o papel relacional correspondente em `user_roles`; o `proxy.ts` continua responsavel somente pelo refresh da sessao e cookies.

## Questoes abertas

### QUESTAO ABERTA

Ainda e necessario definir se havera necessidade real de VPS na primeira versao operacional.

### QUESTAO ABERTA

Ainda e necessario definir quais automacoes justificarao n8n.

### QUESTAO ABERTA

Ainda e necessario definir quais fluxos de IA justificarao LangGraph.
