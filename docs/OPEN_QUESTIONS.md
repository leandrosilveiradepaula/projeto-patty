### PARCIALMENTE RESOLVIDO - PROGRESSAO DO PROTOCOLO

A Patty confirmou que a progressao segue a sequencia do protocolo, mas depende de adesao e resultado. Se a cliente nao estiver aderindo adequadamente ou se o resultado nao for considerado valido, a progressao e interrompida e os proximos passos sao definidos manualmente pela Patty.

A leitura profissional de resultado esta parcialmente resolvida:
- qualquer resultado e valido quando ha mudanca nos indicadores numericos e essa evolucao nao esta indo contra o objetivo que a propria cliente buscou;
- o resultado nao e considerado valido quando a evolucao vai contra o objetivo buscado pela cliente ou quando os numeros, no geral, permanecem estagnados.

Tambem confirmou que o Cutting 2 reinicia a estrutura de Cutting com menos doses de macros em relacao ao ciclo anterior.

Continuam abertos:
- criterio objetivo de adesao suficiente/insuficiente;
- janela de tempo para caracterizar estagnacao;
- limiar de variacao em medidas para distinguir mudanca real de ruido;
- tratamento de combinacoes conflitantes de indicadores alem dos casos confirmados;
- criterios de resultado para objetivos diferentes de emagrecimento/reducao de gordura;
- quanto e quais macros diminuem em cada transicao do Cutting 2;
- quando simplificar, retornar, manter ou trocar estrategia em cada caso.

### RESOLVIDO PARCIALMENTE — INDICADORES DE RESULTADO

Para emagrecimento/reducao de gordura:
- reducao de cintura e abdomen e resultado positivo;
- busto/peito e referencia adicional forte;
- melhora visual nas fotos pode representar evolucao mesmo com peso estavel;
- peso isolado nao invalida evolucao quando medidas e/ou visual melhoram.

Nao converter automaticamente essa leitura em score ou decisao de fase enquanto janela, tolerancia a ruido e demais combinacoes nao estiverem formalizadas.

Nao criar score automatico de adesao, estagnacao automatica ou mudanca automatica de fase.

# Questoes Abertas

Este documento concentra pontos ainda nao definidos. Cada item deve ser validado pelo responsavel adequado antes de virar decisao: regras do metodo e operacao profissional pela Patty; arquitetura, seguranca e produto tecnico pelo responsavel do projeto; temas juridicos/privacidade com validacao juridica quando aplicavel.

## Produto e usuarios

### FATO JA CONFIRMADO

A Patty ja possui o email da cliente e inicia o onboarding enviando um link para esse endereco. Nao existe cadastro publico/autonomo. O lifecycle tecnico de ativacao, definicao inicial de senha e login posterior esta implementado e passou E2E sintetico em producao. Site URL e redirect allowlist tambem estao alinhados.

### DECISAO DE INFRAESTRUTURA

O MVP usara o Gmail pessoal da Patty via Custom SMTP do Supabase Auth. A escolha de infraestrutura do email real de convite esta resolvida.

### PENDENCIA OPERACIONAL — NAO BLOQUEIA O ONBOARDING ASSISTIDO

A configuracao de Gmail/Custom SMTP continua pendente e recomendada para envio automatico.

Ainda falta configurar no Google/Supabase:
- verificacao em duas etapas na conta Google;
- App Password exclusiva;
- Custom SMTP com `smtp.gmail.com`;
- template real `Invite user` usando `TokenHash` + `type=invite` para `/auth/confirm`;
- teste de entrega real com fixture sintetica.

Porem, o admin ja pode gerar links manuais individuais de convite e de recuperacao de senha. Portanto SMTP deixou de bloquear o uso assistido do sistema. A App Password deve ser inserida diretamente no Supabase e nao deve ser compartilhada no chat ou repositorio.

### PARCIALMENTE RESOLVIDO

A recuperacao tecnica de senha esta implementada no aplicativo com fluxo PKCE do Supabase, resposta neutra quanto a existencia da conta e redefinicao autenticada.

Continuam abertas:
- regras de expiracao/reenvio do convite;
- politica operacional de encerramento da conta;
- tratamento de conta Auth excluida preservando historico profissional.

### RESOLVIDO

O projeto nao esta mais sendo conduzido como MVP. O objetivo atual e construir o **sistema completo, de ponta a ponta**.

Todos os modulos e fluxos confirmados para Patty e clientes fazem parte do escopo. A ordem de implementacao pode ser priorizada tecnicamente, mas nao existe mais uma decisao de produto sobre "o que fica para depois" entre funcionalidades ja confirmadas.

### RESOLVIDO

Todos os fluxos listados para a cliente na pergunta 7 da rodada de fechamento devem estar disponiveis no primeiro lancamento: Perfil/Cadastro Atual, Anamnese, fotos, exames/documentos, avaliacoes/medidas, protocolo alimentar, conteudos educacionais, biblioteca de exercicios, solicitacao de treino, visualizacao do treino quando houver prescricao, esclarecimentos no aplicativo e evolucao.

O check-in de liquidos/atividade fisica tambem faz parte do sistema completo. Seus parametros ainda abertos continuam sendo tratados como questoes de regra/implementacao, nao de retirada de escopo.

### RESOLVIDO

Para esta rodada, "primeiro lancamento" significa a primeira versao pronta para uso real no atendimento, e nao o primeiro dia/acesso de uma cliente.

A Patty confirmou que **todas** as operacoes administrativas listadas na pergunta 8 devem estar disponiveis antes do uso real: onboarding/convite, Cadastro Atual, Anamnese e correcao historica, esclarecimentos, arquivos privados, avaliacoes/comparacao, protocolos/versionamento/aprovacao/publicacao, liberacao de conteudos, solicitacao de treino, painel de pendencias e assistencia de IA na revisao da Anamnese.

A prontidao tecnica de cada item permanece sendo acompanhada separadamente.

## Autenticacao

### QUESTAO ABERTA

