# Questoes Abertas

Este documento concentra pontos ainda nao definidos. Nenhum item abaixo deve ser tratado como regra confirmada ate que seja validado pela Patty e registrado como decisao.

## Produto e usuarios

### QUESTAO ABERTA

Havera outros papeis administrativos alem da Patty, como assistentes, profissionais parceiros ou suporte operacional?

### QUESTAO ABERTA

Como serao os fluxos de cadastro, convite, ativacao e encerramento de conta de clientes?

### QUESTAO ABERTA

Quais modulos entram no primeiro MVP operacional?

### QUESTAO ABERTA

Quais fluxos precisam estar disponiveis para clientes no primeiro lancamento?

### QUESTAO ABERTA

Quais operacoes administrativas a Patty precisa executar no primeiro painel?

## Autenticacao

### QUESTAO ABERTA

A criacao de conta sera por convite ou cadastro autonomo?

### QUESTAO ABERTA

O login inicial sera senha, magic link ou outra estrategia?

### QUESTAO ABERTA

MFA sera obrigatorio para Patty/admin?

### QUESTAO ABERTA

Qual sera o tratamento de conta Auth excluida quando for necessario manter historico profissional?

## Autorizacao

### QUESTAO ABERTA

Como sera criado/bootstrap do primeiro admin Patty?

### QUESTAO ABERTA

Quem pode criar, alterar ou encerrar assignments?

### QUESTAO ABERTA

Existirao outros profissionais no MVP ou somente Patty?

### QUESTAO ABERTA

Quais permissoes futuras esses profissionais terao?

## Arquitetura e automacoes

### QUESTAO ABERTA

Havera necessidade real de VPS na primeira versao operacional?

### QUESTAO ABERTA

Quais automacoes justificarao n8n?

### QUESTAO ABERTA

Quais fluxos de IA justificarao LangGraph?

## Modelo de dados

### QUESTAO ABERTA

Qual sera o modelo logico detalhado?

### QUESTAO ABERTA

Quais campos serao obrigatorios em anamnese, medidas, fotos, exames, protocolos e avaliacoes?

### QUESTAO ABERTA

Qual sera a politica de retencao, arquivamento e exportacao de dados?

### QUESTAO ABERTA

Quais serao os valores definitivos de `profiles.status`?

### QUESTAO ABERTA

Quais serao os valores definitivos de `clients.status`?

### QUESTAO ABERTA

Qual sera o formulario cadastral completo de `client_registration`?

## Dados e LGPD

### QUESTAO ABERTA

Qual sera a politica de retencao de dados?

### QUESTAO ABERTA

Qual sera a politica de exclusao de dados?

### QUESTAO ABERTA

Qual sera a politica de anonimizacao?

### QUESTAO ABERTA

Qual sera a politica de exportacao de dados?

### QUESTAO ABERTA

Como tratar conta excluida mantendo historico profissional necessario?

## RBAC, RLS e auditoria

### QUESTAO ABERTA

Como sera definida a relacao operacional "clientes sob responsabilidade da Patty/admin"?

### QUESTAO ABERTA

Quais acoes serao consideradas criticas para auditoria?

### QUESTAO ABERTA

Quais serao as regras de acesso para arquivos privados em Storage?

## Supabase

### QUESTAO ABERTA

Qual sera a regiao do projeto Supabase?

### QUESTAO ABERTA

Havera ambientes definitivos alem de desenvolvimento e producao?

## Storage

### QUESTAO ABERTA

Qual sera o limite de tamanho por arquivo?

### QUESTAO ABERTA

Quais MIME types serao permitidos?

### QUESTAO ABERTA

Havera necessidade de analise de arquivos maliciosos?

### QUESTAO ABERTA

Qual sera a estrategia de analise de arquivos maliciosos, se necessaria?

## Metodo profissional

### QUESTAO ABERTA

Quais sao as regras de fases?

### QUESTAO ABERTA

Quais sao as regras de reconhecimento metabolico?

### QUESTAO ABERTA

Quais sao as regras de alimentacao?

### QUESTAO ABERTA

Quais sao as regras de doses?

### QUESTAO ABERTA

Quais sao as regras de hidratacao?

### QUESTAO ABERTA

Quais sao as regras de suplementacao?

### QUESTAO ABERTA

Quais sao as regras de treino?

### QUESTAO ABERTA

Quais sao as regras de mudanca de fase?

### QUESTAO ABERTA

Quais sao as regras de avaliacoes?

### QUESTAO ABERTA

Quais sao as regras de alertas?

### QUESTAO ABERTA

Quais sao as regras de comportamento?

## Conteudo

### QUESTAO ABERTA

Algum conteudo podera ser publico ou todo conteudo exigira autenticacao?

### QUESTAO ABERTA

Qual sera a taxonomia da biblioteca educacional?

### QUESTAO ABERTA

Qual sera a taxonomia da biblioteca de exercicios?

### QUESTAO ABERTA

Quais conteudos do Drive podem ser migrados primeiro?

### QUESTAO ABERTA

Qual sera o processo de revisao, aprovacao e versionamento dos conteudos?
