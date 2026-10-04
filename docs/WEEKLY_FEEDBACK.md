# Feedback Semanal

Data de referencia: 2026-10-03.

## Objetivo

Digitalizar o feedback semanal que hoje e enviado manualmente pela Patty, permitindo:
- questionario versionado;
- solicitacao semanal por cliente;
- resposta dentro do aplicativo;
- historico por periodo;
- acompanhamento de respondido/pendente pela Patty;
- entrega de link por canais configuraveis;
- futura assistencia de IA somente apos os gates de dados de saude aplicaveis.

Este fluxo e separado dos check-ins diarios de liquidos e atividade fisica ja existentes.

## Principios

### DECISAO TECNICA/PRODUTO

O Feedback Semanal sera um dominio proprio. Nao reutilizar `client_liquid_intake_events` ou `client_activity_checkin_events` para representar o questionario semanal.

### DECISAO TECNICA/PRODUTO

Preservar separadamente:
1. versao do questionario enviada;
2. periodo de referencia;
3. resposta original da cliente;
4. eventual interpretacao da IA;
5. observacao/revisao da Patty;
6. acao posterior;
7. historico de entregas/notificacoes.

### DECISAO TECNICA/PRODUTO

O link deve abrir o aplicativo autenticado da cliente. O canal de entrega nao recebe o conteudo sensivel das respostas.

### DECISAO TECNICA/PRODUTO

Agenda e canais devem ser configuraveis. Dia da semana, horario, prazo e canal nao devem ficar hardcoded como regra profissional.

### REGRA DE SEGURANCA

O questionario pode conter dados de saude e comportamento sensiveis. Cliente acessa somente suas solicitacoes/respostas. Patty/admin acessa somente dados client-scoped autorizados e sob os requisitos administrativos vigentes. `anon` nao recebe acesso.

### REGRA DE IA

Nenhuma resposta semanal deve ser enviada automaticamente a provider de IA enquanto o gate aplicavel a dados reais de saude permanecer fechado. Mesmo depois da abertura, IA apenas analisa/rascunha; nao altera protocolo, classifica adesao, bloqueia atendimento ou envia mensagem sem revisao humana quando aplicavel.

## Estrutura inicial das 21 perguntas

A fonte original esta em `docs/source_drafts/weekly_feedback_current_source.md`.

Classificacao inicial de interface, sem alterar o sentido da pergunta:

| # | Natureza inicial | Observacao |
| --- | --- | --- |
| 1 | numero inteiro | quantidade de treinos |
| 2 | numero inteiro | quantidade de aerobicos |
| 3 | sim/nao + texto condicional | se sim, relatar o consumido |
| 4 | sim/nao | detalhes adicionais nao estao explicitamente pedidos na fonte |
| 5 | sim/nao + texto condicional | frequencia e alimento |
| 6 | sim/nao | detalhes adicionais nao estao explicitamente pedidos na fonte |
| 7 | sim/nao | restaurante |
| 8 | nao se aplica / sim / nao + texto condicional | aplicavel quando estiver em Cutting; nao automatizar aplicabilidade ainda |
| 9 | sim/nao + texto condicional | bebida, dias e quantidade |
| 10 | sim/nao + campos condicionais | quantidade de doses e numero de refeicoes |
| 11 | sim/nao + numero condicional | numero de dias acima do limite |
| 12 | sim/nao | atingiu meta de liquidos |
| 13 | texto/quantidade a formalizar | a fonte nao define unidade da media diaria |
| 14 | nao se aplica / sim / nao | manipulados no protocolo |
| 15 | nao se aplica / sim / nao | suplementos no protocolo |
| 16 | nao se aplica / sim / nao + texto/numero | recurso ergogenico e semana do ciclo; dado sensivel |
| 17 | escala 0-10 autorreferida | armazenar como autoavaliacao da execucao; nunca como score automatico de adesao |
| 18 | texto livre | maior dificuldade |
| 19 | texto livre | como esta se sentindo |
| 20 | escolha/texto a formalizar | home office ou trabalho externo conforme fonte |
| 21 | escolha/texto a formalizar | academia ou casa conforme fonte |

## Fluxo pretendido

configuracao ativa
-> geracao de solicitacao semanal
-> entrega de link pelo canal configurado
-> cliente abre o aplicativo autenticado
-> salva/preenche respostas
-> envio final
-> Patty visualiza historico e pendencias
-> eventual analise assistiva separada
-> decisao humana

## Estados recomendados

Sem automatizar consequencias profissionais, o lifecycle tecnico pode distinguir:
- `pending`: solicitacao criada e ainda nao enviada pela cliente;
- `submitted`: cliente enviou o feedback;
- `overdue`: derivado de `due_at` para visualizacao operacional, sem bloquear atendimento automaticamente.

Nao criar estado automatico de "inadimplente", "sem atendimento" ou equivalente sem confirmacao expressa da Patty.

## Canais

### Email

Pode reutilizar o email de contato apenas se o produto decidir explicitamente que ele e o endereco operacional de notificacao. Nao usar email como chave de relacionamento.

### WhatsApp

`client_registration.phone` nao deve ser presumido como numero de WhatsApp. Antes do envio real, definir provedor, consentimento/opt-in quando aplicavel, origem do numero e comportamento de fallback.

### In-app

A solicitacao deve sempre existir dentro do aplicativo independentemente do canal externo de aviso.

## Elegibilidade confirmada em 2026-10-04

A elegibilidade profissional comeca depois que a cliente recebe o primeiro protocolo.

Antes desse marco, a cliente nao precisa responder ao Feedback Semanal.

Esta confirmacao resolve a regra profissional de inicio. O evento tecnico exato que representara "recebeu o primeiro protocolo" deve ser mapeado de forma auditavel ao fluxo real de publicacao/entrega do protocolo, sem inventar um novo criterio profissional.

## Questoes que bloqueiam automacao completa

1. Qual o dia/horario inicial desejado para o envio? A ideia de segunda-feira pela manha deve virar configuracao, nao constante.
2. O prazo "ate quarta-feira" continua vigente? O prazo fecha o formulario ou apenas marca atraso?
3. O texto "responder e obrigatorio" deve ser apenas comunicacao ou gerar algum estado operacional?
4. A regra historica de ficar sem atendimento online quando nao responder continua vigente? Se sim, quem confirma a suspensao e como ela termina? Nao automatizar sem resposta.
5. RESOLVIDO PROFISSIONALMENTE: o Feedback Semanal comeca depois que a cliente recebe o primeiro protocolo. O mapeamento tecnico de "recebeu" deve usar um evento auditavel do fluxo real de protocolo.
6. Cliente pode salvar rascunho e continuar depois?
8. Cliente pode corrigir depois de enviar? Se sim, ate quando e com qual historico?
9. Havera lembrete antes/depois de quarta-feira? Qual cadencia?
10. Canal inicial: email, WhatsApp, ambos, ou preferencia por cliente?
11. Perguntas 8, 14, 15 e 16 devem ter aplicabilidade automatica a partir do protocolo ou a cliente marca "nao se aplica"?
12. Perguntas 20 e 21 devem continuar semanais mesmo sendo dados relativamente estaveis?
13. A Patty quer uma observacao/revisao manual por feedback antes de qualquer uso em IA ou protocolo?
