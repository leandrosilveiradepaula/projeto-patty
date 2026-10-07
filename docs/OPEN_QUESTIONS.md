## Ciclo de conta x ciclo de acompanhamento (auditoria 2026-10-07)

Fatos confirmados no runtime:
- encerrar o ultimo assignment ativo marca `clients.status = inactive` e preserva a conta e o historico;
- iniciar/reiniciar assignment marca a cliente como `active`;
- recuperacao assistida pode gerar link individual sem alterar a senha diretamente.

Questoes de produto ainda abertas e que nao devem ser inferidas:
- expiracao/reenvio operacional de convite;
- encerramento/desativacao da conta Auth quando houver motivo independente do acompanhamento;
- politica de reengajamento/campanhas para clientes inativas e sua base de autorizacao/privacidade.

Importante: cliente inativa nao equivale a conta Auth desativada. Nao apagar identidade, perfil ou historico ao encerrar acompanhamento.

Boundary adicional:
- o parser de convite do frontend apenas reconhece tokens do tipo `invite`; isso e suporte tecnico ao fluxo, nao politica de expiracao/reenvio;
- reengajamento nao autoriza listar dados clinicos/sensiveis de clientes inativas fora das regras atuais de RLS;
- eventual campanha futura precisa definir base legal/consentimento, canal, escopo minimo de dados e autorizacao de leitura antes de qualquer implementacao.

## Conteudos - semantica de progresso (aberto em 2026-10-07)

A tabela `client_content_progress` ja existe com `first_opened_at` e `completed_at`, mas o produto ainda nao definiu quem deve registrar esses fatos.

Questoes abertas:
- abrir um asset pelo portal deve registrar automaticamente `first_opened_at`, ou abertura deve continuar sem rastreamento ate consentimento/definicao explicita?
- `completed_at` deve ser marcado pela propria cliente, pela Patty ou por outro evento verificavel?
- para video/PDF, "concluido" significa declaracao da cliente ou algum criterio tecnico? Nao inferir consumo completo a partir de download/abertura.

Ate confirmacao, nao escrever progresso automaticamente. O schema pode continuar preservado sem ser usado como telemetria implicita.

## NOVAS QUESTOES ABERTAS — CLIENTES INATIVAS / REENGAJAMENTO

A Patty confirmou em 2026-10-07 que clientes devem ser identificadas como ativas ou inativas e que o historico de inativas deve ser preservado para possibilitar reengajamento futuro.

Continuam abertas antes de implementar campanhas:
- qual base legal/consentimento sera exigida para contato de reengajamento;
- quais canais poderao ser usados;
- quais dados minimos de cliente inativa a Patty podera consultar sem assignment ativo;
- qual autorizacao client-scoped substituira, se necessario, o assignment ativo para esse uso limitado;
- como sera modelada a reativacao sem apagar o historico do acompanhamento anterior.

A existencia de `inactive` nao autoriza relaxar RLS nem consultar dados clinicos/sensiveis de ex-clientes fora de uma regra de acesso documentada.

## RECONCILIACAO VIGENTE — 2026-10-07

Permanecem explicitamente abertas:

- qualquer etapa posterior a `Cutting 2: 2 Low / 1 High`;
- Cutting 3 e seu eventual detalhamento;
- Bulking detalhado;
- Consolidacao;
- hidratacao como regra profissional automatica;
- Fases 5 e 6 do Carb Cycle;
- criterios finais de progressao/treino ainda nao formalizados.

Trechos historicos abaixo que marquem esses pontos como resolvidos devem ser lidos como superados por esta reconciliacao.

O modelo versionado de treino por cliente foi mergeado no `master` pelo PR #445. Portanto, a selecao individual de exercicios e a publicacao do treino deixaram de ser pendencia de implementacao basica; progressao e regras profissionais de treino continuam abertas.

### PARCIALMENTE RESOLVIDO - PROGRESSAO DO PROTOCOLO

## RESOLVIDO EM 2026-10-06 - exposicao da biblioteca de exercicios

A Patty confirmou que a biblioteca global e o catalogo profissional de exercicios e que cada cliente deve visualizar somente o conjunto de exercicios escolhido para o treino individual dela.

