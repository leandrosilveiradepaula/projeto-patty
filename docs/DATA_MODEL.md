# Modelo de Dados

## Principios confirmados

### DECISAO CONFIRMADA

O modelo de dados deve separar autenticacao, perfil, cliente e dados clinicos/operacionais.

`auth.users` nao sera a tabela principal de clientes.

Dados de saude sao sensiveis.

Fotos, exames e documentos devem ser privados.

Preservar historico e nao sobrescrever versoes antigas.

Registrar auditoria de acoes criticas.

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
