# Modelo de Dados

## Principios confirmados

### DECISAO CONFIRMADA

O modelo de dados deve separar autenticacao, perfil, cliente e dados clinicos/operacionais.

`auth.users` nao sera a tabela principal de clientes.

Dados de saude sao sensiveis.

Fotos, exames e documentos devem ser privados.

Preservar historico e nao sobrescrever versoes antigas.

Registrar auditoria de acoes criticas.

## Modelo conceitual inicial de identidade

### DECISAO CONFIRMADA

O modelo conceitual inicial separa quatro conceitos:

1. identidade/autenticacao;
2. perfil da aplicacao;
3. cliente da consultoria;
4. dados cadastrais, clinicos e operacionais.

`auth.users` e responsabilidade do Supabase Auth.

`auth.users` nao sera a tabela principal de clientes.

### DECISAO CONFIRMADA

O encadeamento conceitual inicial e:

```text
auth.users
|
v
profiles
|
+--> user_roles
|
+--> clients
|
+--> client_registration

profiles
|
+--> client_assignments <-- clients
```

## Profiles

### DECISAO CONFIRMADA

`profiles` representa dentro da aplicacao uma identidade autenticada.

`profiles.id` corresponde ao UUID de `auth.users.id`.

Essa e uma escolha tecnica para simplificar autenticacao e RLS, sem transformar `auth.users` em cadastro profissional do cliente.

### ESCOPO CONCEITUAL INICIAL

Campos conceituais minimos de `profiles`:

- `id`;
- `display_name`;
- `status`;
- `created_at`;
- `updated_at`.

### QUESTAO ABERTA

Ainda nao foram definidos valores definitivos para `profiles.status`.

### DECISAO CONFIRMADA

`profiles` nao deve conter:

- anamnese;
- medidas;
- endereco;
- dados de saude;
- protocolos;
- informacoes clinicas.

## User roles

### DECISAO CONFIRMADA

`user_roles` representa autorizacoes de alto nivel da aplicacao.

Roles sao separadas do perfil.

### ESCOPO CONCEITUAL INICIAL

Campos conceituais minimos de `user_roles`:

- `profile_id`;
- `role`;
- `created_at`.

### DECISAO CONFIRMADA

Papeis inicialmente conhecidos:

- `admin`;
- `client`.

Nao criar papeis futuros sem decisao confirmada.

### DECISAO CONFIRMADA

Autorizacao nao deve depender de `user_metadata`.

Papel nao sera controlado pelo proprio cliente.

Cliente nao pode conceder papel a si mesmo.

Nao usar JWT como unica fonte autoritativa de papel nesta fase.

Preferir tabela relacional como fonte de autorizacao.

### QUESTAO ABERTA

O mecanismo administrativo definitivo para atribuicao e revogacao de papeis ainda sera definido.

## Clients

### DECISAO CONFIRMADA

`clients` representa a pessoa atendida pela Consultoria Corpo e Mente.

`clients` e uma entidade profissional/operacional independente da conta de login.

Cliente pode existir sem conta Auth ativa.

Historico de cliente nao depende da existencia permanente do login.

### ESCOPO CONCEITUAL INICIAL

Campos conceituais minimos de `clients`:

- `id`;
- `profile_id` nullable;
- `status`;
- `started_at`;
- `ended_at`;
- `created_at`;
- `updated_at`.

Relacionamento conceitual:

- `clients.profile_id -> profiles.id`.

### DECISAO CONFIRMADA

`clients.profile_id` deve poder ser `NULL`.

Uma cliente pode ser cadastrada antes de criar conta.

Encerrar acompanhamento nao apaga historico.

Remover ou desativar acesso nao deve apagar automaticamente o registro profissional.

Exclusao da identidade Auth nao deve provocar cascade sobre dados historicos do cliente.

### RECOMENDACAO TECNICA

Na implementacao futura, `clients.profile_id` deve usar semantica equivalente a `ON DELETE SET NULL`.

### QUESTAO ABERTA

Ainda nao foram definidos valores definitivos para `clients.status`.

## Client registration

### DECISAO CONFIRMADA

`client_registration` representa dados cadastrais e informativos da cliente.

Dados cadastrais devem ficar separados dos dados clinicos/operacionais.

### ESCOPO CONCEITUAL INICIAL

Relacionamento conceitual 1:1:

- `client_registration.client_id -> clients.id`.