A exposicao global da biblioteca para clientes fica superada. O modelo versionado de treino por cliente, com selecao de exercicios pela Patty, foi mergeado no master pelo PR #445. Nao e questao profissional aberta.


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

O sistema atual usara o Gmail pessoal da Patty via Custom SMTP do Supabase Auth. A escolha de infraestrutura do email real de convite esta resolvida.

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

### QUESTAO ABERTA FUTURA

Se futuramente forem introduzidos assistentes, profissionais parceiros ou suporte operacional, quais papeis e permissoes client-scoped serao necessarios?

## Arquitetura e automacoes

## Modelo de dados

### PARCIALMENTE RESOLVIDO

Na Anamnese, todos os campos aplicaveis ao preenchimento final sao obrigatorios. O mapa nao juridico da v1, tipos, ordem e as 10 regras de aplicabilidade estao definidos. ANAM-046 tambem foi resolvido para o MVP como checkbox obrigatorio versionado no envio final.

### PARCIALMENTE RESOLVIDO

O catalogo e as unidades das medidas da Avaliacao Completa foram confirmados pela Patty em 2026-09-27. Permanecem abertas as definicoes de campos/obrigatoriedade que nao foram cobertas por essa resposta, especialmente para exames, protocolos e outros fluxos ainda nao formalizados.

### QUESTAO ABERTA

Qual sera a politica geral de retencao, arquivamento e exportacao de dados fora das decisoes ja confirmadas para preservacao do historico de IA?

### QUESTAO ABERTA TECNICA

`profiles.status` existe desde a fundacao de identidade, mas nao deve ser usado para representar acompanhamento. Os valores/semantica desse campo ainda nao estao definidos e nenhuma automacao deve depender dele.

### RESOLVIDO EM 2026-10-07

`clients.status` e a fonte do estado profissional de acompanhamento: `active` para cliente em acompanhamento e `inactive` para cliente sem acompanhamento atual, preservando historico. O banco sincroniza esse estado a partir dos assignments ativos.

### QUESTAO ABERTA

Quais campos adicionais, se houver, devem ser incorporados futuramente ao `client_registration` alem de Cidade, Telefone, Email de contato e Instagram? O fluxo atual edita somente esses quatro campos ja existentes.

### FATO RESOLVIDO

 a cliente atualiza Cidade, Telefone, Email de contato e Instagram em `/cliente/perfil`, sem alterar Auth ou Anamnese historica.

### FATO RESOLVIDO

 a propria cliente pode atualizar seus quatro campos atuais; Patty/admin pode atualizar os mesmos campos somente para cliente acessivel por assignment ativo e sessao administrativa AAL2.

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

### FATO RESOLVIDO

 email de autenticacao e email de contato permanecem independentes; editar Cadastro Atual nao altera o email de login e nao existe sincronizacao bidirecional automatica.

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

### RESOLVIDO PARA AGENDA E CORRECAO DE MEDIDAS

- **Avaliacao Completa** substitui o nome historico "mensal";
- **Avaliacao Basica** substitui o nome historico "quinzenal";
- a Avaliacao Completa nao fica presa ao mesmo dia numerico do mes;
- a preferencia profissional vigente e posiciona-la, quando possivel, proxima de sexta-feira ou sabado;
- essa preferencia nao bloqueia outras datas;
- a Avaliacao Basica permanece aproximadamente no meio do intervalo entre duas Avaliacoes Completas;
- datas de inicio 29/30/31 nao exigem regra especial de ultimo dia do mes;
- a preferencia de dias da Avaliacao Completa e versionada/configuravel;
- nenhum agendamento automatico de Avaliacao foi autorizado.

O catalogo da Avaliacao Completa e as unidades estao confirmados em BUSINESS_RULES.md.

A correcao de medida finalizada esta resolvida tecnicamente por assessment_measurement_corrections, preservando o lancamento original e tornando a correcao mais recente o valor factual vigente.

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

### RESOLVIDO EM 2026-10-04 — ENCERRAMENTO DO ACOMPANHAMENTO

Nao existe criterio unico automatico para encerrar o acompanhamento.

A decisao e manual e contextual. Na pratica relatada pela Patty, o acompanhamento geralmente termina quando a propria paciente entende/decide que nao precisa mais continuar.

Nao usar resultado, adesao, tempo, fase ou meta isolada como gatilho automatico de encerramento.



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

