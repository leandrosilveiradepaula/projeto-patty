# RBAC e RLS

## Principios de acesso

### DECISAO CONFIRMADA

RLS e obrigatoria.

Cliente so acessa os proprios dados.

Patty/admin acessa clientes sob sua responsabilidade.

Fotos, exames e documentos devem ser privados.

Dados de saude sao sensiveis.

Autenticacao nao e autorizacao.

Para dados client-scoped, autorizacao deve verificar vinculo explicito com o cliente.

### EXCECAO CONFIRMADA PARA ARQUIVOS PRIVADOS

No MVP, a Patty e a unica administradora/profissional de negocio e pode acessar fotos, exames e documentos privados das clientes mesmo sem `client_assignment` ativo. Esta excecao nao autoriza acesso irrestrito aos demais dados client-scoped e deve ser reavaliada antes da introducao de qualquer outro admin ou profissional.

## Estrategia geral de RLS

### DECISAO CONFIRMADA

A estrategia de RLS deve seguir `DENY BY DEFAULT`.

RLS devera ser habilitada em toda tabela exposta que contenha dados da aplicacao.

Uma policy apenas com `TO authenticated` nao e considerada suficiente para dados client-scoped.

Policies precisam incluir vinculo explicito com o recurso acessado.

## Papeis conhecidos

### DECISAO CONFIRMADA

Papeis conceituais conhecidos neste momento:

- `admin`;
- `client`.

No MVP, a Patty e a unica administradora/profissional de negocio. Nao serao criados papeis operacionais para assistente, profissional parceiro ou suporte nesta primeira versao.

Roles nao serao armazenados em `user_metadata`.

Cliente nao pode administrar papeis.

Acesso tecnico ao repositorio ou infraestrutura nao constitui automaticamente role de negocio da aplicacao e nao concede acesso client-scoped por si so.

Papeis adicionais ficam fora do MVP e exigem decisao propria de escopo e permissoes antes de implementacao.

## Separacao de responsabilidades

### DECISAO CONFIRMADA

Autenticacao, perfil, cliente e dados clinicos/operacionais devem ser separados.

`auth.users` nao sera a tabela principal de clientes.

## Acesso da cliente

### DECISAO CONFIRMADA

Fluxo conceitual de acesso da cliente:

```text
auth.uid()
->
profiles.id
->
clients.profile_id
->
recurso.client_id
```

Cliente pode acessar somente seu proprio `clients`.

Cliente pode acessar somente seu proprio `client_registration`.

Futuramente, cliente podera acessar somente seus proprios dados client-scoped.

Para Anamnese em rascunho, a fundacao de escrita segue privilegio minimo: a cliente pode criar somente a propria submission para versao publicada e inserir/atualizar somente o valor das respostas enquanto a submission continua sem `submitted_at`. A identidade da resposta (`submission_id`, `form_version_id`, `question_id`) nao recebe UPDATE.

A regra de produto da submissao final esta definida e implementada: todos os campos aplicaveis obrigatorios devem estar preenchidos, perguntas nao aplicaveis nao bloqueiam e o consentimento versionado precisa estar aceito. A cliente pode concluir o envio final pela boundary existente; depois disso, respostas e submission ficam protegidas contra edicao pela cliente.

Depois da submissao, a cliente nao recebe escrita nas respostas nem acesso a `anamnesis_answer_corrections`. Correcoes estruturadas sao administrativas, exigem assignment ativo e AAL2, e sao append-only.

Cliente nunca pode acessar dados de outra cliente.

Cliente nao pode modificar `user_roles`.

Cliente nao pode criar ou modificar `client_assignments`.

Nao criar excecoes genericas.

## MFA administrativo na camada de dados

### DECISAO DE SEGURANCA

MFA obrigatorio para `admin` deve ser aplicado tambem em RLS, nao apenas na navegacao do aplicativo.