Exemplos conceituais de dados cadastrais:

- nome;
- telefone;
- data de nascimento;
- endereco;
- escolaridade;
- Instagram;
- demais dados cadastrais futuramente definidos.

### DECISAO CONFIRMADA

Endereco, escolaridade e Instagram sao dados informativos e nao devem ser enviados a IA por padrao.

### QUESTAO ABERTA

O formulario cadastral completo ainda nao sera definido nesta tarefa.

## Ownership de dados cadastrais, Auth e anamnese

### DECISAO CONFIRMADA

Supabase Auth / `auth.users` e responsavel por identidade de autenticacao, credenciais, email usado para login quando aplicavel e metadados estritamente necessarios a autenticacao.

`auth.users` nao e a fonte mestre do cadastro profissional ou operacional da cliente.

### DECISAO CONFIRMADA

`profiles` representa o usuario dentro da aplicacao e vincula a identidade autenticada ao modelo da aplicacao.

`profiles` pode apoiar papeis, permissoes e atributos gerais necessarios a aplicacao, mas nao deve acumular dados clinicos nem duplicar indiscriminadamente o cadastro da cliente.

### DECISAO CONFIRMADA

`clients` representa a entidade de negocio da pessoa atendida pela consultoria.

O cadastro atual da cliente e seus dados de contato pertencem ao dominio de cliente/cadastro de cliente, nao ao Auth e nao a anamnese como fonte mestre.

### DECISAO CONFIRMADA

A anamnese representa uma submissao ou versao historica de respostas fornecidas em um contexto especifico.

A anamnese nao e fonte mestre dos dados cadastrais atuais da cliente.

Se dados cadastrais forem preservados junto de uma submissao de anamnese para manter contexto historico, essa copia deve ser tratada como snapshot historico da submissao.

Consequencias:

- alterar o cadastro atual da cliente nao modifica uma anamnese ja submetida;
- alterar ou corrigir uma anamnese historica nao modifica silenciosamente o cadastro atual;
- nao existe sincronizacao bidirecional automatica entre cadastro atual e historico de anamnese;
- dados historicos nao sao sobrescritos;
- um rascunho pode estar incompleto e ser retomado posteriormente;
- a submissao final exige todos os campos da Anamnese preenchidos;
- depois da submissao, a cliente nao altera as respostas;
- correcao posterior e exclusiva da Patty e deve ser modelada sem sobrescrever a resposta original, preservando ator e timestamp da correcao.

A fundacao tecnica usa `anamnesis_answer_corrections` como historico append-only por resposta. `anamnesis_answers.answer_value` permanece como resposta original enviada pela cliente; cada correcao adiciona um novo `corrected_answer_value` com autoria e timestamp. Multiplas correcoes nao substituem registros anteriores.

### DECISAO CONFIRMADA

Email de autenticacao e email de contato sao conceitos diferentes.

O email de autenticacao pertence ao Auth quando for usado para identidade/login. O email de contato pertence ao cadastro da cliente como dado operacional de contato.

Os dois valores podem inicialmente coincidir, mas nao devem ser tratados como uma unica fonte sem decisao propria de produto e modelagem.

### DECISAO CONFIRMADA

Duplicar um mesmo valor em estruturas diferentes so e aceitavel quando cada copia possui responsabilidade semantica diferente.

Exemplo aceitavel:

- Auth: email de autenticacao;
- Cliente: email de contato.

Nao criar copias redundantes apenas por conveniencia.

### DECISAO CONFIRMADA

O relacionamento entre identidade autenticada, perfil da aplicacao e cliente usa identificadores UUID estaveis, nunca email como chave de relacionamento.

### MATRIZ CONCEITUAL DE OWNERSHIP

| Dado | Fonte mestre atual | Observacao |
| --- | --- | --- |
| Cidade | Cliente / cadastro da cliente | Cadastro atual; nao pertence a `auth.users`. |
| Telefone | Cliente / cadastro da cliente | Contato atual; nao assumir WhatsApp ou responsabilidade primaria de Auth. |
| Email de autenticacao | Auth | Identidade/login quando essa for a estrategia adotada. |
| Email de contato | Cliente / cadastro da cliente | Contato operacional; pode coincidir com o email de autenticacao sem ser o mesmo conceito. |
| Instagram | Cliente / cadastro da cliente | Dado informativo; nao enviado a IA por padrao. |
| Snapshot em anamnese | Historico da submissao | Copia contextual, se existir; nao e fonte mestre do cadastro atual. |

