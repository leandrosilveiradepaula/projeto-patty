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
```

Nao inferir etapas posteriores enquanto nao houver confirmacao documentada.

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

Nao automatizar hidratacao, suplementacao, manipulados, progressao definitiva de treino, alertas profissionais, criterios finais de avaliacao, fases 5 e 6 do Carb Cycle, etapas posteriores ao Cutting 2, Bulking ou Consolidacao antes de confirmacao documentada.