A estrategia e aditiva: policies `RESTRICTIVE` verificam o claim confiavel `aal` do JWT por meio de `auth.jwt()`. Elas nao substituem ownership, role ou assignment e nao transformam AAL2 em autorizacao suficiente por si so.

`user_roles` permanece fora dessa restricao para permitir que uma sessao administrativa em `aal1` descubra o proprio role e seja encaminhada ao fluxo de MFA. Os demais recursos administrativos protegidos exigem `aal2`. Clientes em `aal1` continuam sujeitas somente as policies normais de ownership e nao passam a exigir MFA.

A migration `20260923113835_admin_mfa_rls_enforcement.sql` foi aplicada no Supabase SaaS em 2026-09-23. O smoke pos-aplicacao documentado confirmou admin em AAL1 bloqueado, admin em AAL2 autorizado quando as demais policies permitem e cliente em AAL1 sem regressao.

## Acesso Patty/admin

### DECISAO CONFIRMADA

Fluxo conceitual de acesso Patty/admin:

```text
auth.uid()
->
profiles
->
user_roles.role = admin
+
client_assignments ativo
->
client_id
```

Para dados client-scoped, acesso administrativo deve considerar:

1. identidade autenticada;
2. papel adequado;
3. assignment ativo ao cliente.

Nao tratar simplesmente `role = admin` como autorizacao irrestrita para todos os dados.

Excecao vigente no MVP: para `client_files` e os objetos correspondentes no Storage privado, a Patty pode acessar os arquivos sem assignment ativo. Essa excecao e especifica para arquivos e para o modelo atual de uma unica admin; nao deve ser copiada para outras tabelas client-scoped.

A Patty tambem podera criar uploads administrativos de arquivos em nome da cliente por boundary server-side controlada, com autoria administrativa registrada. O browser nao deve receber escrita privilegiada irrestrita em `client_files` ou `storage.objects`, e o fluxo nao pode mascarar o ator real do upload.

Essa arquitetura protege contra ampliacao acidental de acesso quando futuramente existirem outros profissionais.

## User roles e client assignments

### DECISAO CONFIRMADA

Clientes nao podem:

- inserir roles;
- atualizar roles;
- remover roles;
- criar assignments;
- alterar assignments;
- encerrar assignments.

No MVP, somente a Patty pode iniciar ou encerrar `client_assignments`, por fluxo administrativo server-side controlado. O browser nao recebe `INSERT`, `UPDATE` ou `DELETE` direto nessa tabela. Encerrar um assignment preserva seu historico e remove somente o acesso atual; hard delete nao e operacao normal do produto.

Nao criar policy generica que permita ao `admin` conceder permissoes arbitrariamente.

### DECISAO DE SEGURANCA

O primeiro admin Patty sera provisionado por procedimento administrativo controlado e unico, sem autoelevacao pelo aplicativo, endpoint publico ou cadastro autonomo de role `admin`.

O procedimento deve criar ou vincular a identidade Auth ao `profile` correto e registrar o role relacional `admin` com privilegios administrativos restritos ao provisionamento. Isso nao concede acesso client-scoped sem assignment ativo.

## GRANT e RLS

### RECOMENDACAO TECNICA

GRANT e RLS sao camadas diferentes.

GRANT define se um papel PostgreSQL consegue executar uma operacao sobre a tabela.

RLS define quais linhas ficam acessiveis depois que a operacao e permitida.

A implementacao futura deve usar privilegios minimos e GRANTs explicitos.

Nao assumir que tabelas novas ficarao automaticamente disponiveis pela Data API.

## Chaves do Supabase

### RECOMENDACAO TECNICA

Frontend/browser deve usar publishable key.

Servidor controlado pode usar secret key somente quando acesso privilegiado for realmente necessario.

Secret key:

- nunca deve ser usada no browser;
- nunca deve estar em variavel `NEXT_PUBLIC_*`;
- ignora RLS;
- nao deve ser usada como atalho para fluxos comuns de usuarios autenticados.

Fluxos normais de cliente e Patty devem preferir sessao autenticada com RLS sempre que possivel.

