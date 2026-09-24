# Questoes Abertas

Este documento concentra pontos ainda nao definidos. Cada item deve ser validado pelo responsavel adequado antes de virar decisao: regras do metodo e operacao profissional pela Patty; arquitetura, seguranca e produto tecnico pelo responsavel do projeto; temas juridicos/privacidade com validacao juridica quando aplicavel.

## Produto e usuarios

### FATO JA CONFIRMADO

A Patty ja possui o email da cliente e inicia o onboarding enviando um link para esse endereco. Nao existe cadastro publico/autonomo. O lifecycle tecnico de ativacao, definicao inicial de senha e login posterior esta implementado e passou E2E sintetico em producao. Site URL e redirect allowlist tambem estao alinhados.

### PENDENCIA DE INFRAESTRUTURA

O template real de convite SSR ainda nao pode ser configurado no ambiente atual. A Management API do Supabase informou que projetos Free usando o provedor de email padrao precisam de upgrade ou SMTP customizado para modificar templates.

### QUESTAO ABERTA

Qual alternativa de infraestrutura sera adotada para o email real de convite: upgrade do plano Supabase ou SMTP customizado?

### QUESTAO ABERTA

Quais serao as regras de expiracao/reenvio do convite, recuperacao de acesso e encerramento da conta?

### QUESTAO ABERTA

Quais modulos entram no primeiro MVP operacional?

### QUESTAO ABERTA

Quais fluxos precisam estar disponiveis para clientes no primeiro lancamento?

### QUESTAO ABERTA

Quais operacoes administrativas a Patty precisa executar no primeiro painel?

## Autenticacao

### QUESTAO ABERTA

Qual sera o tratamento de conta Auth excluida quando for necessario manter historico profissional?

## Autorizacao

### QUESTAO ABERTA POS-MVP

Se futuramente forem introduzidos assistentes, profissionais parceiros ou suporte operacional, quais papeis e permissoes client-scoped serao necessarios?

## Arquitetura e automacoes

## Modelo de dados

### PARCIALMENTE RESOLVIDO

Na Anamnese, todos os campos aplicaveis ao preenchimento final sao obrigatorios. Ainda falta fechar o mapa final de campos e as regras de aplicabilidade condicional.

### QUESTAO ABERTA

Quais campos definitivos existirao em medidas, fotos, exames, protocolos e avaliacoes, e quais deles serao obrigatorios em cada fluxo?

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

### FATO JA CONFIRMADO

A Patty confirmou que as perguntas do formulario atual devem ser mantidas como base de conteudo. Nesta etapa, o objetivo e organizar melhor a experiencia no aplicativo, nao fazer uma revisao ampla removendo ou acrescentando varias perguntas.

A reorganizacao pode alterar apresentacao, agrupamento, tipos de input e logica condicional sem mudar silenciosamente o sentido profissional das perguntas.

### FATO JA CONFIRMADO

Todos os campos da Anamnese sao obrigatorios para permitir o envio final. Rascunhos podem permanecer incompletos ate a cliente finalizar o preenchimento.

### QUESTAO ABERTA

Qual sera o tipo final de input de cada campo da anamnese?

### QUESTAO ABERTA

Perguntas compostas da anamnese atual devem permanecer juntas ou ser normalizadas em campos separados?

### PARCIALMENTE RESOLVIDO

A regra geral de exibicao condicional esta confirmada: pergunta dependente nao aplicavel fica oculta e nao obrigatoria. Ainda falta identificar no questionario final quais campos sao condicionais e quais respostas determinam sua aplicabilidade.

### PARCIALMENTE RESOLVIDO

`ANAMNESE_CANONICAL_V1_CANDIDATE.md` propoe um agrupamento candidato baseado exclusivamente nas categorias e decisoes ja documentadas, sem alterar o sentido profissional das perguntas.

Ainda falta validar a ordem final dentro de cada secao e fechar os pontos bloqueadores listados na especificacao candidata.

### FATO JA CONFIRMADO