Qual sera o tratamento de conta Auth excluida quando for necessario manter historico profissional?

## Autorizacao

### QUESTAO ABERTA POS-MVP

Se futuramente forem introduzidos assistentes, profissionais parceiros ou suporte operacional, quais papeis e permissoes client-scoped serao necessarios?

## Arquitetura e automacoes

## Modelo de dados

### PARCIALMENTE RESOLVIDO

Na Anamnese, todos os campos aplicaveis ao preenchimento final sao obrigatorios. O mapa nao juridico da v1, tipos, ordem e as 10 regras de aplicabilidade estao definidos. ANAM-046 tambem foi resolvido para o MVP como checkbox obrigatorio versionado no envio final.

### PARCIALMENTE RESOLVIDO

O catalogo e as unidades das medidas da Avaliacao Completa foram confirmados pela Patty em 2026-09-27. Permanecem abertas as definicoes de campos/obrigatoriedade que nao foram cobertas por essa resposta, especialmente para exames, protocolos e outros fluxos ainda nao formalizados.

### QUESTAO ABERTA

Qual sera a politica geral de retencao, arquivamento e exportacao de dados fora das decisoes ja confirmadas para preservacao do historico de IA?

### QUESTAO ABERTA

Quais serao os valores definitivos de `profiles.status`?

### QUESTAO ABERTA

Quais serao os valores definitivos de `clients.status`?

### QUESTAO ABERTA

Quais campos adicionais, se houver, devem ser incorporados futuramente ao `client_registration` alem de Cidade, Telefone, Email de contato e Instagram? O fluxo atual edita somente esses quatro campos ja existentes.

### QUESTAO ABERTA

FATO RESOLVIDO: a cliente atualiza Cidade, Telefone, Email de contato e Instagram em `/cliente/perfil`, sem alterar Auth ou Anamnese historica.

### QUESTAO ABERTA

FATO RESOLVIDO: a propria cliente pode atualizar seus quatro campos atuais; Patty/admin pode atualizar os mesmos campos somente para cliente acessivel por assignment ativo e sessao administrativa AAL2.

### QUESTAO ABERTA

Quais alteracoes cadastrais exigirao auditoria especifica?

## Anamnese

### PARCIALMENTE RESOLVIDO

O inventario conhecido `ANAM-000..046` agora possui mapa completo fonte -> destino em `ANAMNESE_FIELD_MAP_V1_CANDIDATE.md` e `anamnesis_field_map_v1_candidate.json`.

O mapa cobre exatamente 47 entradas historicas, propoe 51 campos candidatos e preserva as 4 medidas fora da Anamnese.

Isso fecha a lacuna de mapeamento do inventario conhecido, mas nao prova que evidencias historicas externas inexistentes nao contenham outros campos.

### FATO JA CONFIRMADO

A Patty confirmou que as perguntas do formulario atual devem ser mantidas como base de conteudo. Nesta etapa, o objetivo e organizar melhor a experiencia no aplicativo, nao fazer uma revisao ampla removendo ou acrescentando varias perguntas.

A reorganizacao pode alterar apresentacao, agrupamento, tipos de input e logica condicional sem mudar silenciosamente o sentido profissional das perguntas.

### FATO JA CONFIRMADO

Todos os campos da Anamnese sao obrigatorios para permitir o envio final. Rascunhos podem permanecer incompletos ate a cliente finalizar o preenchimento.

### DECISAO DE PRODUTO

Os tipos nao juridicos da v1 estao definidos no mapa aceito:
- `text` para respostas abertas;
- `single_choice` para opcoes observadas ou perguntas explicitamente binarias aprovadas no mapa.

ANAM-046 ja foi resolvido separadamente para o MVP e permanece versionado como consentimento obrigatorio no envio final.

### DECISAO DE PRODUTO

A v1 separa exatamente as 10 perguntas compostas explicitas do formato Sim/Nao + detalhe documentadas no mapa. ANAM-025 e ANAM-043 permanecem juntas.

Nenhuma separacao adicional deve ser inferida sem nova decisao.

### DECISAO DE PRODUTO E ESTADO APLICADO

A regra geral de exibicao condicional esta confirmada: pergunta dependente nao aplicavel fica oculta e nao obrigatoria.

A fundacao tecnica versionada esta aplicada no Supabase SaaS e a v1 possui exatamente 10 dependencias aprovadas no mapa, todas derivadas das perguntas compostas explicitas Sim/Nao + detalhe e ativadas por igualdade JSON exata com `"Sim"`.

A UI e a validacao de envio final usam a aplicabilidade versionada. Nenhuma dependencia adicional deve ser inferida.

### DECISAO DE PRODUTO

A ordem e o agrupamento descritos em `ANAMNESE_CANONICAL_V1_CANDIDATE.md` estao aceitos para a v1, com ANAM-010 em Cadastro.

O nome do arquivo preserva o sufixo `CANDIDATE` por historico; o conteudo correspondente ja foi promovido a decisao de produto. ANAM-046 foi resolvido e a `client-anamnesis` v1 ja foi publicada e validada em producao.

### FATO JA CONFIRMADO

A Patty confirmou que as medidas corporais podem ser separadas da Anamnese e tratadas em um fluxo proprio de Avaliacao/Medidas. O lifecycle operacional `rascunho -> finalizada`, o catalogo configuravel, as unidades/obrigatoriedade das definicoes ativas e a correcao auditavel de valor/unidade apos finalizacao ja estao implementados. Continuam abertas apenas regras profissionais/calendario ainda nao formalizadas e eventuais correcoes de outros atributos historicos.

### FATO RESOLVIDO

ANAM-044 usa o dominio privado existente. A Anamnese orienta e aponta para `/cliente/arquivos`; cada arquivo e classificado por `file_kind` como `photo`, `exam` ou `document`. Nao existe upload duplicado nem `anamnesis_answer` de arquivo.

### QUESTAO ABERTA