Nao recomendar novas implementacoes baseadas nas chaves legadas `anon` e `service_role`, salvo quando necessario para explicar papeis PostgreSQL internos ou compatibilidade.

## Policies futuras

### DECISAO CONFIRMADA

BACKEND-A1 aplica:

- usar `TO authenticated` combinado com predicado real de autorizacao;
- evitar `auth.role()`;
- usar `(select auth.uid())` onde apropriado;
- lembrar que `UPDATE` precisa considerar `SELECT`, `USING` e `WITH CHECK`;
- indexar colunas utilizadas frequentemente pelas policies;
- nao usar `user_metadata` para autorizacao;
- views futuras expostas devem respeitar RLS, preferencialmente `security_invoker`;
- `SECURITY DEFINER` nao deve ser usado apenas para contornar RLS.

Se futuramente uma funcao `SECURITY DEFINER` for realmente necessaria:

- deve ficar em schema nao exposto;
- deve possuir autorizacao explicita;
- deve restringir `EXECUTE`;
- deve ter `search_path` controlado;
- deve passar por revisao de seguranca.

A afirmacao acima descreve a fase inicial. Fases posteriores introduziram funcoes e boundaries controladas documentadas em `DECISIONS.md`; qualquer avaliacao atual deve usar o estado mais recente, nao esta restricao historica.

## Auditoria

### DECISAO CONFIRMADA

Acoes criticas devem ser auditadas.

Visualizacao ou download administrativo de exames e documentos privados e acao auditavel no MVP. O registro deve conter apenas identificadores internos, acao, data/hora e resultado da autorizacao, sem copiar o conteudo do arquivo. A auditoria deve ocorrer na boundary controlada que autoriza a operacao/gera a signed URL.

Preservar historico.

Nao sobrescrever versoes antigas.

### RECOMENDACAO TECNICA

A futura especificacao de RLS deve incluir testes para provar isolamento entre clientes e acesso administrativo apenas dentro do escopo permitido.

## Questoes abertas

### QUESTAO ABERTA

Ainda e necessario definir as demais acoes consideradas criticas para auditoria. A visualizacao/download administrativo de exames e documentos privados ja esta definida como auditavel.

## Implementacao BACKEND-A1

### Grants

`anon` nao recebe privilegios nas quatro tabelas. `authenticated` recebe somente `SELECT` em `profiles`, `user_roles`, `clients` e `client_assignments`; nao recebe `INSERT`, `UPDATE` ou `DELETE` nessas tabelas. O Supabase local tambem esta configurado com `auto_expose_new_tables = false`, exigindo grants explicitos para futuras tabelas.

### Matriz de RLS

| Tabela | Papel | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- | --- |
| `profiles` | authenticated | propria conta; admin com assignment ativo para a cliente vinculada | negado | negado | negado |
| `user_roles` | authenticated | somente os proprios roles | negado | negado | negado |
| `clients` | authenticated | propria cliente; admin com assignment ativo | negado | negado | negado |
| `client_assignments` | authenticated | somente assignments do proprio admin | negado | negado | negado |

As policies usam `(select auth.uid())`, role relacional e assignment com `ended_at IS NULL`. Nenhuma policy depende somente de `TO authenticated`, `auth.role()`, JWT como fonte unica de papel ou `SECURITY DEFINER`.

### Provisionamento administrativo

O browser nao cria perfis, clientes, roles ou assignments diretamente. O bootstrap de producao da Patty sera um procedimento administrativo controlado e unico, sem autoelevacao pela aplicacao. No MVP, a Patty podera iniciar ou encerrar assignments somente por boundary administrativo server-side controlado; o registro historico deve ser preservado. Fixtures pgTAP sinteticas existem apenas para provar isolamento local.

## Implementacao BACKEND-BUNDLE-01

### DECISAO CONFIRMADA

`client_registration`, definicoes de Anamnese, submissions, answers e reviews usam RLS desde a criacao e privilegios minimos explicitos.

