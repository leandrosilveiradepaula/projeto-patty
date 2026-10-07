## Cadastro e lifecycle da cliente

### REGRA CONFIRMADA

Nome da cliente e obrigatorio. Um novo cadastro profissional nao pode ser concluido sem nome valido. No dominio profissional, `clients.full_name` e a fonte canonica do nome da cliente; `profiles.display_name` permanece ligado a identidade/perfil e pode existir como compatibilidade de apresentacao, mas nao substitui o campo obrigatorio de `Client`.

### REGRA CONFIRMADA

Cada cliente possui estado profissional:
- `active`: esta em acompanhamento;
- `inactive`: ja esteve em acompanhamento e atualmente nao esta em processo ativo.

Encerrar acompanhamento nao apaga historico.

Status profissional da cliente nao e equivalente a login, conta Auth, sessao ou assignment.

### FUTURO REENGAJAMENTO

Clientes inativas devem permanecer preservadas para permitir, no futuro, fluxos de reengajamento/campanhas. Isso nao confirma envio automatico nem regras de consentimento, canal, segmentacao ou acesso a dados sensiveis.

## REGRA VIGENTE — RECONCILIACAO 2026-10-07

Para automacao e produto, a sequencia confirmada do metodo termina em:

```text
Reconhecimento Metabolico
-> Cutting 1 Dia 1 / Dia 2
-> Cutting 1: 2 Low / 1 High
-> Up Metabolico
-> Cutting 2 Linear
-> Cutting 2 Dia 1 / Dia 2
-> Cutting 2: 2 Low / 1 High
```

Nao inferir etapas posteriores. Cutting 3, Bulking detalhado, Consolidacao e qualquer etapa posterior ao Cutting 2 permanecem pendentes.

Hidratacao tambem permanece aberta para regra profissional automatica. Templates tecnicos ou valores historicos existentes nao equivalem a regra profissional confirmada.

Quando houver conflito com trechos historicos abaixo, esta reconciliacao mais recente prevalece.

## Biblioteca de exercicios e treino individual

### REGRA CONFIRMADA

A biblioteca de exercicios e o catalogo global mantido pela Patty com os exercicios disponiveis para composicao dos treinos.

Cada cliente recebe somente o conjunto de exercicios que a Patty selecionar para o treino daquela cliente. Clientes diferentes podem receber conjuntos diferentes, e a Patty pode variar manualmente os exercicios ao longo do acompanhamento.

Publicar um exercicio na biblioteca nao equivale a prescreve-lo nem a libera-lo para todas as clientes.

A cliente deve visualizar somente os exercicios pertencentes ao treino que foi selecionado, revisado e publicado para ela.

A selecao e a alteracao de exercicios sao decisoes profissionais da Patty. Nao criar selecao, troca ou progressao automatica sem regra previamente confirmada, documentada e configurada.

# Regras de Negocio

## Regras confirmadas

### DECISAO CONFIRMADA

Cada cliente tera conta propria.

O cliente so acessa os proprios dados.

A Patty/admin acessa clientes sob sua responsabilidade.

A IA sera assistiva.

A IA nao publica protocolos automaticamente.

A Patty sempre revisara e aprovara protocolos antes da publicacao.

Preservar historico.

Nao sobrescrever versoes antigas.

Registrar auditoria de acoes criticas.

Nao usar dados reais no desenvolvimento inicial.

## Anamnese

### DECISAO CONFIRMADA

Todos os campos da Anamnese sao obrigatorios para o envio final.

A cliente pode interromper o preenchimento antes do envio final e continuar depois a partir de um rascunho salvo. Um rascunho incompleto nao e uma Anamnese submetida.

Depois do envio final, a cliente nao pode alterar as respostas. Somente a Patty pode registrar uma correcao posterior.

A correcao nao apaga nem sobrescreve a resposta originalmente enviada. Devem ser preservados separadamente o valor original, a correcao da Patty, o ator e o momento da correcao.

## Esclarecimentos pos-Anamnese

### DECISAO CONFIRMADA

Quando a Patty solicitar um esclarecimento a cliente:

- a resposta da cliente **nao resolve automaticamente** o pedido;
- a Patty precisa ler a resposta e marcar manualmente o esclarecimento como **resolvido**;
- se ainda houver duvida, a Patty pode fazer novo questionamento;
- nao existe prazo de expiracao para a cliente responder;
- enquanto o esclarecimento estiver aguardando resposta da cliente, o sistema deve enviar um **lembrete a cada 24 horas** solicitando a resposta.

O canal tecnico da notificacao ainda precisa ser definido. Nao inferir email, push, WhatsApp ou outro canal sem decisao de produto.

O historico de pedidos e respostas deve permanecer preservado; novo questionamento nao deve sobrescrever a pergunta ou resposta anterior.

## Fluxo futuro de IA

### DECISAO CONFIRMADA

O fluxo futuro previsto para IA e:

1. dados do cliente;
2. validacao;
3. analise;
4. pendencias/alertas;
5. rascunho;
6. revisao da Patty;
7. ajustes;
8. aprovacao;
9. publicacao.

O sistema deve preservar:

- resposta original;
- interpretacao da IA;
- alteracoes da Patty;
- versao aprovada;
- historico das versoes.

## Revisao humana dos achados de IA

### DECISAO CONFIRMADA

Um achado gerado pela IA permanece **interno** ate decisao explicita da Patty.

A Patty pode:
- aceitar o achado como uma observacao interna;
- transformar o achado em uma anotacao propria/profissional.

Esses atos nao autorizam comunicacao automatica com a cliente.

Nenhuma resposta, orientacao, mensagem, observacao ou outro conteudo originado da IA pode ser enviado, publicado ou exibido para a cliente sem **aprovacao explicita previa da Patty**.

Preservar separadamente:
- output original da IA;
- observacao interna aceita;
- anotacao criada/editada pela Patty;
- eventual conteudo aprovado para comunicacao a cliente;
- evento de aprovacao/publicacao.

Nao sobrescrever o output original da IA quando a Patty criar sua propria anotacao.

## Metodo da Patty - regras confirmadas

### DECISAO CONFIRMADA

Todo acompanhamento comeca pelo Reconhecimento Metabolico, que e o protocolo linear inicial.

A sequencia atualmente confirmada do fluxo principal termina em:

```text
Reconhecimento Metabolico
-> Cutting 1 Dia 1 / Dia 2
-> Cutting 1: 2 Low / 1 High
-> Up Metabolico
-> Cutting 2 Linear
-> Cutting 2 Dia 1 / Dia 2
-> Cutting 2: 2 Low / 1 High
```

A progressao e passo a passo e depende dos resultados observados pela Patty. Nao existe promocao automatica de fase apenas por tempo.

Etapas posteriores ao Cutting 2 permanecem abertas. Referencias historicas a Cutting 3, Bulking ou Consolidacao nao autorizam automacao nem definem a sequencia vigente.

### DECISAO CONFIRMADA

O Reconhecimento Metabolico pode ser reutilizado quando houver baixa adesao, dificuldade de execucao ou retorno apos afastamento.

A progressao do protocolo segue a sequencia profissional confirmada e **nao e automatica**.

A adesao e um gate central para avancar para a etapa seguinte:
- quando a cliente esta conseguindo aderir ao protocolo e a evolucao permite continuidade, a Patty pode seguir a sequencia;
- quando a cliente nao esta aderindo adequadamente, a progressao deve ser interrompida para revisao profissional.

### LEITURA PROFISSIONAL DE RESULTADO

A Patty confirmou que, para a decisao de continuidade, **qualquer resultado e valido quando ha mudanca nos indicadores numericos e essa evolucao nao esta indo contra o objetivo que a propria cliente buscou**.

O resultado nao e considerado valido quando:
- a evolucao esta indo contra o objetivo buscado pela cliente; ou
- os numeros, no geral, permanecem estagnados.

Quando o resultado nao e considerado valido, a progressao deve parar para decisao manual da Patty sobre os proximos passos.

### INDICADORES DE EVOLUCAO CONFIRMADOS

Para objetivo de emagrecimento/reducao de gordura, a Patty confirmou como referencias fortes:
- reducao de cintura;
- reducao de abdomen;
- reducao de busto/peito como referencia adicional relevante;
- comparacao visual positiva entre fotos de antes e depois.