### HISTORICO SUPERADO — ETAPAS POSTERIORES AO CUTTING 2

A Patty confirmou em 2026-10-04 a sequencia de alto nivel:
- Cutting 2;
- Up Metabolico;
- Cutting 3;
- Up Metabolico.

Tambem confirmou que, quando ha objetivo de ganho de massa muscular, pode existir Bulking seguido de Consolidacao Metabolica antes do retorno ao Cutting.

Continuam abertos:
- formulas, duracao e criterios de entrada/saida do Bulking;
- formulas, duracao e criterios de entrada/saida da Consolidacao Metabolica;
- criterio/quantidade exata do aumento de carboidrato em cada ocorrencia do Up Metabolico, caso futuramente seja formalizado;
- pareamento completo entre fases numeradas da planilha e etapas concretas do protocolo.

Resolvido em 2026-10-04: os Ups Metabolicos nao precisam repetir duracao nem quantidade de refeicoes livres. Esses parametros variam por periodo/cliente conforme resultado e decisao profissional.

A progressao continua sendo decisao profissional baseada em resultados. Nao automatizar mudanca de fase sem regra deterministica confirmada.

### REGISTRO HISTORICO — BULKING E CONSOLIDACAO METABOLICA

> Este bloco preserva respostas de 2026-10-04 para rastreabilidade. A reconciliacao vigente de 2026-10-07 nao autoriza usar Cutting 3, Bulking ou Consolidacao como sequencia automatica atual.

A Patty confirmou que Bulking e usado quando o paciente deseja trabalhar ganho de massa muscular.

Entre o Bulking e a volta ao Cutting, a Patty utiliza Consolidacao Metabolica para trabalhar/preservar o ganho de massa muscular e retirar somente o excesso adicional de gordura e retencao liquida.

Resolvido em 2026-10-04:
- Bulking nao possui duracao geral predefinida; Patty decide manualmente;
- Consolidacao termina quando a Patty considera o ganho muscular preservado e a paciente pronta para voltar ao Cutting;
- nenhum threshold automatico de tempo, peso ou medida foi confirmado.

Nao automatizar Bulking ou Consolidacao alem das regras explicitamente confirmadas.

### RECONCILIADO EM 2026-10-07 — HIDRATACAO/CHECK-IN DE LIQUIDOS

As referencias de 2026-10-04 a 35 mL/kg e composicao 70/30 ficam preservadas somente como historico de decisao. A reconciliacao profissional mais recente prevalece: **nao existe regra automatica vigente de hidratacao**.

Estado atual:
- check-ins de liquidos permanecem registros factuais;
- cliente e Patty podem corrigir registros com auditoria append-only;
- nenhuma avaliacao gera meta automaticamente;
- nenhuma tela deve mostrar progresso percentual contra meta automatica;
- 35 mL/kg, 60 mL/kg e 70/30 nao autorizam calculo, recalculo ou lembrete automatico;
- snapshots/configuracoes historicos permanecem preservados para auditoria/compatibilidade.

Continua aberta somente uma eventual nova regra profissional de hidratacao e, se ela vier a ser confirmada/documentada, seus parametros e lembretes correspondentes.

### RESOLVIDO EM 2026-10-04 — SUPLEMENTACAO E MANIPULADOS

Suplementacao e manipulados sao definidos manualmente pela Patty, caso a caso.

Nao existe regra geral automatica, template obrigatorio ou sugestao automatica da IA autorizada neste momento. O produto precisa permitir registro/edicao manual e preservar o historico publicado.

### PARCIALMENTE RESOLVIDO — TREINO

A solicitacao de treino pela cliente possui registro estruturado append-only e nao autoriza geracao automatica.

Confirmado em 2026-10-04:
- existe estrutura inicial padrao;
- progressao posterior e manual conforme treino, evolucao e paciente;
- cada exercicio precisa de exercicio, series e repeticoes;
- tempo de descanso e observacoes/orientacoes de execucao podem ser incluidos;
- carga/peso e definida pela capacidade da paciente, nao como valor fixo prescrito pela Patty.

Detalhes adicionais de intensidade, cardio, excecoes e eventual cancelamento da solicitacao podem ser definidos futuramente, mas nao bloqueiam a estrutura inicial do produto.

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