Qual politica concreta de retencao define quando um arquivo inativado/substituido pode ser removido fisicamente, considerando referencias historicas e auditoria?

### FATO RESOLVIDO — ANAM-046

ANAM-046 foi definido para o MVP como checkbox obrigatorio no envio final da Anamnese canonica.

Texto v1: "Concordo com o tratamento das informações fornecidas nesta Anamnese, inclusive dados de saúde, para realização do meu acompanhamento pela Consultoria Corpo & Mente."

O valor versionado persistido e `Concordo`. Sem marcar, a cliente pode continuar salvando o rascunho, mas nao pode enviar a Anamnese. O aceite nao autoriza automaticamente uso de dados reais por IA. A especificacao completa esta em `ANAMNESE_CONSENT_GATE.md`.

### QUESTAO ABERTA

Em quais finalidades especificas, e sob quais controles, Cidade, Telefone e Email de contato poderao ser selecionados para o contexto de IA? Eles nao entram automaticamente a partir do Cadastro Atual.

### FATO RESOLVIDO

A identificacao tecnica estavel da condicao financeira e o `question_key` versionado `financial_capacity_for_supplements`, ligado no mapa v1 ao item historico `ANAM-033`.

O schema garante unicidade de `question_key` dentro de cada `form_version_id`. O runtime usa uma constante centralizada para esse key, e o teste de invariantes confere que o mapa v1 continua associando `ANAM-033` a esse identificador com `ai_default = exclude`.

Regra preservada: essa resposta fica fora do contexto de IA por padrao e somente pode entrar por inclusao explicita da Patty na execution.

### PARCIALMENTE RESOLVIDO — PRIMEIRO FLUXO DE IA

Para o primeiro fluxo `anamnesis_review`:
- provider confirmado: OpenAI;
- adapter server-side implementado sobre Responses API;
- modelo tecnico inicial: `gpt-5.6-terra`, sobrescrevivel por `OPENAI_MODEL`;
- reasoning inicial: `medium`;
- prompt v1 versionado e aplicado;
- Structured Outputs, aliases efemeros e validacao deterministica do output implementados;
- `purpose_key = anamnesis_review` e o contrato v1 de findings estao definidos;
- persistencia de falhas e limites locais de retencao estao implementados;
- revisao humana continua obrigatoria e a IA nao publica diretamente.

Continuam abertos antes de dados reais:
- avaliacao sintetica inicial: RESOLVIDA no run `37128054011` com 4/4 cenarios aprovados;
- controles organizacionais de retencao/processamento da OpenAI;
- base legal/consentimento aplicavel;
- conclusao explicita do checklist `OPENAI_HEALTH_DATA_GATE.md`.

O modelo inicial passou a avaliacao sintetica basica de contrato/comportamento, mas ainda nao deve ser tratado como escolha definitiva de producao ate a avaliacao de custo/latencia e os controles organizacionais de dados reais serem concluídos.

### QUESTAO ABERTA — EXPANSAO FUTURA

A taxonomia global de `purpose_key` para futuros usos de IA e os contratos de output desses outros purposes continuam abertos. Isso nao reabre o contrato v1 ja definido para `anamnesis_review`.

### PARCIALMENTE RESOLVIDO - UX DE FINDINGS DE IA

A Patty confirmou que um finding pode ser aceito como observacao interna ou transformado em anotacao propria. Nenhum conteudo originado da IA pode chegar a cliente sem aprovacao explicita previa da Patty.

As duas acoes confirmadas foram implementadas em 2026-09-30:
- aceitar como observacao interna;
- transformar em anotacao propria da Patty.

O output original permanece imutavel e a decisao humana fica em registro separado, append-only. Cada finding aceita uma unica decisao humana dessas duas alternativas. Quando vira anotacao, a nota da Patty e criada separadamente em `anamnesis_reviews`.

Continuam abertas apenas as demais acoes de UX ainda nao confirmadas, como editar o texto do finding, descartar explicitamente ou converter diretamente em pedido de esclarecimento.

### RESOLVIDO — CALCULO DETERMINISTICO E OVERRIDE MANUAL

A decisao de parametrizacao de 2026-09-30 resolve a relacao conceitual entre calculo e edicao manual:

- o template e sua versao de origem permanecem identificados;
- os inputs e o resultado calculado permanecem preservados;
- uma alteracao da Patty e registrada como override profissional, separada do resultado calculado;
- o override preserva valor original, valor alterado, unidade, autoria, timestamp e contexto de aplicacao;
- a alteracao nao deve ser atribuida a IA;
- o protocolo/treino materializado preserva snapshot dos parametros efetivamente usados;
- alterar o template no futuro nao reescreve snapshots anteriores.

Continua sendo tarefa tecnica definir a materializacao exata dessas entidades no schema/runtime, sem enfraquecer auditoria, RLS ou historico.

### QUESTAO ABERTA

Quais consentimentos, bases legais e politicas legais de retencao, arquivamento, descarte e exportacao se aplicarao ao contexto e ao historico de IA?

### QUESTAO ABERTA

Como a futura entidade de materializacao entre rascunho de IA e `protocol_version` identificara hipoteses ainda presentes e impedira aprovacao/publicacao enquanto alguma permanecer sem confirmacao explicita da Patty?

### QUESTAO ABERTA

Qual sera a classificacao definitiva de cada campo da anamnese nas categorias estruturais do produto?

### RESOLVIDO — ALERTAS/BLOQUEIOS INICIAIS

A Patty confirmou que respostas iniciais da Anamnese, doencas relatadas, alteracoes em exames ou relatos comportamentais nao devem gerar alerta, bloqueio, encaminhamento, revisao obrigatoria ou outro fluxo automatico apenas por sua presenca.

O acompanhamento inicia normalmente e a Patty observa a evolucao da cliente. Eventual intervencao posterior continua sendo julgamento humano.

Se futuramente a Patty quiser automatizar algum alerta especifico, isso exigira nova regra explicitamente confirmada e documentada.

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

