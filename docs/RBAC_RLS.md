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

Roles nao serao armazenados em `user_metadata`.

Cliente nao pode administrar papeis.

### QUESTAO ABERTA

Ainda e necessario definir se existirao papeis adicionais, como assistente, profissional parceiro, suporte, auditor ou administrador tecnico.

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

Cliente nunca pode acessar dados de outra cliente.

Cliente nao pode modificar `user_roles`.

Cliente nao pode criar ou modificar `client_assignments`.

Nao criar excecoes genericas.

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

A forma exata de administracao destas tabelas sera definida na camada administrativa/servidor.

Nao criar nesta tarefa uma policy generica que permita ao `admin` conceder permissoes arbitrariamente.

### QUESTAO ABERTA

O mecanismo de bootstrap do primeiro admin Patty ainda precisa ser definido.

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

### RECOMENDACAO TECNICA

Para BACKEND-001:

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

Nao implementar funcoes nesta tarefa.

## Auditoria

### DECISAO CONFIRMADA

Acoes criticas devem ser auditadas.

Preservar historico.

Nao sobrescrever versoes antigas.

### RECOMENDACAO TECNICA

A futura especificacao de RLS deve incluir testes para provar isolamento entre clientes e acesso administrativo apenas dentro do escopo permitido.

## Questoes abertas

### QUESTAO ABERTA

Ainda e necessario definir a relacao operacional "clientes sob responsabilidade da Patty/admin".

### QUESTAO ABERTA

Ainda e necessario definir quais acoes sao consideradas criticas para auditoria.

### QUESTAO ABERTA

Ainda e necessario definir regras de acesso para arquivos privados em Storage.
