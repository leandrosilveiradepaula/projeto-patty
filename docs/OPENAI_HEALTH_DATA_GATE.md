# Gate de processamento de dados de saude na OpenAI

Status: **NAO LIBERADO PARA DADOS REAIS**

Este gate controla apenas o envio externo de dados para o provider OpenAI no fluxo `anamnesis_review`. Ele nao substitui revisao juridica, de privacidade ou de seguranca quando aplicavel.

## Fatos tecnicos atuais

- provider confirmado: OpenAI;
- endpoint: Responses API;
- modelo tecnico inicial: `gpt-5.6-terra`;
- reasoning inicial: `medium`;
- `store: false` em todas as chamadas do fluxo;
- contexto minimizado antes da chamada;
- IDs internos de answer/question substituidos por aliases efemeros;
- `instagram` nunca entra no contexto;
- capacidade financeira so entra por opt-in explicito da Patty por execution;
- output passa por validacao deterministica;
- output nao publica nada automaticamente;
- chamada externa depende de `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=true`.

## Controles da OpenAI que precisam ser verificados

### Fatos da documentacao oficial

A documentacao oficial da OpenAI informa que:

- dados enviados pela API nao sao usados para treinar ou melhorar os modelos por padrao, salvo opt-in explicito;
- logs de monitoramento de abuso podem conter conteudo do cliente e, no regime padrao, podem ser retidos por ate 30 dias;
- `/v1/responses` e um endpoint elegivel a Zero Data Retention (ZDR), sujeito as limitacoes e elegibilidade da organizacao/modelo;
- `store: false` evita persistencia normal de application state para o Response, mas nao equivale sozinho a ZDR porque o regime de abuse monitoring e um controle separado;
- ZDR e Modified Abuse Monitoring (MAM) so podem ser configurados depois que a organizacao for aprovada para esses controles;
- depois da aprovacao, a configuracao aparece em `Settings -> Organization -> Data controls` e pode ser definida no nivel da organizacao e de cada projeto;
- mesmo para clientes aprovados, a OpenAI pode tornar modelos especificos inelegiveis a ZDR/MAM em determinadas circunstancias, com notificacao aplicavel.

Referencia oficial:
- https://developers.openai.com/api/docs/guides/your-data

### Estado especifico do Projeto Patty

Confirmado:

- o fluxo usa `/v1/responses`;
- o request usa `store: false`;
- o projeto nao usa Conversations API nem background mode neste fluxo;
- a avaliacao sintetica usa a organizacao `Personal` / projeto `Default project`, mas isso nao define automaticamente o ambiente final para dados reais.

Ainda nao confirmado nesta sessao:

- se a organizacao OpenAI atual esta aprovada para ZDR/MAM;
- qual controle de retencao esta efetivamente ativo na organizacao e no projeto;
- se `gpt-5.6-terra` esta elegivel para o controle escolhido nessa organizacao;
- se `Personal / Default project` sera mantido ou substituido por um projeto OpenAI dedicado ao Projeto Patty/Corpo e Mente.

### Recomendacao tecnica de privacidade

Para dados reais de saude, preferir ZDR quando a organizacao/projeto/modelo forem elegiveis. Se ZDR nao estiver disponivel, manter o gate fechado ate existir decisao explicita sobre a alternativa de retencao, com revisao de privacidade/juridica quando aplicavel.

Nao interpretar "endpoint elegivel a ZDR" como "ZDR ativo".

## Checklist de liberacao

Todos os itens abaixo precisam estar explicitamente concluídos antes de definir `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=true`:

- [x] conta/projeto OpenAI para a avaliacao sintetica identificado (organizacao `Personal`, projeto `Default project`);
- [x] `OPENAI_API_KEY` configurada como GitHub Actions secret para a avaliacao sintetica; uso em producao continua separado do gate de dados reais;
- [x] chave nao presente no repositorio, browser, logs ou fixtures; o workflow validou apenas a existencia do secret e o GitHub mascarou seu valor;
- [x] avaliacao sintetica do modelo executada e aprovada no workflow `Evaluate OpenAI anamnesis review`, run `37128054011`;
- [ ] modelo/effort avaliados em qualidade, custo e latencia;
- [x] politica publica de retencao/processamento da API OpenAI revisada na documentacao oficial;
- [ ] politica efetivamente ativa na organizacao/projeto OpenAI verificada no painel;
- [x] necessidade tecnica de minimizar retencao avaliada: ZDR e a opcao preferida se elegivel;
- [ ] disponibilidade/elegibilidade de ZDR ou MAM confirmada para organizacao/projeto/modelo;
- [ ] responsavel humano aprovou o envio de dados de saude para esse ambiente;
- [x] logs da aplicacao revisados: o provider server-only nao possui `console.log/error/warn` de prompt/resposta e a regressao de boundary protege essa ausencia;
- [x] rollback operacional testavel: sem `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=true`, `getOpenAiProviderReadiness()` falha fechado antes de qualquer chamada ao provider;
- [x] revisao humana da Patty continua obrigatoria e visivel na UI; a tela administrativa explicita que nenhum achado cria diagnostico, pendencia, mensagem, protocolo ou publicacao automatica.