Para Cadastro Atual, submission e answer, a cliente autenticada le somente recursos vinculados ao proprio `clients.profile_id`. Patty/admin le somente quando possui role relacional `admin` e assignment ativo para a cliente. `anon` nao recebe acesso.

### DECISAO HISTORICA PARCIALMENTE SUBSTITUIDA

A fundacao original nao concedia escrita de browser em Cadastro Atual, definicoes, submissions ou answers. Essa descricao foi parcialmente substituida para Anamnese em rascunho.

Na implementacao atual, a cliente autenticada pode criar somente a propria submission de rascunho para versao publicada e inserir/atualizar somente o valor das proprias respostas enquanto `submitted_at IS NULL`, sob RLS e privilegios minimos. O envio final e permitido somente pela transicao controlada de `submitted_at`, validada deterministicamente no banco. Cadastro Atual e definicoes de formulario nao receberam escrita ampla pelo browser por causa dessa mudanca. Posteriormente, o Cadastro Atual recebeu edicao controlada exclusivamente por Server Actions: cliente resolve o proprio `client_id`; admin exige AAL2 e valida cliente sob assignment ativo; somente depois uma boundary `server-only` privilegiada executa o upsert. `authenticated` continua com grant direto apenas de SELECT em `client_registration`.

Administradores com assignment ativo podem inserir review administrativa em seu proprio nome e ler reviews da cliente sob sua responsabilidade. Clientes nao possuem grant ou policy para ler reviews.

### DECISAO CONFIRMADA

A fundacao de aplicabilidade de perguntas nao altera a superficie de autorizacao: as colunas de condicionalidade pertencem a `anamnesis_questions`, portanto seguem os mesmos grants, RLS, publicacao por versao e imutabilidade das definicoes ja existentes. Nenhum grant de INSERT/UPDATE/DELETE de definicao e aberto para cliente ou browser administrativo por essa fundacao.

### DECISAO CONFIRMADA

Clientes nao possuem permissoes para criar, alterar, excluir ou publicar definicoes de Anamnese. O catalogo so pode ser lido quando uma versao estiver marcada como disponivel por `published_at`. A `client-anamnesis` v1 canonica foi publicada pela migration `20260924230322_publish_canonical_anamnesis_v1`.

## Implementacao BACKEND-BUNDLE-02

### DECISAO HISTORICA SUBSTITUIDA E ESTADO ATUAL

A implementacao inicial de `client_files` exigia assignment ativo para acesso administrativo. Essa regra foi substituida especificamente para arquivos privados pela migration `20260922230034_private_file_access_visibility_foundation.sql`.

No estado atual:
- cliente autenticada le somente arquivos proprios liberados por `client_visible_at`;
- Patty/admin com role relacional `admin` pode ler `client_files` sem depender de assignment ativo;
- `storage.objects` no bucket `client-private` aplica a mesma excecao administrativa e exige correspondencia com metadado autorizado em `client_files`;
- uploads administrativos permanecem ocultos para a cliente ate liberacao explicita;
- a policy transversal de MFA continua `RESTRICTIVE`, portanto admin precisa de AAL2 mesmo nesta excecao;
- a excecao nao se estende aos demais dados client-scoped.

A auditoria estatica de 2026-09-23 confirmou que as rotas de listagem, download, upload administrativo e liberacao nao reintroduzem requisito de assignment. As Server Actions exigem `requireRole("admin")`, e leitura/download com sessao normal continua sujeita a RLS. O smoke E2E administrativo documentado cobre upload, ocultacao inicial, liberacao explicita, visibilidade para cliente e download.

Nao ha policy geral para `authenticated` no bucket inteiro. Escritas temporarias de upload permanecem limitadas aos fluxos especificos autorizados e aos paths gerados pelo sistema.

### DECISAO CONFIRMADA

