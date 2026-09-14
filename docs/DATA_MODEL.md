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

A BACKEND-001 devera prever indices nas principais colunas usadas nas relacoes e em RLS, incluindo conceitualmente:

- `clients.profile_id`;
- `user_roles.profile_id`;
- `client_assignments.client_id`;
- `client_assignments.staff_profile_id`;
- `client_registration.client_id`.

## Schemas futuros

### RECOMENDACAO TECNICA

Recomendacao inicial de schemas:

- `public`: dados da aplicacao que precisam ser acessiveis pela Data API sob RLS;
- schema privado futuro, por exemplo `private`: prompts, analises internas de IA, logs internos sensiveis, regras internas e dados nao destinados ao cliente.

Nao criar schema nesta tarefa.

Nao decidir ainda toda a distribuicao das tabelas futuras.

## IA e versionamento

### DECISAO CONFIRMADA

O sistema deve preservar:

- resposta original;
- interpretacao da IA;
- alteracoes da Patty;
- versao aprovada;
- historico das versoes.

## Limites desta documentacao

### DECISAO CONFIRMADA

Esta tarefa nao cria tabelas, SQL, migrations, schemas ou Supabase.

### QUESTAO ABERTA

Ainda e necessario definir o modelo logico detalhado.

### QUESTAO ABERTA

Ainda e necessario definir quais campos serao obrigatorios em anamnese, medidas, fotos, exames, protocolos e avaliacoes.

### QUESTAO ABERTA

Ainda e necessario definir politica de retencao, arquivamento e exportacao de dados.