A Patty confirmou que as medidas corporais podem ser separadas da Anamnese e tratadas em um fluxo proprio de Avaliacao/Medidas. O catalogo definitivo de medidas, unidades, obrigatoriedade e fluxo de correcao continuam abertos.

### QUESTAO ABERTA

Como separar a finalidade dos arquivos enviados entre fotos, exames e documentos?

### QUESTAO ABERTA

Qual politica concreta de retencao define quando um arquivo inativado/substituido pode ser removido fisicamente, considerando referencias historicas e auditoria?

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

### FATO JA CONFIRMADO

A Patty confirmou que os dados cadastrais podem permanecer dentro da Anamnese final. Essa decisao e de apresentacao/fluxo e nao elimina a separacao tecnica entre Cadastro Atual e snapshot historico da Anamnese.

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

Quais outras acoes, alem de visualizacao/download administrativo de exames e documentos privados, serao consideradas criticas para auditoria?

## Supabase

## Storage

### QUESTAO ABERTA

Qual politica concreta de retencao define quando um arquivo inativado/substituido pode ser removido fisicamente, considerando referencias historicas e auditoria?

## Avaliacoes e acompanhamento

### PARCIALMENTE RESOLVIDO

A Patty confirmou duas rotinas de avaliacao:
- **quinzenal**: cintura, abdomen, quadril e peso;
- **mensal**: avaliacao completa com todas as medidas, peso e fotos.

Continuam abertos:
- o catalogo exato de todas as medidas da avaliacao mensal;
- as unidades permitidas;
- eventuais campos adicionais;
- como a avaliacao mensal se relaciona operacionalmente com a ocorrencia quinzenal quando as datas coincidirem.

### QUESTAO ABERTA

Qual e o fluxo auditavel para correcao de uma avaliacao ou medida historica sem sobrescrever o registro anterior?

### QUESTAO ABERTA

Qual e a origem da percepcao de aderencia e quais partes do acompanhamento profissional poderao futuramente ser exibidas para a cliente?

## IA e revisao de Anamnese

### PARCIALMENTE RESOLVIDO

A Patty confirmou a regra geral de aplicabilidade: quando uma pergunta nao se aplica a cliente, as perguntas dependentes devem ficar ocultas e deixam de ser obrigatorias.

A obrigatoriedade geral permanece: todos os campos aplicaveis da versao devem estar preenchidos no envio final.

Ainda falta mapear, pergunta a pergunta, quais dependencias existem e quais respostas ativam ou desativam cada campo condicional.

O contrato futuro de `missing_answer` devera usar `target_question_id` para a pergunta ausente e permitir `source_answer_ids` vazio; o target devera pertencer a mesma `form_version_id` da submission. O finding so podera considerar ausencia quando a pergunta estiver aplicavel segundo o mapa condicional da versao.

### QUESTAO ABERTA

Qual sera o limite maximo de `ai_execution_failure_responses.content` preservado como resposta bruta e o tamanho maximo de `failure_message` sanitizada? Nenhum limite sera cristalizado antes de decisao tecnica propria.

### GAP OPERACIONAL ABERTO

Se banco ou conexao ficar indisponivel apos resposta do provider, a execution previamente criada pode permanecer `started` sem persistir resposta bruta, metadados de falha ou transicao terminal. Definir mecanismo futuro de reconciliacao, timeout, watchdog ou recovery job, sem tratar esse estado como `failed/persistence_failed` sem failure response.

### QUESTAO ABERTA

Qual sera o caminho server-side confiavel para escrita nas entidades internas de IA, sem escrita direta do browser, sem secret no cliente e sem usar `SECURITY DEFINER` como atalho?

### QUESTAO ABERTA

Qual sera a UX e o processo humano para revisao de findings, edicao de follow-up, descarte, eventual transformacao manual em acao e eventual envio a cliente?

## Metodo profissional