### RESOLVIDO PARA AUTOMACAO — SUPLEMENTACAO/MANIPULADOS

Os exemplos historicos de suplementos/manipulados continuam sendo apenas exemplos individuais.

A Patty confirmou em 2026-10-04 que define suplementacao e manipulados manualmente, caso a caso. Portanto, criterios gerais de elegibilidade, dose, forma, duracao, contraindicacoes e interacoes nao precisam ser inferidos nem automatizados para viabilizar o produto.

Se futuramente a Patty quiser transformar alguma pratica em template/regra reutilizavel, sera necessaria nova confirmacao e versionamento.

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

### FATO RESOLVIDO

 a cliente cria/atualiza o proprio Cadastro Atual pela area de Perfil; Patty/admin cria/atualiza pela tela da cliente sob assignment ativo + AAL2. A persistencia usa boundary server-side privilegiada e o browser continua sem INSERT/UPDATE direto em `client_registration`.

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

### RESOLVIDO TECNICAMENTE

O processo de autoria da biblioteca educacional ja e versionado: Patty/admin cria rascunho, edita enquanto draft, publica manualmente uma versao imutavel e pode criar nova versao posteriormente. A liberacao para cliente aponta para versao publicada exata e continua sendo acao separada/manual.

Permanece aberta apenas a governanca editorial adicional que a Patty eventualmente queira definir; nao tratar o lifecycle tecnico de revisao/publicacao como ausente.

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

Resolvido tecnicamente:
- o Blob store privado foi criado/conectado ao projeto Vercel;
- a UI administrativa ja mostra o estado de assets e permite registrar metadados verificados em versao draft;
- registro exige path privado opaco, MIME, byte size e SHA-256, sem expor token ou URL publica.

Ainda falta operacionalmente:
- migrar o arquivo original aprovado;
- conferir tamanho, MIME e SHA-256 contra a origem;
- registrar o asset verificado na versao draft;
- revisar/publicar/liberar explicitamente.

### QUESTAO ABERTA

Como ocorrera a migracao fisica dos demais arquivos do Google Drive, incluindo referencias de origem internas, lotes, direitos e revisao individual?

### PARCIALMENTE RESOLVIDO

A biblioteca de exercicios ja expoe para clientes autenticadas somente versoes publicadas. A autoria administrativa e versionada, e publicar um exercicio global nao o prescreve para uma cliente.

A prescricao individual tambem ja possui lifecycle versionado e publicacao humana. Permanecem abertas somente taxonomia/campos adicionais e regras profissionais de progressao, carga, volume, cardio ou outros criterios ainda nao formalizados.

## Protocolos e equivalentes

### PARCIALMENTE RESOLVIDO

A Patty confirmou que o protocolo/acompanhamento precisa permitir edicao manual de fase, macros, numero de refeicoes, distribuicao de doses, alimentos/equivalentes, Low/High, refeicao livre, observacoes, data de inicio, orientacoes, treino quando solicitado, suplementacao e manipulados.

Pela decisao de parametrizacao de 2026-09-30, esses ajustes devem ser representados como configuracao/override profissional versionado, preservando origem e snapshot, e nao como sobrescrita silenciosa de um calculo anterior.

Quando houver regra previamente confirmada, documentada e cadastrada como configuracao ativa, o motor deterministico pode montar rascunhos automaticamente para revisao da Patty, inclusive macros da fase e treino predefinido aplicavel. A IA nao cria nem escolhe formulas profissionais por raciocinio generativo.

Treino ja possui autoria/prescricao individual versionada e campos operacionais iniciais. Continuam abertas somente as regras profissionais de progressao, carga, volume, cardio e campos adicionais que ainda nao estiverem formalizados. Suplementacao e manipulados permanecem manuais caso a caso, sem formulas automaticas autorizadas.

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

A Patty confirmou que o produto deve prever check-ins para:
- registrar liquidos consumidos ao longo do dia;
- realizar check-in diario de atividade fisica com registro "fez / nao fez", independente do treino prescrito;
- preservar historico e auditoria dos registros;
- permitir que a cliente corrija os proprios registros anteriores sem limite temporal profissional definido;
- permitir que a Patty corrija registros da cliente, preservando auditoria.

