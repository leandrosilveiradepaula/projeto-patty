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

Quais detalhes fisicos da migration da fundacao de IA ainda precisarao ser validados contra o schema vigente, incluindo constraints compostas, validacao das fontes e transicoes controladas de lifecycle?

### QUESTAO ABERTA

Quais campos serao obrigatorios em anamnese, medidas, fotos, exames, protocolos e avaliacoes?

### QUESTAO ABERTA

Qual sera a politica geral de retencao, arquivamento e exportacao de dados fora das decisoes ja confirmadas para preservacao do historico de IA?

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

Em quais finalidades especificas, e sob quais controles, Cidade, Telefone e Email de contato poderao ser selecionados para o contexto de IA? Eles nao entram automaticamente a partir do Cadastro Atual.

### QUESTAO ABERTA

Qual sera a identificacao tecnica estavel da condicao financeira em cada versao de Anamnese, para que sua exclusao automatica do contexto de IA seja verificavel?

### QUESTAO ABERTA

Qual provider e modelo concretos serao escolhidos, quais requisitos contratuais e tecnicos verificaveis garantirao que dados da Patty e das clientes nao sejam usados para treinamento, e qual sera a base legal ou o consentimento aplicavel? Antes da integracao real, tambem precisam ser definidos a politica de logs tecnicos, o tratamento de conteudo sensivel em erros e logs e o contrato estruturado definitivo do output.

### QUESTAO ABERTA

Qual sera a taxonomia final de `purpose_key` e o contrato estruturado final do output original da IA?

### QUESTAO ABERTA

Como uma edicao manual da Patty deve interagir com valor originado de calculo deterministico, sem sobrescrever silenciosamente o resultado ou atribuir esse calculo a IA?

### QUESTAO ABERTA

Quais consentimentos, bases legais e politicas legais de retencao, arquivamento, descarte e exportacao se aplicarao ao contexto e ao historico de IA?

### QUESTAO ABERTA

Como a futura entidade de materializacao entre rascunho de IA e `protocol_version` identificara hipoteses ainda presentes e impedira aprovacao/publicacao enquanto alguma permanecer sem confirmacao explicita da Patty?

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

Quem podera fazer upload de cada tipo de arquivo, por qual fluxo controlado e em que momento o metadado sera criado?

### QUESTAO ABERTA

Quem podera excluir arquivo, sob quais regras de retencao, arquivamento, anonimizacao e auditoria?

### QUESTAO ABERTA

Quais tipos de arquivo privados podem ser visualizados pela cliente e quais permanecem exclusivamente administrativos?

## Avaliacoes e acompanhamento

### QUESTAO ABERTA

Qual e o catalogo profissional de medidas, quais unidades sao permitidas e quais campos serao obrigatorios em cada avaliacao?

### QUESTAO ABERTA

Qual e o fluxo auditavel para correcao de uma avaliacao ou medida historica sem sobrescrever o registro anterior?

### QUESTAO ABERTA

Qual e a origem da percepcao de aderencia e quais partes do acompanhamento profissional poderao futuramente ser exibidas para a cliente?

### QUESTAO ABERTA

Quais MIME types serao permitidos?

### QUESTAO ABERTA

Havera necessidade de analise de arquivos maliciosos?

### QUESTAO ABERTA

Qual sera a estrategia de analise de arquivos maliciosos, se necessaria?

## IA e revisao de Anamnese

### QUESTAO ABERTA

Quais perguntas da Anamnese serao definitivamente obrigatorias, quais serao condicionais e quais regras determinam sua aplicabilidade? Ate essa definicao, `missing_answer` permanece bloqueado na primeira revisao operacional de IA.

O contrato futuro de `missing_answer` devera usar `target_question_id` para a pergunta ausente e permitir `source_answer_ids` vazio; o target devera pertencer a mesma `form_version_id` da submission. Isso e conceito futuro, nao implementacao atual.

### QUESTAO ABERTA

Qual sera o limite maximo de `ai_execution_failure_responses.content` preservado como resposta bruta e o tamanho maximo de `failure_message` sanitizada? Nenhum limite sera cristalizado antes de decisao tecnica propria.

### GAP OPERACIONAL ABERTO

Se banco ou conexao ficar indisponivel apos resposta do provider, a execution previamente criada pode permanecer `started` sem persistir resposta bruta, metadados de falha ou transicao terminal. Definir mecanismo futuro de reconciliacao, timeout, watchdog ou recovery job, sem tratar esse estado como `failed/persistence_failed` sem failure response.

### QUESTAO ABERTA

Qual sera o caminho server-side confiavel para escrita nas entidades internas de IA, sem escrita direta do browser, sem secret no cliente e sem usar `SECURITY DEFINER` como atalho?

### QUESTAO ABERTA

Antes da migration que tornar `failure_stage` e `failure_code` obrigatorios em executions `failed`, verificar se ja existem linhas `ai_executions.status = failed` persistidas. Backfill permanece aberto ate conhecer esse estado; nao definir valor retroativo sem evidencia.

### QUESTAO ABERTA

Qual sera a UX e o processo humano para revisao de findings, edicao de follow-up, descarte, eventual transformacao manual em acao e eventual envio a cliente?

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

Qual e a semantica validada de eventual limite de doses de proteina high-fat, incluindo input, maximo aplicavel e comportamento com doses fracionarias?

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

## Cadastro e Anamnese

### QUESTAO ABERTA

Quem pode criar ou alterar o Cadastro Atual e por qual fluxo controlado?

### QUESTAO ABERTA

Como sera o preenchimento, salvamento de rascunho e submissao da Anamnese pela cliente, incluindo as permissoes de escrita correspondentes?

### QUESTAO ABERTA

Quando uma nova versao de formulario podera ser marcada como disponivel para preenchimento?

### QUESTAO ABERTA

Como ocorrera uma correcao posterior a uma submission enviada, sem sobrescrever a resposta original?

### QUESTAO ABERTA

Qual sera o workflow administrativo completo para revisao de Anamnese alem da criacao de notas append-only?

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

### QUESTAO ABERTA

Qual sera a taxonomia final de categoria, tipo, audiencia e fase como metadado da biblioteca educacional?

### QUESTAO ABERTA

Obrigatorio/opcional pertence a definicao global de conteudo ou a cada liberacao para cliente?

### QUESTAO ABERTA

Quem pode registrar abertura e conclusao de conteudo, o que caracteriza `completed_at` e qual historico adicional de progresso sera necessario?

### QUESTAO ABERTA

Quais regras futuras poderao justificar liberacao de conteudo por fase, sem criar automacao antes de validacao da Patty?

### QUESTAO ABERTA

Como ocorrera a migracao fisica do Google Drive, incluindo politica de arquivos educacionais e referencias de origem internas?

### QUESTAO ABERTA

Quando e como a biblioteca de exercicios podera ser exposta a cliente, e quais campos definitivos de exercicio serao necessarios sem antecipar programacao de treino?

## Protocolos e equivalentes

### QUESTAO ABERTA

Quais campos, tipos de protocolo e elementos profissionais compoem um protocolo alem da estrutura versionada inicial?

### QUESTAO ABERTA

Quais regras profissionais definem a criacao, revisao e aprovacao de um plano alimentar, incluindo fases, reconhecimento metabolico, doses, limites, hidratacao, suplementacao, treino, cardio, alertas e comportamento?

### QUESTAO ABERTA

Qual catalogo de equivalentes sera validado, quem podera versiona-lo e qual parte, se alguma, podera ser exibida a cliente em um protocolo publicado?