Avaliacoes, medidas e associacoes de arquivo podem ser lidas somente por Patty/admin com assignment ativo. A visibilidade para a cliente permanece pendente e, por isso, nao recebe grant ou policy de leitura nesta etapa. Nenhuma escrita de avaliacao ou medida e liberada ao browser.

### DECISAO CONFIRMADA

`professional_follow_ups` e estritamente interno: cliente e `anon` nao o leem. Patty/admin com assignment ativo pode ler e inserir registro em proprio nome. Nao ha grant ou policy de UPDATE ou DELETE, preservando o historico append-only.

## Implementacao BACKEND-BUNDLE-03

### DECISAO CONFIRMADA

Protocolos e planos usam grants explicitos e RLS. Cliente nao recebe escrita e so le o proprio protocolo e plano quando existe `protocol_publications` para a versao. Draft, revisao e aprovado sem publicacao nao ficam visiveis para a cliente.

Patty/admin precisa de role relacional `admin` e assignment ativo para leitura interna. A escrita de protocolo e plano e limitada ao draft; triggers tambem recusam mutacao apos submissao para revisao. `anon`, admin sem assignment e assignment encerrado nao recebem acesso.

O catalogo de equivalentes continua interno: cliente nao recebe grant ou policy de leitura. Admin com role e ao menos um assignment ativo pode administra-lo; o mecanismo administrativo detalhado permanece aberto.

## Implementacao BACKEND-BUNDLE-04

### DECISAO CONFIRMADA

Bibliotecas educacional e de exercicios sao definicoes globais: admin com role relacional `admin` pode gerencia-las sem depender de `client_assignment`. Cliente e `anon` nao recebem acesso geral a essas definicoes.

Cliente le somente versao educacional vinculada a uma `client_content_release` propria. Patty/admin acessa release e progresso somente quando possui role `admin` e assignment ativo para a cliente. A cliente nao recebe escrita de progresso nesta etapa.

Biblioteca de exercicios permanece interna: cliente nao recebe grant ou policy de leitura, mesmo autenticada.


## Submissao final da Anamnese

### DECISAO DE SEGURANCA

A cliente pode atualizar somente a coluna `submitted_at` da propria submission enquanto ela ainda e rascunho. A policy de UPDATE exige ownership por `clients.profile_id = auth.uid()`; nenhuma coluna de identidade, cliente ou versao recebe privilegio de UPDATE por esse fluxo.

Um trigger deterministico no banco valida o envio antes da transicao:
- a versao precisa estar publicada;
- o grafo de aplicabilidade precisa ser resolvivel integralmente;
- toda pergunta aplicavel e marcada como obrigatoria precisa possuir resposta valida;
- `text` exige string nao vazia;
- `single_choice` exige opcoes validas e resposta pertencente a essas opcoes;
- pergunta nao aplicavel nao bloqueia o envio;
- tipos nao suportados falham fechados quando obrigatorios.

O banco substitui o timestamp enviado pelo caller por `statement_timestamp()`. Depois da transicao, os triggers de imutabilidade ja existentes impedem novas alteracoes na submission e nas respostas originais.

A validacao da UI serve somente para experiencia; o banco permanece a autoridade final contra bypass direto da Data API.


## Esclarecimentos pos-Anamnese

### DECISAO DE SEGURANCA

- `anon` nao recebe acesso;
- cliente autenticada le pedidos e complementos somente de suas proprias submissions enviadas;
- cliente insere somente complemento em proprio nome;
- cliente nao cria pedido, nao atualiza e nao exclui historico;
- Patty/admin com assignment ativo e AAL2 le o historico e cria pedido em proprio nome;
- admin nao responde em nome da cliente;
- pedidos so podem existir para submission enviada;
- vinculo opcional a resposta original deve pertencer a mesma submission;
- triggers preservam imutabilidade mesmo sob acesso privilegiado.


## Escrita interna de IA

### DECISAO DE SEGURANCA

As tabelas internas de IA permanecem sem INSERT/UPDATE/DELETE para `authenticated`; administradores autenticados recebem somente SELECT quando permitido por RLS, assignment ativo e MFA AAL2.