## Client assignments

### DECISAO CONFIRMADA

`client_assignments` define responsabilidade e acesso de profissionais sobre clientes.

Assignments sao a base do acesso profissional client-scoped.

Patty/admin acessa clientes sob sua responsabilidade.

Nao assumir que qualquer usuario com papel `admin` automaticamente possui acesso irrestrito a todos os clientes.

### ESCOPO CONCEITUAL INICIAL

Campos conceituais minimos de `client_assignments`:

- `id`;
- `client_id`;
- `staff_profile_id`;
- `assigned_at`;
- `ended_at`;
- `created_at`.

Relacionamentos conceituais:

- `client_assignments.client_id -> clients.id`;
- `client_assignments.staff_profile_id -> profiles.id`.

Considerar assignment ativo quando `ended_at IS NULL`.

### RECOMENDACAO TECNICA

Evitar manter ao mesmo tempo `active` boolean e `ended_at`, pois isso criaria duas fontes de verdade para o mesmo estado.

### QUESTAO ABERTA

A definicao de quem pode criar, encerrar ou modificar assignments permanece aberta para implementacao administrativa futura.

Nao definir ainda papeis de equipe futura.

## Relacionamentos conceituais

### DECISAO CONFIRMADA

Cardinalidades conceituais:

- `auth.users` 1 -> 0..1 `profiles`;
- `profiles` 1 -> 0..N `user_roles`;
- `profiles` 1 -> 0..1 `clients`;
- `clients` 1 -> 0..1 `client_registration`;
- `profiles` 1 -> 0..N `client_assignments`;
- `clients` 1 -> 0..N `client_assignments`.

Esse modelo permite:

- cliente cadastrado sem login;
- criacao posterior da conta;
- encerramento de acompanhamento sem perda historica;
- futuro suporte a equipe sem tornar acesso global automatico.

## Entidades conceituais previstas

### DECISAO CONFIRMADA

O produto lidara com informacoes de:

- clientes;
- anamnese;
- medidas;
- fotos;
- exames;
- protocolos;
- avaliacoes;
- conteudos;
- exercicios;
- usuarios administrativos;
- revisoes e aprovacoes da Patty.

### RECOMENDACAO TECNICA

O modelo futuro deve diferenciar entidades de identidade, perfil e dominio clinico/operacional.

Uma futura modelagem deve considerar versionamento para protocolos, interpretacoes de IA, ajustes da Patty e versoes aprovadas.

BACKEND-A1 implementa indices nas principais colunas usadas nas relacoes e em RLS:

- `clients.profile_id`;
- `user_roles.profile_id`;
- `client_assignments.client_id`;
- `client_assignments.staff_profile_id`;
- `client_registration.client_id`.

## Schemas futuros

### DECISAO CONFIRMADA

A fundacao BACKEND-A1 usa `public` para as tabelas da aplicacao protegidas por RLS. Nao foram criados schemas privados, views, funcoes privilegiadas, Storage ou tabelas de dados clinicos nesta fase.

### RECOMENDACAO TECNICA

Evolucoes futuras podem usar:

- `public`: dados da aplicacao que precisam ser acessiveis pela Data API sob RLS;
- schema privado futuro, por exemplo `private`: prompts, analises internas de IA, logs internos sensiveis, regras internas e dados nao destinados ao cliente.

Nao decidir ainda toda a distribuicao das tabelas futuras.

## Aplicabilidade versionada da Anamnese

### DECISAO TECNICA

A primeira fundacao de condicionalidade da Anamnese usa a propria definicao versionada da pergunta.

Cada `anamnesis_questions` pode permanecer:
- sem regra de aplicabilidade, caso em que e aplicavel por padrao;
- ou vinculada a **uma** pergunta controladora da mesma `form_version_id`, com um unico valor JSON esperado.

Campos propostos na migration `20260924105003_add_anamnesis_question_applicability_foundation.sql`:
- `applicability_source_question_id uuid nullable`;
- `applicability_expected_answer jsonb nullable`.

Invariantes:
- fonte e valor esperado aparecem juntos ou ambos ficam nulos;
- `json null` nao e um valor esperado valido nesta fundacao;
- a pergunta nao pode depender dela mesma;
- a fonte deve pertencer a mesma versao da pergunta dependente;
- nenhuma nova permissao de escrita de definicao e concedida.

