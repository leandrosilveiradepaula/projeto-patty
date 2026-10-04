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

A sequencia atualmente confirmada do fluxo principal e:

```text
Reconhecimento Metabolico
-> Cutting 1
-> Up Metabolico
-> Cutting 2
-> Up Metabolico
-> Cutting 3
-> Up Metabolico
```

A progressao e passo a passo e depende dos resultados observados pela Patty. Nao existe promocao automatica de fase apenas por tempo.

As estruturas internas ja confirmadas de Cutting 1 e Cutting 2 permanecem validas. A estrutura interna completa do Cutting 3 ainda nao deve ser inferida.

Quando o objetivo inclui ganho de massa muscular, a Patty pode usar um ramo com Bulking. Entre o Bulking e a volta ao Cutting, utiliza Consolidacao Metabolica para trabalhar/preservar o ganho de massa muscular e retirar o excesso adicional de gordura e retencao liquida. Formulas, duracao e criterios exatos desse ramo continuam pendentes.

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

### RELACAO ENTRE PLANILHA CARB CYCLE E PROTOCOLO LINEAR

### DECISAO CONFIRMADA

A Patty confirmou que:
- as **Fases 1, 2, 3 e 4** da Planilha Carb Cycle pertencem ao conjunto de fases usado nos **Cuttings 1, 2 e 3** do metodo atual;
- a coluna **Media** da planilha corresponde ao valor utilizado no **protocolo Linear** da fase correspondente.

Portanto, o Linear nao deve ser calculado por uma formula inventada fora da planilha quando houver fase da Planilha Carb Cycle aplicavel: a referencia confirmada e a coluna Media.

### USO PRATICO DAS FASES DA PLANILHA

A Patty confirmou que, na pratica, **dificilmente chega as Fases 4, 5 e 6** da planilha.

O padrao profissional mais frequente e:
- trabalhar repetidamente com as Fases 1, 2 e 3;
- realizar um periodo de cutting mais prolongado;
- intercalar com um periodo de bulking voltado ao trabalho de massa muscular;
- depois reiniciar novamente o ciclo pelas Fases 1, 2 e 3 quando voltar ao cutting.

Isso descreve a pratica profissional atual e **nao cria uma transicao automatica** entre cutting e bulking. Os criterios de quando interromper cutting, iniciar bulking, encerrar bulking e retornar ao cutting continuam dependentes de decisao da Patty.

As Fases 4, 5 e 6 permanecem validas como possibilidades historicas/metodologicas, mas nao devem ser tratadas como caminho padrao nem como requisito para a primeira automacao do fluxo.

Ainda nao inferir o pareamento individual completo entre cada fase numerada da planilha e os nomes de Cutting quando isso nao estiver explicitado.

Essa lógica deve ser determinística. Somente fórmulas confirmadas e documentadas podem ser ativadas como configuração versionada e executadas pelo motor determinístico.

As regras detalhadas das Fases 4, 5 e 6 continuam abertas.

## Up Metabolico

### DECISAO CONFIRMADA

No fluxo confirmado, o Up Metabolico inclui uma refeicao livre semanal.

Nao inferir outras regras do Up Metabolico sem confirmacao documentada.

## Limites sobre metodo profissional

### DECISAO CONFIRMADA

Exemplos historicos individuais nao viram regra geral.

Regra nao confirmada deve permanecer como `QUESTAO ABERTA`.

Nao automatizar regras de hidratacao alem da formula confirmada de 60 mL/kg e da taxonomia ativa de liquidos; nao existe proporcao minima automatica confirmada entre agua pura e outros liquidos zero calorias. Suplementacao, manipulados, progressao definitiva de treino, criterios finais de avaliacao, fases 5 e 6 do Carb Cycle, etapas posteriores ao Cutting 2, Bulking ou Consolidacao permanecem dependentes de confirmacao documentada.
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

Automacao so e autorizada para regras previamente confirmadas e documentadas. Regras ainda abertas de treino, suplementacao, manipulados, progressao, doses, contraindicacoes, formulas ou criterios profissionais continuam abertas e nao devem ser inferidas.

A prescricao de treino continua condicionada a regra ja confirmada de que a Patty prescreve treino somente para clientes que solicitam esse servico.

## Visibilidade do protocolo para a cliente

### DECISAO CONFIRMADA

Depois de revisado e publicado pela Patty, a cliente deve conseguir visualizar no aplicativo sua **rotina de alimentacao** e, quando houver treino prescrito, sua **rotina de treinos**.

A cliente nao precisa registrar execucao diretamente dentro do protocolo alimentar ou do treino publicado. O protocolo permanece como orientacao publicada e versionada.

### DECISAO DE PRODUTO CONFIRMADA

O produto deve prever um check-in de acompanhamento para servir tambem como estimulo a cliente.