FATO RESOLVIDO: email de autenticacao e email de contato permanecem independentes; editar Cadastro Atual nao altera o email de login e nao existe sincronizacao bidirecional automatica.

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

A Patty corrigiu a nomenclatura e a logica operacional:
- **Avaliacao Completa** substitui o nome historico "mensal";
- **Avaliacao Basica** substitui o nome historico "quinzenal";
- a data da Avaliacao Completa fica ancorada no dia do mes em que a cliente iniciou o acompanhamento;
- a Avaliacao Basica ocorre no meio do intervalo entre duas Avaliacoes Completas;
- exemplo confirmado: Avaliacao Completa no dia 2 -> Avaliacao Basica no dia 17.

Nao existem duas avaliacoes concorrentes na mesma data como regra normal do fluxo.

O catalogo da Avaliacao Completa esta confirmado:
- peso (kg);
- cintura (cm);
- abdomen (cm);
- coxa (cm);
- biceps (cm);
- busto para mulher ou peito para homem (cm);
- quadril (cm);
- ombros (cm);
- panturrilhas (cm);
- fotos de avaliacao.

Para medidas unilaterais, utiliza-se somente o lado direito do corpo.

Continua aberta:
- a regra de calendario quando a data de inicio cai em 29, 30 ou 31 e o mes seguinte nao possui esse dia.

O fluxo tecnico de correcao de medida historica apos finalizacao foi resolvido em 2026-09-30 com registro append-only: o lancamento original permanece preservado, cada correcao registra ator/momento/valor/unidade e a correcao mais recente passa a ser o valor factual vigente na leitura e comparacao.

### PARCIALMENTE RESOLVIDO

A Patty confirmou dois cenarios distintos:
- nova avaliacao de acompanhamento: preserva a anterior e cria uma nova avaliacao com nova data;
- erro de lancamento: a Patty volta a avaliacao existente, corrige o dado e o valor incorreto deixa de ser o dado valido.

### RESOLVIDO TECNICAMENTE EM 2026-09-30

A implementacao auditavel foi materializada em `assessment_measurement_corrections`. A medida original permanece imutavel e cada ajuste e append-only. O runtime administrativo usa a correcao mais recente como valor vigente sem apagar o original nem criar nova avaliacao apenas por erro de digitacao.

### QUESTAO ABERTA

Qual e a origem da percepcao de aderencia e quais partes do acompanhamento profissional poderao futuramente ser exibidas para a cliente?

## IA e revisao de Anamnese

### PARCIALMENTE RESOLVIDO

A Patty confirmou a regra geral de aplicabilidade e o mapa v1 de 10 dependencias esta definido, versionado e consumido pela UI/validacao de envio.

A obrigatoriedade geral permanece: todos os campos aplicaveis da versao devem estar preenchidos no envio final.

O contrato deterministico de `missing_answer` esta implementado no validador: usa `target_question_id`, permite `source_answer_ids` vazio e exige que o target esteja na allowlist de perguntas previamente verificadas como aplicaveis e sem resposta para a mesma execution/submission.

A montagem server-side da allowlist foi implementada de forma deterministica a partir da submission, perguntas versionadas, answers e aplicabilidade. Provider OpenAI, configuracao tecnica inicial de modelo/effort, prompt v1, contrato de output de `anamnesis_review` e avaliacao sintetica inicial ja estao definidos/validados. Continuam abertos o gate de processamento de dados de saude, os controles organizacionais/retencao e eventuais ampliacoes de UX dos findings ainda nao confirmadas.

### FATO RESOLVIDO

O boundary server-side de persistencia de falhas limita:
- `ai_execution_failure_responses.content` a 128 KiB medidos em bytes UTF-8;
- `failure_message` a 1.024 code points apos normalizacao de whitespace;
- caracteres NUL sao substituidos antes da persistencia;
- quando a resposta bruta precisa ser truncada, ela passa a ser armazenada como `text`, com marcador explicito contendo tamanho original e formato informado, para nao representar um JSON truncado como JSON valido.

O limite e aplicado antes do RPC privilegiado, no modulo `server-only`, e possui testes determinísticos. O SaaS foi verificado antes da mudanca e nao continha failure responses nem failure messages reais a migrar.

### GAP OPERACIONAL PARCIALMENTE MITIGADO

Se banco ou conexao ficar indisponivel apos resposta do provider, a execution previamente criada pode permanecer `started` sem persistir resposta bruta, metadados de falha ou transicao terminal.

A UI administrativa agora detecta de forma deterministica `status = started` sem `completed_at`/ `failed_at` e sinaliza que a execution exige reconciliacao operacional. Essa deteccao nao inventa timeout, nao converte o estado em `failed`, nao cria failure response e nao dispara retry automatico.

A consulta do Supabase SaaS em 2026-09-24 encontrou 0 executions `started` sem output/failure response.

Continua aberto definir, se necessario, mecanismo de reconciliacao, timeout, watchdog ou recovery job. Nenhuma execution deve ser tratada como `failed/persistence_failed` sem failure response correspondente.

### FATO RESOLVIDO

A escrita interna de IA usa RPCs `SECURITY INVOKER` exclusivas de `service_role`, chamadas somente por modulo `server-only`. A identidade administrativa e derivada da sessao por `requireRole("admin")`/AAL2; o browser nao fornece `initiated_by_profile_id` e roles `anon`/`authenticated` nao recebem escrita nem EXECUTE nessas RPCs.

### QUESTAO ABERTA

Qual sera a UX e o processo humano para revisao de findings, edicao de follow-up, descarte, eventual transformacao manual em acao e eventual envio a cliente?

## Metodo profissional

As regras abaixo permanecem abertas somente onde a documentacao ainda nao registra confirmacao da Patty. O fluxo principal, o Reconhecimento Metabolico, as referencias iniciais de macros e doses, o limite do grupo de proteina com maior teor de gordura, o Cutting Dia 1 / Dia 2 e a refeicao livre semanal do Up Metabolico ja estao documentados como confirmados.

