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

### QUESTAO ABERTA

Como a cliente atualizara os dados cadastrais atuais: Perfil, fluxo dedicado de cadastro, confirmacao contextual durante a anamnese ou outro fluxo?

### QUESTAO ABERTA

Quem podera alterar cada dado cadastral atual da cliente, incluindo Cidade, Telefone, Email de contato e Instagram?

### QUESTAO ABERTA

Quais alteracoes cadastrais exigirao auditoria especifica?

## Anamnese

### QUESTAO ABERTA

Qual e o mapa completo dos campos do formulario atual de anamnese, considerando que as evidencias disponiveis podem ser parciais?

### QUESTAO ABERTA

Quais perguntas do formulario atual devem ser mantidas, alteradas ou removidas no novo aplicativo?

### QUESTAO ABERTA

Qual sera a obrigatoriedade de cada campo da anamnese no novo aplicativo?

### QUESTAO ABERTA

Qual sera o tipo final de input de cada campo da anamnese?

### QUESTAO ABERTA

Perguntas compostas da anamnese atual devem permanecer juntas ou ser normalizadas em campos separados?

### QUESTAO ABERTA

Quais campos da anamnese serao condicionais e quais serao suas regras de exibicao?

### QUESTAO ABERTA

Qual sera a ordem e o agrupamento final dos campos da anamnese?

### QUESTAO ABERTA

Medidas informadas na anamnese pertencem a propria resposta de anamnese, criam tambem um registro inicial de medicao/avaliacao, ou devem ser movidas para um fluxo de avaliacao separado?

### QUESTAO ABERTA

Nos uploads ligados a anamnese, quais tipos, tamanhos maximos, quantidade maxima, substituicao e exclusao de arquivos serao permitidos no novo aplicativo?

### QUESTAO ABERTA

Como separar a finalidade dos arquivos enviados entre fotos, exames e documentos?

### QUESTAO ABERTA

Qual sera o texto definitivo, versao, base legal, data/hora, forma de aceite, possibilidade de revogacao, politica de retencao e relacao operacional entre consentimento e inicio do acompanhamento?

### QUESTAO ABERTA

Quais campos da anamnese poderao ser enviados a IA, campo a campo?

### QUESTAO ABERTA

Qual sera a classificacao definitiva de cada campo da anamnese nas categorias estruturais do produto?

### QUESTAO ABERTA

Havera alertas ou bloqueios de saude derivados de respostas da anamnese? Se houver, quais regras serao validadas pela Patty?

### QUESTAO ABERTA

Em quais fluxos algum dado cadastral precisara coexistir semanticamente em Auth, cadastro da cliente ou snapshot de anamnese, especialmente no caso de email?

### QUESTAO ABERTA

A secao Cadastro continuara aparecendo dentro da anamnese final ou sera movida para outro fluxo de cadastro/perfil?

### QUESTAO ABERTA

Quais dados cadastrais precisam ser confirmados a cada nova anamnese?

### QUESTAO ABERTA

Qual representacao tecnica sera usada para eventual snapshot historico de dados cadastrais em uma submissao de anamnese?

### QUESTAO ABERTA

Quando o email de autenticacao e o email de contato devem iniciar com o mesmo valor?

### QUESTAO ABERTA

Havera alguma acao explicita para sincronizar email de autenticacao e email de contato, ou eles permanecerao independentes apos a criacao inicial?

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
