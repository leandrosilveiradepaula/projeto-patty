# Decisoes

## 2026-09-22 - Metodo principal de login

### DECISAO DE PRODUTO E SEGURANCA

O metodo principal de login no MVP sera email + senha para clientes e administradores. Contas administrativas continuam com MFA obrigatorio.

Links enviados por email podem ser usados nos fluxos controlados de convite, ativacao e recuperacao de acesso, mas magic link nao sera o metodo normal de login no MVP.

## 2026-09-22 - Uso de LangGraph no MVP

### DECISAO TECNICA

LangGraph nao sera usado inicialmente no MVP. A primeira integracao real de IA deve usar um fluxo server-side simples, explicito e auditavel. LangGraph so deve ser introduzido se surgirem fluxos de IA com estado persistente, multiplas etapas, ramificacoes ou orquestracao complexa que nao sejam bem atendidos por uma implementacao mais simples.

## 2026-09-22 - Uso de n8n no MVP

### DECISAO TECNICA

n8n nao sera usado inicialmente no MVP. A ferramenta so deve ser introduzida quando existir uma automacao externa ou orquestracao concreta, documentada e com beneficio claro sobre uma solucao mais simples dentro de Next.js, Vercel e Supabase.

## 2026-09-22 - Uso de VPS no MVP

### DECISAO TECNICA

A VPS Hostinger nao sera usada na primeira versao operacional do MVP enquanto Vercel e Supabase atenderem aos requisitos confirmados. Ela so deve ser introduzida se surgir necessidade tecnica concreta e documentada que exija processo persistente, worker, servico de longa duracao ou componente que nao se encaixe adequadamente na arquitetura atual.

## 2026-09-22 - Ambientes, MFA administrativo e onboarding de clientes

### DECISAO TECNICA/PRODUTO

No MVP, o projeto tera somente dois ambientes operacionais definidos: desenvolvimento e producao. Nao sera criado ambiente de staging neste momento. Um terceiro ambiente so deve ser introduzido se surgir necessidade concreta e documentada.

### DECISAO DE SEGURANCA

MFA sera obrigatorio para contas administrativas, incluindo Patty/admin.

### DECISAO DE PRODUTO E SEGURANCA

A criacao de conta de cliente no MVP sera somente por convite ou ativacao controlada. Nao havera cadastro publico/autonomo de clientes.

Esta decisao nao fecha ainda os detalhes operacionais de envio do convite, expiracao, reenvio, ativacao, recuperacao ou encerramento de conta.

## 2026-09-22 - Fluxos humanos de escrita ja operacionais

### FATO CONFIRMADO DE IMPLEMENTACAO

Os seguintes fluxos de escrita humana estao conectados na aplicacao usando sessao autenticada, grants e RLS existentes:

- notas internas append-only de revisao de Anamnese;
- acompanhamento profissional append-only ligado a avaliacao;
- liberacao manual de uma versao publicada de conteudo educacional para uma cliente;
- lifecycle manual de protocolo: submissao para revisao, aprovacao humana e publicacao explicita.

No lifecycle de protocolo, cada etapa e independente. Submeter nao aprova; aprovar nao publica; publicar exige uma aprovacao existente da mesma versao. A aplicacao revalida acesso e estado atual antes da escrita, e o banco continua sendo a autoridade final por RLS, constraints, FKs, triggers e unicidade.

### LIMITE DE ESCOPO

Esses fluxos nao autorizam inferir outras operacoes administrativas ainda abertas, como criacao/encerramento de assignments, edicao do Cadastro Atual, upload/exclusao de arquivos, preenchimento final da Anamnese ou automacoes de protocolo.

## 2026-09-22 - Leitura administrativa de arquivos privados

### DECISAO TECNICA

Arquivos privados permanecem no bucket privado `client-private`, sem URL publica permanente e sem signed URL persistida.

Fotos privadas vinculadas a uma avaliacao podem ser exibidas no detalhe administrativo por uma rota server-side dedicada. A rota exige role relacional `admin`, consulta o `client_file` sob as RLS existentes e cria sob a sessao atual uma signed URL com validade de 60 segundos. O redirecionamento nao deve ser armazenado em cache.

A area administrativa da cliente pode listar metadados de `client_files` acessiveis pelas RLS existentes. Para download administrativo de fotos, exames ou documentos, uma rota server-side igualmente exige `admin`, resolve o arquivo sob RLS e cria signed URL de 60 segundos com comportamento de download forcado. Isso evita decidir renderizacao inline de exames ou documentos antes da definicao de MIME types e controles adicionais.

