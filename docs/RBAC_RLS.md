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

Para Anamnese em rascunho, a fundacao de escrita segue privilegio minimo: a cliente pode criar somente a propria submission para versao publicada e inserir/atualizar somente o valor das respostas enquanto a submission continua sem `submitted_at`. A identidade da resposta (`submission_id`, `form_version_id`, `question_id`) nao recebe UPDATE. A submissao final ainda nao e liberada nesta etapa.

Cliente nunca pode acessar dados de outra cliente.

Cliente nao pode modificar `user_roles`.

Cliente nao pode criar ou modificar `client_assignments`.

Nao criar excecoes genericas.

## MFA administrativo na camada de dados

### DECISAO DE SEGURANCA

MFA obrigatorio para `admin` deve ser aplicado tambem em RLS, nao apenas na navegacao do aplicativo.

A estrategia e aditiva: policies `RESTRICTIVE` verificam o claim confiavel `aal` do JWT por meio de `auth.jwt()`. Elas nao substituem ownership, role ou assignment e nao transformam AAL2 em autorizacao suficiente por si so.

`user_roles` permanece fora dessa restricao para permitir que uma sessao administrativa em `aal1` descubra o proprio role e seja encaminhada ao fluxo de MFA. Os demais recursos administrativos protegidos exigem `aal2`. Clientes em `aal1` continuam sujeitas somente as policies normais de ownership e nao passam a exigir MFA.

A migration `20260923113835_admin_mfa_rls_enforcement.sql` esta preparada e validada por dry-run transacional, mas ainda nao aplicada no SaaS.

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

Nao foram implementadas funcoes nesta fase.

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

### DECISAO CONFIRMADA

Nesta etapa, browser autenticado nao recebe `INSERT`, `UPDATE` ou `DELETE` em Cadastro Atual, definicoes, submissions ou answers. O fluxo definitivo de escrita permanece aberto e nao foi inferido a partir da UI.

Administradores com assignment ativo podem inserir review administrativa em seu proprio nome e ler reviews da cliente sob sua responsabilidade. Clientes nao possuem grant ou policy para ler reviews.

### DECISAO CONFIRMADA

Clientes nao possuem permissoes para criar, alterar, excluir ou publicar definicoes de Anamnese. O catalogo so pode ser lido quando uma versao estiver marcada como disponivel por `published_at`; nenhuma versao do inventario historico foi publicada nesta etapa.

## Implementacao BACKEND-BUNDLE-02

### DECISAO CONFIRMADA

`client_files` possui RLS propria, separada de `storage.objects`. Na implementacao atual, cliente autenticada le somente metadados e objetos privados vinculados ao proprio `clients.profile_id`; Patty/admin le somente com role relacional `admin` e assignment ativo. `anon`, usuario sem vinculo, admin sem assignment e assignment encerrado nao recebem acesso.

A regra de produto posterior exige granularidade adicional para a cliente: arquivos enviados pela propria cliente ficam visiveis por padrao, enquanto arquivos enviados administrativamente pela Patty devem permanecer ocultos ate liberacao explicita. A RLS/policy atual nao representa essa distincao por autoria/liberacao e precisa ser reconciliada antes de o upload administrativo ser disponibilizado.

Essa descricao e fato de implementacao, mas esta parcialmente desalinhada com a decisao posterior de produto: a Patty deve manter acesso aos arquivos privados mesmo sem assignment ativo. A RLS de `client_files`, a policy correspondente de `storage.objects` e as rotas server-side de arquivo precisam ser reconciliadas antes de a decisao ser considerada implementada.

A policy de `storage.objects` restringe explicitamente o bucket `client-private` e exige correspondencia com metadado autorizado em `client_files`. Nao ha policy geral para `authenticated` no bucket inteiro, nem grant de INSERT, UPDATE ou DELETE para arquivos nesta etapa.

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
