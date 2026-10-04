# Produto

## Visao

### DECISAO CONFIRMADA

O Projeto Patty sera um aplicativo para digitalizar e automatizar parte do atendimento da Consultoria Corpo e Mente da Patricia Torres.

Cada cliente tera conta propria.

O aplicativo deve apoiar o acompanhamento dos clientes sem remover a revisao profissional da Patty nos pontos criticos.

## Areas funcionais previstas

### DECISAO CONFIRMADA

O produto tera suporte a:

- anamnese;
- medidas;
- fotos;
- exames;
- protocolos;
- avaliacoes;
- conteudos educacionais;
- exercicios;
- painel administrativo da Patty.

## Escopo atual do produto

### DECISAO CONFIRMADA

O objetivo atual e construir o **sistema completo, de ponta a ponta**. O projeto nao esta mais sendo tratado como um MVP com funcionalidades deliberadamente adiadas para uma segunda fase.

Todos os modulos e fluxos confirmados para Patty e clientes fazem parte do escopo do sistema completo. A ordem de implementacao pode ser priorizada tecnicamente, mas prioridade nao reduz escopo.

Regras profissionais ainda abertas continuam bloqueadas para automacao ate confirmacao e documentacao.


## Evolucao futura para produto comercializavel

### DIRECAO DE PRODUTO CONFIRMADA - 2026-10-04

O sistema nasce para uso da Patty e do metodo atual da Consultoria Corpo e Mente, mas deve ser construido de forma que possa futuramente ser comercializado.

Por isso, regras e defaults da Patty nao devem ser confundidos com regras universais da plataforma. O produto deve separar o motor generico das configuracoes profissionais versionadas.

A arquitetura futura de organizacoes/tenants ainda nao esta definida e nao deve ser inventada nesta etapa. A decisao atual e garantir que o dominio profissional nao fique acoplado a constantes ou a uma unica configuracao global irreversivel.

## Parametrizacao do metodo

### DECISAO CONFIRMADA

Regras, calculos, formulas, coeficientes, quantidades, limites e workflows do metodo profissional devem ser configuracao versionada, e nao constantes definitivas espalhadas pelo codigo.

Os valores atuais dos Excels e das regras confirmadas formam os templates iniciais. A Patty deve poder criar novas versoes de template e ajustar parametros para uma cliente, protocolo ou treino especifico sem alterar silenciosamente os demais casos.

A resolucao segue o principio:

`template versionado -> configuracao/override da cliente -> snapshot do protocolo/treino`

Alteracoes futuras de template nao reescrevem historico. Overrides individuais nao viram regra global automaticamente.

O codigo fornece um motor deterministico seguro para validar e executar configuracoes estruturadas. Seguranca, autorizacao, RLS, Auth, MFA, auditoria, preservacao de historico e revisao humana permanecem invariantes tecnicas.

Detalhamento normativo: `CONFIGURABLE_RULES.md`.

## Papel da IA

### DECISAO CONFIRMADA

A IA sera assistiva.

A IA nao publicara protocolos automaticamente.

A Patty sempre revisara e aprovara protocolos antes da publicacao.

## Usuarios

### DECISAO CONFIRMADA

Devem existir clientes com conta propria.

Deve existir um painel administrativo para a Patty.

### QUESTAO ABERTA

Ainda e necessario definir se havera outros papeis administrativos alem da Patty, como assistentes, profissionais parceiros ou suporte operacional.

### DECISAO CONFIRMADA E QUESTOES REMANESCENTES

No sistema, a Patty inicia o onboarding com o email da cliente e envia um link de convite/ativacao. Nao existe cadastro publico/autonomo. A cliente define a senha no fluxo de ativacao e o login posterior usa email + senha.

Continuam abertas somente as regras operacionais ainda nao fechadas, como expiracao/reenvio do convite, recuperacao de acesso, encerramento da conta e a infraestrutura definitiva do email real de convite.

## Substituicao gradual do Drive

### DECISAO CONFIRMADA

O aplicativo substituira gradualmente o Google Drive para os clientes.

Todo o conteudo atual do Google Drive deve ser preservado.

### RECOMENDACAO TECNICA

A migracao do Drive deve ser planejada em etapas, com inventario, classificacao, validacao pela Patty e somente depois importacao ou publicacao no aplicativo.


## Instalação no celular

### REQUISITO CONFIRMADO - 2026-09-30

O aplicativo deve poder ser instalado no telefone celular e aberto a partir da tela inicial como aplicativo.

### DECISAO TECNICA

A primeira implementação desse requisito será via PWA sobre a aplicação web existente. Isso não impede futura distribuição por App Store ou Google Play se surgir necessidade concreta de produto ou capacidade nativa que justifique outra arquitetura.