### LIMITE

Esta fundacao representa somente comparacao exata de um valor por pergunta dependente.

Nao modela nesta etapa:
- AND/OR entre varias condicoes;
- operadores numericos ou ranges;
- negacao;
- condicoes clinicas;
- regras de alerta;
- inferencia automatica do mapa.

O mapa pergunta-a-pergunta continua dependendo da especificacao final da Anamnese.

A migration foi validada em transacao com `ROLLBACK` no Supabase SaaS antes do commit: regra valida aceitou, par incompleto/cross-version/self-reference/json-null foram rejeitados e nenhuma coluna persistiu.

## IA e versionamento

### DECISAO CONFIRMADA

O sistema deve preservar:

- resposta original;
- interpretacao da IA;
- alteracoes da Patty;
- versao aprovada;
- historico das versoes.

### ESTADO ATUAL VERIFICADO

Ainda nao existem entidades persistentes para prompts, execucoes de IA, analises de IA, rascunhos de IA, alertas ou pendencias estruturados, nem auditoria generica.

As estruturas existentes que podem apoiar futura modelagem, sem constituir modelo de IA, sao:

- `anamnesis_submissions`, `anamnesis_answers` e `anamnesis_reviews`;
- `professional_follow_ups`;
- `protocols`, `protocol_versions`, `protocol_version_approvals` e `protocol_publications`;
- `client_assessments`, `assessment_measurements`, `assessment_files` e `client_files`.

Essas estruturas nao eliminam a distincao necessaria:

```text
dado original
!= interpretacao da IA
!= rascunho
!= alteracao da Patty
!= versao aprovada
!= publicacao
```

`protocol_versions.submitted_for_review_at IS NULL` representa somente um draft tecnico da versao de protocolo. Nao representa rascunho de IA.

### DIVERGENCIA ATUAL DE UI

A demonstracao de revisao de Anamnese usa o campo `aiAnalysis` em `lib/demo/anamnesis.ts`. Esse conteudo nao possui entidade persistente, RLS ou auditoria real e nao define contrato de IA.

### MODELO TECNICO APROVADO PARA FUNDACAO

Ainda nao existe modelo fisico implementado para IA. O desenho abaixo e uma decisao tecnica para uma migration futura; nao cria entidades, RLS, grants, triggers ou auditoria generica nesta etapa.

#### `ai_prompt_versions`

Mantem `prompt_key`, `version_number`, instrucao/conteudo e `created_at`. Cada versao e imutavel e identificada por `unique (prompt_key, version_number)`. Ela e criada por deploy ou processo administrativo controlado, sem UI de gerenciamento na v1.

#### `ai_executions`

Mantem `client_id`, `purpose_key`, `prompt_version_id`, `initiated_by_profile_id`, provider, modelo, lifecycle/status, timestamps e motivo opcional de descarte. A linha representa uma tentativa operacional explicitamente iniciada, vinculada a prompt, provider e modelo ja definidos, e pode realizar no maximo uma chamada ao provider. Ela nao contem output original e nao deve ser tratada como integralmente imutavel.

Uma extensao futura deve adicionar `failure_stage`, `failure_code` e `failure_message` nullable. Os tres campos permanecem nulos quando o status nao e `failed`; em `failed`, stage e code sao obrigatorios e message permanece opcional. Stage, code e message sao fatos historicos e nao podem ser reescritos apos terminalizacao. Isso ainda nao esta implementado.

#### `ai_execution_outputs`

Mantem `execution_id`, `content jsonb` e `created_at`, em relacao 1:1 com `ai_executions`. E a saida original imutavel da IA. Pode nao existir quando a execucao ainda esta em andamento ou falhou.

#### `ai_execution_failure_responses`

Extensao futura aprovada, ainda nao implementada, para preservar conteudo efetivamente retornado pelo modelo que nao se tornou `ai_execution_output` valido. Mantem `execution_id`, `client_id`, `content`, `content_format` e `received_at`.