## Verificacao manual restante no OpenAI Platform

Antes de qualquer dado real, verificar no painel da organizacao escolhida:

1. abrir `Settings -> Organization -> Data controls`;
2. confirmar se a secao de Data Retention esta disponivel;
3. registrar a configuracao efetiva da organizacao;
4. abrir o projeto que sera usado pelo Projeto Patty e registrar se ele herda o default ou possui ZDR/MAM explicito;
5. confirmar a elegibilidade do modelo escolhido nesse projeto;
6. somente depois decidir qual projeto/chave sera a credencial de producao.

Se a secao de controles de retencao nao estiver disponivel ou a elegibilidade nao puder ser confirmada, o estado continua `NAO LIBERADO PARA DADOS REAIS`.

## Evidencia sintetica 2026-10-03

O workflow manual `Evaluate OpenAI anamnesis review` foi executado no `master` `d912211f2460fbdf94e6a70c6bd07b43ca8822b5` usando exclusivamente fixtures sinteticas.

Resultado do run `37128054011`:

- `clear_no_findings`: PASS;
- `possible_contradiction`: PASS;
- `clarification_needed`: PASS;
- `missing_answer`: PASS;
- total: 4 cenarios, 4 aprovados, 0 falhas;
- modelo: `gpt-5.6-terra`;
- nenhum dado real de cliente foi usado;
- `OPENAI_HEALTH_DATA_PROCESSING_ENABLED` permaneceu ausente/desabilitado.

Essa evidencia fecha apenas o gate de avaliacao sintetica inicial. Ela nao autoriza dados reais enquanto os demais itens de retencao/processamento, ZDR/MAM, logging, aprovacao humana e rollback operacional permanecerem pendentes.

## Evidencias locais adicionais 2026-10-03

Revisao do runtime e das regressões confirmou:

- `lib/ai/openai-provider.ts` e `lib/ai/anamnesis-review-execution.ts` sao `server-only`;
- o provider exige `OPENAI_HEALTH_DATA_PROCESSING_ENABLED === "true"` antes de verificar a chave ou chamar a API;
- `security/boundary-regression.test.mjs` exige a presenca desse gate, `store: false` e a ausencia de `console.log/error/warn` no provider;
- a pagina `/admin/anamneses/[anamneseId]/ia` mostra explicitamente "Revisao humana obrigatoria";
- os unicos atos sobre findings sao registrar observacao interna ou criar anotacao da Patty, ambos separados do output original;
- nenhuma dessas acoes publica conteudo para cliente ou altera protocolo automaticamente.

Essas verificacoes nao resolvem os controles externos ainda pendentes: politica efetiva de retencao/processamento da organizacao OpenAI, elegibilidade/configuracao ZDR/MAM e aprovacao humana explicita para envio de dados reais.

## Regra de rollout

1. executar avaliacao apenas com fixtures sinteticas;
2. corrigir prompt/modelo se necessario;
3. concluir checklist de dados;
4. configurar segredo no ambiente de producao;
5. habilitar o gate;
6. iniciar com volume controlado;
7. observar failures, custo e latencia;
8. manter possibilidade de desligar o gate sem migration.

## O que nao fazer

- nao usar dados reais para desenvolvimento/teste;
- nao copiar dados de cliente para fixtures;
- nao colocar API key em GitHub, codigo, screenshots ou mensagens;
- nao habilitar o gate apenas porque a API key existe;
- nao transformar achado da IA em diagnostico ou decisao automatica;
- nao publicar resposta da IA diretamente para cliente.

## Limites locais de falha

Independentemente da politica de retencao do provider, a aplicacao limita localmente o que pode ser persistido quando uma resposta do provider falha na validacao:

- resposta bruta: no maximo 128 KiB UTF-8;
- `failure_message`: no maximo 1.024 code points;
- resposta truncada e identificada explicitamente e armazenada como texto.

Esse controle reduz persistencia excessiva em erro, mas nao altera o status deste gate: dados reais continuam proibidos enquanto o checklist de liberacao nao estiver concluido.