As regras abaixo permanecem abertas somente onde a documentacao ainda nao registra confirmacao da Patty. O fluxo principal, o Reconhecimento Metabolico, as referencias iniciais de macros e doses, o limite do grupo de proteina com maior teor de gordura, o Cutting Dia 1 / Dia 2 e a refeicao livre semanal do Up Metabolico ja estao documentados como confirmados.

### QUESTAO ABERTA — PENDENCIA RECONFIRMADA PELA PATTY

A Patty confirmou em 2026-09-24 que as Fases 5 e 6 da Planilha Carb Cycle continuam **pendentes**.

Nao implementar, inferir ou reaproveitar formulas de outras fases para preencher essa lacuna ate nova confirmacao explicita.

### PARCIALMENTE RESOLVIDO

A Patty confirmou que, apos `Cutting 2: 2 Low / 1 High`, a etapa seguinte e **Cutting 3 com protocolo linear**.

Continuam abertas:
- as regras detalhadas do Cutting 3 Linear;
- quais etapas, se houver, seguem depois dele.

### QUESTAO ABERTA

Quais sao as regras detalhadas de Bulking e Consolidacao?

### QUESTAO ABERTA

Quais sao as regras de hidratacao?

### QUESTAO ABERTA

Quais sao as regras de suplementacao e manipulados?

### QUESTAO ABERTA

Qual sera a montagem e progressao definitiva de treino, incluindo volume, progressao e cardio quando aplicavel?

### QUESTAO ABERTA

Quais criterios profissionais determinam avancar, simplificar ou retornar entre etapas alem do fluxo ja confirmado, sem criar score automatico de adesao?

### QUESTAO ABERTA

Quais sao os criterios profissionais finais de avaliacao e reavaliacao?

### QUESTAO ABERTA

Quais alertas profissionais devem existir, quais sao apenas informativos e quais, se algum, bloqueiam uma acao?

### QUESTAO ABERTA

Quais regras de comportamento ainda precisam ser formalizadas alem do principio confirmado de adaptar o protocolo a dificuldade relatada e priorizar adesao?

## Cadastro e Anamnese

### QUESTAO ABERTA

Quem pode criar ou alterar o Cadastro Atual e por qual fluxo controlado?

### PARCIALMENTE RESOLVIDO

O salvamento de rascunho e as permissoes minimas de escrita estao aplicados no SaaS: um rascunho ativo por cliente/versao publicada e escrita somente da propria submission/respostas enquanto nao enviada.

A interface da cliente ja consegue retomar um rascunho existente e salvar respostas `text` individualmente. Isso e uma integracao parcial e deliberada; nao define qual versao inicia automaticamente, nao define os demais tipos de input, nao define autosave definitivo e nao implementa submissao final.

### QUESTAO ABERTA

A especificacao candidata da primeira Anamnese canonica esta em `ANAMNESE_CANONICAL_V1_CANDIDATE.md`.

Antes da submissao final e da publicacao da primeira versao ainda precisam ser fechados:
- mapa pergunta-a-pergunta de condicionais;
- tipos finais de input;
- tratamento das perguntas compostas;
- integracao do item historico de upload com o dominio de arquivos privados;
- texto/versionamento do consentimento;
- ordem final;
- UX definitiva de autosave/submissao.

### QUESTAO ABERTA

Quando uma nova versao de formulario podera ser marcada como disponivel para preenchimento?

### FATO JA RESOLVIDO

A correcao posterior de uma submission enviada esta implementada sem sobrescrever a resposta original. As correcoes sao registros append-only em `anamnesis_answer_corrections`, com autoria e timestamp; UPDATE/DELETE sao bloqueados e a cliente nao recebe acesso a esse historico.

A aplicacao administrativa ja possui uma rota dedicada para visualizar a resposta original, listar o historico cronologico de correcoes e acrescentar uma nova correcao, sempre sob AAL2, assignment ativo e RLS.

### PARCIALMENTE RESOLVIDO

A revisao administrativa ja possui notas append-only e correcoes append-only separadas da resposta original.

### PARCIALMENTE RESOLVIDO