A autorizacao continua dependendo de assignment ativo. Encerrar o assignment remove o acesso atual da Patty/admin; nenhuma dessas rotas usa `service_role` nem bypass de RLS.

### LIMITE DE ESCOPO

Esta decisao implementa somente leitura e download administrativos de arquivos ja cadastrados.

Ela nao define:

- quem pode fazer upload;
- substituicao ou exclusao de arquivos;
- MIME types definitivos aceitos;
- limite de tamanho como regra de produto;
- analise de arquivos maliciosos;
- quais fotos, exames ou documentos devem ser exibidos na UI da cliente.

Esses pontos permanecem abertos.

## 2026-09-22 - Reconciliacao documental das regras confirmadas do metodo

### DECISAO CONFIRMADA

Esta secao registra no repositorio regras ja confirmadas pela Patty e elimina a classificacao antiga que tratava todo o metodo como indefinido.

Todo acompanhamento comeca pelo Reconhecimento Metabolico, protocolo linear inicial.

A sequencia atualmente confirmada do fluxo principal e:

```text
Reconhecimento Metabolico
-> Cutting 1 Dia 1 / Dia 2
-> Cutting 1: 2 Low / 1 High
-> Up Metabolico
-> Cutting 2 Linear
-> Cutting 2 Dia 1 / Dia 2
-> Cutting 2: 2 Low / 1 High
```

Nao inferir automaticamente etapas posteriores.

### DECISAO CONFIRMADA

O Reconhecimento Metabolico pode ser reutilizado em caso de baixa adesao, dificuldade de execucao ou retorno apos afastamento.

Adesao e central. A Patty adapta o protocolo a dificuldade relatada e pode simplificar ou retornar antes de avancar.

Nao criar score automatico de adesao.

### DECISAO CONFIRMADA

Nao existe numero fixo de refeicoes. A quantidade e adaptada a rotina e preferencia da cliente, com foco em adesao.

Horarios individuais nao constituem regra geral. No jejum intermitente explicado pela Patty, normalmente sao usadas 3 refeicoes, com a ultima ate 12 horas apos a primeira e horarios internos flexiveis.

### DECISAO CONFIRMADA

A referencia inicial geral do Reconhecimento Metabolico e proteina 2 g/kg, carboidrato 2 g/kg e gordura 50 g/dia como referencia, com possibilidade de individualizacao.

Conversoes confirmadas:

- 1 dose de proteina = 15 g;
- 1 dose de carboidrato = 12 g;
- 1 dose de gordura = 6 g.

Doses podem ser fracionadas. Parte das doses inicialmente associadas ao carboidrato pode ser redistribuida para gordura.

### DECISAO CONFIRMADA

Proteinas possuem grupo de maior teor de gordura e grupo de menor teor de gordura.

O limite diario do grupo de maior teor de gordura e metade das doses totais de proteina, arredondando para cima. "Sem restricao" nao significa proteina ilimitada.

### DECISAO CONFIRMADA

No Cutting Dia 1 / Dia 2, a proteina permanece praticamente igual e o carboidrato e a principal variavel. O protocolo linear anterior e a referencia: Dia 1 usa aproximadamente metade do carboidrato e Dia 2 aproximadamente a quantidade do linear. A gordura pode permanecer ou diminuir.

A etapa 2 Low / 1 High usa a Planilha Carb Cycle baseada no peso. Somente formulas confirmadas e documentadas podem ser implementadas em codigo deterministico. As Fases 5 e 6 continuam abertas.

### DECISAO CONFIRMADA

No fluxo confirmado, o Up Metabolico inclui uma refeicao livre semanal. Outras regras nao devem ser inferidas.

### QUESTAO ABERTA

Permanecem abertas, entre outros pontos: Fases 5 e 6 do Carb Cycle, etapas posteriores ao Cutting 2, Bulking detalhado, Consolidacao, hidratacao, suplementacao/manipulados, montagem e progressao definitiva de treino, alertas profissionais e criterios finais de avaliacao.

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

### DECISAO TECNICA APROVADA PARA FUNDACAO

A fundacao futura usa `ai_prompt_versions`, `ai_executions`, `ai_execution_outputs`, `ai_execution_sources`, `ai_draft_versions` e `ai_hypotheses`. Sao entidades internas: a cliente nao as acessa. Prompts sao imutaveis e criados por deploy ou processo administrativo controlado, sem UI de gerenciamento na primeira versao.

