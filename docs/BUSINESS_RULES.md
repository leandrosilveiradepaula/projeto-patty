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

## Metodo da Patty - regras confirmadas

### DECISAO CONFIRMADA

Todo acompanhamento comeca pelo Reconhecimento Metabolico, que e o protocolo linear inicial.

A sequencia atualmente confirmada do fluxo principal e:

```text
Reconhecimento Metabolico
-> Cutting 1 Dia 1 / Dia 2
-> Cutting 1: 2 Low / 1 High
-> Up Metabolico
-> Cutting 2 Linear
-> Cutting 2 Dia 1 / Dia 2
-> Cutting 2: 2 Low / 1 High
-> Cutting 3 Linear
```

A Patty confirmou apenas que a etapa seguinte e **Cutting 3 com protocolo linear**. Nao inferir regras internas dessa etapa nem etapas posteriores enquanto nao houver confirmacao documentada.

### DECISAO CONFIRMADA

O Reconhecimento Metabolico pode ser reutilizado quando houver baixa adesao, dificuldade de execucao ou retorno apos afastamento.

Adesao e central para a decisao profissional. A Patty pode simplificar ou retornar antes de avancar conforme a dificuldade relatada.

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

## Proteinas

### DECISAO CONFIRMADA

Existem dois grupos de proteina:

- maior teor de gordura;
- menor teor de gordura.

O grupo de maior teor de gordura possui limite diario. "Sem restricao" nao significa proteina ilimitada.

O limite diario do grupo de maior teor de gordura e metade das doses totais de proteina, arredondando para cima.

Exemplos:

- 8 doses -> maximo 4;
- 7 doses -> maximo 4;
- 9 doses -> maximo 5.

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

Essa logica deve ser deterministica. Somente formulas confirmadas e documentadas podem ser implementadas.

As Fases 5 e 6 da Planilha Carb Cycle continuam abertas.

## Up Metabolico

### DECISAO CONFIRMADA

No fluxo confirmado, o Up Metabolico inclui uma refeicao livre semanal.

Nao inferir outras regras do Up Metabolico sem confirmacao documentada.

## Limites sobre metodo profissional

### DECISAO CONFIRMADA

Exemplos historicos individuais nao viram regra geral.

Regra nao confirmada deve permanecer como `QUESTAO ABERTA`.

Nao automatizar hidratacao, suplementacao, manipulados, progressao definitiva de treino, alertas profissionais, criterios finais de avaliacao, fases 5 e 6 do Carb Cycle, regras ainda nao documentadas do Cutting 3, etapas posteriores ao Cutting 3 Linear, Bulking ou Consolidacao antes de confirmacao documentada.
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

## Comportamento e relacao com comida

### DECISAO CONFIRMADA

Relatos de alimentacao emocional, culpa, compulsao ou restricao merecem atencao profissional especial.

Essa confirmacao nao define alerta automatico, severidade, diagnostico, bloqueio ou encaminhamento. O comportamento de sistema continua pendente de formalizacao.

## Limite adicional desta rodada

### DECISAO CONFIRMADA

As respostas de 2026-09-26 nao autorizam automatizar suplementacao/manipulados, encaminhamento por doenca, regras de gordura/legumes, restricao absoluta de gordura saturada, progressao de treino ou criterio de estagnacao.

Esses temas permanecem como `QUESTAO ABERTA` ate formalizacao suficiente para implementacao deterministica e revisavel.

