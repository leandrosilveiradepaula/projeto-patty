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

A documentacao oficial da OpenAI informa que dados enviados pela API nao sao usados para treinamento por padrao, salvo opt-in.

`store: false` impede a persistencia normal do objeto Response como application state. Isso nao equivale, por si so, a Zero Data Retention: logs de monitoramento de abuso podem conter conteudo do cliente e, por padrao, podem ser retidos por ate 30 dias.

Antes de habilitar dados reais, confirmar na organizacao/projeto OpenAI qual politica de dados esta efetivamente ativa e se Zero Data Retention, Modified Abuse Monitoring ou outra configuracao aprovada e necessaria/disponivel para este caso de uso.

## Checklist de liberacao

Todos os itens abaixo precisam estar explicitamente concluídos antes de definir `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=true`:

- [ ] conta/projeto OpenAI de producao identificado;
- [ ] `OPENAI_API_KEY` configurada somente no ambiente server-side de producao;
- [ ] chave nao presente no repositorio, browser, logs ou fixtures;
- [ ] avaliacao sintetica do modelo executada e aprovada;
- [ ] modelo/effort avaliados em qualidade, custo e latencia;
- [ ] politica de retencao/processamento da organizacao OpenAI revisada;
- [ ] necessidade e disponibilidade de ZDR/MAM avaliadas;
- [ ] responsavel humano aprovou o envio de dados de saude para esse ambiente;
- [ ] logs da aplicacao revisados para nao registrar prompts/respostas;
- [ ] rollback operacional testavel: desabilitar `OPENAI_HEALTH_DATA_PROCESSING_ENABLED`;
- [ ] revisao humana da Patty continua obrigatoria e visivel na UI.

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