A reducao de cintura e abdomen e considerada resultado positivo pela Patty.

O peso isolado na balanca **nao determina ausencia de evolucao**. A cliente pode manter o mesmo peso e ainda assim ser considerada em evolucao quando as medidas e/ou o visual melhoram.

Na leitura profissional da Patty, a possibilidade de alteracao de composicao corporal faz com que medidas e fotos tenham mais peso do que a balanca isoladamente.

Essa regra profissional **nao define um algoritmo automatico de estagnacao ou sucesso**. Continuam abertos:
- qual janela de tempo deve ser usada para considerar estagnacao;
- qual variacao em centimetros conta como mudanca real em vez de ruido de medicao;
- como tratar indicadores que se movem em direcoes diferentes alem dos casos agora confirmados;
- criterios especificos para objetivos diferentes de emagrecimento/reducao de gordura.

Nao inferir automaticamente a causa de ausencia de resultado. Resultado nao valido nao deve ser tratado pelo sistema como prova de baixa adesao.

Nao criar score automatico de adesao, regra automatica de estagnacao ou mudanca automatica de fase.

### CUTTING 2 - RELACAO COM O CUTTING 1

Depois do Up Metabolico, o Cutting 2 reinicia a mesma estrutura de progressao ja confirmada:
- Cutting 2 Linear;
- Cutting 2 Dia 1 / Dia 2;
- Cutting 2: 2 Low / 1 High.

A Patty confirmou que o Cutting 2 trabalha com **menos doses de macros** em relacao ao ciclo anterior. A quantidade exata de reducao, quais macros sao reduzidos em cada transicao e as formulas correspondentes ainda precisam ser formalizadas antes de qualquer calculo automatico.

A etapa posterior a `Cutting 2: 2 Low / 1 High` permanece aberta. Nao promover exemplos, planilhas historicas ou nomenclaturas antigas a uma nova etapa sem confirmacao documentada da Patty.

Nao criar score automatico de adesao.

## Refeicoes e jejum

### DECISAO CONFIRMADA

Nao existe numero fixo de refeicoes. A quantidade e adaptada a rotina e preferencia da cliente, com foco em adesao.

Horarios individuais nao constituem regra geral; o importante e cumprir a meta diaria.

No jejum intermitente explicado pela Patty:

- normalmente sao usadas 3 refeicoes;
- a ultima refeicao ocorre ate 12 horas apos a primeira;
- os horarios internos permanecem flexiveis.

## Macros e doses

### DECISAO CONFIRMADA

Referencia inicial geral do Reconhecimento Metabolico:

- proteina: 2 g/kg;
- carboidrato: 2 g/kg;
- gordura: 50 g/dia como referencia.

Esses valores podem ser individualizados.

Conversoes confirmadas:

- 1 dose de proteina = 15 g;
- 1 dose de carboidrato = 12 g;
- 1 dose de gordura = 6 g.

Doses podem ser fracionadas pela cliente.

Parte das doses inicialmente associadas ao carboidrato pode ser redistribuida para gordura.

### LEGUMES NA CONTAGEM DE CARBOIDRATO

### DECISAO CONFIRMADA

Para efeito da contagem total do protocolo:

- **2 doses de legumes contabilizam 1 dose de carboidrato**.

Exemplo confirmado pela Patty para uma cliente com 6 doses totais de carboidrato:
- almoco: 2 doses de legumes, contabilizadas como 1 dose de carboidrato;
- jantar: 2 doses de legumes, contabilizadas como 1 dose de carboidrato;
- essas duas alocacoes consomem 2 das 6 doses totais de carboidrato;
- restam 4 doses do total diario;
- as 4 doses restantes podem ser distribuidas entre carboidrato e gordura.

Os legumes, portanto, nao entram por fora do total: entram na contagem do carboidrato conforme a equivalencia acima.

Esta confirmacao ainda nao define:
- a conversao exata entre o saldo de doses de carboidrato e doses de gordura;
- se almoco e jantar devem sempre receber essa alocacao em todas as fases/protocolos;
- excecoes especificas por fase ou alimento.