A regra profissional automatica de hidratacao permanece aberta. Portanto, valores historicos como 35 mL/kg, 60 mL/kg, composicao 70/30, metas automaticas, progresso contra meta e recalculo automatico nao devem ser tratados como regra vigente.

Permanece aberto:
- eventual regra profissional futura de hidratacao;
- horarios/cadencia de lembretes caso sejam reativados a partir de regra confirmada;
- detalhes tecnicos adicionais de notificacao quando necessarios.

A correcao auditavel de check-ins deixou de ser questao aberta: a persistencia append-only foi aplicada e o fluxo operacional de cliente e Patty foi integrado ao runtime em 2026-10-07.

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

### PENDENCIA OPERACIONAL — PRIMEIRO LOTE NO VERCEL PRIVATE BLOB

O primeiro lote controlado de midia esta definido em `docs/educational_media_migration_batch_1.json` e cobre somente o video aprovado da balanca.

O Vercel Private Blob store ja foi criado/conectado ao projeto. A interface administrativa tambem ja suporta visualizar e registrar os metadados de um asset privado verificado.

Ainda falta executar a migracao fisica do primeiro arquivo. A integracao disponivel nesta sessao nao expoe operacao de Storage/Blob, portanto o upload nao deve ser tratado como executado.

A ordem continua deterministica:
1. copiar o arquivo original aprovado para o path privado previsto;
2. conferir tamanho, MIME e SHA-256 contra a origem;
3. registrar o asset na versao draft;
4. revisar e publicar a versao;
5. liberar explicitamente para clientes quando apropriado.

Manter os demais arquivos do Drive fora deste lote ate revisao individual e direitos/licenciamento aplicaveis.

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

### HISTORICO SUPERADO / RECONCILIADO EM 2026-10-07

A infraestrutura historica chegou a materializar 35 mL/kg como configuracao/snapshot, mas essa referencia nao e regra profissional automatica vigente. A reconciliacao posterior prevalece: check-ins de liquidos e atividade fisica sao registros factuais, sem meta/progresso/recalculo automatico de hidratacao ate nova confirmacao documentada.

Resolvido tecnicamente:
- ingestao e atividade fisica com eventos append-only;
- cliente e Patty podem corrigir check-ins com auditoria preservada;
- resposta a esclarecimento nao resolve automaticamente;
- resolucao manual da Patty possui registro separado e auditavel.

Ainda aberto:
- eventual regra profissional futura de hidratacao;
- canal de notificacao para o lembrete de 24 horas de esclarecimentos;
- nenhum ponto aberto autoriza score de adesao ou notificacao por canal inferido.


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

### ESTADO RECONCILIADO

Resolvido:
- agenda profissional toda segunda-feira, independentemente da fase;
- template inicial 08:00, com dia/horario configuraveis e versionados;
- elegibilidade somente depois do primeiro protocolo publicado;
- periodo automatico = semana anterior completa, de segunda a domingo;
- lembrete na quarta-feira para quem ainda nao respondeu;
- canal configuravel por cliente entre email, WhatsApp e notificacao no aplicativo;
- geracao recorrente, origem auditavel e idempotencia implementadas;
- notificacao in-app operacional;
- worker de email implementado, dependendo apenas da configuracao SMTP operacional.

Ainda aberto:
- quarta-feira nao e prazo fatal nem fechamento automatico; qualquer consequencia profissional de ausencia permanece humana;
- provedor, opt-in/consentimento e fallback do WhatsApp;
- eventual horario profissional especifico do lembrete, se a Patty quiser formaliza-lo;
- se perguntas relativamente estaveis permanecem semanais;
- se a Patty deseja revisao/observacao formal por feedback antes de qualquer uso posterior.


### PARCIALMENTE RESOLVIDO — CARB CYCLE COMO 2 LOW / 1 HIGH

A Patty confirmou que Carb Cycle corresponde a etapa de 2 dias Low Carb para 1 dia High Carb.

A planilha historica informada fica em `Corpo e Mente passo a passo / Alimentacao / Planilha Carb Cycle` e recebe o peso da cliente para realizar os calculos.

Continuam abertos apenas os pontos que dependem da leitura/reconciliacao da planilha:
- formulas exatas por faixa/fase;
- mapeamento de cada coluna/linha para o protocolo;
- regras das fases pouco usadas que ainda nao estejam documentadas.