`ai_executions` registra lifecycle e metadados da execucao, mas nao a saida original. `ai_execution_outputs` preserva essa saida em relacao 1:1 imutavel e pode nao existir quando a execucao esta em andamento ou falhou. Versoes de rascunho da Patty sao append-only; eventual descarte pode alterar somente metadata restrita, nunca o conteudo da versao.

As fontes de uma execucao usam FKs concretas mutuamente exclusivas, e nao uma referencia generica por tipo e UUID. A fundacao deve carregar `client_id` nas entidades internas client-scoped e validar propriedade da fonte por constraints compostas e validacoes estreitas na migration futura.

### DECISAO DE PRODUTO CONFIRMADA

A saida original da IA, cada versao editada pela Patty, a versao aprovada e a publicacao sao artefatos distintos. Nenhuma versao anterior deve ser sobrescrita silenciosamente. A rejeicao ou o descarte de uma analise/rascunho pode registrar motivo, mas esse motivo e opcional.

Antes de gerar um rascunho, a Patty escolhe a fase/protocolo do metodo. A IA nao escolhe automaticamente a fase. Regras matematicas confirmadas permanecem em codigo deterministico e testavel; a IA recebe ou utiliza seus resultados, sem derivar formulas por raciocinio generativo.

Quando faltar uma regra profissional confirmada, a IA pode apresentar sugestao provisoria marcada como HIPOTESE. A hipotese nao vira regra do metodo, nao pode ser baseada em exemplo historico individual como regra geral e exige confirmacao explicita da Patty antes de aprovacao ou publicacao. Uma aprovacao geral de protocolo nao pode ocultar hipotese pendente.

Cliente nao acessa analises da IA, hipoteses, rascunhos, versoes internas ou comentarios internos da Patty. Ve somente conteudo aprovado/publicado para ela.

`protocol_versions` continua sendo versao de protocolo e nunca rascunho de IA. A futura materializacao de um rascunho de IA deve usar entidade de ligacao propria, sem alterar agora a semantica de `protocol_versions`.

## 2026-09-22 - Modelo tecnico para falhas de execution de IA

### DECISAO TECNICA

Uma `ai_execution` representa uma tentativa operacional explicitamente iniciada, vinculada a prompt, provider e modelo ja definidos, e pode realizar no maximo uma chamada ao provider. Ela pode terminar `failed` antes dessa chamada. Nova tentativa explicita cria nova execution; retry automatico e entidade `attempts` permanecem fora da v1.

Quando prompt, provider e modelo estao definidos, mas falta configuracao operacional server-side, como credential, a execution pode ser criada e terminar `failed` com `failure_stage = preflight` e `failure_code = provider_not_configured`. Quando prompt, provider ou modelo ainda nao estao definidos, a execution nao deve ser criada e nao se usam valores ficticios para satisfazer campos obrigatorios.

### DECISAO TECNICA

O boundary transacional da execution separa persistencia curta de chamada externa. TX1 cria a execution `started` e registra suas sources, seguida de commit. A chamada ao provider ocorre sem transacao longa de banco aberta. Em TX2 de sucesso, a insercao do unico `ai_execution_output` valido e a transicao para `completed` ocorrem atomicamente. Em TX2 de resposta invalida, a insercao de `ai_execution_failure_responses`, os metadados de falha e a transicao para `failed` ocorrem atomicamente.

O deferred constraint de output valido permanece: `completed` exige exatamente um `ai_execution_output`; `started` e `failed` exigem zero outputs validos. Output valido permanece imutavel, `failed` permanece terminal e descarte continua restrito a `completed`. Uma failure response nao e output valido.

### DECISAO TECNICA

A extensao futura de `ai_executions` usa `failure_stage`, `failure_code` e `failure_message` nullable somente quando `status = failed`. Stage e code sao obrigatorios na falha e os tres campos devem permanecer nulos nos demais estados. Apos terminalizacao, eles nao podem ser reescritos.

`failure_message` e sanitizada pela aplicacao para diagnostico operacional interno, opcional e nao vazia quando presente. Nao contem resposta bruta do provider, stack trace completo, token, secret ou PII desnecessaria. Seu tamanho maximo permanece aberto.

Os pares fechados da v1 sao `preflight` -> `provider_not_configured`, `provider_request` -> `provider_request_failed`, `output_parse` -> `invalid_json`, `output_validation` -> `invalid_output_schema` e `persistence` -> `persistence_failed`. A futura migration deve protege-los com CHECK ou constraint deterministica.

### DECISAO TECNICA