### PARCIALMENTE RESOLVIDO — PLANILHA CARB CYCLE

A Patty confirmou posteriormente que:
- as Fases 1, 2, 3 e 4 da planilha pertencem ao conjunto de fases usado nos Cuttings 1, 2 e 3 do metodo atual;
- a coluna **Media** e o valor utilizado no protocolo **Linear** da fase correspondente.

A Patty esclareceu que o uso pratico mais frequente nao depende de avancar indefinidamente na numeracao da planilha: ela normalmente trabalha com as Fases 1, 2 e 3, intercala um periodo de bulking e depois reinicia novamente 1, 2 e 3 ao retornar ao cutting.

As Fases 4, 5 e 6 sao pouco usadas e deixam de ser bloqueio para a primeira automacao do fluxo principal, mas suas regras continuam abertas.

Continuam abertos:
- pareamento individual completo fase numerada -> nome do Cutting quando nao estiver explicitado;
- criterios profissionais de transicao cutting -> bulking -> cutting;
- regras detalhadas das Fases 4, 5 e 6.

### PARCIALMENTE RESOLVIDO — ETAPAS POSTERIORES AO CUTTING 2

A Patty confirmou em 2026-10-04 a sequencia de alto nivel:
- Cutting 2;
- Up Metabolico;
- Cutting 3;
- Up Metabolico.

Tambem confirmou que, quando ha objetivo de ganho de massa muscular, pode existir Bulking seguido de Consolidacao Metabolica antes do retorno ao Cutting.

Continuam abertos:
- formulas, duracao e criterios de entrada/saida do Bulking;
- formulas, duracao e criterios de entrada/saida da Consolidacao Metabolica;
- formulas/macros detalhados de cada ocorrencia do Up Metabolico;
- pareamento completo entre fases numeradas da planilha e etapas concretas do protocolo.

Resolvido em 2026-10-04: os Ups Metabolicos nao precisam repetir duracao nem quantidade de refeicoes livres. Esses parametros variam por periodo/cliente conforme resultado e decisao profissional.

A progressao continua sendo decisao profissional baseada em resultados. Nao automatizar mudanca de fase sem regra deterministica confirmada.

### PARCIALMENTE RESOLVIDO — BULKING E CONSOLIDACAO METABOLICA

A Patty confirmou que Bulking e usado quando o paciente deseja trabalhar ganho de massa muscular.

Entre o Bulking e a volta ao Cutting, a Patty utiliza Consolidacao Metabolica para trabalhar/preservar o ganho de massa muscular e retirar somente o excesso adicional de gordura e retencao liquida.

Continuam abertos:
- estrutura de macros/doses do Bulking;
- duracao do Bulking;
- criterios de ajuste/encerramento do Bulking;
- estrutura de macros/doses da Consolidacao;
- duracao da Consolidacao;
- criterio para encerrar a Consolidacao e retornar ao Cutting.

Nao automatizar Bulking ou Consolidacao apenas com base nessa confirmacao de fluxo geral.

### PARCIALMENTE RESOLVIDO — HIDRATACAO/CHECK-IN DE LIQUIDOS

A Patty substituiu em 2026-10-04 a referencia anterior de 60 mL/kg pela regra vigente:

- **minimo de 35 mL por kg de peso corporal por dia**;
- exemplo matematico: 60 kg -> 2.100 mL/dia = 2,1 L/dia.

A taxonomia operacional distingue agua pura de outros liquidos zero calorias. A Patty confirmou que a orientacao profissional e 70% da meta em agua pura e os 30% restantes podendo vir de outros liquidos zero calorias. Divergencia da cliente nao gera bloqueio automatico nem score de adesao.

Continuam abertos:
- horarios/cadencia dos lembretes;
- poderes de correcao da Patty;
- se a Patty tambem pode corrigir registros da cliente.

O valor vigente de **35 mL/kg/dia** e a referencia profissional confirmada e passa a ser o template inicial dessa regra, substituindo 60 mL/kg para novas metas. O runtime atual ja possui implementacao deterministica com snapshot de meta, mas, conforme a decisao de parametrizacao de 2026-09-30, esse numero nao deve permanecer como constante profissional definitiva no codigo: deve migrar para configuracao versionada sem reescrever historico.

As questoes de recalculo por mudanca de peso, eventual proporcao-alvo de agua pura, lembretes e correcoes continuam abertas e nao devem ser inferidas a partir do template.

### QUESTAO ABERTA

Quais sao as regras de suplementacao e manipulados?

### QUESTAO ABERTA

A solicitacao de treino pela cliente ja possui registro estruturado append-only e nao autoriza geracao automatica. Continua aberta a montagem e progressao definitiva de treino, incluindo excecoes de frequencia/duracao, intensidade, volume, progressao e cardio quando aplicavel.

Tambem permanece aberto como representar eventual retirada/cancelamento posterior da solicitacao de treino; nao inferir cancelamento nem apagar o registro historico.

### QUESTAO ABERTA

Quais criterios profissionais determinam avancar, simplificar ou retornar entre etapas alem do fluxo ja confirmado, sem criar score automatico de adesao?

### QUESTAO ABERTA

Quais sao os criterios profissionais finais de avaliacao e reavaliacao?

### QUESTAO ABERTA

Quais alertas profissionais devem existir, quais sao apenas informativos e quais, se algum, bloqueiam uma acao?

### QUESTAO ABERTA

Quais regras de comportamento ainda precisam ser formalizadas alem do principio confirmado de adaptar o protocolo a dificuldade relatada e priorizar adesao?

### PARCIALMENTE RESOLVIDO — FORMULAS/CONVERSOES ALIMENTARES

A relacao entre legumes e a contagem total de carboidrato foi confirmada:

- **2 doses de legumes = 1 dose de carboidrato para efeito da contagem total**.