Nao inferir formula fora da planilha nem transformar exemplo individual em template global sem reconciliacao.


### REGISTRO HISTORICO — ESTRUTURA DO CUTTING 3

> Preservado somente como historico. Nao usar para implementar etapa posterior ao Cutting 2 sem nova confirmacao documentada da Patty.

A Patty confirmou que o Cutting 3 repete:

- Linear;
- Dia 1 / Dia 2;
- Carb Cycle 2 Low / 1 High.

No Carb Cycle do Cutting 3, usar Fase 3 / faixa vermelha da tabela central.


Transicao Bulking -> Consolidacao: criterios profissionais confirmados em 2026-10-04 como combinacao de ganho muscular, gordura/retencao, objetivo e avaliacao da Patty. Permanecem abertas as regras internas da Consolidacao e seu criterio de encerramento.


Na Consolidacao, a Patty confirmou reducao manual e gradual das doses. Permanece aberto apenas se algum dia houver interesse em formalizar um criterio/ritmo exato das reducoes graduais; ate la, os ajustes sao profissionais e caso a caso.


Resolvido em 2026-10-04: o retorno pos-Consolidacao reinicia pelo Cutting 1 desde o Linear, seguindo depois Dia 1/Dia 2 e Carb Cycle 2 Low/1 High.


### RESOLVIDO EM 2026-10-05 — PERIODO DO FEEDBACK SEMANAL

A solicitacao automatica representa a semana anterior completa, de segunda-feira a domingo.

Exemplo confirmado para operacionalizacao:
- geracao em segunda-feira 05/10/2026;
- `period_start = 28/09/2026`;
- `period_end = 04/10/2026`.

Essa definicao remove o bloqueio profissional da geracao automatica semanal.


### PARCIALMENTE RESOLVIDO — CANAIS DO FEEDBACK SEMANAL

Resolvido:
- canal e configuravel por cliente;
- opcoes: email, WhatsApp e notificacao dentro do app;
- preferencia e versionada e auditavel;
- notificacao in-app esta operacional;
- bloqueios de canal/contato/provedor aparecem como pendencia profissional;
- quarta-feira e o dia confirmado do lembrete.

Ainda aberto:
- provedor tecnico de WhatsApp;
- requisitos de consentimento/opt-in e fallback para WhatsApp;
- ativacao efetiva do envio por email;
- eventual horario profissional especifico do lembrete, caso a Patty queira definir um no futuro.

Ate essas decisoes, email/WhatsApp nunca devem ser marcados como enviados automaticamente.


### PARCIALMENTE RESOLVIDO — ENVIO REAL POR EMAIL DO FEEDBACK SEMANAL

Resolvido tecnicamente:
- worker server-side dedicado;
- Gmail SMTP como provider de baixo volume do MVP;
- fila, lease, tentativa, falha, retry limitado e entrega auditavel;
- separacao do Custom SMTP do Supabase Auth;
- cron protegido por `CRON_SECRET`;
- cliente nao acessa logs internos de transporte.

Ainda pendente de configuracao operacional:
- cadastrar na Vercel o Gmail da Patty;
- cadastrar App Password exclusiva do worker;
- publicar o master correspondente;
- validar envio/recebimento com conta sintetica.

WhatsApp continua separado e sem provider escolhido.


### PENDENCIA OPERACIONAL EXPLICITA — UPLOAD DO PRIMEIRO VIDEO EDUCACIONAL

Registrado em 2026-10-05 para retomada quando houver acesso operacional adequado ao Vercel Blob.

Estado:
- o arquivo aprovado da balanca ja foi baixado e revalidado;
- tamanho e SHA-256 esperados estao registrados no manifesto;
- o Vercel Private Blob store esta criado e conectado;
- o boundary de acesso privado da cliente esta implementado;
- o binario ainda nao foi fisicamente enviado ao Blob.

Retomada obrigatoria:
1. enviar o arquivo aprovado para o path privado previsto;
2. verificar objeto, tamanho, MIME e SHA-256;
3. somente depois registrar o asset no Supabase;
4. submeter a revisao humana;
5. publicar explicitamente;
6. liberar explicitamente para cliente quando apropriado.

Nao bloquear as demais frentes do projeto por esta pendencia e nao marcar upload, asset, publicacao ou release como concluidos antes da verificacao real.