`execution_id` deve ser a PK, permitindo no maximo uma linha por execution, e a relacao com `ai_executions` deve ser client-scoped por FK composta. `content` deve ser `text`, inclusive quando o conteudo recebido for JSON sintaticamente valido, para preservar literalmente a resposta original recebida. `content_format` usa apenas `text` ou `json`: `text` quando o conteudo nao e JSON sintaticamente valido e `json` quando e JSON valido, ainda que incompativel com o schema de output esperado. A tabela nao inclui `response_disposition`, porque essa classificacao e derivavel de `failure_stage` e `failure_code`.

Essa entidade deve ser insert-only, sem UPDATE ou DELETE, e nao deve armazenar envelope HTTP completo, headers, tokens, credentials, request completo, stack trace ou telemetria irrelevante. O limite maximo de `content` ainda nao esta definido.

#### `ai_execution_sources`

Mantem `execution_id`, `client_id`, `source_kind` e FKs concretas nullable para a fonte efetivamente usada. Uma unica tabela usa `CHECK` para exigir exatamente um formato de fonte por linha; nao usa `source_type + source_id` generico sem FK.

As fontes previstas sao `anamnesis_answers`, `assessment_measurements`, `client_files`, `protocol_versions` e `professional_follow_ups`. Para foto de avaliacao/evolucao, a fonte enviada e o `client_file` selecionado; `assessment_files` continua sendo somente a relacao existente entre arquivo e avaliacao quando aplicavel, sem duplicar a referencia de fonte.

#### `ai_draft_versions`

Mantem `execution_id`, `client_id`, `version_number`, `based_on_draft_version_id`, conteudo, `created_by_profile_id`, `created_at` e metadata opcional de descarte. O conteudo e o versionamento sao append-only: nenhuma versao anterior e sobrescrita. A versao 1 e a primeira edicao humana baseada no output original; cada edicao posterior cria uma nova linha. Se houver descarte, somente sua metadata pode sofrer transicao restrita, sem editar o conteudo.

#### `ai_hypotheses`

Mantem `execution_id`, `client_id`, conteudo original, `created_at`, `confirmed_by_profile_id` e `confirmed_at`. O conteudo e imutavel. A confirmacao e unica e irreversivel, preservando autoria e momento da decisao, sem transformar a hipotese em regra geral do metodo.

#### Integridade das fontes

Entidades internas client-scoped carregam `client_id`. A migration futura deve usar FKs compostas para impedir que uma execucao de uma cliente referencie fonte de outra. Para isso, deve validar novamente o schema vigente e adicionar somente se ainda necessarias:

- `unique (id, client_id)` em `anamnesis_submissions`;
- `unique (id, client_id)` em `professional_follow_ups`;
- `unique (id, submission_id)` em `anamnesis_answers`;
- `unique (id, assessment_id)` em `assessment_measurements`.

A migration tambem deve realizar validacao estreita para aceitar somente respostas ligadas a submissao de Anamnese efetivamente submetida e para confirmar compatibilidade entre o tipo de `client_file` e a fonte de foto, exame ou documento selecionada. A implementacao dessa validacao nao esta definida nesta documentacao.

#### Ownership, RLS e relacionamento com protocolos

Admin acessa objetos internos somente com role relacional `admin` e assignment ativo da cliente. Cliente e `anon` recebem zero acesso a entidades internas de IA. Prompts permanecem internos a admin/deploy. Credenciais de provider ou secret nunca pertencem ao browser.

`ai_execution_failure_responses` deve seguir o mesmo modelo: RLS obrigatoria; admin relacional com assignment ativo recebe somente SELECT client-scoped; cliente recebe zero linhas; `anon` nao recebe acesso; e `authenticated` nao recebe INSERT, UPDATE ou DELETE. A escrita fica restrita a caminho server-side confiavel ainda nao definido, sem `SECURITY DEFINER` como atalho e sem service role ou secret no browser.

`protocol_versions` nao deve ser reutilizado como draft de IA. O fluxo previsto e:

```text
fontes
-> ai_execution
-> ai_execution_output
-> ai_draft_versions
-> ai_hypotheses e confirmacoes
-> futura materializacao controlada
-> protocol_version
-> aprovacao
-> publicacao
```

Uma futura materializacao deve preferir entidade de ligacao propria entre `ai_draft_versions` e `protocol_versions`, sem mudar agora a semantica de protocolo. Pendencias sugeridas, perguntas sugeridas, a materializacao, o enforcement final entre hipotese pendente e publicacao e a UI de prompts ficam adiados.

#### Limites para uso em producao