Exemplo confirmado:
- 6 doses totais de carboidrato;
- 2 doses de legumes no almoco contabilizam 1 dose de carboidrato;
- 2 doses de legumes no jantar contabilizam mais 1 dose de carboidrato;
- restam 4 doses do total diario, que podem ser distribuidas entre carboidrato e gordura.

Ficam abertos:
- a conversao exata entre doses do saldo de carboidrato e gordura;
- se a alocacao de legumes no almoco e jantar vale para todas as fases/protocolos;
- excecoes especificas.

A equivalencia dos legumes pode ser documentada, mas nao ampliar a automacao para a redistribuicao carboidrato/gordura enquanto a conversao restante nao estiver formalizada.

### QUESTAO ABERTA — GORDURA SATURADA E REFEICOES FORA

A Patty descreveu a alimentacao como "totalmente sem gordura saturada" e orientou priorizar refeicoes preparadas pela propria cliente, deixando refeicoes fora para refeicoes livres ou situacoes esporadicas.

Definir o significado operacional dessa orientacao, limites/excecoes e se e regra de protocolo ou recomendacao geral. Nao criar bloqueio alimentar automatico enquanto isso estiver aberto.

### QUESTAO ABERTA — SUPLEMENTACAO/MANIPULADOS

A rodada trouxe exemplos adicionais de pratica profissional: magnesio antes de dormir, possibilidade de alho, manipulados ou encaminhamento conforme exames.

Ainda faltam criterios de elegibilidade, dose, forma, duracao, contraindicacoes, interacoes, grupos excluidos e necessidade de avaliacao externa. Esses exemplos nao viram recomendacao automatica.

### QUESTAO ABERTA — TREINO

A Patty confirmou que prescreve treino somente quando solicitado e relatou como pratica atual minimo de 3x por semana / cerca de 1 hora.

Ainda falta definir se esse minimo admite excecoes e formalizar intensidade, volume, progressao, cardio, ajustes por limitacao e criterios de avaliacao complementar.

### RESOLVIDO PARA O COMPORTAMENTO INICIAL — ALERTAS/ENCAMINHAMENTO

A Patty confirmou que o sistema nao deve fazer nada automaticamente no inicio apenas porque foram relatadas alimentacao emocional, culpa, compulsao, restricao, doenca ou alteracao em exame.

O acompanhamento e iniciado normalmente e a Patty observa como a cliente se comporta ao longo do processo.

Nao ha regra inicial automatica de:
- destaque;
- revisao obrigatoria;
- pedido de esclarecimento;
- encaminhamento;
- bloqueio.

Permanece humano o julgamento posterior da Patty sobre necessidade de esclarecimento, ajuste ou encaminhamento. Se algum desses comportamentos vier a ser automatizado no futuro, sera necessaria nova confirmacao especifica.

### QUESTAO ABERTA — ACOMPANHAMENTO, RESULTADO E EXCECOES

As secoes do roteiro sobre acompanhamento apos protocolo inicial, criterios formais para alterar dieta/treino, sinais de sucesso/insucesso, diferenca entre estrategia inadequada e baixa adesao, formato final do protocolo, excecoes e definicao de bom resultado ficaram sem resposta.

Esses temas permanecem abertos e devem ser retomados em rodada posterior.
## Cadastro e Anamnese

### QUESTAO ABERTA

FATO RESOLVIDO: a cliente cria/atualiza o proprio Cadastro Atual pela area de Perfil; Patty/admin cria/atualiza pela tela da cliente sob assignment ativo + AAL2. A persistencia usa boundary server-side privilegiada e o browser continua sem INSERT/UPDATE direto em `client_registration`.

### FATO RESOLVIDO

O salvamento de rascunho, as permissoes minimas de escrita e a submissao final estao aplicados no SaaS.

A cliente pode retomar rascunho, salvar respostas `text` e `single_choice`, receber a visibilidade condicional versionada e enviar explicitamente a Anamnese. O banco revalida todos os campos obrigatorios aplicaveis antes de aceitar o envio. Autosave nao e requisito da v1.

### FATO RESOLVIDO

A primeira Anamnese canonica `client-anamnesis` v1 esta materializada e publicada no Supabase SaaS.

Estado validado:
- 10 secoes;
- 51 perguntas;
- 10 condicionais;
- ANAM-044 preservado fora de `anamnesis_answers` conforme decisao de produto;
- ANAM-046 versionado como checkbox obrigatorio no envio final;
- valor de aceite persistido: `Concordo`;
- envio completo validado em smoke transacional com `ROLLBACK`;
- E2E de browser do consentimento canônico aprovado no run `36072067063`.

ANAM-046 nao e mais bloqueio para a v1 publicada.

### DECISAO DE PRODUTO

Uma versao so fica disponivel por publicacao explicita depois de possuir definicao deterministica completa, consentimento aplicavel resolvido, integridade validada e revisao humana. Criar uma versao em draft nao a torna disponivel.

### FATO JA RESOLVIDO

A correcao posterior de uma submission enviada esta implementada sem sobrescrever a resposta original. As correcoes sao registros append-only em `anamnesis_answer_corrections`, com autoria e timestamp; UPDATE/DELETE sao bloqueados e a cliente nao recebe acesso a esse historico.

A aplicacao administrativa ja possui uma rota dedicada para visualizar a resposta original, listar o historico cronologico de correcoes e acrescentar uma nova correcao, sempre sob AAL2, assignment ativo e RLS.

### PARCIALMENTE RESOLVIDO

A revisao administrativa ja possui notas append-only e correcoes append-only separadas da resposta original.

### PARCIALMENTE RESOLVIDO

A Patty confirmou que, apos o envio final da Anamnese, a cliente entra diretamente em analise profissional. Nao sao necessarios estados intermediarios como "recebida", "em revisao" ou "pendencias" para iniciar o trabalho da Patty.

A Patty tambem confirmou que, quando faltar informacao importante ou uma resposta estiver pouco clara, o esclarecimento deve ser solicitado a cliente dentro do aplicativo, em vez de a Patty completar a resposta original por conta propria.

