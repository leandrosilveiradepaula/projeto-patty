# Decisoes

## 2026-09-22 - Primeira versao assistiva de IA

### DECISAO DE PRODUTO CONFIRMADA

A IA pode identificar respostas ausentes, contraditorias ou que precisam de esclarecimento, sugerir perguntas de acompanhamento para a Patty e auxiliar a preparacao de rascunhos completos de alimentacao e treino. A execucao continua assistiva, depende de revisao humana e so inicia quando a Patty a solicitar; nao ha execucao automatica em background por entrada de novos dados.

Sugestoes de pendencia ou de perguntas para a cliente nao criam pendencia operacional nem sao enviadas diretamente. A Patty deve revisar, pode editar e deve confirmar antes de qualquer criacao ou envio.

### DECISAO DE PRODUTO E PRIVACIDADE CONFIRMADA

As respostas da Anamnese entram automaticamente no contexto de IA, exceto a condicao financeira, que so entra quando a Patty a selecionar explicitamente. Essa decisao inclui os dados de saude, medicamentos, suplementacao, sono, autoimagem, comportamento, habitos alimentares e saude reprodutiva ja existentes no questionario; nao autoriza inferir novos campos de Anamnese.

Todas as medidas factuais registradas podem entrar automaticamente no contexto, sem autorizar diagnostico ou interpretacao diagnostica automatica. Fotos de avaliacao/evolucao, exames/documentos de saude, protocolos anteriores e historico de acompanhamento so entram quando a Patty selecionar explicitamente cada fonte ou registro.

Cidade, Telefone e Email de contato nao entram automaticamente a partir do Cadastro Atual. Endereco, escolaridade e Instagram tambem permanecem fora do contexto padrao sem necessidade especifica.

### DECISAO TECNICA E DE PRIVACIDADE CONFIRMADA

Cada execucao futura deve registrar referencias das fontes usadas, sem duplicar automaticamente todo o conteudo original para auditoria, e registrar versao da instrucao/prompt, modelo e provider. O provider escolhido deve ter configuracao e condicoes verificaveis para que dados da Patty e das clientes nao sejam usados no treinamento de modelos.

O historico de IA deve ser preservado junto ao historico da cliente, sem exclusao automatica: referencias de fontes, instrucao/prompt, modelo, provider, saida original, versoes editadas, autoria, timestamps e decisoes de aprovacao ou rejeicao quando aplicaveis. Essa decisao nao define politica legal geral de retencao.

### DECISAO DE PRODUTO CONFIRMADA

A saida original da IA, cada versao editada pela Patty, a versao aprovada e a publicacao sao artefatos distintos. Nenhuma versao anterior deve ser sobrescrita silenciosamente. A rejeicao ou o descarte de uma analise/rascunho pode registrar motivo, mas esse motivo e opcional.

Antes de gerar um rascunho, a Patty escolhe a fase/protocolo do metodo. A IA nao escolhe automaticamente a fase. Regras matematicas confirmadas permanecem em codigo deterministico e testavel; a IA recebe ou utiliza seus resultados, sem derivar formulas por raciocinio generativo.

Quando faltar uma regra profissional confirmada, a IA pode apresentar sugestao provisoria marcada como HIPOTESE. A hipotese nao vira regra do metodo, nao pode ser baseada em exemplo historico individual como regra geral e exige confirmacao explicita da Patty antes de aprovacao ou publicacao. Uma aprovacao geral de protocolo nao pode ocultar hipotese pendente.

Cliente nao acessa analises da IA, hipoteses, rascunhos, versoes internas ou comentarios internos da Patty. Ve somente conteudo aprovado/publicado para ela.

## 2026-09-22 - Limites confirmados para fundacao futura de IA

### DECISAO CONFIRMADA

A IA auxilia Patty; nao decide nem publica diretamente. Nao gera diagnostico automatico.

### DECISAO CONFIRMADA

Exemplos e historicos individuais nao podem ser transformados em regra geral do metodo profissional.

### DECISAO CONFIRMADA

Endereco, escolaridade e Instagram nao devem ser enviados ao contexto de IA sem necessidade especifica.

## 2026-09-18 - Arquivos privados, avaliacoes e acompanhamento profissional

### DECISAO CONFIRMADA

Metadados de fotos, exames e documentos ficam em `client_files`, separados de `storage.objects`. O bucket previsto e privado e nenhum URL publico permanente ou signed URL persistida e armazenado no modelo de negocio.

### DECISAO CONFIRMADA

Avaliacoes e medidas sao historicas: reavaliacao cria novo registro, medidas pertencem a uma avaliacao e fotos podem ser relacionadas por referencia ao arquivo privado existente. Esta implementacao nao define catalogo clinico de medidas nem realiza interpretacao automatica.

### DECISAO CONFIRMADA