Nao inferir essas partes restantes.

## Proteinas e equivalentes

### DECISAO CONFIRMADA

A cliente pode escolher livremente as substituicoes de alimentos **dentro do grupo de equivalentes permitido pelo protocolo**.

Na proteina existem duas tabelas/grupos:

- proteinas com maior teor de gordura;
- proteinas com menor teor de gordura.

O grupo de maior teor de gordura possui limite diario. A justificativa profissional informada pela Patty e controlar o excesso de gordura da alimentacao e considerar cuidados relacionados a saude e colesterol.

O limite diario do grupo de maior teor de gordura e metade das doses totais de proteina, arredondando para cima.

Exemplos:

- 8 doses -> maximo 4;
- 7 doses -> maximo 4;
- 9 doses -> maximo 5;
- 10 doses -> maximo 5 da tabela de maior teor de gordura e as 5 restantes obrigatoriamente da tabela de menor teor de gordura.

Enquanto ainda houver saldo dentro desse limite, a cliente pode escolher livremente entre os alimentos da tabela de maior teor de gordura. Depois de atingir o limite diario desse grupo, as doses de proteina restantes do dia devem ser escolhidas na tabela de menor teor de gordura.

Na tabela de menor teor de gordura, "livre escolha" significa liberdade para escolher entre os alimentos listados **dentro do total de doses de proteina do protocolo**. Nao significa consumo ilimitado de proteina.

## Cutting e carb cycle

### DECISAO CONFIRMADA

No Cutting Dia 1 / Dia 2:

- proteina permanece praticamente igual;
- carboidrato e a principal variavel;
- o protocolo linear anterior e a referencia;
- Dia 1 usa aproximadamente metade do carboidrato;
- Dia 2 usa aproximadamente a quantidade do linear;
- gordura pode permanecer ou diminuir.

A etapa 2 Low / 1 High usa a Planilha Carb Cycle baseada no peso.

### PLANILHA CARB CYCLE — LIMITE VIGENTE

### DECISAO CONFIRMADA

A etapa 2 Low / 1 High usa a Planilha Carb Cycle baseada no peso.

Essa logica deve ser deterministica. Somente formulas confirmadas e documentadas podem ser ativadas como configuracao versionada e executadas pelo motor deterministico.

Nao inferir mapeamentos ou etapas posteriores ao fluxo confirmado do metodo. Em especial:
- o fluxo vigente confirmado termina em Cutting 2: 2 Low / 1 High;
- Cutting 3 e etapas posteriores nao fazem parte da sequencia vigente confirmada;
- Fases 5 e 6 da Planilha Carb Cycle permanecem abertas;
- referencias historicas a outras fases, cores ou pareamentos nao autorizam automacao.
## Up Metabolico

### DECISAO CONFIRMADA

O Up Metabolico nao possui duracao fixa nem quantidade fixa de refeicoes livres aplicavel a todas as clientes ou ocorrencias.

A Patty decide manualmente conforme o momento, resultados e resposta individual. Pode haver 1 refeicao livre semanal e, em alguns momentos, 2; esses exemplos nao viram regra automatica.

As faixas de referencia confirmadas para todos os Ups sao:
- proteina: 1,5 a 2,5 g/kg;
- carboidrato: 3,0 a 4,5 g/kg;
- gordura: distribuida manualmente pela Patty.

O sistema nao escolhe automaticamente o valor dentro das faixas. A Patty parte do protocolo anterior e ajusta manualmente, principalmente o carboidrato.

## Limites sobre metodo profissional

### DECISAO CONFIRMADA

Exemplos historicos individuais nao viram regra geral.

Regra nao confirmada deve permanecer como `QUESTAO ABERTA`.

A hidratacao permanece aberta para regra profissional automatica. Valores historicos como 35/60 mL/kg, composicao 70/30, metas, lembretes e recalculos automaticos nao sao regra vigente enquanto nao houver nova confirmacao documentada da Patty. Check-ins de liquidos e atividade fisica permanecem como registros factuais. Suplementacao e manipulados sao definicoes manuais caso a caso, sem automacao profissional nesta etapa. Outros temas ainda nao formalizados permanecem dependentes de confirmacao documentada.
## Leitura profissional da Anamnese