A Patty confirmou que, apos o envio final da Anamnese, a cliente entra diretamente em analise profissional. Nao sao necessarios estados intermediarios como "recebida", "em revisao" ou "pendencias" para iniciar o trabalho da Patty.

A Patty tambem confirmou que, quando faltar informacao importante ou uma resposta estiver pouco clara, o esclarecimento deve ser solicitado a cliente dentro do aplicativo, em vez de a Patty completar a resposta original por conta propria.

Continuam abertos os detalhes de UX, notificacao e lifecycle desse pedido de esclarecimento, alem dos findings de IA.

## Conteudo

### QUESTAO ABERTA

Algum conteudo podera ser publico ou todo conteudo exigira autenticacao?

### QUESTAO ABERTA

Qual sera a taxonomia da biblioteca educacional?

### QUESTAO ABERTA

Qual sera a taxonomia da biblioteca de exercicios?

### PARCIALMENTE RESOLVIDO

A Patty confirmou que o video historico `Como utilizar a BALANCA DE ALIMENTOS`:
- e material da Consultoria/Patty;
- continua atual;
- pode ser disponibilizado as clientes no aplicativo.

Esse video passa a ser o primeiro conteudo elegivel para um lote de migracao controlada. A migracao fisica, versionamento e release ainda precisam ser executados separadamente; essa confirmacao nao significa que o arquivo ja foi copiado ou publicado.

A Patty tambem confirmou que a planilha historica `Sugestao de refeicoes` deve ser transformada em **conteudo educacional revisado para clientes**. A estrutura historica de seis refeicoes permanece exemplo e nao deve ser convertida em regra fixa de numero de refeicoes.

A Patty confirmou ainda que conteudos sobre **formulas/manipulados** devem fazer parte do aplicativo. O arquivo historico `Fórmulas.pptx` permanece bloqueado para publicacao ate revisao profissional completa das alegacoes, confirmacao de atualidade, autoria/direitos e revisao de referencias comerciais/farmacia.

Os demais conteudos continuam sujeitos a revisao individual.

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

### BLOQUEIO TECNICO IDENTIFICADO

O primeiro video aprovado pela Patty, `Como utilizar a BALANCA DE ALIMENTOS`, possui 123.262.796 bytes (~117,6 MiB).

O projeto Supabase atual esta no plano Free, cujo limite global de upload do Storage e 50 MB. O unico bucket existente hoje e `client-private`, destinado a arquivos privados de clientes e que nao deve ser reutilizado para a biblioteca educacional.

Portanto, a migracao fisica desse video esta bloqueada ate decisao tecnica propria entre alternativas como:
- upgrade do Supabase para um plano que suporte o tamanho original;
- armazenamento de midia educacional em outro servico apropriado;
- criacao de uma versao de midia reduzida/transcodificada, somente se isso for explicitamente aprovado como politica de conteudo.

Nao criar bucket de conteudo nem alterar o arquivo original apenas para contornar o limite.

### QUESTAO ABERTA

Como ocorrera a migracao fisica do Google Drive, incluindo politica de arquivos educacionais, referencias de origem internas e a escolha de infraestrutura de midia para arquivos acima do limite atual do Supabase Free?

### QUESTAO ABERTA

Quando e como a biblioteca de exercicios podera ser exposta a cliente, e quais campos definitivos de exercicio serao necessarios sem antecipar programacao de treino?

## Protocolos e equivalentes

### QUESTAO ABERTA

Quais campos, tipos de protocolo e elementos profissionais compoem um protocolo alem da estrutura versionada inicial?

### QUESTAO ABERTA

Quais regras profissionais ainda pendentes devem completar a criacao, revisao e aprovacao de um plano alimentar, sem reabrir as regras do metodo ja confirmadas em `BUSINESS_RULES.md` e `DECISIONS.md`?

### QUESTAO ABERTA

Qual catalogo de equivalentes sera validado, quem podera versiona-lo e qual parte, se alguma, podera ser exibida a cliente em um protocolo publicado?