Nao ha bloqueio para modelar a fundacao. Antes de uso real em producao, permanecem pendentes provider/modelo concreto, garantia tecnica e contratual de no-training, consentimento/base legal, taxonomia final de `purpose_key`, contrato estruturado final do output, identificacao estavel da condicao financeira para exclusao automatica e enforcement entre hipotese pendente e publicacao.

### DECISOES PARA MODELAGEM FUTURA

Quando a fundacao for implementada, cada execucao devera manter referencias das fontes utilizadas, sem duplicar automaticamente todo o conteudo original, e registrar a versao da instrucao/prompt, o modelo e o provider.

O contexto padrao de uma execucao inclui respostas de Anamnese, exceto condicao financeira, que exige selecao explicita da Patty, e todas as medidas factuais registradas. Fotos de avaliacao/evolucao, exames/documentos de saude, protocolos anteriores e historico de acompanhamento exigem selecao explicita da Patty. Cidade, Telefone e Email de contato nao entram automaticamente a partir do Cadastro Atual; Endereco, escolaridade e Instagram permanecem fora do contexto padrao sem necessidade especifica.

Uma modelagem futura deve preservar separadamente a saida original da IA, cada versao editada pela Patty com autoria e data/hora, a versao aprovada e a publicacao. Deve tambem preservar referencias das fontes, instrucoes/prompts, modelo, provider e decisoes de aprovacao ou rejeicao, sem exclusao automatica do historico de IA. Isso nao cria entidades, RLS, auditoria generica ou politica legal de retencao nesta etapa.

Analises, hipoteses, rascunhos, versoes internas e comentarios internos da Patty nao devem ser expostos a cliente. A escolha concreta de provider, modelo, modelo fisico, regras de acesso e controles contratuais/tecnicos para impedir uso dos dados em treinamento permanecem pendentes.

## Limites desta documentacao

### DECISAO HISTORICA SUBSTITUIDA

A restricao anterior de nao criar tabelas, SQL, migrations, schemas ou Supabase pertencia a fase documental. Foi substituida para a fundacao operacional BACKEND-A1, limitada a `profiles`, `user_roles`, `clients` e `client_assignments`.

### QUESTAO ABERTA

Ainda e necessario definir o modelo logico detalhado.

### QUESTAO ABERTA

Ainda e necessario definir quais campos serao obrigatorios em medidas, fotos, exames, protocolos e avaliacoes. Para Anamnese, a regra geral ja esta confirmada: todos os campos aplicaveis da versao devem estar preenchidos no envio final; rascunhos podem permanecer incompletos.

### QUESTAO ABERTA

Ainda e necessario definir politica de retencao, arquivamento e exportacao de dados.

## Implementacao BACKEND-A1

### DECISAO CONFIRMADA

A migration `20260918034107_create_identity_client_rbac_foundation.sql` implementa a fundacao fisica com `timestamptz`, UUIDs e RLS em todas as tabelas expostas:

- `profiles.id` referencia `auth.users.id` com `ON DELETE CASCADE`;
- `clients.profile_id` e opcional, unico e usa `ON DELETE SET NULL`, preservando o registro profissional quando uma identidade de cliente e removida;
- `user_roles` usa o enum restrito `app_role` com apenas `admin` e `client`;
- `client_assignments` preserva historico por `ended_at`; um indice unico parcial impede duplicacao de assignment ativo para o mesmo par cliente/profissional;
- assignments protegem sua referencia ao profissional com `ON DELETE RESTRICT`, para evitar apagar historico silenciosamente.

Os campos textuais `profiles.status` e `clients.status` foram mantidos opcionais e sem valores enumerados: os valores definitivos continuam questao aberta. Nenhuma aplicacao navegador recebe permissao de escrita para esses campos nesta fase.

## Contrato minimo futuro para frontend

### Profile

O frontend autenticado pode consumir o proprio `id`, `display_name` e estado quando o fluxo de provisionamento o disponibilizar. Nao deve inferir autorizacao a partir de metadados JWT editaveis.

### Client

O frontend pode consumir um cliente somente quando a policy RLS permitir: a propria cliente vinculada ou um admin com assignment ativo. Email de login e dados de Cadastro Atual continuam fora desta fundacao.

### Contexto do usuario atual

O contexto futuro deve combinar sessao autenticada, perfil, roles que a propria conta pode ler e `client_id` quando houver vinculo. A API nao deve distinguir desnecessariamente recurso inexistente de recurso proibido para clientes.