A fundacao minima de UX/historico foi definida e implementada: pedido textual da Patty, vinculo opcional a resposta original, complementos textuais append-only da cliente e visualizacao nas duas interfaces.

A Patty confirmou:
- a resposta da cliente nao resolve automaticamente;
- a Patty precisa ler e marcar manualmente como resolvido;
- se ainda houver duvida, pode questionar novamente;
- nao existe prazo/expiracao para resposta;
- enquanto estiver aguardando resposta da cliente, o sistema deve enviar lembrete a cada 24 horas.

O estado aberto/resolvido foi materializado tecnicamente em 2026-09-30: a resposta da cliente nao resolve o pedido, e a resolucao manual da Patty fica em registro append-only separado.

O painel operacional tambem calcula de forma deterministica o primeiro marco de 24 horas para pedidos ainda sem resposta. Quando esse marco passa, exibe `Lembrete de 24h devido`; isso nao registra nem presume que uma mensagem tenha sido enviada.

Continuam abertos:
- o canal tecnico da notificacao de 24 horas;
- o registro/execucao de cada envio real e a recorrencia subsequente enquanto continuar sem resposta;
- como os complementos entram no contexto de IA e no historico de findings.

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

### FATO RESOLVIDO — INFRAESTRUTURA

A infraestrutura tecnica escolhida para a midia educacional binaria e Vercel Private Blob. O Supabase continua sendo fonte de verdade de metadata, versoes, releases e RLS.

O bucket `client-private` nao sera reutilizado e o original nao sera reduzido apenas para contornar limite.

### PENDENCIA OPERACIONAL

Ainda falta:
- criar/conectar o Blob store privado ao projeto Vercel;
- migrar o arquivo original aprovado;
- conferir tamanho, MIME e SHA-256;
- registrar o asset na versao draft;
- revisar/publicar/liberar explicitamente.

### QUESTAO ABERTA

Como ocorrera a migracao fisica dos demais arquivos do Google Drive, incluindo referencias de origem internas, lotes, direitos e revisao individual?

### QUESTAO ABERTA

Quando e como a biblioteca de exercicios podera ser exposta a cliente, e quais campos definitivos de exercicio serao necessarios sem antecipar programacao de treino?

## Protocolos e equivalentes

### PARCIALMENTE RESOLVIDO

A Patty confirmou que o protocolo/acompanhamento precisa permitir edicao manual de fase, macros, numero de refeicoes, distribuicao de doses, alimentos/equivalentes, Low/High, refeicao livre, observacoes, data de inicio, orientacoes, treino quando solicitado, suplementacao e manipulados.

Pela decisao de parametrizacao de 2026-09-30, esses ajustes devem ser representados como configuracao/override profissional versionado, preservando origem e snapshot, e nao como sobrescrita silenciosa de um calculo anterior.

Quando houver regra previamente confirmada, documentada e cadastrada como configuracao ativa, o motor deterministico pode montar rascunhos automaticamente para revisao da Patty, inclusive macros da fase e treino predefinido aplicavel. A IA nao cria nem escolhe formulas profissionais por raciocinio generativo.

Continuam abertas as regras internas e os campos detalhados necessarios para treino, suplementacao e manipulados onde essas regras ainda nao estiverem formalizadas.

### QUESTAO ABERTA

Quais regras profissionais ainda pendentes devem completar a criacao, revisao e aprovacao de um plano alimentar, sem reabrir as regras do metodo ja confirmadas em `BUSINESS_RULES.md` e `DECISIONS.md`?

### PARCIALMENTE RESOLVIDO

A Patty confirmou que a cliente pode escolher livremente substituicoes dentro do grupo de equivalentes permitido pelo protocolo. Na proteina, o grupo de maior teor de gordura possui limite diario e, depois de atingi-lo, as doses restantes devem vir do grupo de menor teor de gordura. "Livre escolha" nao significa proteina ilimitada.

Continuam abertos:
- catalogo completo e versionado **aprovado** de equivalentes;
- governanca de quem pode alterar/versionar o catalogo;
- regras de exibicao detalhada do catalogo para a cliente;
- regras equivalentes para grupos de carboidratos/gorduras quando ainda nao formalizadas.

Em 2026-09-30 foi criado apenas um snapshot historico desidentificado do `Macros.xlsx` e um validador fail-closed. A fonte preserva grupos/quantidades observados, verifica as referencias confirmadas de doses e permanece explicitamente `publishable: false`. Nada foi inserido nas tabelas ativas de catalogo e nenhuma linha historica foi promovida a regra atual.


### PARCIALMENTE RESOLVIDO

A Patty confirmou que a cliente deve visualizar a rotina alimentar publicada e, quando houver treino prescrito, a rotina de treinos. A cliente nao precisa registrar execucao dentro do protocolo publicado.

### PARCIALMENTE RESOLVIDO - CHECK-IN

A Patty confirmou que o produto deve prever check-ins com metas e lembretes para:
- liquidos consumidos ao longo do dia;
- meta de liquidos baseada no peso da cliente;
- check-in diario de atividade fisica com registro "fez / nao fez", independente do treino prescrito;
- visualizacao do progresso pela cliente como estimulo adicional.

A Patty confirmou que as metas/configuracoes individuais podem ser definidas na entrega do primeiro protocolo.

A formula e a unidade da meta estao resolvidas: 60 mL/kg/dia.

Ainda faltam formalizar:
- eventual proporcao-alvo de agua pura dentro da meta;
- regra de recalculo apos mudanca de peso;
- horarios e cadencia dos lembretes;
- o que a Patty visualiza e pode corrigir;
- se registros anteriores podem ser editados;
- parametros funcionais restantes necessarios para implementar o check-in completo.

Nao inferir score de adesao ou frequencia ideal de treino.

## OpenAI — modelo e controles de dados

### FATO CONFIRMADO

O provider do primeiro fluxo `anamnesis_review` sera OpenAI.

### QUESTOES/OPERACOES AINDA ABERTAS