Escritas de execution usam exclusivamente RPCs internas `SECURITY INVOKER` com EXECUTE revogado de `public`, `anon` e `authenticated` e concedido apenas a `service_role`.

O uso de `service_role` fica restrito a modulo `server-only`. Antes da chamada privilegiada, a aplicacao deriva a identidade da sessao com `requireRole("admin")` e consulta submission/fontes pelo cliente Supabase autenticado normal, mantendo RLS como primeira verificacao. Triggers e FKs do banco repetem as invariantes de assignment, client scope, submission e lifecycle.


## OpenAI e segredo de provider

`OPENAI_API_KEY` e segredo exclusivamente server-side e nunca pode ser exposto ao browser, logs ou payloads de UI.

O browser aciona somente Server Action administrativa protegida por `requireRole("admin")`/AAL2. O adapter OpenAI e `server-only`.

A execucao nao envia IDs internos de answer/question ao provider; usa aliases efemeros e remapeamento posterior. O output recebido passa pelo validador deterministico antes de qualquer persistencia como `completed`.
## Client training requests

`client_training_requests` e historico interno de negocio.

- `anon`: nenhum acesso;
- cliente: nenhum acesso direto nesta etapa;
- admin/Patty: SELECT e INSERT somente com role relacional `admin`, sessao AAL2 e assignment ativo para a cliente;
- UPDATE/DELETE: sem grants para browser e bloqueados por trigger append-only.

O ator gravado deve ser `auth.uid()`. Service role continua reservado a operacoes server-side controladas e nao deve ser exposto ao browser.
## Assessment draft writes

As tabelas de avaliacao continuam protegidas pela policy `RESTRICTIVE` administrativa de MFA AAL2.

Para novos rascunhos:
- `client_assessments`: `SELECT`, `INSERT`, `UPDATE` para `authenticated`; sem `DELETE`; escrita exige role relacional `admin` + assignment ativo; INSERT grava `created_by_profile_id = auth.uid()`;
- `assessment_measurements`: `SELECT`, `INSERT`, `UPDATE`, `DELETE` somente quando a avaliacao pai esta em rascunho e o admin possui assignment ativo;
- `assessment_files`: `SELECT`, `INSERT`, `DELETE` somente para rascunho, cliente correspondente e assignment ativo;
- `anon`: sem acesso.

Triggers de banco tornam avaliacao, medidas e vinculos imutaveis depois de `finalized_at`.

A finalizacao deve gravar `finalized_by_profile_id = auth.uid()`. Nao existe bypass de RLS para facilitar a UI.



## Configuracao profissional versionada

### DECISAO DE SEGURANCA - NAO IMPLEMENTADA

Quando a fundacao de configuracao profissional for criada, aplicar o seguinte modelo:

**Templates globais**
- `anon`: nenhum acesso;
- cliente: nenhum acesso direto;
- admin/Patty: leitura com role relacional `admin` e AAL2;
- escrita/ativacao/retirada: boundary server-side controlada;
- nao exigir `client_assignment`, pois o template global nao pertence a uma cliente.

**Overrides client-scoped**
- `anon`: nenhum acesso;
- cliente: nenhum acesso direto;
- admin/Patty: leitura e boundary de escrita somente com role `admin`, AAL2 e assignment ativo da cliente;
- nenhuma escrita direta generica pelo browser.

**Snapshots**
- sao client-scoped;
- admin/Patty acessa conforme autorizacao vigente do dominio e AAL2;
- cliente nao recebe SELECT generico sobre a tabela de snapshots;
- cliente ve somente o artefato publicado que o dominio ja autoriza;
- snapshots permanecem imutaveis/append-only.

RLS e autorizacao nunca sao configuracoes profissionais. A camada configuravel nao pode ampliar acesso a dados nem contornar MFA, assignment, grants ou policies existentes.

O desenho detalhado esta em `METHOD_CONFIGURATION_CONTRACT.md`.