### DECISAO CONFIRMADA

A Patty analisa a Anamnese como um conjunto. Nao existe uma resposta isolada com peso fixo universal.

Na leitura profissional, devem ser considerados em conjunto, entre outros dados ja existentes no produto:
- rotina e horarios;
- como a cliente se alimenta;
- peso, medidas e fotos;
- horario de maior fome;
- comportamento, autoimagem e aspectos psicologicos relatados;
- fatores que possam dificultar ou facilitar adesao.

Isso nao autoriza score automatico, diagnostico psicologico ou classificacao clinica automatica.

## Alimentacao - rotina, escolhas e reavaliacao

### DECISAO CONFIRMADA

A quantidade de refeicoes deve, quando possivel, preservar o habito e a rotina da cliente. Os horarios internos sao ajustados pela propria cliente conforme sua rotina, respeitando as regras do protocolo aplicavel.

Preferencias e substituicoes alimentares sao atendidas por meio das tabelas/catalogos permitidos, sem transformar um numero historico de refeicoes em regra fixa.

A referencia de 2 g/kg de proteina e 2 g/kg de carboidrato foi reconfirmada como ponto de partida frequente, mantendo a possibilidade de individualizacao ja documentada.

A Patty relatou que deficit, manutencao ou superavit dependem do objetivo e da resposta da cliente. O uso de deficit como inicio frequente e a revisao por volta de 30 dias descrevem pratica atual, nao prazo ou formula automatica universal.

## Treino

### DECISAO CONFIRMADA

A Patty prescreve treino somente para clientes que solicitam esse servico.

Na montagem do treino, ela considera pratica previa, disponibilidade/frequencia pretendida, limitacoes relatadas e evolucao.

A orientacao atual citada de no minimo 3 treinos por semana com cerca de 1 hora por sessao nao deve ser transformada em regra automatica universal enquanto excecoes, intensidade, volume, progressao e cardio nao estiverem formalizados.

## Edicao profissional de protocolos

### DECISAO CONFIRMADA

Ao montar ou ajustar o acompanhamento de uma cliente, a Patty precisa conseguir editar manualmente, quando aplicavel:

- fase/protocolo;
- quantidade total de proteina;
- quantidade total de carboidrato;
- quantidade de gordura;
- numero de refeicoes;
- distribuicao das doses entre as refeicoes;
- alimentos e equivalentes;
- configuracao de dias Low/High quando o protocolo usar esse ciclo;
- refeicao livre quando aplicavel;
- observacoes;
- data de inicio;
- orientacoes especificas;
- area de treino, quando a Patty estiver prescrevendo treino para a cliente;
- area de suplementacao;
- area de manipulados.

Esses campos/blocos devem permanecer editaveis pela Patty para que ela possa revisar e ajustar o plano individualmente.

Quando existir regra previamente confirmada, documentada e configurada para uma fase, o motor determinístico pode montar automaticamente o rascunho correspondente. Isso pode incluir quantidades em gramas de proteina, carboidrato e gordura, estrutura alimentar derivada dessas regras e treino predefinido quando houver passo a passo de exercicios previamente confirmado e aplicavel.

A Patty deve visualizar o rascunho gerado, revisar todos os campos, corrigir o que for necessario e somente depois aprovar/publicar.

Automacao so e autorizada para regras previamente confirmadas e documentadas. Treino possui estrutura inicial e campos basicos confirmados, mas sua progressao permanece manual; suplementacao e manipulados sao manuais caso a caso. Nenhuma dose, contraindicacao, formula ou criterio profissional ausente pode ser inferido.

A prescricao de treino continua condicionada a regra ja confirmada de que a Patty prescreve treino somente para clientes que solicitam esse servico.

## Visibilidade do protocolo para a cliente

### DECISAO CONFIRMADA

Depois de revisado e publicado pela Patty, a cliente deve conseguir visualizar no aplicativo sua **rotina de alimentacao** e, quando houver treino prescrito, sua **rotina de treinos**.

A cliente nao precisa registrar execucao diretamente dentro do protocolo alimentar ou do treino publicado. O protocolo permanece como orientacao publicada e versionada.