O check-in deve permitir:
- registrar a quantidade de liquidos consumida ao longo do dia;
- acompanhar progresso em relacao a uma meta de liquidos;
- receber lembretes relacionados ao consumo de liquidos;
- realizar um check-in diario de atividade fisica, registrando se fez ou nao fez atividade naquele dia;
- acompanhar o progresso dessas metas de forma visivel para a cliente.

### META DE LIQUIDOS

### DECISAO CONFIRMADA

A regra vigente confirmada pela Patty em 2026-10-04 substitui a referencia anterior de 60 mL/kg.

A meta minima usada no metodo e:

- **35 mL por kg de peso corporal por dia**.

Formula deterministica vigente:

`meta_liquidos_ml = peso_kg * 35`

Exemplo matematico:
- cliente com 60 kg -> minimo de 2.100 mL/dia = 2,1 L/dia.

Na composicao dessa meta:
- a taxonomia ativa distingue **agua pura** de **outros liquidos zero calorias**;
- a orientacao profissional passada a cliente e que 70% da meta diaria seja cumprida com agua pura;
- os 30% restantes podem ser contabilizados com outros liquidos zero calorias;
- exemplos citados de outros liquidos: cafe, cha, chimarrao, refrigerante zero e bebidas zero calorias similares;
- se a cliente optar por cumprir de outra forma, isso e uma escolha dela; nao criar bloqueio automatico nem score de adesao a partir dessa divergencia.

Nao tratar essa regra do metodo como recomendacao medica geral fora do acompanhamento profissional.

O check-in diario de atividade fisica e independente do treino prescrito ou de qualquer rotina previamente definida para a cliente. O registro diario pode ser usado posteriormente para derivar frequencia, sem criar score automatico de adesao.

A existencia de metas e lembretes esta confirmada como comportamento desejado do produto.

Esses parametros podem ser definidos individualmente **na entrega do primeiro protocolo da cliente**, junto com a revisao/publicacao inicial do acompanhamento.

Ainda nao estao formalizados como regra geral:
- a meta deve ser recalculada automaticamente sempre que um novo peso for registrado; o novo calculo vale prospectivamente e nao reescreve metas historicas;
- horarios e cadencia padrao dos lembretes;
- o que a Patty visualiza ou pode corrigir;
- politica de edicao de check-ins anteriores.

A formula vigente de 35 mL/kg esta confirmada e pode ser tratada como calculo deterministico do metodo para novas metas. Metas historicas ja persistidas nao devem ser reescritas. Nao criar score automatico de adesao a partir do check-in.

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

A cadencia e ancorada na data de inicio do acompanhamento da cliente:
- a Avaliacao Completa ocorre mensalmente no mesmo dia do mes correspondente ao inicio do processo;
- a Avaliacao Basica ocorre no meio do intervalo entre duas Avaliacoes Completas;
- exemplo confirmado pela Patty: Avaliacao Completa no dia 2 -> Avaliacao Basica no dia 17.

Nao inferir ainda a regra para datas de inicio que nao existem em todos os meses, como dias 29, 30 ou 31.

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


### RECALCULO DA META DE LIQUIDOS POR NOVO PESO

### DECISAO CONFIRMADA

Sempre que um novo peso da cliente for registrado, a meta diaria de liquidos deve ser recalculada automaticamente usando a configuracao vigente da regra de hidratacao.

O novo calculo passa a valer dali em diante. Metas historicas e registros de consumo anteriores permanecem preservados e nao devem ser recalculados retroativamente.


### CORRECAO DE CHECK-INS PELA CLIENTE

### DECISAO CONFIRMADA

A cliente pode corrigir os proprios registros de check-in de liquidos e atividade fisica.

A cliente pode corrigir quando perceber o erro, inclusive em registro anterior, sem limite temporal profissional definido.

Ainda precisa ser definido:
- se a Patty tambem pode corrigir registros da cliente;
- como a correcao sera materializada tecnicamente sem perder auditoria.


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


### CARB CYCLE - CORRESPONDENCIA COM OS CUTTINGS

### DECISAO CONFIRMADA

- Cutting 1 -> Fase 1 -> faixa verde da tabela central.
- Cutting 2 -> Fase 2 -> faixa amarela da tabela central.
- Cutting 3 -> Fase 3 -> faixa vermelha da tabela central.

A mudanca de faixa acompanha a mudanca profissional de Cutting, depois de cumprido o passo a passo do processo. O peso usado no calculo continua sendo o da ultima Avaliacao Completa.


### CUTTING 3 - ESTRUTURA INTERNA

### DECISAO CONFIRMADA

O Cutting 3 repete a mesma estrutura operacional dos Cuttings anteriores:

```text
Linear
-> Dia 1 / Dia 2
-> Carb Cycle 2 Low / 1 High
```

No Carb Cycle do Cutting 3, usar a Fase 3 da tabela central da planilha, correspondente a faixa vermelha.

A progressao continua condicionada ao passo a passo profissional e aos resultados da cliente. Nao automatizar avancos de etapa sem a decisao/regra aplicavel.