Quando uma execution `failed` for persistida com `invalid_json`, `invalid_output_schema` ou `persistence_failed`, ela deve ter exatamente uma failure response imutavel. `provider_not_configured` e `provider_request_failed` nao possuem failure response. Em `persistence_failed`, isso cobre somente o caso em que o banco permanece acessivel apos a falha de persistencia de sucesso.

Se o banco ou a conexao estiver indisponivel apos o provider responder, nao e possivel garantir a persistencia da resposta, dos metadados de falha ou da transicao para `failed`; a execution previamente criada pode permanecer `started`. Esse estado nao reconciliado e uma limitacao operacional, nao uma execution `failed/persistence_failed` sem failure response.

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

## 2026-09-22 - Primeiro contrato operacional de IA para revisao de Anamnese

### DECISAO TECNICA/PRODUTO

O primeiro fluxo operacional de IA usa `purpose_key = anamnesis_review`, sem versao embutida. A versao pertence a `ai_prompt_versions`; provider e modelo pertencem a `ai_executions`.

### DECISAO TECNICA/PRODUTO

A revisao e iniciada somente por acao explicita de Patty/admin relacional autorizado, com assignment ativo da cliente e submission escolhida explicitamente. Nao existe execucao automatica ou em background nesta primeira versao.

### DECISAO TECNICA/PRODUTO

Cada execution `anamnesis_review` analisa uma submission selecionada. A mesma submission pode ter multiplas executions historicas por nova solicitacao explicita, versao de prompt ou modelo; nao existe unicidade submission -> execution.

### DECISAO TECNICA/PRODUTO

O contexto automatico da v1 limita-se a submission, `form_version_id`, `question_id`, `question_key`, `label` e `answer_value` original das answers selecionadas para envio da propria submission. A condicao financeira nao entra automaticamente: so pode ser incluida quando Patty a selecionar explicitamente para aquela execution. As demais answers autorizadas pelo contexto padrao permanecem automaticas. Fonte disponivel nao equivale necessariamente a fonte selecionada ou enviada. Cadastro Atual, avaliacoes, medidas, protocolos, follow-ups, fotos, exames, documentos, outros arquivos, endereco, escolaridade e Instagram ficam fora deste purpose. Essa minimizacao nao se generaliza automaticamente para outros purposes de IA.

### DECISAO TECNICA/PRODUTO

Na primeira implementacao, os findings permitidos sao somente `possible_contradiction` e `clarification_needed`. `missing_answer` continua objetivo do produto, mas fica bloqueado ate que obrigatoriedade e aplicabilidade condicional da Anamnese estejam formalizadas.

`possible_contradiction` e uma sinalizacao de possivel incompatibilidade ou ambiguidade, nunca conclusao definitiva, e exige ao menos duas respostas existentes. `clarification_needed` sinaliza resposta existente ambigua ou insuficiente para revisao humana segura e exige ao menos uma resposta existente.

Nenhum finding diagnostica, cria conclusao clinica, vira pendencia, e enviado a cliente, altera protocolo/fase ou publica conteudo automaticamente.

### DECISAO TECNICA/PRODUTO

Registrar em `ai_execution_sources` todas as `anamnesis_answers` efetivamente enviadas ao modelo, uma referencia por answer. Answers submetidas e suas definicoes versionadas sao protegidas contra alteracao/exclusao pelo schema atual; as referencias permitem reconstruir fontes utilizadas, mas nao constituem snapshot literal do payload enviado ao provider.

### DECISAO TECNICA/PRODUTO

O output valido original da IA permanece imutavel em `ai_execution_outputs`. Findings permanecem nesse output nesta versao e nao criam entidade operacional independente; tambem nao viram `ai_hypotheses` automaticamente.

Revisao e edicao humana devem ser persistidas separadamente em `ai_draft_versions`, de forma append-only. Nunca sobrescrever o output original da IA. `ai_hypotheses` fica reservado para proposicoes que realmente exigirem confirmacao explicita antes de eventual aprovacao ou publicacao futura.

### CONTRATO CONCEITUAL DE OUTPUT

O contrato conceitual da v1 e um objeto com `findings`, que pode ser vazio. Cada finding possui `type` (`possible_contradiction` ou `clarification_needed`), `source_answer_ids`, `explanation` interna com incerteza explicita e `suggested_follow_up_question` opcional e interna.

Propriedades extras devem ser rejeitadas na validacao futura. IDs devem pertencer a submission analisada e as sources da execution. O contrato nao e JSON Schema implementado nesta etapa e nao inclui score, diagnostico ou conclusao clinica.

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