- avaliacao sintetica inicial de `gpt-5.6-terra` + reasoning `medium`: RESOLVIDA no run `37128054011`; custo/latencia e controles para dados reais continuam pendentes;
- configurar `OPENAI_API_KEY` fora do repositorio;
- executar `npm run eval:ai:openai` com uma chave OpenAI de ambiente; o harness usa somente fixtures sinteticas;
- revisar e documentar os controles organizacionais de retencao/processamento aplicaveis ao caso de uso de dados de saude;
- somente depois habilitar `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=true`.

A escolha do provider nao autoriza por si so o envio de dados reais.


O checklist operacional esta em `OPENAI_HEALTH_DATA_GATE.md`. O gate permanece fechado ate conclusao humana explicita dos itens aplicaveis.

### PENDENCIA OPERACIONAL — VERCEL PRIVATE BLOB STORE

O primeiro lote controlado de midia esta definido em `docs/educational_media_migration_batch_1.json` e cobre somente o video aprovado da balanca.

Ainda falta criar/conectar um Vercel Private Blob store ao projeto. A integracao Vercel disponivel na sessao de 2026-09-24 nao expoe operacao de Storage, portanto essa etapa nao foi executada automaticamente.

Enquanto o store nao existir:
- nao baixar/copiar o arquivo apenas para adiantar a migracao;
- nao preencher `storage_path` ou SHA-256 por estimativa;
- nao criar asset;
- nao publicar versao;
- nao criar release.

Depois da criacao/conexao do store, seguir a ordem deterministica do manifesto e manter os demais arquivos do Drive fora do lote.

### GAP OPERACIONAL — OBSERVABILIDADE CENTRAL IMPLEMENTADA

Executions acessiveis que permanecem `started` sem `completed_at` e sem `failed_at` agora aparecem em uma visao administrativa central em `/admin/ia`, alem do alerta contextual na revisao da Anamnese.

A tela:
- respeita assignment ativo e RLS existentes;
- nao define timeout;
- nao altera status;
- nao sintetiza failure response;
- nao dispara retry.

Continua aberto apenas o mecanismo futuro de recovery/watchdog, caso seja necessario.


## Atualizacao 2026-09-30 - check-ins e esclarecimentos

### RESOLVIDO TECNICAMENTE

- formula e unidade vigentes para novas metas: 35 mL/kg/dia;
- esse valor passa a ser template inicial versionado e nao constante profissional definitiva;
- persistencia da meta como snapshot, sem sobrescrever historico;
- ingestao e atividade fisica com eventos append-only;
- resposta a esclarecimento nao resolve automaticamente;
- resolucao manual da Patty possui registro separado e auditavel.

### AINDA ABERTO

- eventual proporcao-alvo de agua pura;
- canal de notificacao para o lembrete de 24 horas;
- a cliente pode corrigir os proprios check-ins sem limite temporal profissional; permanecem abertas a correcao pela Patty e a forma tecnica auditavel;
- nenhum desses pontos abertos autoriza score de adesao ou notificacao por canal inferido.


## Atualizacao 2026-09-30 - correcao de Avaliacao

### RESOLVIDO PARA VALOR/UNIDADE DE MEDIDA

Erro de lancamento em valor/unidade de medida de uma avaliacao finalizada agora possui mecanismo auditavel append-only. O valor original e preservado e a correcao mais recente e usada como valor vigente.

### AINDA ABERTO SOMENTE SE HOUVER NECESSIDADE REAL

- correcao historica de chave/nome da medida;
- alteracao historica da data ou tipo da avaliacao;
- correcao de vinculo de foto depois da finalizacao.

Nao ampliar o mecanismo sem caso profissional confirmado.


## Atualizacao 2026-10-03 - Feedback Semanal

### RESOLVIDO TECNICAMENTE

- dominio separado dos check-ins diarios;
- versao v1 publicada com as 21 perguntas da fonte operacional atual;
- solicitacao client-scoped por periodo;
- prazo opcional;
- rascunho da cliente;
- envio final validado e imutavel;
- historico administrativo e da cliente;
- RLS ownership/assignment + AAL2;
- sem score automatico, sem alteracao automatica de protocolo e sem suspensao automatica de atendimento.

### AINDA ABERTO

- dia e horario padrao da agenda automatica;
- se o prazo historico de quarta-feira apenas marca atraso ou fecha alguma acao;
- marco exato de elegibilidade para iniciar Feedback Semanal;
- significado tecnico de "recebeu protocolo" para elegibilidade;
- politica de lembretes;
- canal inicial: email, WhatsApp, ambos ou preferencia por cliente;
- eventual consentimento/opt-in e provedor de WhatsApp;
- se perguntas relativamente estaveis, como local de trabalho/treino, permanecem semanais;
- se a Patty deseja revisao/observacao formal por feedback antes de qualquer uso posterior;
- consequencia profissional de nao responder continua humana ate nova confirmacao explicita.


### PARCIALMENTE RESOLVIDO — CARB CYCLE COMO 2 LOW / 1 HIGH

A Patty confirmou que Carb Cycle corresponde a etapa de 2 dias Low Carb para 1 dia High Carb.

A planilha historica informada fica em `Corpo e Mente passo a passo / Alimentacao / Planilha Carb Cycle` e recebe o peso da cliente para realizar os calculos.

Continuam abertos apenas os pontos que dependem da leitura/reconciliacao da planilha:
- formulas exatas por faixa/fase;
- mapeamento de cada coluna/linha para o protocolo;
- regras das fases pouco usadas que ainda nao estejam documentadas.

Nao inferir formula fora da planilha nem transformar exemplo individual em template global sem reconciliacao.


### RESOLVIDO - ESTRUTURA DO CUTTING 3

A Patty confirmou que o Cutting 3 repete:

- Linear;
- Dia 1 / Dia 2;
- Carb Cycle 2 Low / 1 High.

No Carb Cycle do Cutting 3, usar Fase 3 / faixa vermelha da tabela central.