O acompanhamento profissional e append-only e interno. Registra dificuldade, percepcao de aderencia, observacao da Patty, decisao profissional e motivo. As decisoes implementadas sao `maintain`, `simplify`, `advance` e `return`; registrar uma decisao nao executa mudanca de fase, protocolo, dieta ou treino.

Registro cronologico de decisoes confirmadas do Projeto Patty.

## 2026-09-18 - Cadastro Atual e Anamnese versionada

### DECISAO CONFIRMADA

`client_registration` e o Cadastro Atual 1:1 de `clients`, separado de Auth e de Anamnese. Nesta implementacao, seus campos sao Cidade, Telefone, Email de contato e Instagram.

### DECISAO CONFIRMADA

Definicoes de Anamnese sao versionadas e submissions preservam a versao exata utilizada. Respostas originais submetidas nao sao sobrescritas.

### DECISAO CONFIRMADA

Notas administrativas da Patty sao armazenadas separadamente das respostas originais e nao sao acessiveis pela cliente.

## 2026-09-18 - Fundacao operacional de identidade, clientes, RBAC e RLS

### DECISAO CONFIRMADA

A fundacao BACKEND-A1 implementa `profiles`, `user_roles`, `clients` e `client_assignments` como entidades separadas no Supabase local/versionado.

### DECISAO CONFIRMADA

O acesso a cliente e client-scoped: a propria cliente acessa somente o registro vinculado ao seu `profiles.id`; admin exige papel relacional `admin` e assignment ativo. Papel administrativo nao concede acesso global a clientes.

### DECISAO CONFIRMADA

`anon` nao recebe acesso a dados privados. Usuarios autenticados nao recebem escrita por browser em roles, assignments, clientes ou perfis nesta fase. A administracao desses vinculos aguardara mecanismo controlado proprio.

### DECISAO CONFIRMADA

Remover uma identidade Auth de cliente preserva o registro profissional e limpa somente `clients.profile_id`. Encerrar assignment preserva historico e remove sua permissao ativa.

### QUESTAO ABERTA

O bootstrap de producao do primeiro admin Patty e o caminho administrativo para criar, alterar ou encerrar roles e assignments continuam pendentes. Seeds e testes locais nao definem fluxo de producao.

## 2026-09-15 - Separacao entre autenticacao, cadastro do cliente e snapshot de anamnese

### DECISAO CONFIRMADA

Auth / `auth.users` nao e cadastro mestre da cliente. Auth e responsavel por identidade de autenticacao, credenciais, email de login quando aplicavel e metadados estritamente necessarios a autenticacao.

### DECISAO CONFIRMADA

Cidade, Telefone, Email de contato e Instagram pertencem ao cadastro atual da cliente.

### DECISAO CONFIRMADA

Email de autenticacao e email de contato sao conceitos diferentes. Eles podem inicialmente ter o mesmo valor, mas nao devem ser tratados como uma unica fonte sem decisao propria.

### DECISAO CONFIRMADA

A anamnese nao e fonte mestre dos dados cadastrais atuais da cliente.

### DECISAO CONFIRMADA

Eventual copia de dados cadastrais preservada junto de uma submissao de anamnese e snapshot historico daquele contexto.

Alterar o cadastro atual nao altera anamneses ja submetidas, e alterar uma anamnese historica nao altera silenciosamente o cadastro atual.

### DECISAO CONFIRMADA

Nao existe sincronizacao bidirecional automatica entre cadastro atual da cliente e historico de anamnese.

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

A decisao de uso de dados da Anamnese pela IA depende de definicao de produto e privacidade, e nao da mera existencia do campo no formulario historico. A rodada de 2026-09-22 confirmou inclusao automatica das respostas de Anamnese, exceto condicao financeira, que exige selecao explicita da Patty.

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

O fluxo estrutural de protocolo separa versao, aprovacao humana e publicacao. Uma publication exige approval da mesma versao; a IA nao aprova nem publica. Conteudo submetido para revisao permanece historico e imutavel.

### DECISAO CONFIRMADA

Planos alimentares e catalogos de equivalentes sao versionados como estruturas de dados, sem catalogo real, calculo de doses, macros, fases ou regra metodologica. A referencia de um plano aponta uma versao especifica do catalogo.

## 2026-09-19 - Bibliotecas e liberacao explicita de conteudo

### DECISAO CONFIRMADA

Conteudo educacional e exercicio sao dominios separados e ambos preservam versoes publicadas. A biblioteca de exercicios nao e exposta globalmente a clientes nesta etapa.

### DECISAO CONFIRMADA

Liberacao educacional e explicita, por cliente e por versao publicada. Nao existe liberacao automatica por fase, avaliacao, protocolo, aderencia ou tempo. Progresso nao e score e a cliente nao recebe escrita enquanto a regra de negocio correspondente permanecer pendente.

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