### DECISAO DE PRODUTO CONFIRMADA — RECONCILIADA EM 2026-10-07

O produto preserva os check-ins como registros factuais do acompanhamento.

O check-in deve permitir:
- registrar a quantidade de liquidos consumida ao longo do dia;
- realizar um check-in diario de atividade fisica, registrando se fez ou nao fez atividade naquele dia;
- preservar o historico desses registros sem gerar score automatico de adesao.

Enquanto a regra profissional de hidratacao permanecer aberta:
- nao criar meta diaria automatica de hidratacao;
- nao mostrar progresso percentual contra meta automatica;
- nao usar 35 mL/kg, 60 mL/kg ou composicao 70/30 como regra profissional vigente;
- nao recalcular meta automaticamente quando houver novo peso;
- nao oferecer acao de recalcular meta baseada nesses valores historicos;
- nao ativar lembretes derivados de meta automatica de hidratacao.

Metas, snapshots, templates, migrations e helpers historicos de hidratacao permanecem preservados por auditoria e compatibilidade, mas nao autorizam comportamento automatico novo.

O check-in diario de atividade fisica continua independente do treino prescrito ou de qualquer rotina previamente definida para a cliente.

A cliente e a Patty podem corrigir registros conforme as regras de auditoria ja documentadas, sem apagar silenciosamente o historico original.
## Avaliacao corporal e evolucao

### DECISAO CONFIRMADA

Na interpretacao profissional, visual e medidas podem ter mais peso do que o numero isolado da balanca.

A **Avaliacao Basica** permanece composta por:
- peso, em quilogramas (kg);
- cintura, em centimetros (cm);
- abdomen, em centimetros (cm);
- quadril, em centimetros (cm).

O catalogo confirmado da **Avaliacao Completa** e:
- peso, em quilogramas (kg);
- cintura, em centimetros (cm);
- abdomen, em centimetros (cm);
- coxa, em centimetros (cm);
- biceps, em centimetros (cm);
- busto para mulher ou peito para homem, em centimetros (cm);
- quadril, em centimetros (cm);
- ombros, em centimetros (cm);
- panturrilhas, em centimetros (cm);
- fotos de avaliacao, conforme regra ja confirmada.

Para qualquer medida corporal unilateral, a Patty pede que seja utilizado somente o **lado direito do corpo**. Nao criar registro bilateral por inferencia.

Para essa medida do torax, a nomenclatura confirmada pela Patty varia conforme o cliente: **busto para mulher** e **peito para homem**. Nao criar duas medidas separadas na mesma avaliacao por causa dessa diferenca de nome. A forma tecnica de determinar/apresentar esse rotulo no produto deve respeitar os dados cadastrais disponiveis e nao deve ser inferida sem regra de produto documentada.

Fotos sao usadas principalmente para comparacao de evolucao. Em contexto de ganho de massa, tambem ajudam a considerar regioes que a cliente deseja desenvolver.

A nomenclatura profissional confirmada passa a ser:
- **Avaliacao Completa**: substitui o nome historico "mensal";
- **Avaliacao Basica**: substitui o nome historico "quinzenal".

A regra anterior de ancorar rigidamente a Avaliacao Completa no mesmo dia do mes foi superada pela confirmacao de 2026-10-04.

Regra operacional vigente:
- a data nao precisa coincidir exatamente com o mesmo dia do mes do inicio do acompanhamento;
- a Patty prefere agendar a Avaliacao Completa o mais proximo possivel de sexta-feira ou sabado;
- essa proximidade e uma preferencia profissional de agenda, nao um bloqueio rigido de calendario;
- a razao informada pela Patty e permitir que a paciente possa aproveitar, apos a avaliacao, a refeicao livre do fim de semana;
- a Avaliacao Basica continua ocorrendo aproximadamente no meio do intervalo entre duas Avaliacoes Completas, preservando a logica de acompanhamento.

Nao criar regra automatica adicional sobre refeicao livre a partir desta preferencia de agenda sem confirmacao especifica.

A Patty distinguiu dois cenarios:

1. **Nova avaliacao de acompanhamento**: a avaliacao anterior e sempre mantida no historico e uma nova avaliacao e criada com sua propria data.
2. **Correcao de erro de lancamento**: se um dado de uma avaliacao foi registrado incorretamente, a Patty precisa voltar a essa avaliacao, corrigir o dado e remover o valor incorreto da visao valida.

A forma tecnica de preservar auditoria dessa correcao sem manter o valor errado como dado ativo ainda deve ser definida separadamente. Nao transformar automaticamente um erro de digitacao em uma nova avaliacao de acompanhamento.

## Comportamento, saude e alertas iniciais

### DECISAO CONFIRMADA

Relatos de alimentacao emocional, culpa, compulsao ou restricao continuam sendo informacoes relevantes para a leitura profissional da Patty.

Na etapa inicial, porem, esses relatos, assim como doencas informadas ou alteracoes em exames, **nao devem disparar comportamento automatico do sistema** por si so.

O fluxo inicial permanece:
- registrar/preservar as informacoes fornecidas;
- iniciar o acompanhamento normalmente;
- observar como a cliente se comporta e responde ao processo;
- deixar qualquer intervencao posterior para decisao profissional da Patty conforme o acompanhamento evolui.

Nao criar automaticamente, apenas pela presenca inicial desses dados:
- destaque especial;
- revisao obrigatoria;
- pedido de esclarecimento;
- encaminhamento;
- bloqueio de protocolo ou de outra acao;
- diagnostico ou classificacao clinica.

Essa regra nao impede que a Patty, mais adiante e por julgamento humano, solicite esclarecimento, ajuste a estrategia ou oriente procura de outro profissional quando considerar necessario. Ela apenas confirma que o **sistema nao toma essa decisao automaticamente no inicio**.

## Limite adicional desta rodada

### DECISAO CONFIRMADA

As respostas de 2026-09-26 nao autorizam automatizar suplementacao/manipulados, encaminhamento por doenca, regras de gordura/legumes, restricao absoluta de gordura saturada, progressao de treino ou criterio **automatizavel** de estagnacao.

Esses temas permanecem como `QUESTAO ABERTA` ate formalizacao suficiente para implementacao deterministica e revisavel.



## Parametrização do método

### DECISÃO CONFIRMADA - 2026-09-30

Todos os valores profissionais atuais são templates iniciais configuráveis.

A Patty pode alterar:
- parâmetros globais;
- parâmetros por fase;
- parâmetros por protocolo;
- parâmetros por treino;
- parâmetros por cliente;
- valores específicos de um protocolo/treino.

Mudanças futuras não alteram retroativamente versões já usadas/publicadas.

Exemplos históricos individuais continuam não sendo regras gerais. Quando importados, permanecem como dados/configuração daquela cliente até que exista decisão explícita de promover algo a template global.


### UP METABOLICO - DURACAO E REFEICOES LIVRES

### DECISAO CONFIRMADA

O Up Metabolico nao possui duracao fixa nem quantidade fixa de refeicoes livres aplicavel a todas as clientes ou a todas as ocorrencias da fase.

A Patty ajusta conforme o momento do processo, os resultados observados e a resposta individual da cliente.

Variacoes confirmadas:
- a cliente pode permanecer no Up Metabolico por mais um mes quando estiver apresentando resultado positivo;
- pode haver 1 refeicao livre por semana;
- em alguns momentos podem existir 2 refeicoes livres na semana, por exemplo quarta-feira e sabado.

Esses exemplos nao devem ser transformados em regra automatica. Duracao e numero de refeicoes livres sao parametros configuraveis por fase/cliente e dependem de decisao manual da Patty.


### HIDRATACAO — ESTADO VIGENTE

### QUESTAO ABERTA

A regra profissional de hidratacao automatica permanece aberta.

Nao recalcular automaticamente meta de liquidos quando houver novo peso enquanto nao existir nova confirmacao documentada da Patty. Snapshots e configuracoes historicas permanecem preservados apenas para compatibilidade e auditoria.
### CORRECAO DE CHECK-INS

### DECISAO CONFIRMADA

A cliente pode corrigir os proprios registros de check-in de liquidos e atividade fisica quando perceber erro, inclusive em registro anterior, sem limite temporal profissional definido.