## Implementacao BACKEND-BUNDLE-01

### DECISAO CONFIRMADA

`client_registration` implementa o Cadastro Atual como estado 1:1 opcional de `clients`. Seus campos implementados sao `city`, `phone`, `contact_email` e `instagram`.

`contact_email` pertence ao cadastro atual, nao e chave de relacionamento e nao possui sincronizacao automatica com o email de autenticacao. Nao foi criado historico/versionamento cadastral nesta etapa.

### DECISAO CONFIRMADA

A definicao de Anamnese e versionada por `anamnesis_forms`, `anamnesis_form_versions`, `anamnesis_sections` e `anamnesis_questions`.

Sections e questions pertencem a uma versao especifica, usam chaves estaveis separadas de titulos/textos e mantem ordem explicita. `answer_type` permanece textual com validacoes basicas de preenchimento, para nao fechar tipos futuros sem decisao funcional. Opcoes, quando existirem, sao preservadas como `jsonb` da pergunta da versao correspondente.

O inventario historico de 15 categorias e 36 perguntas nao foi publicado como catalogo do aplicativo: ele ainda depende das validacoes registradas em `ANAMNESE.md` e nas questoes abertas.

### DECISAO CONFIRMADA

`anamnesis_submissions` vincula cada preenchimento a um `client_id` e a uma `form_version_id`. `anamnesis_answers` preserva o valor original em `answer_value jsonb` e usa FKs compostas para impedir que uma resposta aponte para pergunta de outra versao.

Uma submission com `submitted_at` preenchido e imutavel, assim como suas respostas. Definicoes de formulario que ja possuem submissions tambem nao sao alteradas ou removidas.

Correcoes posteriores nao criam sobrescrita da resposta original: somente a Patty/admin autorizado pode acrescentar registros append-only em `anamnesis_answer_corrections`, preservando `anamnesis_answers.answer_value`, autoria e timestamp. A cliente nao edita respostas depois do envio final.

### DECISAO CONFIRMADA

`anamnesis_reviews` armazena notas administrativas separadamente da resposta original, com autoria e timestamp. Reviews nao contêm interpretacao de IA nesta etapa e nao sao visiveis para clientes.

## Contratos conceituais futuros

### CurrentRegistration

Representa somente o cadastro atual permitido para a aplicacao: `clientId`, `city`, `phone`, `contactEmail` e `instagram`.

### AnamnesisDefinition

Representa um formulario logico e uma versao disponivel, com sections ordenadas e questions contendo `questionKey`, `label`, `answerType`, `required` e `options` quando aplicaveis. O contrato nao expoe regras profissionais, prompts, logica de IA ou notas internas.

### AnamnesisSubmission

Representa `id`, `clientId`, `formVersionId`, `createdAt`, `submittedAt`, estado derivado de `submittedAt` e respostas originais. Nao inclui reviews administrativos.

### AdminReview

Representa uma nota administrativa separada com `id`, `submissionId`, `reviewerProfileId`, `note` e `createdAt`. Esse contrato e administrativo e nao deve ser combinado ao contrato de cliente.

## Implementacao BACKEND-BUNDLE-02

### DECISAO CONFIRMADA

`client_files` e o registro operacional de arquivos privados. Ele referencia `clients`, mantem `file_kind` entre `photo`, `exam` e `document`, e registra `bucket_id` e `object_path` sem usar `storage.objects` como tabela de negocio.

O caminho usa somente identificadores opacos no namespace `clients/<client_uuid>/<file_kind>/<file_uuid>.<ext>`. Ele nao usa email, nome, CPF, telefone ou Instagram. Cada novo upload representa novo registro; nao ha substituicao silenciosa de historico.

### DECISAO CONFIRMADA

`client_assessments` representa um evento historico de avaliacao. `assessment_measurements` guarda entradas de medida com chave estavel, valor `numeric(12,4)` e unidade separada. Nenhum catalogo clinico de medidas, unidade obrigatoria por medida, calculo, score ou interpretacao e introduzido nesta etapa.

`assessment_files` permite relacionar um arquivo privado ja existente a uma avaliacao, preservando a consistencia de cliente entre avaliacao e arquivo.

### DECISAO CONFIRMADA

