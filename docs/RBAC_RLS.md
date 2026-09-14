# RBAC e RLS

## Principios de acesso

### DECISAO CONFIRMADA

RLS e obrigatoria.

Cliente so acessa os proprios dados.

Patty/admin acessa clientes sob sua responsabilidade.

Fotos, exames e documentos devem ser privados.

Dados de saude sao sensiveis.

## Papeis conhecidos

### DECISAO CONFIRMADA

Papeis conceituais conhecidos neste momento:

- cliente;
- Patty/admin.

### QUESTAO ABERTA

Ainda e necessario definir se existirao papeis adicionais, como assistente, profissional parceiro, suporte, auditor ou administrador tecnico.

## Separacao de responsabilidades

### DECISAO CONFIRMADA

Autenticacao, perfil, cliente e dados clinicos/operacionais devem ser separados.

`auth.users` nao sera a tabela principal de clientes.

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