A Patty tambem pode corrigir registros de check-in da cliente quando identificar erro.

A correcao administrativa nao deve apagar silenciosamente o historico original. A implementacao deve preservar auditoria de quem corrigiu, quando corrigiu e qual era o valor anterior.


### CARB CYCLE - DEFINICAO OPERACIONAL

### DECISAO CONFIRMADA

No metodo da Patty, o Carb Cycle corresponde a etapa em que a cliente segue a alternancia de **2 dias Low Carb para 1 dia High Carb**.

A Patty utiliza a planilha historica de Carb Cycle para calcular essa etapa a partir do peso da cliente.

A localizacao operacional informada pela Patty e:
`Corpo e Mente passo a passo / Alimentacao / Planilha Carb Cycle`.

Consequencias:
- nao tratar "Carb Cycle" como uma fase separada da alternancia 2 Low / 1 High;
- nao inferir formulas sem ler e reconciliar a planilha original;
- os calculos da planilha devem ser parametrizaveis/versionados, conforme a decisao geral de parametrizacao do metodo;
- o peso usado no calculo deve ser preservado como input do rascunho/protocolo correspondente.


### CARB CYCLE - MAPEAMENTO DE FASE E PESO

### DECISAO CONFIRMADA

A Patty confirmou que usa sempre a tabela central da planilha de Carb Cycle.

Mapeamento profissional:
- Fase 1: faixa verde;
- Fase 2: faixa amarela;
- Fase 3: faixa vermelha.

O peso usado no calculo e o peso da ultima Avaliacao Completa da cliente.

Na planilha fornecida, a tabela central calcula os valores multiplicando o peso informado pelos coeficientes da faixa correspondente. O sistema deve preservar qual peso e qual fase/faixa foram usados no calculo.

A numeracao exibida na coluna "Fase" da tabela central do arquivo historico nao deve prevalecer sobre o mapeamento profissional confirmado por cor sem reconciliacao, pois ha rotulos que nao coincidem com Fase 1/2/3. Para implementacao, usar a regra profissional documentada e validar os coeficientes por faixa.


## Material historico posterior ao fluxo vigente

> Os blocos abaixo preservam respostas e hipoteses historicas para rastreabilidade. Eles foram superados como fonte de regra vigente pela reconciliacao de 2026-10-07. Nao implementar, automatizar ou inferir sequencia profissional a partir deles sem nova confirmacao documentada da Patty.

### CARB CYCLE - CORRESPONDENCIA COM OS CUTTINGS

### REGISTRO HISTORICO — NAO VIGENTE PARA AUTOMACAO

- Cutting 1 -> Fase 1 -> faixa verde da tabela central.
- Cutting 2 -> Fase 2 -> faixa amarela da tabela central.
- Cutting 3 -> Fase 3 -> faixa vermelha da tabela central.

A mudanca de faixa acompanha a mudanca profissional de Cutting, depois de cumprido o passo a passo do processo. O peso usado no calculo continua sendo o da ultima Avaliacao Completa.


### HISTORICO SUPERADO - CUTTING 3, BULKING E CONSOLIDACAO

O bloco historico que detalhava Cutting 3, Bulking, Consolidacao e retorno pos-Consolidacao foi superado pela reconciliacao vigente de 2026-10-07.

Para produto e automacao:
- nao usar esse material historico como regra;
- nao inferir etapas posteriores a `Cutting 2: 2 Low / 1 High`;
- Cutting 3, Bulking detalhado e Consolidacao permanecem questoes abertas ate nova confirmacao explicita e documentada da Patty.

Os registros historicos permanecem preservados em `DECISIONS.md` para rastreabilidade, com a reconciliacao mais recente prevalecendo.

## Suplementacao e manipulados

### DECISAO CONFIRMADA - 2026-10-04

Suplementacao e manipulados sao definidos manualmente pela Patty, caso a caso, conforme cada paciente.

Nao existe, nesta etapa, template profissional automatico, regra geral de indicacao, dose automatica ou sugestao automatica da IA autorizada para esse bloco.

O sistema deve permitir registro e edicao manual pela Patty, preservando o que foi efetivamente aprovado/publicado para a paciente.