`professional_follow_ups` preserva historico interno de acompanhamento profissional. Cada registro pode conter dificuldade, percepcao de aderencia, observacao da Patty, decisao profissional e motivo. As chaves de decisao confirmadas nesta etapa sao `maintain`, `simplify`, `advance` e `return`.

O registro nao executa protocolo, dieta, treino, mudanca de fase, diagnostico, score ou qualquer transicao automatica.

### QUESTAO ABERTA

Ainda nao foram definidos o catalogo profissional de medidas, suas unidades permitidas, a visibilidade de avaliacoes para a cliente, a correcao de avaliacao historica, a origem da percepcao de aderencia e quais partes futuras do acompanhamento poderao ser exibidas para a cliente.

## Contratos conceituais futuros

### ClientFile

Representa `id`, `clientId`, `fileKind`, `originalFilename`, `mimeType`, `byteSize` e `createdAt`. O contrato nao persiste URL publica ou signed URL; a referencia de objeto permanece operacional e interna.

### Assessment

Representa `id`, `clientId`, `assessedAt`, medidas com `measurementKey`, `measurementValue` e `unit`, e arquivos relacionados quando permitidos. Nao inclui conclusao clinica ou observacao interna.

### ProfessionalFollowUp

Representa contrato administrativo interno com observacoes, decisao e motivo. Ele permanece separado de qualquer contrato futuro de cliente.

## Implementacao BACKEND-BUNDLE-03

### DECISAO CONFIRMADA

`protocols` identifica o protocolo logico de uma cliente; `protocol_versions` preserva cada versao. Uma versao pode indicar a versao anterior e possui numero unico dentro do protocolo. `protocol_version_approvals` registra a aprovacao humana separadamente de `protocol_publications`, cuja FK exige uma aprovacao da mesma versao e cliente.

Uma versao submetida para revisao fica congelada. Aprovacao e publicacao nao alteram seu conteudo; uma mudanca posterior cria nova versao. A cliente so pode ler a propria versao efetivamente publicada.

### DECISAO CONFIRMADA

`meal_plan_versions` pertence a uma `protocol_version`. Variantes, ciclos opcionais, passos ordenados, refeicoes ordenadas e alocacoes de dose sao estruturas versionadas do plano. Horario de refeicao nao e obrigatorio estruturalmente. `dose_quantity` usa `numeric(12,4)` e os tipos estruturais sao somente `protein`, `carbohydrate` e `fat`; isso nao representa calculo, recomendacao ou regra profissional.

### DECISAO CONFIRMADA

`food_equivalent_catalogs` possui versoes, grupos e itens. Um plano pode referenciar uma versao especifica do catalogo, sem usar o conceito de versao mais recente. O catalogo permanece vazio nesta etapa e nenhum alimento real foi publicado.

## Implementacao BACKEND-BUNDLE-04

### DECISAO CONFIRMADA

`educational_contents` identifica um conteudo educacional logico e `educational_content_versions` preserva suas versoes. Titulo, ordem editorial explicita e chaves textuais opcionais de categoria, tipo e fase pertencem a versao. Essas chaves nao definem taxonomia, mecanismo de fase ou regra profissional.

Versao publicada e imutavel. `client_content_releases` registra a liberacao explicita de uma versao publicada para uma cliente, com responsavel e timestamp. Uma nova versao nao altera releases existentes.

### DECISAO CONFIRMADA

`client_content_progress` e separado da release e armazena somente `first_opened_at` e `completed_at`. Nao ha score, regra de conclusao, liberacao automatica ou escrita pela cliente nesta etapa.

### DECISAO CONFIRMADA

`exercises` e `exercise_versions` formam uma biblioteca separada da biblioteca educacional. A versao armazena apenas nome, numero de versao e publicacao; nao inclui series, repeticoes, carga, descanso, progressao, musculos ou protocolo de treino.


## Esclarecimentos pos-Anamnese

### DECISAO TECNICA/PRODUTO

`anamnesis_clarification_requests` preserva cada pedido da Patty para uma `anamnesis_submission` enviada. O pedido pode opcionalmente apontar para um `anamnesis_answer` da mesma submission, sem alterar essa resposta.

`anamnesis_clarification_responses` preserva complementos textuais da cliente em ordem cronologica. Pedido e complemento sao append-only; nao existe UPDATE/DELETE operacional.

O modelo nao cria estado de workflow. A existencia de zero, uma ou varias respostas e um fato historico, nao um status profissional de resolucao.
