## 2026-09-27 - Planilha Carb Cycle: coluna Media corresponde ao Linear

### REGRA CONFIRMADA PELA PATTY

A Patty confirmou que as Fases 1, 2, 3 e 4 da Planilha Carb Cycle sao usadas no conjunto dos Cuttings 1, 2 e 3 do metodo atual.

Tambem confirmou explicitamente que a coluna **Media** da planilha e o valor utilizado no **protocolo Linear** da fase correspondente.

### LIMITE AINDA ABERTO

A resposta nao explicita como as quatro fases numeradas (1, 2, 3 e 4) se distribuem individualmente entre os tres Cuttings nomeados (Cutting 1, Cutting 2 e Cutting 3).

Nao inferir esse pareamento. A planilha pode ser tratada como fonte matematica das fases confirmadas, mas a associacao fase numerada -> Cutting deve ser fechada antes de automatizar a selecao da fase pelo nome do protocolo.

## 2026-09-27 - Legumes na contagem de carboidrato

### REGRA CONFIRMADA PELA PATTY

Para a contagem total do protocolo, **2 doses de legumes contabilizam 1 dose de carboidrato**.

Exemplo confirmado:
- total diario: 6 doses de carboidrato;
- almoco: 2 doses de legumes = 1 dose contabilizada de carboidrato;
- jantar: 2 doses de legumes = 1 dose contabilizada de carboidrato;
- saldo restante: 4 doses do total diario;
- esse saldo pode ser distribuido entre carboidrato e gordura.

Assim, os legumes consomem parte do total de doses de carboidrato; nao sao adicionais ao total.

### AINDA ABERTO

A resposta nao formaliza a conversao exata entre o saldo de carboidrato e gordura nem confirma que a mesma alocacao almoco/jantar vale para todas as fases/protocolos.

## 2026-09-27 - Sem alertas automaticos na etapa inicial

### REGRA CONFIRMADA PELA PATTY

Ao receber inicialmente relatos como alimentacao emocional, culpa, compulsao, restricao, doencas informadas ou alteracoes em exames, a Patty **nao espera que o sistema execute uma acao automatica especifica** apenas por causa desses dados.

O acompanhamento deve ser iniciado normalmente e a Patty observa, ao longo do processo, como a cliente se comporta e responde.

Portanto, a presenca inicial desses dados nao gera automaticamente:
- destaque especial;
- revisao obrigatoria;
- pedido de esclarecimento;
- encaminhamento;
- bloqueio de protocolo/acao;
- diagnostico ou classificacao clinica.

Qualquer intervencao posterior continua sendo decisao humana da Patty conforme a evolucao do caso. Isso nao revoga a possibilidade de encaminhamento manual a outro profissional quando a Patty julgar necessario; apenas exclui uma regra automatica inicial do sistema.

## 2026-09-27 - Progressao do protocolo por sequencia, adesao e resultado

### REGRA CONFIRMADA PELA PATTY

O acompanhamento segue a sequencia profissional ja confirmada:
Reconhecimento Metabolico -> Cutting 1 Dia 1/Dia 2 -> Cutting 1 2 Low/1 High -> Up Metabolico -> Cutting 2 Linear -> Cutting 2 Dia 1/Dia 2 -> Cutting 2 2 Low/1 High -> Cutting 3 Linear -> Cutting 3 Dia 1/Dia 2 -> Cutting 3 2 Low/1 High -> Up Metabolico.

A progressao entre etapas nao deve ser automatica.

A adesao ao protocolo e um criterio central para decidir se a cliente pode continuar a sequencia. Se a cliente nao estiver aderindo adequadamente, a Patty interrompe a progressao e redefine os proximos passos.

A Patty confirmou tambem a leitura profissional de resultado para esse gate:
- qualquer resultado e valido quando ha mudanca nos indicadores numericos e essa evolucao nao esta indo contra o objetivo que a propria cliente buscou;
- para emagrecimento/reducao de gordura, reducao de cintura e abdomen e resultado positivo;
- busto/peito e outra referencia forte de reducao de gordura;
- comparacao visual positiva das fotos tambem caracteriza evolucao, mesmo quando o peso se mantem;
- o peso isolado nao e criterio suficiente para concluir ausencia de evolucao;
- o resultado nao e considerado valido quando a evolucao vai contra o objetivo buscado pela cliente ou quando os numeros, no geral, permanecem estagnados.

Quando o resultado nao e considerado valido, a progressao para e a Patty decide manualmente o que fazer a seguir.

Nao inferir que resultado nao valido significa automaticamente baixa adesao.

Essa confirmacao nao define deteccao automatica de estagnacao nem sucesso.

### CUTTING 2

Depois do Up Metabolico, o Cutting 2 reinicia a estrutura de progressao do Cutting com menos doses de macros em relacao ao ciclo anterior.

Ainda nao estao formalizados:
- quanto cada macro diminui;
- quais macros diminuem em cada transicao;
- formula exata dessa reducao;
- criterio objetivo de adesao suficiente;
- janela de tempo para caracterizar estagnacao;
- limiar de variacao para distinguir mudanca real de ruido;
- como tratar combinacoes conflitantes de indicadores alem dos casos confirmados;
- criterios por objetivo diferente de emagrecimento/reducao de gordura.

Nenhuma dessas lacunas autoriza score de adesao, deteccao automatica de estagnacao ou mudanca automatica de fase.

## 2026-09-27 - Revisao humana dos findings de IA

### REGRA CONFIRMADA PELA PATTY

Para um finding/achado produzido pela IA:
- a Patty pode aceita-lo como **observacao interna**;
- a Patty pode transforma-lo em uma **anotacao propria**;
- aceitar ou transformar o achado nao publica nem envia nada para a cliente;
- nenhum conteudo originado da IA pode chegar a cliente sem **aprovacao explicita previa da Patty**.

### REGRA DE AUDITORIA

O sistema deve preservar separadamente o output original da IA, a decisao humana sobre o achado, a anotacao profissional resultante quando houver e qualquer versao posteriormente aprovada para comunicacao/publicacao.

### QUESTOES DE UX AINDA ABERTAS

Esta resposta nao definiu, por si so, todas as demais acoes da interface sobre findings, como editar o texto do finding, descartar explicitamente ou converter diretamente em pedido de esclarecimento. Essas acoes nao devem ser inferidas apenas desta confirmacao.

## 2026-09-27 - Fluxo de esclarecimento e lembrete de 24 horas

### REGRA CONFIRMADA PELA PATTY

No fluxo de esclarecimentos pos-Anamnese:

- a cliente responde ao pedido dentro do aplicativo;
- a resposta nao encerra automaticamente o esclarecimento;
- a Patty precisa ler e marcar manualmente como **resolvido**;
- se ainda houver duvida, a Patty pode questionar novamente;
- nao existe prazo/expiracao para resposta;
- enquanto estiver aguardando resposta da cliente, o sistema deve enviar lembrete a cada **24 horas** para que ela responda.

### LIMITE TECNICO

Ainda nao foi definido o canal da notificacao de 24 horas. A regra funcional esta confirmada, mas a implementacao nao deve escolher silenciosamente entre notificacao in-app, email, push ou outro canal.

O modelo tecnico tambem deve preservar o historico quando houver novo questionamento, sem sobrescrever pedidos/respostas anteriores.

## 2026-09-27 - Projeto passa a ter escopo de sistema completo

### DECISAO DE PRODUTO CONFIRMADA

O Projeto Patty nao esta mais sendo conduzido como um MVP com recortes de primeira/segunda fase.

O objetivo atual e construir o **sistema completo, de ponta a ponta**, cobrindo integralmente os fluxos da Patty e das clientes que ja foram definidos para o produto.

Consequencias:
- perguntas do tipo "o que entra no primeiro lancamento?" ou "o que pode ficar para depois?" deixam de ser perguntas de escopo;
- quando a Patty responder "todos os itens" em listas de funcionalidades da cliente ou do admin, todos os itens passam a compor o escopo do sistema completo;
- funcionalidades ja confirmadas, como check-ins de liquidos e atividade fisica, tambem fazem parte do sistema completo;
- nao usar "MVP", "segunda fase" ou "fora do MVP" para excluir funcionalidade ja confirmada do produto;
- ainda e valido priorizar tecnicamente a ordem de implementacao, desde que isso nao seja confundido com retirada de escopo.

### REGRA DE CONTINUIDADE

Continuam valendo as distincioes entre:
- confirmado x aberto;
- implementado x testado x aplicado x publicado;
- automacao autorizada x regra profissional ainda pendente.

Construir o sistema completo nao autoriza inventar regras profissionais ainda nao confirmadas.

### DOCUMENTACAO

Os arquivos historicos `MVP.md` e `MVP_READINESS.md` permanecem com esses nomes para evitar quebrar referencias existentes, mas passam a representar, respectivamente, o **escopo completo do sistema** e o **mapa de prontidao do sistema completo**.

## 2026-09-27 - Escopo obrigatorio da Patty antes do uso real

### DEFINICAO DE PRODUTO

Nesta rodada, **primeiro lancamento** significa a primeira versao do aplicativo considerada pronta para uso real no atendimento pela Patty e pelas clientes. Nao significa o primeiro dia de uma cliente nem o primeiro acesso ao sistema.

### DECISAO DE PRODUTO CONFIRMADA PELA PATTY

Todos os itens listados na pergunta 8 devem estar disponiveis para a Patty antes de o aplicativo entrar em uso real:

- convidar/cadastrar cliente;
- editar Cadastro Atual;
- ler a Anamnese;
- registrar correcao posterior da Anamnese preservando historico;
- solicitar esclarecimento a cliente;
- acessar fotos, exames e documentos privados autorizados;
- criar e trabalhar com avaliacoes;
- comparar avaliacoes/evolucao;
- criar/editar protocolo;
- criar nova versao de protocolo;
- revisar e aprovar protocolo;
- publicar protocolo para a cliente;
- liberar conteudos;
- visualizar/administrar solicitacao de treino;
- usar o painel de pendencias;
- usar a assistencia de IA para revisao da Anamnese, respeitando os gates de privacidade e revisao humana.

Nenhum desses itens deve ser planejado como funcionalidade de uma segunda fase posterior ao inicio do uso real.

### LIMITE

Esta decisao define **escopo obrigatorio**, nao declara que todos os itens ja estejam implementados, testados, aplicados ou publicados. A prontidao tecnica de cada fluxo continua devendo ser verificada separadamente.

## 2026-09-27 - Escopo obrigatorio da cliente no primeiro lancamento

### DECISAO DE PRODUTO CONFIRMADA PELA PATTY

Todos os itens listados na pergunta 7 da rodada de fechamento sao obrigatorios no primeiro lancamento para a cliente:

- Perfil/Cadastro Atual;
- Anamnese;
- envio e visualizacao de fotos;
- envio e visualizacao de exames/documentos;
- avaliacoes e medidas;
- visualizacao do protocolo alimentar publicado;
- conteudos educacionais;
- biblioteca de exercicios;
- solicitacao de treino;
- visualizacao do treino quando houver prescricao;
- pedidos/respostas de esclarecimento dentro do aplicativo;
- visualizacao da evolucao.

Nenhum desses itens deve ser adiado para uma segunda fase do lancamento inicial.

### LIMITE

O check-in de liquidos e atividade fisica foi definido em respostas posteriores a pergunta 5 e nao fazia parte da lista original da pergunta 7. Seu recorte exato no primeiro lancamento continua sendo tratado separadamente ate decisao explicita.

## 2026-09-27 - Substituicoes dentro dos Grupos de Proteina

### REGRA CONFIRMADA PELA PATTY

A cliente pode escolher livremente substituicoes de alimentos dentro do grupo de equivalentes permitido pelo protocolo.

Na proteina existem dois grupos:
- maior teor de gordura;
- menor teor de gordura.

O grupo de maior teor de gordura possui limite diario. A justificativa profissional informada pela Patty e evitar excesso de gordura na alimentacao e considerar cuidados relacionados a saude e colesterol.

O limite permanece sendo metade das doses totais de proteina, arredondando para cima.

Exemplo confirmado: com 10 doses totais de proteina, no maximo 5 podem vir do grupo de maior teor de gordura; as 5 restantes devem vir do grupo de menor teor de gordura.

Ao atingir esse limite, as doses restantes de proteina do dia devem ser escolhidas no grupo de menor teor de gordura.

"Libre escolha" no grupo de menor teor de gordura significa escolha entre os alimentos permitidos dentro do total de doses de proteina do protocolo; nao significa proteina ilimitada.

## 2026-09-27 - Visibilidade do Protocolo e Check-in de Metas

### REGRA CONFIRMADA PELA PATTY

Depois de revisado e publicado:
- a cliente deve visualizar sua rotina de alimentacao;
- quando houver treino prescrito, deve visualizar sua rotina de treinos;
- a cliente nao precisa registrar execucao diretamente dentro do protocolo alimentar ou do treino publicado.

O produto deve prever um check-in de acompanhamento e incentivo para:
- registrar liquidos consumidos ao longo do dia;
- acompanhar progresso em relacao a uma meta de liquidos;
- receber lembretes para apoiar o cumprimento da meta;
- realizar um check-in diario de atividade fisica, registrando se fez ou nao fez atividade naquele dia;
- acompanhar progresso dessas metas.

A meta diaria de liquidos foi confirmada posteriormente pela Patty como **60 mL por kg de peso corporal**.

Formula do metodo:

`meta_liquidos_ml = peso_kg * 60`

Exemplo: 60 kg -> 3.600 mL/dia (3,6 L/dia).

A Patty orienta que a maior parte da meta seja agua pura. O restante pode ser complementado, em menor quantidade, por liquidos zero calorias, como cha, chimarrao, suco zero ou refrigerante zero.

O check-in diario de atividade fisica e independente do treino prescrito ou de qualquer rotina previamente definida. A frequencia pode ser derivada depois dos registros diarios.

### MOMENTO DE DEFINICAO CONFIRMADO

As metas e configuracoes individuais do check-in podem ser definidas na entrega do primeiro protocolo da cliente.

### QUESTOES AINDA ABERTAS

Ainda precisam ser formalizados como padrao/regra:
- proporcao minima/exata de agua pura dentro da meta;
- se/quando recalcular a meta apos mudanca de peso;
- horarios e cadencia dos lembretes;
- visibilidade e poderes de correcao da Patty;
- politica de edicao de check-ins passados.

A formula 60 mL/kg esta confirmada como regra deterministica do metodo. Nao criar score automatico de adesao a partir do check-in.

## 2026-09-27 - Escopo de Edicao Manual da Patty

### REGRA CONFIRMADA PELA PATTY

Ao montar ou ajustar um protocolo/acompanhamento, a Patty precisa poder editar manualmente:
- fase/protocolo;
- totais de proteina, carboidrato e gordura;
- numero de refeicoes;
- distribuicao de doses entre refeicoes;
- alimentos/equivalentes;
- dias Low/High, quando aplicavel;
- refeicao livre, quando aplicavel;
- observacoes;
- data de inicio;
- orientacoes especificas;
- treino, quando o cliente solicitar esse servico;
- suplementacao;
- manipulados.

### AUTOMACAO PERMITIDA QUANDO A REGRA EXISTIR

Quando houver regra previamente confirmada, documentada e deterministica, o sistema pode montar automaticamente um rascunho para revisao da Patty. Isso pode incluir, por exemplo:
- gramas de proteina, carboidrato e gordura previstas para determinada fase;
- estrutura alimentar derivada dessas regras;
- treino predefinido quando existir passo a passo de exercicios previamente confirmado e aplicavel.

A Patty deve visualizar o rascunho, revisar, corrigir se necessario e somente depois aprovar/publicar.

### LIMITE

Nenhuma regra ausente pode ser inferida. Regras de treino, suplementacao, manipulados, doses, progressao, contraindicacoes e criterios profissionais continuam abertas onde ainda nao houver confirmacao especifica.

## 2026-09-27 - Historico de Avaliacoes e Correcao de Erro

### REGRA CONFIRMADA PELA PATTY

A Patty distinguiu dois cenarios:

1. **Nova avaliacao de acompanhamento**
   - a avaliacao anterior e sempre mantida;
   - uma nova avaliacao e criada;
   - a nova avaliacao recebe sua propria data;
   - o historico de avaliacoes anteriores permanece preservado.

2. **Correcao de erro de lancamento**
   - se algum dado foi registrado incorretamente em uma avaliacao, a Patty precisa voltar a essa avaliacao;
   - o dado incorreto deve ser corrigido;
   - o valor errado nao deve continuar como dado valido da avaliacao.

### QUESTAO TECNICA ABERTA

A regra profissional exige que o dado errado deixe de valer, mas ainda precisa ser definida a forma auditavel de implementar essa correcao no banco sem perder rastreabilidade. Nao criar nova avaliacao apenas para corrigir erro de digitacao.

## 2026-09-27 - Catalogo da Avaliacao Completa

### REGRA CONFIRMADA PELA PATTY

Na Avaliacao Completa, sao solicitados:
- peso, em quilogramas (kg);
- cintura, em centimetros (cm);
- abdomen, em centimetros (cm);
- coxa, em centimetros (cm);
- biceps, em centimetros (cm);
- busto para mulher ou peito para homem, em centimetros (cm);
- quadril, em centimetros (cm);
- ombros, em centimetros (cm);
- panturrilhas, em centimetros (cm);
- fotos de avaliacao.

Para medidas unilaterais, deve ser utilizado somente o lado direito do corpo.

A lista acima substitui referencias anteriores incompletas ao catalogo da avaliacao completa. Para a medida do torax, a nomenclatura confirmada e **busto para mulher** e **peito para homem**. Trata-se da mesma posicao no catalogo; nao criar duas medidas separadas na mesma avaliacao apenas pela diferenca de nomenclatura.

### LIMITE

Esta resposta fecha catalogo e unidades da Avaliacao Completa, mas nao resolve:
- calendario para datas-ancora 29, 30 ou 31 em meses sem o mesmo dia;
- correcao auditavel de avaliacao finalizada.

## 2026-09-27 - Avaliacao Basica e Avaliacao Completa

### REGRA CONFIRMADA PELA PATTY

A nomenclatura profissional de avaliacao corporal passa a ser:
- **Avaliacao Completa**: substitui o nome historico "mensal";
- **Avaliacao Basica**: substitui o nome historico "quinzenal".

A cadencia e individual e fica ancorada na data de inicio do acompanhamento:
- a Avaliacao Completa ocorre mensalmente no mesmo dia do mes correspondente ao inicio do processo;
- a Avaliacao Basica ocorre no meio do intervalo entre duas Avaliacoes Completas;
- exemplo fornecido pela Patty: Avaliacao Completa no dia 2 -> Avaliacao Basica no dia 17.

Portanto, o desenho normal nao cria uma avaliacao "mensal" e outra "quinzenal" concorrentes na mesma data. A Basica e uma ocorrencia intermediaria dentro do ciclo entre Completas.

### LIMITE

Ainda nao esta definida a regra de calendario para clientes cuja data-ancora seja 29, 30 ou 31 em meses que nao possuam o mesmo dia.

O catalogo completo de medidas e unidades da Avaliacao Completa tambem permanece aberto.

## 2026-09-24 - Vercel Private Blob para midia educacional

### DECISAO TECNICA

A midia binaria da biblioteca educacional usara Vercel Blob com acesso privado na primeira versao operacional.

Motivos:
- o primeiro video aprovado possui ~117,6 MiB e excede o limite atual de 50 MB do Supabase Free;
- o aplicativo ja esta hospedado na Vercel;
- Vercel Blob suporta objetos privados, uploads grandes/multipart e URLs assinadas;
- a arquitetura pode usar OIDC no runtime Vercel, evitando secret estatico de longa duracao quando o store estiver conectado ao projeto;
- nao e necessario introduzir outro fornecedor apenas para o primeiro lote.

O Supabase continua sendo a fonte de verdade de metadados, versionamento, releases e autorizacao. O bucket `client-private` nao sera reutilizado.

### DECISAO DE MODELO

`educational_content_assets` liga um asset a uma versao exata de conteudo. A v1 registra provider, path, MIME, tamanho e SHA-256. Asset de versao publicada e imutavel.

Cliente so pode ler metadata de asset quando a mesma versao estiver explicitamente liberada para ela. O acesso ao blob privado sera mediado server-side/signed URL apos autorizacao no Supabase.

### LIMITE

Criar a tabela de metadata nao significa que o Blob store exista nem que o video tenha sido copiado. Criacao do store, upload do arquivo original, verificacao de hash e publicacao permanecem passos operacionais separados.

### ESTADO OPERACIONAL

A migration `20260924210600_create_educational_content_assets.sql` foi aplicada no Supabase SaaS em 2026-09-24 e passou smoke pos-apply sintetico com `ROLLBACK`. O PR #157 foi mergeado no commit `857daed` e o deployment correspondente ficou `READY` em producao. Nenhum Blob store foi criado e nenhum arquivo foi migrado nesta etapa.

## 2026-09-24 - Gmail da Patty como SMTP do MVP

### DECISAO TECNICA/OPERACIONAL

No MVP, os emails de autenticacao e convite serao enviados pelo Gmail pessoal da Patty via Custom SMTP do Supabase Auth.

A escolha considera o baixo volume previsto nesta etapa e evita introduzir um provedor transacional adicional antes de existir necessidade operacional.

O fluxo de onboarding continua usando `admin.auth.admin.inviteUserByEmail`; o codigo da aplicacao nao envia email diretamente pelo Gmail.

### SEGURANCA

A conta Google deve usar verificacao em duas etapas e uma App Password exclusiva para o SMTP. A senha principal da Patty nao sera usada.

A App Password deve ser digitada diretamente na configuracao SMTP do Supabase e nao pode ser colocada no repositorio, em migrations, logs, screenshots, chat ou variaveis publicas.

### LIMITE

Gmail e a escolha atual do MVP, nao uma dependencia permanente da arquitetura. Se volume, entregabilidade, observabilidade ou confiabilidade exigirem, o Custom SMTP pode ser trocado por provedor transacional sem alterar o lifecycle de onboarding.

A configuracao operacional esta descrita em `docs/GMAIL_SMTP_SETUP.md`.

## 2026-09-24 - Rollout OpenAI permanece opt-in

### DECISAO TECNICA/OPERACIONAL

Publicar o adapter OpenAI nao habilita processamento externo. O envio de dados reais depende simultaneamente de credencial server-side e do feature gate `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=true`.

A avaliacao inicial do modelo deve usar apenas fixtures sinteticas por meio de `npm run eval:ai:openai`.

O checklist de liberacao fica versionado em `docs/OPENAI_HEALTH_DATA_GATE.md`.

## 2026-09-24 - Provider OpenAI para revisao assistida da Anamnese

### REGRA CONFIRMADA PELO PROJETO

O provider do primeiro fluxo de IA assistiva sera a OpenAI.

### DECISAO TECNICA

A integracao usa a Responses API diretamente por HTTPS no backend Next.js/Vercel, sem expor chave no browser e sem introduzir n8n/LangGraph. As chamadas usam `store: false` e Structured Outputs com JSON Schema.

O default tecnico inicial e `gpt-5.6-terra`, escolhido por equilibrio entre inteligencia e custo para este fluxo de revisao. `OPENAI_MODEL` pode sobrescrever o default em avaliacao/rollout sem alterar regra profissional. O reasoning effort inicial e `medium`, sujeito a avaliacao sintetica de qualidade, custo e latencia.

A chamada externa so fica habilitada quando:
- `OPENAI_API_KEY` estiver configurada;
- `OPENAI_MODEL` estiver configurado;
- `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=true` estiver explicitamente habilitado depois da revisao operacional de privacidade/dados.

### MINIMIZACAO

IDs internos de answers/questions nao sao enviados ao provider. A execucao cria aliases efemeros como `A1` e `Q1`, mapeados de volta server-side antes da validacao deterministica.

`instagram` permanece excluido. Capacidade financeira permanece opt-in explicito por execution. Campos nao aplicaveis continuam fora do contexto.

### REVISAO HUMANA

A resposta da OpenAI entra somente como output interno de `anamnesis_review`. Achados nao criam esclarecimento, diagnostico, pendencia, protocolo, publicacao ou mensagem para cliente automaticamente.

### ESTADO OPERACIONAL

A migration `20260924193339_seed_openai_anamnesis_review_prompt.sql` foi aplicada no Supabase SaaS em 2026-09-24. O prompt v1 existe exatamente uma vez e nenhuma execution foi criada durante apply/validacao. A chamada externa permanece desabilitada por feature gate.

## 2026-09-24 - Fundacao de esclarecimentos pos-Anamnese

### DECISAO TECNICA/PRODUTO

O pedido de esclarecimento confirmado pela Patty passa a ter uma fundacao append-only propria, separada de resposta original, correcoes administrativas e notas internas.

A primeira versao suporta:
- pedido textual da Patty apenas para Anamnese ja enviada;
- vinculo opcional a uma resposta original da mesma submission;
- resposta textual complementar da propria cliente;
- multiplos complementos preservados cronologicamente;
- nenhuma edicao ou exclusao de pedido/resposta pelo fluxo normal;
- AAL2 + assignment ativo para criacao/leitura administrativa;
- cliente le somente pedidos da propria Anamnese e escreve somente complementos em proprio nome.

Nao existe estado formal de aberto/resolvido, prazo, expiracao ou notificacao automatica nesta fundacao. Esses pontos continuam abertos.

### LIMITE

Complemento da cliente nao altera a resposta original e nao e tratado automaticamente como correcao. A inclusao futura em contexto de IA permanece decisao separada.

### ESTADO OPERACIONAL

A migration `20260924153808_create_anamnesis_clarification_flow.sql` foi aplicada no Supabase SaaS em 2026-09-24. Smoke pos-apply com dados sinteticos e `ROLLBACK` confirmou as invariantes de autoria, isolamento, append-only e preservacao da resposta original. A UI passou CI/build no PR #146 e o commit de merge `492a7ab` foi publicado como `READY` na Vercel. E2E autenticado de producao continua separado e nao foi alegado como concluido.

# Decisoes

## 2026-09-24 - Submissao final deterministica da Anamnese aplicada

### DECISAO TECNICA E FATO OPERACIONAL

A cliente finaliza a propria Anamnese por uma acao explicita que altera somente `submitted_at` da submission em rascunho. A migration remota `20260924142453_anamnesis_final_submission_foundation` esta aplicada no Supabase SaaS.

O banco e a autoridade final para a transicao:
- RLS limita UPDATE a submission propria ainda nao enviada;
- o papel `authenticated` recebe UPDATE somente da coluna `submitted_at`;
- a versao precisa estar publicada;
- o grafo versionado de aplicabilidade precisa ser resolvivel;
- pergunta aplicavel e obrigatoria precisa possuir resposta valida;
- `text` exige string nao vazia;
- `single_choice` exige valor pertencente as opcoes versionadas;
- pergunta nao aplicavel nao bloqueia;
- o banco normaliza o timestamp com `statement_timestamp()`;
- depois do envio, os guards de imutabilidade existentes continuam bloqueando alteracoes da submission e das respostas originais.

### VALIDACAO

O SQL foi validado antes do apply em transacao com `ROLLBACK` e repetido apos o apply. O smoke sintetico confirmou dependente oculto aceito, dependente aplicavel ausente bloqueado, submissao completa aceita e timestamp do caller substituido.

A auditoria pos-apply confirmou que `authenticated` pode atualizar `submitted_at`, mas nao `client_id` nem `form_version_id`; a policy de UPDATE e o trigger de validacao existem.

### LIMITE

ANAM-046 continua juridicamente pendente. A existencia da submissao final tecnica nao autoriza publicar a primeira `client-anamnesis` antes do fechamento do consentimento.

## 2026-09-24 - Fechamento de produto da Anamnese v1, exceto consentimento juridico

### DECISAO DE PRODUTO

A reorganizacao nao juridica da primeira Anamnese canonica esta aceita para a v1. Esta decisao organiza o formulario historico confirmado pela Patty e nao cria regra clinica, diagnostico, alerta, score ou criterio profissional.

Ficam definidos:
- tipos `text` e `single_choice` do mapa para todos os campos nao juridicos;
- os 10 desdobramentos explicitos Sim/Nao + detalhe, com o detalhe aplicavel somente quando a pergunta-base possui resposta JSON exata `"Sim"`;
- ANAM-025 e ANAM-043 permanecem juntas;
- a ordem de secoes/perguntas descrita na especificacao v1, com ANAM-010 em Cadastro;
- salvamento explicito por resposta; autosave nao e requisito do MVP;
- envio final por acao explicita da cliente.

### DECISAO DE PRODUTO — ANAM-044

ANAM-044 nao cria `anamnesis_answer`. A secao Arquivos orienta e aponta para `/cliente/arquivos`, usando o dominio privado existente. A finalidade fica em `file_kind`: `photo`, `exam` ou `document`.

Nao duplicar bytes, metadados ou referencias em respostas da Anamnese. Sem nova regra profissional confirmada, a existencia de upload nao bloqueia o envio final.

### LIMITE JURIDICO

ANAM-046 continua pendente. Texto definitivo, versao, base legal, forma de aceite, revogacao, retencao e impacto da recusa exigem validacao juridica/operacional.

Enquanto ANAM-046 nao estiver resolvido, a primeira `client-anamnesis` permanece **NAO PUBLICAVEL**.

## 2026-09-24 - Fundacao versionada de aplicabilidade da Anamnese

### DECISAO TECNICA

A primeira fundacao de perguntas condicionais usa duas colunas opcionais na propria `anamnesis_questions`:
- `applicability_source_question_id`;
- `applicability_expected_answer`.

Sem fonte/valor esperado, a pergunta e aplicavel por padrao. Com regra, a aplicabilidade e satisfeita somente quando a resposta da pergunta controladora corresponde exatamente ao JSON esperado.

A fonte obrigatoriamente pertence a mesma `form_version_id`, nao pode ser a propria pergunta dependente e o par fonte/valor deve existir em conjunto.

### LIMITE

Essa decisao define somente a representacao tecnica. Nao define nenhuma dependencia profissional concreta do questionario e nao autoriza inferir condicionais a partir do texto historico.

A v1 nao suporta AND/OR, range, negacao ou operadores clinicos.

### VALIDACAO

O SQL foi executado em transacao no Supabase SaaS com `ROLLBACK`. Foram verificados:
- regra valida aceita;
- fonte sem valor esperado rejeitada;
- fonte de outra versao rejeitada;
- auto-referencia rejeitada;
- `json null` rejeitado;
- nenhuma coluna persistida apos rollback.

A migration foi gerada pelo Supabase CLI 2.117.0 com o nome `20260924105003_add_anamnesis_question_applicability_foundation.sql`.

Estado desta decisao: **APLICADA E VERIFICADA NO SAAS**.

### EVIDENCIA POS-APPLY

Em 2026-09-24, o fluxo de deploy do Supabase confirmou:
- dry-run listando somente `20260924105003_add_anamnesis_question_applicability_foundation.sql`;
- apply concluido com sucesso;
- `migration list` pos-apply com `20260924105003` presente local e remoto;
- duas colunas novas presentes em `anamnesis_questions`;
- quatro constraints de aplicabilidade presentes;
- indice parcial presente;
- RLS de `anamnesis_questions` continuou habilitada;
- smoke transacional pos-apply validou regra aceita e rejeicoes esperadas;
- `0` formularios sinteticos `e2e-applicability-*` restantes apos rollback.

Os advisors de seguranca nao apontaram novo problema relacionado a esta migration. O unico warning de seguranca continua sendo Leaked Password Protection desabilitada por limitacao de plano/configuracao ja conhecida.


## 2026-09-24 - Gates de producao da Anamnese validados

### FATO OPERACIONAL CONFIRMADO

Os gates foram executados com o codigo de aplicacao do commit `19d216bf2148e983d452f0555a2d1e740e1027ca`, publicado na Vercel como deployment de producao `READY`. Esse commit permanece contido no `master`; merges exclusivamente documentais posteriores nao invalidam a evidencia.

A validacao de runtime confirmou:
- GET real de `/login` com CSP, Permissions-Policy, `no-referrer`, `nosniff` e `X-Frame-Options: DENY`;
- smoke E2E da cliente para retomada de rascunho e INSERT/UPDATE de resposta `text`;
- smoke E2E administrativo da rota de correcoes com MFA e leitura da resposta original;
- caso de JSON invalido sem criacao de historico;
- cleanup sem residuos: `0` drafts E2E ativos e `0` correcoes E2E residuais.

O run final de producao foi `35985899621` e concluiu com `success`.

### CORRECAO DE TESTE

As falhas imediatamente anteriores eram de seletores Playwright ambiguos, nao de runtime:
- heading `Anamnese` passou a exigir match exato;
- a resposta original administrativa passou a ser localizada dentro do bloco `Resposta original`.

Nenhuma regra de negocio, schema, RLS ou comportamento de producao foi alterado para obter o PASS.

### LIMITE

Isso valida o fluxo de **retomada/edicao de rascunho existente** e a **UI administrativa de correcoes**.

A criacao inicial de nova Anamnese ainda depende da primeira versao canonica publicada com `form_key = client-anamnesis`. A submissao final continua separada e depende do fechamento do questionario/tipos/condicionais.


## 2026-09-24 - Fases 5 e 6 do Carb Cycle permanecem pendentes

### CONFIRMACAO DA PATTY

A Patty confirmou explicitamente que as regras das Fases 5 e 6 da Planilha Carb Cycle continuam pendentes.

### CONSEQUENCIA

Nenhuma formula, criterio ou comportamento dessas fases deve ser:
- inferido a partir das fases anteriores;
- implementado em codigo;
- usado em rascunho automatico como se fosse regra confirmada.

Qualquer uso futuro depende de nova confirmacao profissional e atualizacao documental previa.


## 2026-09-24 - Cutting 3 Linear e etapa seguinte

### DECISAO SUPERADA PARCIALMENTE POR CONFIRMACAO DE 2026-09-27

A confirmacao anterior registrava apenas a existencia de `Cutting 3 Linear`.

A Patty confirmou posteriormente que o Cutting 3 segue a mesma estrutura de progressao:
- Cutting 3 Linear;
- Cutting 3 Dia 1 / Dia 2;
- Cutting 3: 2 Low / 1 High;
- depois, Up Metabolico.

No Cutting 3, as quantidades de proteina e carboidrato diminuem de acordo com o peso da cliente, com base em tabelas existentes em Excel.

Ainda permanecem pendentes de reconciliacao documental:
- valores exatos das tabelas por peso;
- formulas/calculos derivados dessas tabelas;
- duracao e criterios de encerramento;
- etapas posteriores ao Up Metabolico que sucede o Cutting 3.

Nao implementar os numeros sem conferir a planilha fonte.


## 2026-09-24 - Conteudos de formulas/manipulados fazem parte do aplicativo

### REGRA CONFIRMADA PELA PATTY

A Patty confirmou que conteudos sobre formulas/manipulados devem fazer parte do aplicativo.

### LIMITE PROFISSIONAL E DE PUBLICACAO

Essa confirmacao nao autoriza publicar diretamente o arquivo historico `Fórmulas.pptx`.

Antes de qualquer disponibilizacao a clientes, o material deve passar por:
- revisao profissional completa;
- confirmacao de que as orientacoes ainda representam a pratica atual da Patty;
- revisao das alegacoes de efeito/beneficio;
- revisao de referencias comerciais e contato de farmacia;
- confirmacao de autoria/direitos de distribuicao;
- criacao de nova versao publicavel e aprovacao explicita da Patty.

### CONSEQUENCIA DE PRODUTO

O tema deixa de ser apenas um artefato historico do Drive e passa a fazer parte do escopo da biblioteca educacional, mas suas **regras profissionais concretas de suplementacao/manipulados continuam abertas** ate documentacao especifica.


## 2026-09-24 - Planilha historica de refeicoes vira conteudo educacional revisado

### REGRA CONFIRMADA PELA PATTY

A Patty confirmou que a planilha historica `Sugestao de refeicoes` deve ser transformada em conteudo educacional revisado para clientes.

### LIMITE PROFISSIONAL

O arquivo historico possui um exemplo com seis refeicoes. Isso nao se torna regra do metodo.

Permanece a regra ja confirmada:
- nao existe numero fixo de refeicoes;
- a quantidade de refeicoes e adaptada a rotina/preferencia com foco em adesao.

Portanto, a versao educacional futura deve reaproveitar conceitos/exemplos uteis sem apresentar seis refeicoes como obrigatorias ou padrao universal.

### CONSEQUENCIA DE PRODUTO

O arquivo original permanece preservado como fonte historica. A publicacao para clientes deve ocorrer por uma nova versao educacional revisada, sujeita a revisao e aprovacao da Patty antes de release.


## 2026-09-24 - Video de uso da balanca aprovado para disponibilizacao

### REGRA CONFIRMADA PELA PATTY

A Patty confirmou que o video historico `Como utilizar a BALANCA DE ALIMENTOS`, arquivo de origem do Drive `1z61DpJfwp-6DMhYMpCRNafkSwX6h9LBE`:
- e material da Consultoria/Patty;
- continua atual;
- esta autorizado para disponibilizacao as clientes no aplicativo.

### CONSEQUENCIA DE PRODUTO

Esse item passa a ser o primeiro conteudo elegivel para migracao controlada do Drive.

### LIMITE

A confirmacao profissional nao equivale a migracao tecnica nem publicacao. Continuam separadas:
1. origem aprovada;
2. copia para armazenamento do aplicativo;
3. registro/versionamento do conteudo;
4. revisao tecnica da versao criada;
5. publicacao;
6. release explicito para cliente.

Nenhuma dessas etapas posteriores deve ser marcada como concluida ate ser executada e verificada.


## 2026-09-24 - Esclarecimento pos-Anamnese deve voltar para a cliente

### REGRA CONFIRMADA PELA PATTY

Durante a analise da Anamnese, quando faltar uma informacao importante ou uma resposta estiver pouco clara, a Patty deve solicitar o esclarecimento a cliente dentro do aplicativo.

A Patty nao deve completar silenciosamente a resposta original da cliente por conta propria.

### CONSEQUENCIA DE PRODUTO

O produto deve preservar separadamente:
- resposta original enviada pela cliente;
- pedido de esclarecimento;
- resposta posterior da cliente ao esclarecimento;
- eventuais notas/correcoes administrativas da Patty.

### LIMITE

Ainda precisam ser definidos:
- como a cliente sera notificada;
- como o pedido aparece na interface;
- se existe prazo/expiracao;
- como fica o estado visual da pendencia;
- como a resposta complementar entra no contexto de IA e no historico.


## 2026-09-24 - Anamnese enviada entra diretamente em analise

### REGRA CONFIRMADA PELA PATTY

Depois que a cliente finaliza e envia a Anamnese, ela entra diretamente na analise profissional da Patty.

Nao sao necessarios estados intermediarios de workflow como:
- recebida;
- em revisao;
- pendencias;
- concluida.

### LIMITE

Essa decisao simplifica o lifecycle administrativo da Anamnese, mas nao elimina a possibilidade de:
- notas internas;
- findings de IA;
- pedidos pontuais de esclarecimento;
- correcoes append-only;
- outras acoes internas que venham a ser confirmadas.

Essas acoes, se existirem, nao devem ser modeladas como estados obrigatorios de uma maquina de workflow sem decisao posterior.


## 2026-09-24 - Perguntas atuais da Anamnese permanecem como base

### REGRA CONFIRMADA PELA PATTY

A Patty confirmou que as perguntas do formulario atual devem ser mantidas como base da Anamnese no aplicativo.

A intencao nesta etapa e **organizar melhor a experiencia**, e nao realizar uma revisao ampla com remocao/adicao de varias perguntas.

### LIMITE

Essa confirmacao preserva o conteudo-base, mas ainda permite e exige decisoes de produto sobre:
- agrupamento e ordem;
- tipos de input;
- separacao ou manutencao de perguntas compostas;
- logica condicional;
- apresentacao de dados cadastrais;
- exclusao das medidas corporais da Anamnese para fluxo proprio de Avaliacao/Medidas.

Nenhuma reorganizacao deve alterar silenciosamente o sentido profissional da pergunta original.


## 2026-09-24 - Cadencia confirmada de avaliacoes corporais

### REGRA CONFIRMADA PELA PATTY

A Patty confirmou a seguinte rotina de avaliacao:

- **quinzenalmente**: cintura, abdomen, quadril e peso;
- **mensalmente**: avaliacao completa com todas as medidas, peso e fotos.

### LIMITE

Ainda nao foram definidos/documentados nesta resposta:
- quais campos compoem exatamente "todas as medidas" da avaliacao mensal;
- as unidades de cada medida;
- se a avaliacao mensal substitui ou acumula com a ocorrencia quinzenal quando coincidirem;
- o fluxo auditavel de correcao historica.

Esses pontos permanecem abertos e nao devem ser inferidos.


## 2026-09-24 - Medidas corporais separadas da Anamnese

### REGRA CONFIRMADA PELA PATTY

A Patty confirmou que as medidas corporais podem ser separadas da Anamnese e tratadas em um fluxo proprio de Avaliacao/Medidas.

### LIMITE

Essa confirmacao resolve a separacao de fluxo, mas nao define automaticamente:
- catalogo definitivo de medidas;
- unidades permitidas;
- campos obrigatorios;
- criterios de avaliacao/evolucao;
- fluxo auditavel de correcao de medidas historicas.

Os campos de medidas observados no formulario historico permanecem como evidencia de origem e nao devem ser promovidos automaticamente para a Anamnese final.


## 2026-09-24 - Dados cadastrais permanecem visiveis dentro da Anamnese

### REGRA CONFIRMADA PELA PATTY

A Patty confirmou que os dados cadastrais podem permanecer dentro da Anamnese final.

### LIMITE TECNICO

Essa confirmacao define o fluxo/apresentacao da Anamnese e nao altera as separacoes ja documentadas:
- Auth User continua diferente de Profile, Client e Cadastro Atual;
- `client_registration` continua sendo o Cadastro Atual;
- valores cadastrais preservados em uma submission de Anamnese sao snapshot historico daquele contexto;
- alterar cadastro atual nao altera silenciosamente anamneses historicas e vice-versa.


## 2026-09-23 - Inicio seguro do rascunho da Anamnese

### DECISAO TECNICA

O fluxo da cliente para iniciar uma nova Anamnese nao pode selecionar genericamente a ultima versao publicada do banco.

Motivo: o mesmo schema pode conter fixtures sinteticas publicadas para E2E. Na verificacao do Supabase SaaS desta tarefa, a unica versao publicada encontrada tinha `form_key` sintetica `e2e-correction-*`.

Foi definida a chave tecnica canonica:

`client-anamnesis`

O fluxo preparado:
- procura somente `anamnesis_forms.form_key = client-anamnesis`;
- considera apenas versoes com `published_at`;
- escolhe a maior `version_number`;
- cria draft para a cliente autenticada via sessao normal/RLS;
- reaproveita draft ativo da mesma cliente/versao, inclusive em corrida de unique violation;
- nao habilita submissao final;
- nao cria nem publica definicao de Anamnese automaticamente.

Enquanto o formulario canonico nao existir com versao publicada, a UI permanece sem acao de inicio. Isso e bloqueio seguro, nao erro de produto.


## 2026-09-23 - Apply da correcao de DELETE do rascunho e confirmacao do failure handling

### FATO OPERACIONAL CONFIRMADO

O workflow manual `Deploy Supabase migrations` executado no `master` em 2026-09-23 confirmou no `migration list` remoto que `20260922160058_ai_execution_failure_handling.sql` ja constava aplicada no Supabase SaaS.

No mesmo fluxo, o dry-run listou apenas `20260923191554_fix_anamnesis_draft_delete_trigger.sql` como pendente. O apply seguinte aplicou essa migration com sucesso e o `migration list` pos-apply confirmou `20260923191554` presente local e remoto.

Isso separa dois estados:
- failure handling de IA: migration presente no repositorio e confirmada no historico remoto;
- correcao do DELETE de rascunho: migration aplicada no SaaS e validada no banco por smoke transacional; a validacao E2E de UI continua dependente de um deployment Vercel atualizado.

### VERIFICACAO POS-APPLY

Um smoke transacional no Supabase SaaS, usando somente dados sinteticos e finalizado com `ROLLBACK`, confirmou:
- exclusao privilegiada de submission nao enviada remove a linha de fato;
- tentativa de excluir submission enviada continua falhando com SQLSTATE `55000`;
- a submission enviada permanece presente apos a tentativa bloqueada;
- cliente A nao consegue ler a submission da cliente B sob RLS.

A primeira tentativa do smoke foi abortada corretamente pelo trigger de imutabilidade porque a fixture tentou inserir uma resposta depois de marcar a submission como enviada. O teste foi corrigido para respeitar o lifecycle valido: resposta primeiro, `submitted_at` depois.


## 2026-09-23 - Reconciliacao de questoes abertas da Anamnese

### FATO DOCUMENTAL

`OPEN_QUESTIONS.md` foi reconciliado com implementacoes e decisoes ja existentes.

Deixam de ser tratadas como questoes abertas:
- a forma de registrar correcao posterior sem sobrescrever a resposta original;
- a existencia de uma UI administrativa para visualizar e acrescentar correcoes historicas.

Permanece aberta somente a parte ainda nao definida do workflow administrativo completo de revisao da Anamnese.

A pergunta generica sobre campos obrigatorios tambem foi ajustada para nao contradizer a regra confirmada de que todos os campos aplicaveis da Anamnese sao obrigatorios no envio final. O mapa final de campos e a aplicabilidade condicional continuam abertos.

## 2026-09-23 - Recuperacao do deployment de producao Vercel

### FATO OPERACIONAL CONFIRMADO

O merge do PR #120, commit `602c6d5129b093fc092f7b87209f21d1eab574ca`, recebeu status Vercel `success` com a descricao `Deployment has completed`.

Isso encerra a condicao anterior em que o `master` estava necessariamente atras da producao por `build-rate-limit`. O status de deployment bem-sucedido, isoladamente, nao prova os comportamentos de runtime. Permanecem como gates:
- GET real em `/login` para confirmar headers HTTP;
- smoke E2E de correcoes administrativas;
- smoke E2E do rascunho da Anamnese.

O gate versionado correspondente esta em `VERCEL_PRODUCTION_GATE.md`.

## 2026-09-23 - Controle de previews Vercel e divergencia temporaria de producao

### FATO OPERACIONAL CONFIRMADO

O ultimo merge de `master` com status Vercel `success` e `b466accc8a5f` (PR #88, 2026-09-23 13:00 UTC).

Todos os merges posteriores consultados ate o estado atual do repositorio receberam status Vercel `failure` com destino indicando `upgradeToPro=build-rate-limit`.

Consequentemente, `master` esta a frente do deployment de producao usado por `E2E_BASE_URL`. Codigo mergeado depois de `b466accc8a5f` deve ser tratado como IMPLEMENTADO/CI VALIDADO, mas nao como PUBLICADO/VALIDADO EM PRODUCAO ate novo deploy bem-sucedido.

### EVIDENCIA DE RUNTIME

Requests GET reais para `/login` no ambiente de producao retornaram HTTP 200 pela Vercel, mas sem os headers adicionados no PR #94, que foi mergeado depois do ultimo deploy de `master` bem-sucedido.

O smoke administrativo de correcoes da Anamnese recebeu HTTP 404 em `/admin/anamneses/[id]/correcoes`. Essa rota foi mergeada no PR #106, tambem posterior ao ultimo deploy de producao bem-sucedido.

Esses resultados confirmam defasagem do deployment e nao devem ser interpretados como regressao funcional do codigo atual.

### DECISAO TECNICA APLICADA

O `vercel.json` passa a desabilitar deployments de preview para branches `codex/**`, preservando o cron existente e deixando `master` elegivel para producao.

Objetivo: evitar que branches tecnicas consumam a cota de builds antes do deployment de `master`.

Essa mudanca reduz consumo futuro, mas nao publica retroativamente o `master` enquanto o limite da conta continuar impedindo novos builds.

### GATE OPERACIONAL

Quando a Vercel voltar a aceitar build de producao:
1. confirmar o SHA efetivamente publicado;
2. validar headers HTTP por GET;
3. repetir smoke administrativo de correcoes da Anamnese;
4. depois de aplicar a migration pendente do trigger de draft, repetir smoke da cliente para retomada de rascunho;
5. somente entao marcar esses fluxos como validados em producao.

## 2026-09-23 - Correcao do trigger de exclusao de rascunho da Anamnese

### FATO TECNICO IDENTIFICADO

O smoke de producao do rascunho sintetico revelou um comportamento incorreto no trigger `anamnesis_submissions_immutable_after_submit`.

A funcao `reject_submitted_anamnesis_submission_mutation()` retornava `NEW` para qualquer operacao permitida. Em um trigger `BEFORE DELETE`, `NEW` e nulo; portanto, a exclusao de uma submission ainda nao enviada era cancelada silenciosamente, sem erro. Isso deixou um rascunho sintetico residual e o indice unico corretamente bloqueou a tentativa posterior de criar um segundo rascunho da mesma cliente/versao.

### DECISAO TECNICA

A migration `20260923191554_fix_anamnesis_draft_delete_trigger.sql` altera apenas o retorno da funcao:

- submission com `submitted_at IS NOT NULL` continua rejeitando UPDATE/DELETE com SQLSTATE `55000`;
- em `DELETE` de rascunho, a funcao retorna `OLD`;
- em `UPDATE` permitido de rascunho, retorna `NEW`.

Isso nao concede DELETE a cliente. Grants e RLS continuam sem permitir exclusao de submission pelo browser; a mudanca apenas faz funcionar corretamente uma exclusao privilegiada/operacional de rascunho.

### VALIDACAO

Dry-run transacional no Supabase SaaS com `ROLLBACK` confirmou:
- exclusao privilegiada de rascunho: PASS;
- exclusao de submission enviada continua bloqueada com `55000`: PASS.

A migration esta versionada e validada, mas ainda nao aplicada no SaaS.

## 2026-09-23 - Retomada parcial de rascunho da Anamnese na UI da cliente

### DECISAO TECNICA/PRODUTO

A UI da cliente pode editar somente um rascunho de Anamnese que ja exista e pertença a propria cliente.

Nesta etapa:
- apenas perguntas com `answer_type = text` sao editaveis;
- cada resposta e salva individualmente no rascunho;
- resposta vazia continua permitida no rascunho, pois obrigatoriedade vale para o envio final;
- submission enviada permanece somente leitura;
- valor estruturado inesperado em pergunta `text` nao e sobrescrito pela UI;
- a Server Action exige role `client`, ownership do rascunho, mesma `form_version_id` e tipo esperado `text`.

A UI **nao**:
- cria uma nova submission automaticamente;
- escolhe a versao publicada que deve ser preenchida;
- implementa os tipos finais de input;
- define autosave definitivo;
- envia a Anamnese.

Esses pontos continuam dependentes das definicoes finais do questionario e da regra de disponibilidade de versao.

### FATO DE TESTE

O formulario persistente `e2e-correction-*` e os perfis `E2E Correction ...` existentes no SaaS pertencem ao smoke administrativo de correcoes. Eles sao fixture sintetica de teste e nao representam uma versao real de Anamnese do produto. Nenhum fluxo de cliente deve selecionar automaticamente uma versao apenas por ela estar publicada.

## 2026-09-23 - Configuracao de Auth de producao auditada e parcialmente endurecida

### FATO TECNICO VALIDADO

A configuracao hospedada do Supabase Auth foi auditada pela Management API usando somente campos nao secretos.

O estado encontrado antes do ajuste era:
- `password_min_length = 6`;
- `password_hibp_enabled = false`;
- Site URL diferente da URL de producao usada pelos smokes;
- redirect allowlist sem a URL de producao;
- template de convite sem o link SSR por `TokenHash`;
- nenhum SMTP customizado configurado.

### DECISAO TECNICA APLICADA

A validacao server-side da aplicacao ja exigia senha com no minimo 8 caracteres. O Supabase Auth foi alinhado para `password_min_length = 8`, sem introduzir nova regra de composicao de senha.

A Site URL do Supabase Auth foi alinhada com a URL de producao ja usada em `E2E_BASE_URL`, e essa mesma origem foi incluida na redirect allowlist preservando entradas existentes.

### LIMITACAO EXTERNA CONFIRMADA

A tentativa de habilitar `password_hibp_enabled` retornou HTTP 402. A documentacao atual do Supabase informa que Leaked Password Protection esta disponivel no plano Pro e superiores. O advisor continua reportando esse unico warning de seguranca enquanto o projeto permanecer sem esse recurso.

A tentativa de alterar `mailer_templates_invite_content` retornou HTTP 400 com mensagem explicita de que projetos Free usando o provedor de email padrao nao podem modificar templates. A propria API informa duas alternativas tecnicas: upgrade de plano ou configuracao de SMTP customizado.

Portanto:
- Site URL e redirect allowlist estao corrigidos;
- senha minima do Auth esta alinhada em 8;
- HIBP permanece bloqueado pelo plano;
- o template real de convite SSR continua bloqueado pela combinacao Free + email provider padrao;
- o E2E sintetico de onboarding continua valido como teste do lifecycle tecnico, mas nao prova entrega/consumo do email real.

Nenhum fallback inseguro foi introduzido para contornar essas limitacoes.

## 2026-09-23 - Otimizacao das policies de correcoes da Anamnese aplicada

### DECISAO TECNICA DE PERFORMANCE

A migration `20260923150743_optimize_anamnesis_correction_rls.sql` foi aplicada no Supabase SaaS pelo workflow manual de migrations.

Ela remove checks diretos redundantes de `auth.jwt()->>'aal'` das policies especificas de `anamnesis_answer_corrections`.

A exigencia de MFA nao foi removida: continua sendo imposta pela policy transversal `RESTRICTIVE admin_mfa_aal2_required`. As policies especificas continuam responsaveis por role relacional `admin`, assignment ativo, autoria da correcao e submission enviada.

### VALIDACAO POS-APLICACAO

Foram confirmados:
- `migration list` local/remoto com `20260923150743` presente nos dois lados;
- admin em `aal1` continua bloqueado;
- admin em `aal2` continua autorizado quando o assignment esta ativo;
- zero chamadas diretas a `auth.jwt()` nas policies especificas de correcoes;
- os warnings `auth_rls_initplan` deixaram de aparecer no advisor de performance.

Os avisos restantes do advisor continuam sendo os 22 foreign keys sem indice de cobertura exata e indices sem uso observado. A decisao documentada de nao criar/remover indices mecanicamente permanece valida.

## 2026-09-23 - E2E sintetico de onboarding/ativacao aprovado

### FATO TECNICO VALIDADO

O workflow manual `E2E client onboarding activation smoke` foi executado em producao contra o `master` e concluiu com sucesso.

O teste sintetico validou o lifecycle tecnico sem depender de inbox real:
- geracao de convite administrativo sintetico;
- provisionamento de identidade/profile/role/client/assignment;
- consumo do token pela rota SSR `/auth/confirm`;
- sessao de ativacao em `/ativar-conta`;
- criacao da senha pela propria cliente;
- acesso subsequente a `/cliente/anamnese`;
- novo login por email + senha em sessao separada;
- cleanup do estado sintetico ao final.

A verificacao posterior no Supabase SaaS confirmou zero residuos do usuario sintetico em `auth.users`, `profiles`, `clients` e `client_assignments`.

Este PASS nao valida o template real de email do Supabase nem a Site URL/redirect allowlist. A configuracao/validacao do template `Invite user` continua como gate operacional separado.

## 2026-09-23 - Hardening de aplicacao e CI independente de regras profissionais

### DECISAO TECNICA DE SEGURANCA

A camada de aplicacao e o CI devem impedir regressao de autorizacao e dependencias vulneraveis sem depender de revisao manual recorrente.

Foram incorporados ao `master`:

- Next.js pinado em `16.3.6`, patch de seguranca upstream aplicado em substituicao a `16.3.5`;
- configuracao publica do Supabase separada fisicamente da leitura de `SUPABASE_SECRET_KEY`, que permanece em modulo `server-only`;
- secrets dos workflows E2E limitados aos passos que efetivamente os usam;
- regressao automatica para classificar toda `route.ts`/`actions.ts` e exigir as guards esperadas;
- regressao automatica das guards dos layouts `/admin`, `/cliente` e paginas de MFA;
- bloqueio em migrations novas de `auth.role()`, metadata editavel de usuario e `SECURITY DEFINER` sem revisao explicita;
- helpers privilegiados de assignment/onboarding derivam a identidade administrativa da sessao AAL2, sem aceitar `staffProfileId` do caller;
- headers HTTP basicos: anti-framing, `nosniff`, `no-referrer`, Permissions Policy restritiva e CSP parcial para `base-uri`, `frame-ancestors` e `form-action`;
- CI com `npm audit --omit=dev --audit-level=high`, bloqueando vulnerabilidades high/critical em dependencias de producao;
- workflows atualizados para `actions/checkout@v7` e `actions/setup-node@v7`, mantendo Node 22 como runtime do projeto.

A CSP permanece deliberadamente parcial. Restricoes completas de `script-src`, `style-src`, `img-src` e `connect-src` so devem ser introduzidas com teste de runtime para nao quebrar hidratacao Next.js, Supabase Auth ou MFA.

A configuracao dos headers passou typecheck, regressao de seguranca e build no CI. A verificacao independente dos headers no deployment de producao nao foi concluida porque o conector Vercel disponivel nesta sessao nao enxerga o time/projeto correspondente; isso e uma pendencia operacional de evidencia, nao falha conhecida do codigo.

## 2026-09-23 - Avisos de foreign keys sem indice nao geram migration automatica

### DECISAO TECNICA

O advisor de performance do Supabase reportou 22 foreign keys sem indice de cobertura exata. Esses avisos foram revisados individualmente antes de qualquer alteracao de schema.

Nao sera criada uma migration apenas para zerar o advisor neste momento.

Motivos:
- cinco dos 22 casos ja possuem indice ou chave primaria cujo primeiro campo corresponde ao primeiro campo da foreign key, oferecendo seletividade util para o acesso atual;
- a maior parte dos demais avisos esta na fundacao de IA, cujas tabelas estao vazias no SaaS e ainda nao possuem workload real;
- varios relacionamentos apontam para registros historicos que o produto deliberadamente preserva e nao costuma apagar, reduzindo o beneficio imediato de indices criados apenas para verificacao de `ON DELETE RESTRICT`;
- o mesmo advisor reporta 37 indices atualmente sem uso observado, portanto adicionar mais indices preventivos sem workload seria ruido e custo de escrita/armazenamento;
- indices novos devem responder a query, RLS, integridade ou volume observado, nao apenas a um lint informativo.

A decisao deve ser reavaliada quando a IA real, progresso de conteudo ou outro fluxo gerar volume mensuravel, ou quando planos de execucao mostrarem scans relevantes.

### FATO TECNICO

O advisor de seguranca reportou `Leaked Password Protection` desativado. A tentativa posterior de habilitacao pela Management API retornou HTTP 402; a documentacao do Supabase limita o recurso ao plano Pro e superiores. A pendencia passa a ser de plano/infraestrutura, nao de implementacao do aplicativo.

## 2026-09-23 - Correcoes historicas da Patty na Anamnese

### REGRA CONFIRMADA PELA PATTY

Depois do envio final, a cliente nao pode editar respostas. Somente a Patty pode registrar correcoes posteriores, sem apagar a resposta originalmente enviada.

### DECISAO TECNICA/PRODUTO

As correcoes posteriores sao modeladas como registros append-only em `anamnesis_answer_corrections`, vinculados a uma resposta original.

Cada correcao preserva:
- `answer_id`;
- valor corrigido separado em `corrected_answer_value`;
- `corrected_by_profile_id`;
- `created_at`.

A resposta em `anamnesis_answers.answer_value` nunca e sobrescrita pela correcao. Mais de uma correcao pode existir para a mesma resposta, preservando a sequencia historica.

Somente admin com assignment ativo para a cliente, sessao `aal2` e Anamnese ja submetida pode inserir correcao. A cliente nao recebe leitura nem escrita dessa tabela nesta fundacao.

UPDATE e DELETE sao bloqueados por privilegios e por trigger de imutabilidade, inclusive para proteger contra ampliacoes futuras de grants.

A migration `20260923114643_anamnesis_answer_corrections_foundation.sql` foi aplicada no Supabase SaaS em 2026-09-23. O smoke pos-aplicacao confirmou: AAL1 bloqueado, AAL2 permitido com assignment ativo, resposta original preservada e UPDATE/DELETE de correcoes bloqueados.

### FATO DE IMPLEMENTACAO

A aplicacao administrativa possui uma rota dedicada de correcoes para Anamneses enviadas. Ela apresenta separadamente a resposta original e todas as correcoes historicas em ordem cronologica e permite somente acrescentar uma nova correcao.

O valor corrigido e informado como JSON explicito para preservar o tipo estrutural sem inferir regra da pergunta. A Server Action exige admin autenticado em AAL2 por `requireRole("admin")`, valida que a resposta pertence a mesma submission e que ela ja foi enviada, e faz INSERT com o cliente Supabase autenticado normal. RLS, assignment ativo e as constraints/trigger append-only permanecem como autoridade final. Nao existe UPDATE/DELETE na UI e a cliente nao recebe acesso ao historico de correcoes.

## 2026-09-23 - Enforcement de MFA administrativo em RLS

### DECISAO TECNICA DE SEGURANCA

A exigencia de MFA da Patty/admin nao deve existir apenas na UI ou em server actions. Um token administrativo em `aal1` tambem deve ser bloqueado pela camada de RLS/Data API e pelo Storage privado.

A migration `20260923113835_admin_mfa_rls_enforcement.sql` adiciona uma segunda trava, sem substituir as policies atuais de role, ownership ou assignment:

- `user_roles` continua legivel pelo proprio usuario em `aal1`, pois o aplicativo precisa descobrir que a sessao pertence a um admin e encaminha-la para enrollment/challenge MFA;
- para usuarios sem role `admin`, a nova trava e neutra e o acesso continua dependendo das policies existentes;
- para role relacional `admin`, recursos protegidos exigem JWT com `aal = aal2`;
- a regra e adicionada como policy `RESTRICTIVE`, portanto nao concede acesso por si so e nao amplia nenhuma policy permissiva;
- `profiles` tambem exige AAL2 para admin; o fluxo de MFA nao depende dessa tabela;
- `storage.objects` recebe a mesma trava restritiva;
- a funcao auxiliar `current_user_admin_mfa_satisfied()` e `SECURITY INVOKER`, nao usa metadata editavel pelo usuario e nao e executavel por `anon`.

O dry-run transacional no Supabase SaaS confirmou que admin em `aal1` ainda le o proprio `user_roles`, mas nao le clientes nem perfis protegidos; em `aal2`, o acesso normal volta sujeito as policies preexistentes; cliente em `aal1` nao e afetada.

A migration foi aplicada no Supabase SaaS em 2026-09-23 via `supabase db push`. O smoke pos-aplicacao confirmou AAL1 bloqueado, AAL2 permitido e cliente AAL1 sem regressao.

## 2026-09-23 - Fundacao de persistencia do rascunho da Anamnese

### DECISAO TECNICA/PRODUTO

A cliente podera manter no maximo um rascunho ativo por versao publicada da Anamnese. O rascunho pertence exclusivamente ao proprio `client_id` autenticado e pode permanecer incompleto.

A escrita de rascunho deve usar privilegios minimos:
- a cliente pode criar a propria submission apenas com `client_id` e `form_version_id`;
- a cliente nao pode definir `submitted_at` na criacao;
- respostas podem ser inseridas no proprio rascunho e somente `answer_value` pode ser atualizado;
- a cliente nao pode trocar `submission_id`, `form_version_id` ou `question_id` de uma resposta existente;
- RLS continua impedindo leitura ou escrita em rascunhos de outra cliente.

A submissao final continua fora desta fundacao. Embora todos os campos sejam obrigatorios para o envio, as regras de perguntas condicionais/aplicabilidade ainda nao estao fechadas; portanto, `submitted_at` nao recebe permissao de escrita da cliente nesta etapa.

A migration `20260923113230_anamnesis_draft_write_foundation.sql` foi aplicada no Supabase SaaS em 2026-09-23. O smoke pos-aplicacao confirmou criacao/edicao do proprio rascunho, isolamento entre clientes e ausencia de privilegio para atualizar `submitted_at`.

## 2026-09-23 - Obrigatoriedade, rascunho e correcao da Anamnese

### REGRA CONFIRMADA PELA PATTY

Todos os campos da Anamnese sao obrigatorios para permitir o envio final.

Depois de enviada, a cliente nao pode corrigir nem sobrescrever respostas da Anamnese. Correcoes posteriores podem ser feitas somente pela Patty.

### DECISAO TECNICA/PRODUTO

Para permitir que a cliente preencha a Anamnese em mais de uma sessao, o sistema deve aceitar um rascunho incompleto e permitir retomada posterior. A exigencia de todos os campos preenchidos se aplica ao envio final, nao ao salvamento do rascunho.

Uma correcao feita pela Patty depois do envio nao deve apagar nem sobrescrever a resposta original. O sistema deve preservar a resposta originalmente enviada e registrar separadamente a correcao, o ator e o momento da alteracao, em coerencia com a regra geral de preservacao de historico.

## 2026-09-23 - Inicio do onboarding da cliente por link enviado pela Patty

### REGRA OPERACIONAL CONFIRMADA PELA PATTY

Quando uma cliente nova entra no sistema, a Patty ja possui o endereco de email da cliente e inicia o onboarding enviando um link para esse email.

O link leva a cliente para a interface do aplicativo onde ela respondera as perguntas que antes eram respondidas no formulario externo.

Nao existe cadastro publico/autonomo. A cliente nao inicia o proprio cadastro informando um email qualquer; o primeiro acesso nasce de uma acao explicita da Patty para o email que ela ja possui.

### DECISAO TECNICA/PRODUTO

No primeiro acesso do MVP, o link enviado pela Patty funciona como convite de ativacao, nao como metodo normal de login. O convite administrativo cria a identidade Auth e o backend provisiona `profile`, role `client`, `client` e assignment ativo da Patty. Se o provisionamento relacional falhar apos a criacao da identidade Auth, a aplicacao executa compensacao para remover o estado parcial e nao considera o acesso configurado.

Ao abrir um convite valido, a cliente entra em uma sessao de ativacao e deve criar a propria senha antes de seguir para a area de Anamnese. A Patty nao define, recebe nem armazena senha provisoria. Depois da ativacao, o metodo normal de acesso permanece email + senha em `/login`.

Para SSR, o template de email de convite do Supabase deve apontar para `/auth/confirm` usando `TokenHash` e tipo `invite`; a rota troca o token por sessao e redireciona para `/ativar-conta`. Site URL e redirect allowlist ja foram alinhados com a producao. O template ainda nao pode ser alterado no ambiente atual: a Management API confirmou que projetos Free com o provedor de email padrao precisam de upgrade ou SMTP customizado para modificar templates.

Expiracao/reenvio do convite, recuperacao de acesso e encerramento da conta continuam pendentes.

## 2026-09-22 - Limpeza de temporarios expirados de upload privado

### DECISAO TECNICA DE IMPLEMENTACAO

A expiracao de uma sessao de upload privado nao autoriza apagar o registro historico da sessao nem qualquer arquivo ja aceito em `client_files`.

A limpeza operacional deve atuar somente no namespace temporario `pending/`:

- sessoes `pending` com `expires_at <= now()` podem ser marcadas como `expired`;
- o objeto temporario correspondente pode ser removido do bucket privado;
- linhas de `client_file_upload_sessions` sao preservadas;
- arquivos aceitos e seus objetos finais nao entram nessa limpeza;
- a politica concreta de retencao/hard delete dos arquivos aceitos continua aberta.

Para evitar corrida entre finalizacao e limpeza, a finalizacao reserva uma sessao valida mudando `pending -> validating` antes de ler/mover o objeto. Somente uma sessao ainda `pending` e nao expirada pode ser reservada.

No deploy Vercel, a limpeza e acionada por rota server-side autenticada com `CRON_SECRET`. O secret nao e exposto ao browser nem armazenado no repositorio.

## 2026-09-22 - Autorizacao temporaria para upload da cliente

### DECISAO TECNICA DE IMPLEMENTACAO

O upload direto da cliente para o Storage usa uma sessao temporaria autorizada no banco antes do envio do objeto.

A sessao:

- pertence a propria cliente autenticada e ao respectivo `client_id`;
- aceita somente foto, exame ou documento dentro da allowlist e dos limites de tamanho ja definidos;
- gera o path temporario pelo banco em `pending/<client_id>/<session_id>.<ext>`, sem permitir que o browser escolha livremente o destino;
- inicia em estado `pending`;
- expira 15 minutos apos a criacao;
- nao concede `UPDATE` ou `DELETE` ao browser;
- autoriza somente `INSERT` no objeto temporario exato do bucket privado.

A migration `20260922231426_client_file_upload_session_foundation.sql` esta aplicada no Supabase SaaS e deve ser preservada sem reescrita. Essa fundacao nao considera o arquivo recebido como valido: a promocao para `client_files` continua dependente da validacao server-side de tamanho, extensao e tipo real/detectado.

## 2026-09-22 - Visibilidade de arquivos privados para a cliente

### DECISAO DE PRODUTO E SEGURANCA

No MVP, a visibilidade de arquivos privados para a cliente depende da autoria do upload:

- arquivo enviado pela propria cliente fica visivel para ela por padrao;
- arquivo enviado pela Patty em nome da cliente nao fica visivel automaticamente;
- a Patty pode liberar explicitamente um arquivo administrativo para a cliente;
- nenhum arquivo privado se torna publico por causa dessa liberacao.

A visualizacao pela cliente continua exigindo autenticacao, autorizacao e signed URL temporaria. O sistema deve preservar quem enviou o arquivo e, quando houver liberacao administrativa, quem liberou e quando.

A RLS de `client_files` e Storage diferencia a visibilidade para a cliente e o acesso administrativo permanente da Patty. O fluxo administrativo implementado cria sessao server-side, autoriza somente o path temporario por signed upload token, finaliza com validacao do conteudo real e registra o arquivo com `client_visible_at` nulo. A liberacao posterior e explicita e grava `client_visibility_set_by_profile_id` e `client_visible_at`.

## 2026-09-22 - Sem antimalware dedicado no primeiro MVP

### DECISAO TECNICA E DE SEGURANCA

O primeiro MVP nao tera servico dedicado de antivirus/antimalware para uploads privados.

Essa decisao considera o conjunto de controles ja definido: allowlist fechada de formatos, validacao server-side de extensao e tipo real/detectado, limites de tamanho, Storage privado, ausencia de execucao de arquivos e fluxo de validacao em duas etapas.

A ausencia de scanner dedicado nao transforma arquivos enviados em confiaveis nem autoriza execucao, conversao irrestrita ou exposicao publica. O sistema deve continuar tratando uploads como conteudo nao confiavel e manter validacao e isolamento.

A necessidade de antimalware dedicado devera ser reavaliada se o produto passar a aceitar formatos mais amplos, integracoes externas, processamento adicional de arquivos ou se surgir requisito especifico de seguranca/compliance.

## 2026-09-22 - Upload administrativo de arquivos pela Patty

### DECISAO DE PRODUTO, SEGURANCA E AUDITORIA

No MVP, a Patty podera enviar fotos, exames e documentos em nome da cliente por um fluxo administrativo server-side controlado.

O sistema deve registrar explicitamente a autoria administrativa do upload; um arquivo enviado pela Patty nao pode ser apresentado no historico como se tivesse sido enviado pela cliente.

O fluxo administrativo deve respeitar a mesma allowlist de formatos, os mesmos limites de tamanho, paths sem PII, imutabilidade dos objetos e validacao em duas etapas definidos para uploads privados.

A autorizacao da operacao segue a excecao ja confirmada para arquivos privados: no MVP, a Patty pode acessar e administrar esses arquivos mesmo sem assignment ativo. A implementacao usa boundary server-side para criar a sessao e o signed upload token do path exato; o browser nao recebe chave secreta. O arquivo administrativo permanece oculto para a cliente ate liberacao explicita.

## 2026-09-22 - Sem limite rigido de quantidade de arquivos no MVP

### DECISAO DE PRODUTO

O MVP nao tera um limite rigido de quantidade de fotos, exames ou documentos por cliente ou por finalidade.

Continuam valendo os limites por arquivo ja definidos e os controles de formato, validacao, autorizacao, privacidade e armazenamento.

Se volume, custo, abuso ou operacao demonstrarem necessidade de um teto quantitativo, uma regra futura devera ser baseada em uso observado e documentada antes de ser automatizada.

## 2026-09-22 - Auditoria de acesso a exames e documentos privados

### DECISAO DE SEGURANCA E AUDITORIA

No MVP, acessos administrativos a exames e documentos privados devem gerar trilha de auditoria quando a Patty solicitar visualizacao ou download. O registro nao deve conter o conteudo do arquivo.

A trilha deve preservar apenas metadados necessarios para rastreabilidade, incluindo identificador interno do usuario, identificador interno do arquivo, acao solicitada, data/hora e resultado da autorizacao.

Se no futuro outro papel receber acesso autorizado a exames/documentos, o mesmo requisito de auditoria se aplica a esse acesso.

A implementacao registra o evento na boundary controlada que autoriza o download e gera a signed URL. A tabela append-only `client_file_access_events` preserva ator, arquivo solicitado, acao, resultado da autorizacao, tipo do arquivo quando autorizado e timestamp, sem armazenar o conteudo. A migration `20260922230601_client_file_access_audit.sql` esta aplicada no Supabase SaaS. A emissao da signed URL nao deve ser interpretada como prova de que a transferencia do arquivo foi concluida pelo cliente.

## 2026-09-22 - Validade das signed URLs de arquivos privados

### DECISAO DE PRODUTO E SEGURANCA

Signed URLs para visualizacao ou download de fotos, exames e documentos privados terao validade de 5 minutos. Elas podem ser regeneradas quando necessario e nunca devem ser persistidas no banco.

As rotas administrativas de visualizacao e download usam signed URLs com validade de 5 minutos, sem persistir a URL.

## 2026-09-22 - Acesso permanente da Patty a arquivos privados

### DECISAO DE PRODUTO E SEGURANCA

No MVP, a Patty podera acessar fotos, exames e documentos privados das clientes mesmo sem `client_assignment` ativo.

Esta e uma excecao especifica para arquivos privados e para a Patty, que e a unica administradora/profissional de negocio do MVP. A regra geral de assignment ativo continua valendo para os demais dados client-scoped, salvo decisao documentada posterior.

Esta decisao substitui a regra anterior que removia o acesso da Patty aos arquivos quando o assignment era encerrado. A implementacao atual de RLS e das rotas de arquivos ainda depende de assignment ativo e deve ser reconciliada antes de esta decisao ser considerada implementada.

## 2026-09-22 - Validacao de upload em duas etapas

### DECISAO TECNICA E DE SEGURANCA

O upload privado do MVP sera tratado em duas etapas:

1. o browser envia o objeto para uma area privada temporaria e nao publicada;
2. o servidor valida tamanho, extensao e tipo real/detectado do arquivo;
3. somente depois da validacao o arquivo e registrado/promovido como valido e disponivel;
4. objetos invalidos sao removidos da area temporaria e nunca aparecem como documentos efetivamente recebidos.

No primeiro MVP nao sera usado servico dedicado de antivirus/antimalware. Essa necessidade deve ser reavaliada se o risco ou o escopo de arquivos aumentar.

## 2026-09-22 - Upload direto do browser para Supabase Storage

### DECISAO TECNICA E DE SEGURANCA

No MVP, a cliente autenticada podera enviar os bytes diretamente do browser para o Supabase Storage, sem encaminhar arquivos grandes pelo servidor Next.js e sem expor `service_role`/secret ao browser.

O upload deve ficar rigidamente limitado por grants/policies/RLS ao espaco autorizado da propria cliente. O caminho e os identificadores aceitos pelo Storage devem ser gerados ou validados pelo sistema; o browser nao recebe liberdade para gravar em paths arbitrarios.

O registro de metadados e o vinculo do objeto ao recurso de negocio continuam sujeitos a validacao server-side e RLS. Esta decisao autoriza o fluxo da cliente. Decisao posterior tambem autorizou upload administrativo pela Patty por boundary server-side controlada, com autoria administrativa explicita.

## 2026-09-22 - Exclusao controlada de arquivos privados

### DECISAO DE PRODUTO, SEGURANCA E OPERACAO

A cliente nao podera apagar fisicamente um arquivo ja enviado por uma escrita direta do browser.

Quando houver necessidade de remocao, o fluxo devera passar por boundary server-side controlado, verificar referencias e regras de retencao e registrar auditoria apropriada. Quando fizer sentido preservar historico, o registro podera ser inativado ou substituido logicamente sem destruicao imediata do objeto.

A politica concreta de retencao e as condicoes para hard delete definitivo continuam pendentes.

## 2026-09-22 - Imutabilidade dos objetos enviados

### DECISAO DE SEGURANCA E AUDITORIA

Um arquivo privado ja persistido nao sera sobrescrito no mesmo path. Correcao ou substituicao gera novo objeto com identificador proprio, preservando o historico e as referencias anteriores.

O browser nao recebe permissao para sobrescrever diretamente um objeto existente.

## 2026-09-22 - Paths de Storage sem PII

### DECISAO DE PRIVACIDADE E SEGURANCA

Paths de objetos privados nao devem conter nome, email, CPF, telefone ou outros dados pessoais legiveis.

O sistema usara apenas identificadores internos/UUIDs no path. O nome original do arquivo pode ser preservado como metadado no banco quando houver necessidade de produto, mas nao deve determinar livremente o path do Storage.

## 2026-09-22 - Armazenamento privado e referencia de objeto

### DECISAO DE SEGURANCA

Fotos, exames e documentos das clientes permanecem em Storage privado, sem URL publica permanente.

O banco deve persistir apenas o identificador/path do objeto e os metadados necessarios. Signed URLs sao temporarias, regeneraveis e nao devem ser salvas como referencia permanente.

## 2026-09-22 - Limites de tamanho para arquivos privados

### DECISAO DE PRODUTO E SEGURANCA

No MVP:

- fotos: maximo de 10 MB por arquivo;
- exames/documentos: maximo de 20 MB por arquivo.

Arquivos acima do limite devem ser rejeitados. O registro definitivo em `client_files` e a disponibilizacao do arquivo so ocorrem apos validacao. Se a validacao em duas etapas exigir objeto temporario, qualquer objeto acima do limite ou invalido deve ser removido e nunca considerado upload aceito.

## 2026-09-22 - Formatos permitidos para arquivos privados no MVP

### DECISAO DE PRODUTO E SEGURANCA

O MVP usara allowlist fechada de formatos para uploads privados:

- fotos: JPEG (`image/jpeg`, extensoes `.jpg`/`.jpeg`), PNG (`image/png`, `.png`) e WebP (`image/webp`, `.webp`);
- exames/documentos: PDF (`application/pdf`, `.pdf`), JPEG (`image/jpeg`, `.jpg`/`.jpeg`) e PNG (`image/png`, `.png`).

Word, Excel, ZIP, executaveis e qualquer outro formato fora dessa allowlist nao serao aceitos no MVP.

A validacao futura de upload deve conferir no servidor a extensao e o tipo real/detectado do arquivo; o nome do arquivo e o `Content-Type` informado pelo cliente nao sao suficientes por si so. Divergencia entre extensao e tipo detectado deve rejeitar o upload.

Esta decisao fecha os formatos aceitos. Decisoes posteriores tambem fecharam limites de tamanho, upload da cliente, imutabilidade/substituicao, exclusao controlada, paths sem PII, validacao em duas etapas, acesso da Patty e validade de signed URLs. Permanece aberta, entre outros pontos, a politica concreta de retencao. A visibilidade para a cliente ja esta definida por autoria/liberacao: uploads da propria cliente ficam visiveis por padrao; uploads administrativos da Patty exigem liberacao explicita. O MVP nao tera limite rigido de quantidade de arquivos, a Patty podera fazer upload administrativo em nome da cliente e nao havera antimalware dedicado no primeiro MVP.

## 2026-09-22 - Gestao de assignments no MVP

### DECISAO DE PRODUTO, SEGURANCA E OPERACAO

No MVP, somente a Patty pode iniciar ou encerrar um `client_assignment`, por fluxo administrativo server-side controlado. O browser nao recebe privilegio direto para inserir, atualizar ou excluir assignments.

O encerramento preserva o registro historico do assignment e remove apenas sua validade atual, usando o estado/tempo de encerramento previsto no modelo. Nao deve haver hard delete de assignment historico como operacao normal do produto.

### FATO DE IMPLEMENTACAO

O encerramento de assignment ativo esta implementado por boundary server-side. A operacao exige a sessao atual com role relacional `admin`, limita a escrita a `client_id` + `staff_profile_id` da Patty autenticada, preenche somente `ended_at` de linhas ainda ativas e preserva integralmente os registros historicos. Nenhum `INSERT`, `UPDATE` ou `DELETE` direto em `client_assignments` foi concedido ao browser.

O inicio de assignment possui agora uma boundary server-only preparada para o onboarding controlado. Ela recebe apenas `client_id` e o `staff_profile_id` da Patty autenticada, reutiliza o indice parcial que garante no maximo um assignment ativo para o mesmo par e trata chamadas repetidas/concorrentes de forma idempotente. Nenhuma UI de onboarding, criacao de conta Auth, criacao automatica de `client`, envio de convite ou ativacao foi inferida nesta etapa.

Os detalhes operacionais de convite/ativacao permanecem abertos. A boundary de inicio somente deve ser acionada por uma futura server action que exija `requireRole("admin")` e parta de uma cliente identificada por um fluxo de onboarding ja confirmado/documentado.

A operacao deve permanecer auditavel e, como regra geral, nao pode conceder acesso client-scoped sem role relacional `admin` e assignment ativo. Decisao posterior criou uma excecao especifica para o acesso da Patty a arquivos privados, sem generalizar essa excecao para os demais dados client-scoped. Fluxos futuros de transferencia, reatribuicao ou outros profissionais ficam fora desta decisao.

## 2026-09-22 - Bootstrap controlado da primeira conta admin

### DECISAO DE SEGURANCA E OPERACAO

A primeira conta administrativa da Patty sera provisionada por procedimento administrativo controlado e unico. O provisionamento cria ou vincula a identidade Auth da Patty ao `profile` correspondente e registra o role relacional `admin` fora de qualquer fluxo publico de autoatendimento.

Nao existira botao, endpoint publico, cadastro autonomo ou mecanismo de autoelevacao que permita a um usuario se tornar `admin` pelo aplicativo.

O procedimento deve usar privilegios administrativos somente durante o provisionamento necessario, ser executado de forma auditavel e nao alterar o principio de que o acesso client-scoped continua dependendo de role relacional e assignment ativo.

Esta decisao resolve apenas o bootstrap inicial da Patty. A gestao de assignments no MVP esta definida separadamente: somente a Patty, por fluxo administrativo server-side controlado, pode iniciar ou encerrar assignments preservando historico.

## 2026-09-22 - Unica administradora/profissional de negocio no MVP

### DECISAO DE PRODUTO E SEGURANCA

No MVP, a Patty sera a unica administradora/profissional de negocio com acesso administrativo aos dados das clientes. Nao serao criados papeis operacionais para assistentes, profissionais parceiros ou suporte nesta primeira versao.

Acesso tecnico ao repositorio, infraestrutura ou operacao da plataforma nao constitui papel de negocio dentro da aplicacao e nao deve, por si so, conceder acesso client-scoped na interface ou contornar RLS.

Novos papeis de negocio so devem ser introduzidos quando houver necessidade operacional concreta, com permissoes e escopo definidos antes da implementacao.

## 2026-09-22 - Metodo principal de login

### DECISAO DE PRODUTO E SEGURANCA

O metodo principal de login no MVP sera email + senha para clientes e administradores. Contas administrativas continuam com MFA obrigatorio.

Links enviados por email podem ser usados nos fluxos controlados de convite, ativacao e recuperacao de acesso, mas magic link nao sera o metodo normal de login no MVP.

## 2026-09-22 - Uso de LangGraph no MVP

### DECISAO TECNICA

LangGraph nao sera usado inicialmente no MVP. A primeira integracao real de IA deve usar um fluxo server-side simples, explicito e auditavel. LangGraph so deve ser introduzido se surgirem fluxos de IA com estado persistente, multiplas etapas, ramificacoes ou orquestracao complexa que nao sejam bem atendidos por uma implementacao mais simples.

## 2026-09-22 - Uso de n8n no MVP

### DECISAO TECNICA

n8n nao sera usado inicialmente no MVP. A ferramenta so deve ser introduzida quando existir uma automacao externa ou orquestracao concreta, documentada e com beneficio claro sobre uma solucao mais simples dentro de Next.js, Vercel e Supabase.

## 2026-09-22 - Uso de VPS no MVP

### DECISAO TECNICA

A VPS Hostinger nao sera usada na primeira versao operacional do MVP enquanto Vercel e Supabase atenderem aos requisitos confirmados. Ela so deve ser introduzida se surgir necessidade tecnica concreta e documentada que exija processo persistente, worker, servico de longa duracao ou componente que nao se encaixe adequadamente na arquitetura atual.

## 2026-09-22 - Ambientes, MFA administrativo e onboarding de clientes

### DECISAO TECNICA/PRODUTO

No MVP, o projeto tera somente dois ambientes operacionais definidos: desenvolvimento e producao. Nao sera criado ambiente de staging neste momento. Um terceiro ambiente so deve ser introduzido se surgir necessidade concreta e documentada.

### DECISAO DE SEGURANCA

MFA sera obrigatorio para contas administrativas, incluindo Patty/admin.

### FATO DE IMPLEMENTACAO PARCIAL

A camada da aplicacao exige `aal2` para acesso administrativo. Depois do login por email/senha, uma conta `admin` sem fator verificado e direcionada ao enrollment TOTP; uma conta com fator verificado, mas sessao ainda em `aal1`, e direcionada ao challenge. Paginas, rotas server-side e server actions que usam `requireRole("admin")` nao prosseguem sem `aal2`.

O enrollment/challenge usa as APIs nativas de MFA do Supabase Auth. A chave secreta TOTP exibida no enrollment pertence ao usuario autenticado e nao e persistida pela aplicacao.

Esta implementacao ainda nao encerra a decisao de MFA por completo: a protecao equivalente em RLS, para impedir uso direto de um token administrativo `aal1` contra a Data API/Storage, permanece como gate tecnico separado antes de considerar MFA plenamente aplicado fim a fim.

### DECISAO DE PRODUTO E SEGURANCA

A criacao de conta de cliente no MVP sera somente por convite ou ativacao controlada. Nao havera cadastro publico/autonomo de clientes.

Esta decisao nao fecha ainda os detalhes operacionais de envio do convite, expiracao, reenvio, ativacao, recuperacao ou encerramento de conta.

## 2026-09-22 - Fluxos humanos de escrita ja operacionais

### FATO CONFIRMADO DE IMPLEMENTACAO

Os seguintes fluxos de escrita humana estao conectados na aplicacao usando sessao autenticada, grants e RLS existentes:

- notas internas append-only de revisao de Anamnese;
- acompanhamento profissional append-only ligado a avaliacao;
- liberacao manual de uma versao publicada de conteudo educacional para uma cliente;
- lifecycle manual de protocolo: submissao para revisao, aprovacao humana e publicacao explicita.

No lifecycle de protocolo, cada etapa e independente. Submeter nao aprova; aprovar nao publica; publicar exige uma aprovacao existente da mesma versao. A aplicacao revalida acesso e estado atual antes da escrita, e o banco continua sendo a autoridade final por RLS, constraints, FKs, triggers e unicidade.

### LIMITE DE ESCOPO

Esses fluxos nao autorizam inferir outras operacoes administrativas ainda abertas, como edicao do Cadastro Atual, upload/exclusao de arquivos, preenchimento final da Anamnese ou automacoes de protocolo. A gestao de assignments foi definida posteriormente como fluxo administrativo server-side controlado da Patty.

## 2026-09-22 - Leitura administrativa de arquivos privados

### FATO CONFIRMADO DE IMPLEMENTACAO E DECISAO TECNICA HISTORICA

Arquivos privados permanecem no bucket privado `client-private`, sem URL publica permanente e sem signed URL persistida.

Fotos privadas vinculadas a uma avaliacao podem ser exibidas no detalhe administrativo por uma rota server-side dedicada. A rota exige role relacional `admin`, consulta o `client_file` sob as RLS existentes e cria sob a sessao atual uma signed URL com validade de 60 segundos. O redirecionamento nao deve ser armazenado em cache.

A area administrativa da cliente pode listar metadados de `client_files` acessiveis pelas RLS existentes. Para download administrativo de fotos, exames ou documentos, uma rota server-side igualmente exige `admin`, resolve o arquivo sob RLS e cria signed URL de 60 segundos com comportamento de download forcado. Isso evita decidir renderizacao inline de exames ou documentos antes da definicao de MIME types e controles adicionais.

Na implementacao atual, a autorizacao dessas rotas ainda depende de assignment ativo, e nenhuma delas usa `service_role` nem bypass de RLS. A decisao posterior de produto determina que a Patty mantenha acesso aos arquivos privados mesmo sem assignment ativo; portanto RLS/rotas atuais precisam ser alteradas antes de a implementacao estar alinhada com a decisao vigente.

### LIMITE DE ESCOPO

Esta decisao implementa somente leitura e download administrativos de arquivos ja cadastrados.

Decisoes posteriores passaram a definir upload da cliente, limites de tamanho, imutabilidade/substituicao, exclusao controlada, validacao em duas etapas, acesso permanente da Patty e signed URLs de 5 minutos.

Continuam abertos nesta area:

- politica concreta de retencao e hard delete.

## 2026-09-22 - Reconciliacao documental das regras confirmadas do metodo

### DECISAO CONFIRMADA

Esta secao registra no repositorio regras ja confirmadas pela Patty e elimina a classificacao antiga que tratava todo o metodo como indefinido.

Todo acompanhamento comeca pelo Reconhecimento Metabolico, protocolo linear inicial.

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

Nao inferir automaticamente regras internas do Cutting 3 nem etapas posteriores.

### DECISAO CONFIRMADA

O Reconhecimento Metabolico pode ser reutilizado em caso de baixa adesao, dificuldade de execucao ou retorno apos afastamento.

Adesao e central. A Patty adapta o protocolo a dificuldade relatada e pode simplificar ou retornar antes de avancar.

Nao criar score automatico de adesao.

### DECISAO CONFIRMADA

Nao existe numero fixo de refeicoes. A quantidade e adaptada a rotina e preferencia da cliente, com foco em adesao.

Horarios individuais nao constituem regra geral. No jejum intermitente explicado pela Patty, normalmente sao usadas 3 refeicoes, com a ultima ate 12 horas apos a primeira e horarios internos flexiveis.

### DECISAO CONFIRMADA

A referencia inicial geral do Reconhecimento Metabolico e proteina 2 g/kg, carboidrato 2 g/kg e gordura 50 g/dia como referencia, com possibilidade de individualizacao.

Conversoes confirmadas:

- 1 dose de proteina = 15 g;
- 1 dose de carboidrato = 12 g;
- 1 dose de gordura = 6 g.

Doses podem ser fracionadas. Parte das doses inicialmente associadas ao carboidrato pode ser redistribuida para gordura.

### DECISAO CONFIRMADA

Proteinas possuem grupo de maior teor de gordura e grupo de menor teor de gordura.

O limite diario do grupo de maior teor de gordura e metade das doses totais de proteina, arredondando para cima. "Sem restricao" nao significa proteina ilimitada.

### DECISAO CONFIRMADA

No Cutting Dia 1 / Dia 2, a proteina permanece praticamente igual e o carboidrato e a principal variavel. O protocolo linear anterior e a referencia: Dia 1 usa aproximadamente metade do carboidrato e Dia 2 aproximadamente a quantidade do linear. A gordura pode permanecer ou diminuir.

A etapa 2 Low / 1 High usa a Planilha Carb Cycle baseada no peso. Somente formulas confirmadas e documentadas podem ser implementadas em codigo deterministico. As Fases 5 e 6 continuam abertas.

### DECISAO CONFIRMADA

No fluxo confirmado, o Up Metabolico inclui uma refeicao livre semanal. Outras regras nao devem ser inferidas.

### QUESTAO ABERTA

Permanecem abertas, entre outros pontos: Fases 5 e 6 do Carb Cycle, regras detalhadas do Cutting 3 Linear e etapas posteriores a ele, Bulking detalhado, Consolidacao, hidratacao, suplementacao/manipulados, montagem e progressao definitiva de treino, alertas profissionais e criterios finais de avaliacao.

## 2026-09-22 - Primeira versao assistiva de IA

### DECISAO DE PRODUTO CONFIRMADA

A IA pode identificar respostas ausentes, contraditorias ou que precisam de esclarecimento, sugerir perguntas de acompanhamento para a Patty e auxiliar a preparacao de rascunhos completos de alimentacao e treino. A execucao continua assistiva, depende de revisao humana e so inicia quando a Patty a solicitar; nao ha execucao automatica em background por entrada de novos dados.

Sugestoes de pendencia ou de perguntas para a cliente nao criam pendencia operacional nem sao enviadas diretamente. A Patty deve revisar, pode editar e deve confirmar antes de qualquer criacao ou envio.

### DECISAO DE PRODUTO E PRIVACIDADE CONFIRMADA

As respostas da Anamnese entram automaticamente no contexto de IA, exceto a condicao financeira, que so entra quando a Patty a selecionar explicitamente. Essa decisao inclui os dados de saude, medicamentos, suplementacao, sono, autoimagem, comportamento, habitos alimentares e saude reprodutiva ja existentes no questionario; nao autoriza inferir novos campos de Anamnese.

Todas as medidas factuais registradas podem entrar automaticamente no contexto, sem autorizar diagnostico ou interpretacao diagnostica automatica. Fotos de avaliacao/evolucao, exames/documentos de saude, protocolos anteriores e historico de acompanhamento so entram quando a Patty selecionar explicitamente cada fonte ou registro.

Cidade, Telefone e Email de contato nao entram automaticamente a partir do Cadastro Atual. Endereco, escolaridade e Instagram tambem permanecem fora do contexto padrao sem necessidade especifica.

### DECISAO TECNICA E DE PRIVACIDADE CONFIRMADA

Cada execucao futura deve registrar referencias das fontes usadas, sem duplicar automaticamente todo o conteudo original para auditoria, e registrar versao da instrucao/prompt, modelo e provider. O provider escolhido deve ter configuracao e condicoes verificaveis para que dados da Patty e das clientes nao sejam usados no treinamento de modelos.

O historico de IA deve ser preservado junto ao historico da cliente, sem exclusao automatica: referencias de fontes, instrucao/prompt, modelo, provider, saida original, versoes editadas, autoria, timestamps e decisoes de aprovacao ou rejeicao quando aplicaveis. Essa decisao nao define politica legal geral de retencao.

### DECISAO TECNICA APROVADA PARA FUNDACAO

A fundacao futura usa `ai_prompt_versions`, `ai_executions`, `ai_execution_outputs`, `ai_execution_sources`, `ai_draft_versions` e `ai_hypotheses`. Sao entidades internas: a cliente nao as acessa. Prompts sao imutaveis e criados por deploy ou processo administrativo controlado, sem UI de gerenciamento na primeira versao.

`ai_executions` registra lifecycle e metadados da execucao, mas nao a saida original. `ai_execution_outputs` preserva essa saida em relacao 1:1 imutavel e pode nao existir quando a execucao esta em andamento ou falhou. Versoes de rascunho da Patty sao append-only; eventual descarte pode alterar somente metadata restrita, nunca o conteudo da versao.

As fontes de uma execucao usam FKs concretas mutuamente exclusivas, e nao uma referencia generica por tipo e UUID. A fundacao deve carregar `client_id` nas entidades internas client-scoped e validar propriedade da fonte por constraints compostas e validacoes estreitas na migration futura.

### DECISAO DE PRODUTO CONFIRMADA

A saida original da IA, cada versao editada pela Patty, a versao aprovada e a publicacao sao artefatos distintos. Nenhuma versao anterior deve ser sobrescrita silenciosamente. A rejeicao ou o descarte de uma analise/rascunho pode registrar motivo, mas esse motivo e opcional.

Antes de gerar um rascunho, a Patty escolhe a fase/protocolo do metodo. A IA nao escolhe automaticamente a fase. Regras matematicas confirmadas permanecem em codigo deterministico e testavel; a IA recebe ou utiliza seus resultados, sem derivar formulas por raciocinio generativo.

Quando faltar uma regra profissional confirmada, a IA pode apresentar sugestao provisoria marcada como HIPOTESE. A hipotese nao vira regra do metodo, nao pode ser baseada em exemplo historico individual como regra geral e exige confirmacao explicita da Patty antes de aprovacao ou publicacao. Uma aprovacao geral de protocolo nao pode ocultar hipotese pendente.

Cliente nao acessa analises da IA, hipoteses, rascunhos, versoes internas ou comentarios internos da Patty. Ve somente conteudo aprovado/publicado para ela.

`protocol_versions` continua sendo versao de protocolo e nunca rascunho de IA. A futura materializacao de um rascunho de IA deve usar entidade de ligacao propria, sem alterar agora a semantica de `protocol_versions`.

## 2026-09-22 - Modelo tecnico para falhas de execution de IA

### DECISAO TECNICA

Uma `ai_execution` representa uma tentativa operacional explicitamente iniciada, vinculada a prompt, provider e modelo ja definidos, e pode realizar no maximo uma chamada ao provider. Ela pode terminar `failed` antes dessa chamada. Nova tentativa explicita cria nova execution; retry automatico e entidade `attempts` permanecem fora da v1.

Quando prompt, provider e modelo estao definidos, mas falta configuracao operacional server-side, como credential, a execution pode ser criada e terminar `failed` com `failure_stage = preflight` e `failure_code = provider_not_configured`. Quando prompt, provider ou modelo ainda nao estao definidos, a execution nao deve ser criada e nao se usam valores ficticios para satisfazer campos obrigatorios.

### DECISAO TECNICA

O boundary transacional da execution separa persistencia curta de chamada externa. TX1 cria a execution `started` e registra suas sources, seguida de commit. A chamada ao provider ocorre sem transacao longa de banco aberta. Em TX2 de sucesso, a insercao do unico `ai_execution_output` valido e a transicao para `completed` ocorrem atomicamente. Em TX2 de resposta invalida, a insercao de `ai_execution_failure_responses`, os metadados de falha e a transicao para `failed` ocorrem atomicamente.

O deferred constraint de output valido permanece: `completed` exige exatamente um `ai_execution_output`; `started` e `failed` exigem zero outputs validos. Output valido permanece imutavel, `failed` permanece terminal e descarte continua restrito a `completed`. Uma failure response nao e output valido.

### DECISAO TECNICA

A extensao futura de `ai_executions` usa `failure_stage`, `failure_code` e `failure_message` nullable somente quando `status = failed`. Stage e code sao obrigatorios na falha e os tres campos devem permanecer nulos nos demais estados. Apos terminalizacao, eles nao podem ser reescritos.

`failure_message` e sanitizada pela aplicacao para diagnostico operacional interno, opcional e nao vazia quando presente. Nao contem resposta bruta do provider, stack trace completo, token, secret ou PII desnecessaria. Seu tamanho maximo permanece aberto.

Os pares fechados da v1 sao `preflight` -> `provider_not_configured`, `provider_request` -> `provider_request_failed`, `output_parse` -> `invalid_json`, `output_validation` -> `invalid_output_schema` e `persistence` -> `persistence_failed`. A futura migration deve protege-los com CHECK ou constraint deterministica.

### DECISAO TECNICA

Quando uma execution `failed` for persistida com `invalid_json`, `invalid_output_schema` ou `persistence_failed`, ela deve ter exatamente uma failure response imutavel. `provider_not_configured` e `provider_request_failed` nao possuem failure response. Em `persistence_failed`, isso cobre somente o caso em que o banco permanece acessivel apos a falha de persistencia de sucesso.

Se o banco ou a conexao estiver indisponivel apos o provider responder, nao e possivel garantir a persistencia da resposta, dos metadados de falha ou da transicao para `failed`; a execution previamente criada pode permanecer `started`. Esse estado nao reconciliado e uma limitacao operacional, nao uma execution `failed/persistence_failed` sem failure response.

## 2026-09-22 - Limites confirmados para fundacao futura de IA

### DECISAO CONFIRMADA

A IA auxilia Patty; nao decide nem publica diretamente. Nao gera diagnostico automatico.

### DECISAO CONFIRMADA

Exemplos e historicos individuais nao podem ser transformados em regra geral do metodo profissional.

### DECISAO CONFIRMADA

Endereco, escolaridade e Instagram nao devem ser enviados ao contexto de IA sem necessidade especifica.

## 2026-09-18 - Arquivos privados, avaliacoes e acompanhamento profissional

### DECISAO CONFIRMADA

Metadados de fotos, exames e documentos ficam em `client_files`, separados de `storage.objects`. O bucket previsto e privado e nenhum URL publico permanente ou signed URL persistida e armazenado no modelo de negocio.

### DECISAO CONFIRMADA

Avaliacoes e medidas sao historicas: reavaliacao cria novo registro, medidas pertencem a uma avaliacao e fotos podem ser relacionadas por referencia ao arquivo privado existente. Esta implementacao nao define catalogo clinico de medidas nem realiza interpretacao automatica.

### DECISAO CONFIRMADA

O acompanhamento profissional e append-only e interno. Registra dificuldade, percepcao de aderencia, observacao da Patty, decisao profissional e motivo. As decisoes implementadas sao `maintain`, `simplify`, `advance` e `return`; registrar uma decisao nao executa mudanca de fase, protocolo, dieta ou treino.

Registro cronologico de decisoes confirmadas do Projeto Patty.

## 2026-09-18 - Cadastro Atual e Anamnese versionada

### DECISAO CONFIRMADA

`client_registration` e o Cadastro Atual 1:1 de `clients`, separado de Auth e de Anamnese. Nesta implementacao, seus campos sao Cidade, Telefone, Email de contato e Instagram.

### DECISAO CONFIRMADA

Definicoes de Anamnese sao versionadas e submissions preservam a versao exata utilizada. Respostas originais submetidas nao sao sobrescritas.

### DECISAO CONFIRMADA

Notas administrativas da Patty sao armazenadas separadamente das respostas originais e nao sao acessiveis pela cliente.

## 2026-09-18 - Fundacao operacional de identidade, clientes, RBAC e RLS

### DECISAO CONFIRMADA

A fundacao BACKEND-A1 implementa `profiles`, `user_roles`, `clients` e `client_assignments` como entidades separadas no Supabase local/versionado.

### DECISAO CONFIRMADA

O acesso a cliente e client-scoped: a propria cliente acessa somente o registro vinculado ao seu `profiles.id`; admin exige papel relacional `admin` e assignment ativo. Papel administrativo nao concede acesso global a clientes.

### DECISAO CONFIRMADA

`anon` nao recebe acesso a dados privados. Usuarios autenticados nao recebem escrita por browser em roles, assignments, clientes ou perfis nesta fase. A administracao desses vinculos aguardara mecanismo controlado proprio.

### DECISAO CONFIRMADA

Remover uma identidade Auth de cliente preserva o registro profissional e limpa somente `clients.profile_id`. Encerrar assignment preserva historico e remove sua permissao ativa.

### QUESTAO ABERTA

O caminho administrativo para criar, alterar ou encerrar assignments continua pendente. O bootstrap inicial da conta admin da Patty foi definido como procedimento administrativo controlado e unico; seeds e testes locais nao definem esse procedimento de producao.

## 2026-09-15 - Separacao entre autenticacao, cadastro do cliente e snapshot de anamnese

### DECISAO CONFIRMADA

Auth / `auth.users` nao e cadastro mestre da cliente. Auth e responsavel por identidade de autenticacao, credenciais, email de login quando aplicavel e metadados estritamente necessarios a autenticacao.

### DECISAO CONFIRMADA

Cidade, Telefone, Email de contato e Instagram pertencem ao cadastro atual da cliente.

### DECISAO CONFIRMADA

Email de autenticacao e email de contato sao conceitos diferentes. Eles podem inicialmente ter o mesmo valor, mas nao devem ser tratados como uma unica fonte sem decisao propria.

### DECISAO CONFIRMADA

A anamnese nao e fonte mestre dos dados cadastrais atuais da cliente.

### DECISAO CONFIRMADA

Eventual copia de dados cadastrais preservada junto de uma submissao de anamnese e snapshot historico daquele contexto.

Alterar o cadastro atual nao altera anamneses ja submetidas, e alterar uma anamnese historica nao altera silenciosamente o cadastro atual.

### DECISAO CONFIRMADA

Nao existe sincronizacao bidirecional automatica entre cadastro atual da cliente e historico de anamnese.

## 2026-09-15 - Formulario atual como baseline de migracao, nao especificacao definitiva

### DECISAO CONFIRMADA

As capturas do formulario atual da Patty sao evidencia do processo existente e devem ser preservadas como referencia de levantamento e migracao.

### DECISAO CONFIRMADA

Campos, textos, obrigatoriedade, tipos de controle, opcoes, validacoes, ordem e agrupamento do formulario atual nao sao automaticamente aprovados como especificacao final do novo aplicativo.

### DECISAO CONFIRMADA

Um campo marcado como obrigatorio no Google Forms historico nao define `required` futuro, validacao obrigatoria ou bloqueio de submissao no novo aplicativo sem decisao propria.

### DECISAO CONFIRMADA

Restricoes tecnicas observadas no Google Forms, como quantidade de arquivos, tamanho maximo, tipos apresentados e impossibilidade de edicao/remocao apos envio, nao devem ser herdadas automaticamente pelo novo aplicativo.

### DECISAO CONFIRMADA

A decisao de uso de dados da Anamnese pela IA depende de definicao de produto e privacidade, e nao da mera existencia do campo no formulario historico. A rodada de 2026-09-22 confirmou inclusao automatica das respostas de Anamnese, exceto condicao financeira, que exige selecao explicita da Patty.

## 2026-09-14 - Modelo conceitual inicial de identidade, clientes e autorizacao

### DECISAO CONFIRMADA

`auth.users` nao sera cadastro principal do cliente.

### DECISAO CONFIRMADA

Identidade, perfil da aplicacao e cliente da consultoria sao conceitos separados.

### DECISAO CONFIRMADA

Cliente pode existir sem conta Auth ativa.

### DECISAO CONFIRMADA

Historico de cliente nao depende da existencia permanente do login.

### DECISAO CONFIRMADA

RLS e obrigatoria.

### DECISAO CONFIRMADA

Autenticacao sozinha nao concede acesso a dados.

### DECISAO CONFIRMADA

Autorizacao client-scoped devera verificar vinculo com o cliente.

### DECISAO CONFIRMADA

Roles nao serao armazenados em `user_metadata`.

### DECISAO CONFIRMADA

Dados cadastrais sao separados de dados clinicos/operacionais.

### DECISAO CONFIRMADA

Cliente nao pode administrar papeis ou assignments.

## 2026-09-14 - Inicializacao da aplicacao frontend

### DECISAO CONFIRMADA

Esta autorizada a criacao da aplicacao web Next.js dentro do repositorio do Projeto Patty.

### DECISAO CONFIRMADA

A aplicacao deve usar Next.js com App Router e TypeScript.

### DECISAO CONFIRMADA

A inicializacao deve ser minima e nao deve implementar funcionalidades de negocio, conectar ao Supabase, implementar autenticacao, criar regras clinicas, implementar IA, gerar dieta ou treino, instalar bibliotecas de UI sem necessidade, instalar bibliotecas de estado, formularios ou icones preventivamente, introduzir n8n ou LangGraph, ou utilizar dados reais de clientes.

### DECISAO CONFIRMADA

A estrutura deve permanecer simples e auditavel, permitir evolucao posterior para as areas `/admin` e `/cliente`, priorizar Server Components quando aplicavel e manter acessibilidade e responsividade como requisitos desde a fundacao.

### DECISAO CONFIRMADA

Documentos que afirmavam que nao deveria ser criada aplicacao, UI ou dependencias descreviam a fase anterior de documentacao. Essa restricao foi substituida exclusivamente quanto a inicializacao e fundacao do frontend.

## 2026-09-14 - Fundacao documental inicial

### DECISAO CONFIRMADA

O repositorio comeca pela fundacao documental, sem implementar aplicacao, banco ou Supabase nesta tarefa.

### DECISAO CONFIRMADA

O Projeto Patty sera um aplicativo para digitalizar e automatizar parte do atendimento da Consultoria Corpo e Mente da Patricia Torres.

### DECISAO CONFIRMADA

Cada cliente tera conta propria.

### DECISAO CONFIRMADA

O produto tera anamnese, medidas, fotos, exames, protocolos, avaliacoes, conteudos, exercicios e painel administrativo da Patty.

### DECISAO CONFIRMADA

A IA sera assistiva e nao publicara protocolos automaticamente.

### DECISAO CONFIRMADA

A Patty sempre revisara e aprovara protocolos antes da publicacao.

### DECISAO CONFIRMADA

O fluxo estrutural de protocolo separa versao, aprovacao humana e publicacao. Uma publication exige approval da mesma versao; a IA nao aprova nem publica. Conteudo submetido para revisao permanece historico e imutavel.

### DECISAO CONFIRMADA

Planos alimentares e catalogos de equivalentes sao versionados como estruturas de dados, sem catalogo real, calculo de doses, macros, fases ou regra metodologica. A referencia de um plano aponta uma versao especifica do catalogo.

## 2026-09-24 - Hardening da execution boundary de IA

### DECISAO TECNICA DE SEGURANCA

A persistencia interna de IA usa uma boundary server-side explicita. O browser e roles `anon`/`authenticated` nao recebem escrita nas tabelas internas de IA nem EXECUTE nas RPCs de persistencia.

As operacoes internas `start_anamnesis_review_execution`, `complete_ai_execution` e `fail_ai_execution` sao `SECURITY INVOKER`, executaveis somente por `service_role`. O acesso privilegiado fica encapsulado em modulo `server-only`; a identidade da Patty/admin e derivada por `requireRole("admin")`, incluindo AAL2, e nunca e aceita como parametro vindo do browser.

### DECISAO TECNICA DE INTEGRIDADE

Cada execution com `purpose_key = anamnesis_review` fica vinculada diretamente a uma `anamnesis_submission` enviada da mesma cliente. O prompt deve ter `prompt_key = anamnesis_review`.

Sources desse purpose aceitam apenas `anamnesis_answer`, pertencem a submission selecionada e so podem ser acrescentadas enquanto a execution esta `started`. Conclusao e falha sao persistidas atomicamente por RPC.

### DECISAO TECNICA DE MINIMIZACAO

A camada deterministica de contexto usa aplicabilidade versionada antes de selecionar sources. Respostas de perguntas ocultas nao entram no contexto.

`instagram` permanece sempre fora do purpose `anamnesis_review`. `financial_capacity_for_supplements` permanece fora por padrao e so entra mediante selecao explicita da Patty para aquela execution. A allowlist de `missing_answer` e derivada somente de perguntas aplicaveis sem resposta.

### LIMITE

Este hardening nao escolhe provider/modelo, nao chama provider, nao cria execucao automatica, nao publica findings e nao altera o requisito de revisao humana.

### ESTADO OPERACIONAL

A migration `20260924165942_harden_ai_execution_boundary.sql` foi aplicada no Supabase SaaS em 2026-09-24. Smoke pos-apply sintetico com `ROLLBACK` confirmou as invariantes da boundary e os privilegios das RPCs. O PR #149 passou CI final, foi mergeado no commit `9b7bbba` e o deployment de producao correspondente ficou `READY`.

## 2026-09-22 - Primeiro contrato operacional de IA para revisao de Anamnese

### DECISAO TECNICA/PRODUTO

O primeiro fluxo operacional de IA usa `purpose_key = anamnesis_review`, sem versao embutida. A versao pertence a `ai_prompt_versions`; provider e modelo pertencem a `ai_executions`.

### DECISAO TECNICA/PRODUTO

A revisao e iniciada somente por acao explicita de Patty/admin relacional autorizado, com assignment ativo da cliente e submission escolhida explicitamente. Nao existe execucao automatica ou em background nesta primeira versao.

### DECISAO TECNICA/PRODUTO

Cada execution `anamnesis_review` analisa uma submission selecionada. A mesma submission pode ter multiplas executions historicas por nova solicitacao explicita, versao de prompt ou modelo; nao existe unicidade submission -> execution.

### DECISAO TECNICA/PRODUTO

O contexto automatico da v1 limita-se a submission, `form_version_id`, `question_id`, `question_key`, `label` e `answer_value` original das answers selecionadas para envio da propria submission. A condicao financeira nao entra automaticamente: so pode ser incluida quando Patty a selecionar explicitamente para aquela execution. As demais answers autorizadas pelo contexto padrao permanecem automaticas. Fonte disponivel nao equivale necessariamente a fonte selecionada ou enviada. Cadastro Atual, avaliacoes, medidas, protocolos, follow-ups, fotos, exames, documentos, outros arquivos, endereco, escolaridade e Instagram ficam fora deste purpose. Essa minimizacao nao se generaliza automaticamente para outros purposes de IA.

### DECISAO TECNICA/PRODUTO

Os findings permitidos no contrato deterministico sao `possible_contradiction`, `clarification_needed` e `missing_answer`.

`possible_contradiction` e uma sinalizacao de possivel incompatibilidade ou ambiguidade, nunca conclusao definitiva, e exige ao menos duas respostas existentes. `clarification_needed` sinaliza resposta existente ambigua ou insuficiente para revisao humana segura e exige ao menos uma resposta existente. `missing_answer` exige `target_question_id`, pode ter `source_answer_ids` vazio e so e aceito quando o caller inclui o target numa allowlist de perguntas da execution previamente verificadas como aplicaveis e sem resposta.

Nenhum finding diagnostica, cria conclusao clinica, vira pendencia, e enviado a cliente, altera protocolo/fase ou publica conteudo automaticamente.

### DECISAO TECNICA/PRODUTO

Registrar em `ai_execution_sources` todas as `anamnesis_answers` efetivamente enviadas ao modelo, uma referencia por answer. Answers submetidas e suas definicoes versionadas sao protegidas contra alteracao/exclusao pelo schema atual; as referencias permitem reconstruir fontes utilizadas, mas nao constituem snapshot literal do payload enviado ao provider.

### DECISAO TECNICA/PRODUTO

O output valido original da IA permanece imutavel em `ai_execution_outputs`. Findings permanecem nesse output nesta versao e nao criam entidade operacional independente; tambem nao viram `ai_hypotheses` automaticamente.

Revisao e edicao humana devem ser persistidas separadamente em `ai_draft_versions`, de forma append-only. Nunca sobrescrever o output original da IA. `ai_hypotheses` fica reservado para proposicoes que realmente exigirem confirmacao explicita antes de eventual aprovacao ou publicacao futura.

### CONTRATO CONCEITUAL DE OUTPUT

O contrato conceitual da v1 e um objeto com `findings`, que pode ser vazio. Cada finding possui `type` (`possible_contradiction`, `clarification_needed` ou `missing_answer`), `source_answer_ids`, `explanation` interna com incerteza explicita e `suggested_follow_up_question` opcional e interna. `missing_answer` inclui ainda `target_question_id`.

Propriedades extras devem ser rejeitadas. IDs devem pertencer a submission analisada e as sources da execution. O contrato nao inclui score, diagnostico ou conclusao clinica.

### FATO DE IMPLEMENTACAO

O primeiro validador deterministico deste contrato esta implementado em `lib/ai/anamnesis-review-output.ts` e nao depende de provider/modelo. Ele:

- aceita somente o objeto top-level `{ findings }`;
- rejeita propriedades extras no top-level e nos findings;
- aceita `possible_contradiction`, `clarification_needed` e `missing_answer`;
- exige UUIDs validos, distintos e presentes na allowlist de answers efetivamente autorizadas para a execution;
- exige ao menos duas sources para `possible_contradiction`, ao menos uma para `clarification_needed` e permite zero para `missing_answer`;
- em `missing_answer`, exige `target_question_id` presente na allowlist deterministica de perguntas aplicaveis e sem resposta;
- exige `explanation` nao vazia e, quando presente, `suggested_follow_up_question` nao vazia;
- aceita `findings: []`;
- nao cria score, diagnostico, conclusao clinica, pendencia, hipotese ou publicacao.

A validacao estrutural nao tenta inferir semanticamente se o texto da `explanation` expressa incerteza suficiente. Essa qualidade permanece responsabilidade do prompt, da revisao humana e de testes futuros baseados em contrato; nao sera implementada por heuristica lexical fragil.

## 2026-09-19 - Bibliotecas e liberacao explicita de conteudo

### DECISAO CONFIRMADA

Conteudo educacional e exercicio sao dominios separados e ambos preservam versoes publicadas. A biblioteca de exercicios nao e exposta globalmente a clientes nesta etapa.

### DECISAO CONFIRMADA

Liberacao educacional e explicita, por cliente e por versao publicada. Nao existe liberacao automatica por fase, avaliacao, protocolo, aderencia ou tempo. Progresso nao e score e a cliente nao recebe escrita enquanto a regra de negocio correspondente permanecer pendente.

### DECISAO CONFIRMADA

A arquitetura definida usa Next.js, Vercel e Supabase para PostgreSQL, Auth, Storage e RLS.

### DECISAO CONFIRMADA

A VPS Hostinger fica disponivel apenas para servicos persistentes quando realmente necessario.

### DECISAO CONFIRMADA

n8n fica disponivel para automacoes quando houver necessidade.

### DECISAO CONFIRMADA

LangGraph sera usado somente para fluxos de IA que realmente justifiquem essa complexidade.

### DECISAO CONFIRMADA

Nao introduzir FastAPI ou outros servicos neste momento.

### DECISAO CONFIRMADA

RLS e obrigatoria. Cliente so acessa os proprios dados. Patty/admin acessa clientes sob sua responsabilidade.

### DECISAO CONFIRMADA

Dados de saude sao sensiveis. Fotos, exames e documentos devem ser privados.

### DECISAO CONFIRMADA

Secrets nao devem ser armazenados no repositorio. Dados reais nao devem ser usados no desenvolvimento inicial.

### DECISAO CONFIRMADA

Autenticacao, perfil, cliente e dados clinicos/operacionais devem ser separados. `auth.users` nao sera a tabela principal de clientes.

### DECISAO CONFIRMADA

Preservar historico, nao sobrescrever versoes antigas e registrar auditoria de acoes criticas.

### DECISAO CONFIRMADA

Todo o conteudo atual do Google Drive deve ser preservado.

### DECISAO CONFIRMADA

A biblioteca educacional deve ser separada da biblioteca de exercicios.

### DECISAO CONFIRMADA

O aplicativo substituira gradualmente o Drive para os clientes.

## 2026-09-24 - Primeiro lote controlado de migracao de midia educacional

### FATO OPERACIONAL

Sem alterar a decisao tecnica de usar Vercel Private Blob, foi preparado um manifesto machine-readable para a primeira migracao controlada.

O lote inclui exclusivamente o video `MovaviClips_Video_20220217-143151.mp4`, ja confirmado pela Patty como material da Consultoria, atual e autorizado para disponibilizacao a clientes.

O manifesto nao cria store, nao baixa nem envia o arquivo, nao cria conteudo/versao/asset no Supabase, nao publica e nao libera para cliente. Ele congela apenas a identidade da fonte e a ordem operacional ja decidida, com verificacao posterior obrigatoria de MIME, tamanho e SHA-256.

### FATO DE CAPACIDADE DA SESSAO

A integracao Vercel disponivel na sessao de 2026-09-24 nao expoe operacoes de Blob Storage. A criacao/conexao do store privado permanece uma pendencia operacional externa a esta implementacao. Nenhum token de Storage deve ser enviado por chat ou armazenado no repositorio.

## 2026-09-24 - Tratamento conservador de execution de IA nao terminal

### DECISAO TECNICA

Enquanto nao houver mecanismo de recovery explicitamente definido, uma execution `started` sem `completed_at`/ `failed_at` deve ser tratada como **nao terminal e pendente de reconciliacao**, nunca inferida como `failed` apenas por idade.

A aplicacao pode sinalizar esse estado para o admin, mas nao deve inventar timeout, failure response ou retry automatico. Essa regra evita transformar indisponibilidade de persistencia em um fato de falha que nao foi gravado.

## 2026-09-24 - Limite tecnico de retencao para falhas de IA

### DECISAO TECNICA

Para reduzir retencao excessiva de conteudo sensivel em cenarios de erro sem perder capacidade minima de auditoria:

- `ai_execution_failure_responses.content`: maximo de 128 KiB em bytes UTF-8;
- `ai_executions.failure_message`: maximo de 1.024 code points apos sanitizacao;
- NUL e substituido antes da persistencia;
- se a resposta original exceder o limite, o trecho retido e marcado como truncado e armazenado com `content_format = text`, mesmo quando a resposta original foi informada como JSON.

Esses limites sao controles tecnicos de minimizacao e nao alteram o lifecycle da execution, nao publicam resultados e nao substituem a politica juridica/organizacional de retencao.

## 2026-09-24 - Identidade estavel para ANAM-033 no contexto de IA

### DECISAO TECNICA

Para identificar a pergunta de condicao financeira entre versoes da Anamnese, usar o `question_key` semantico e versionado `financial_capacity_for_supplements`, associado a `ANAM-033` na proveniencia do mapa v1.

Nao usar label textual, posicao visual ou UUID de uma versao como identificador semantico. O UUID continua identificando a instancia da pergunta naquela versao; o `question_key` identifica o significado funcional dentro da definicao versionada.

A politica de IA permanece: excluir por padrao e permitir somente opt-in explicito da Patty para aquela execution.

## 2026-09-24 - Reconciliacao de escopo do primeiro purpose de IA

### FATO DOCUMENTAL

O primeiro purpose `anamnesis_review` nao deve mais ser descrito como aguardando escolha de provider, definicao de prompt ou contrato de output: esses elementos ja foram implementados e documentados.

A configuracao `gpt-5.6-terra` + reasoning `medium` continua sendo configuracao tecnica inicial, nao uma aprovacao definitiva de qualidade. A avaliacao sintetica e o gate de dados de saude continuam pre-condicoes para uso com dados reais.

A taxonomia de futuros `purpose_key` e seus contratos permanece aberta e nao altera o contrato v1 de `anamnesis_review`.

## 2026-09-24 - Defesa em profundidade para retencao de falhas de IA

### DECISAO TECNICA

Os limites de retencao de falhas de IA nao ficam apenas na aplicacao. O banco tambem rejeita:
- `ai_execution_failure_responses.content` acima de 131072 bytes;
- `ai_executions.failure_message` acima de 1024 caracteres.

A migration aplicada e `20260924215415_add_ai_failure_retention_constraints`.

Essa camada adicional nao substitui sanitizacao/truncamento server-side; ela existe como fail-safe de integridade.

## 2026-09-24 - Observabilidade central de execution nao terminal

### DECISAO TECNICA

Executions de IA nao terminais devem ser visiveis de forma central para a Patty/admin, mas a observabilidade nao pode alterar o significado do estado persistido.

A area `/admin/ia` lista apenas registros acessiveis por RLS que continuam `started` sem `completed_at`/ `failed_at`. Nenhum timeout, retry ou transicao de estado e inferido.

## 2026-09-24 - ANAM-046 como checkbox obrigatorio no envio final

### REGRA CONFIRMADA

No MVP, o consentimento da Anamnese sera simples e integrado ao envio final.

ANAM-046:
- aparece como checkbox obrigatorio antes do envio da `client-anamnesis`;
- usa o texto versionado: "Concordo com o tratamento das informações fornecidas nesta Anamnese, inclusive dados de saúde, para realização do meu acompanhamento pela Consultoria Corpo & Mente.";
- persiste o valor `Concordo` na resposta versionada;
- nao impede salvar/retomar rascunho quando ainda nao marcado;
- bloqueia o envio final quando nao marcado;
- nao exige IP, device fingerprint, localizacao ou metadados adicionais;
- nao autoriza automaticamente uso de dados reais pela OpenAI.

### DECISAO TECNICA

Nao criar tabela juridica paralela para o MVP. O aceite usa a estrutura versionada existente de `anamnesis_questions` + `anamnesis_answers`, preservando cliente, submission, form version, pergunta, resposta e timestamps.

A UI renderiza a unica opcao valida `Concordo` como checkbox, enquanto o backend revalida a definicao versionada antes de concluir a submission.

## 2026-09-24 - Publicacao da primeira client-anamnesis

### FATO OPERACIONAL

A primeira definicao canonica `client-anamnesis`, versao 1, foi publicada no Supabase SaaS pela migration `20260924230322_publish_canonical_anamnesis_v1`.

A definicao publicada deriva do field map v1 aprovado e contem 10 secoes, 51 perguntas e 10 condicionais.

ANAM-046 integra a mesma versao:
- `question_key = consent_acceptance`;
- obrigatorio;
- `single_choice`;
- unica opcao `Concordo`;
- UI propria de checkbox na finalizacao.

A definicao nao deve ser alterada in-place. Mudancas futuras exigem nova versao.

## 2026-09-24 - Evidencia de envio completo da client-anamnesis v1

### FATO DE TESTE

A primeira versao canonica publicada passou por smoke transacional completo no Supabase SaaS com `ROLLBACK`.

A validacao utilizou dados sinteticos, preencheu todas as perguntas aplicaveis, preservou 10 condicionais como nao aplicaveis quando suas controladoras receberam `Nao`, gravou ANAM-046 como `Concordo` e concluiu `submitted_at`.

Nenhum registro do smoke foi preservado apos o `ROLLBACK`.

## 2026-09-24 - Validacao de producao do consentimento canonico

### FATO DE TESTE

O consentimento ANAM-046 da `client-anamnesis` v1 foi validado no browser contra producao pelo run GitHub Actions `36072067063`.

O teste confirmou a UI de checkbox obrigatorio, ausencia de persistencia sem aceite, persistencia de `Concordo` quando marcado, manutencao do draft quando outro campo obrigatorio permanece vazio e cleanup completo da fixture sintetica.

Esse resultado encerra o gate funcional de consentimento da v1.

## 2026-09-24 - Validacao de producao do inicio da Anamnese canonica

### FATO DE TESTE

O fluxo de inicio e retomada da `client-anamnesis` v1 foi validado no browser contra producao pelo run GitHub Actions `36074218960`.

O teste confirmou criacao do draft da versao publicada, vinculo correto a cliente, manutencao de `submitted_at = null`, substituicao da acao de inicio por `Continuar rascunho`, retomada do mesmo registro e cleanup sem residuo.

Esse resultado encerra o gate funcional de inicio/retomada da v1.
## 2026-09-26 - Levantamento ampliado do metodo da Patty

### REGRA CONFIRMADA PELA PATTY

A leitura da Anamnese e holistica: a Patty considera o conjunto das respostas, rotina, alimentacao, peso/medidas/fotos, horario de maior fome, comportamento e fatores de adesao. Nao existe peso fixo universal para uma pergunta isolada.

A quantidade de refeicoes continua adaptada ao habito/rotina da cliente. Preferencias e substituicoes usam as tabelas/catalogos permitidos.

Treino e prescrito somente quando a cliente solicita esse servico. A montagem considera pratica previa, frequencia pretendida, limitacoes e evolucao.

Na avaliacao corporal, visual e medidas podem ter mais peso profissional do que a balanca isolada. A cadencia quinzenal/mensal ja documentada foi reconfirmada e peito foi citado como medida adicional relevante.

Relatos de alimentacao emocional, culpa, compulsao ou restricao merecem atencao profissional especial.

### LIMITE DA CONFIRMACAO

A mesma rodada trouxe afirmacoes que ainda nao possuem definicao operacional suficiente para automacao: contagem conjunta de gordura/legumes com carboidrato, relacao de doses de legumes, orientacao de ausencia de gordura saturada, magnesio/alho/manipulados, criterios de encaminhamento por doenca, minimo de treino, estagnacao e revisao em 30 dias.

Esses pontos foram mantidos como questoes abertas. Nenhuma formula, alerta, recomendacao de suplemento, bloqueio de saude ou gerador automatico de treino deve ser criado a partir deles sem nova formalizacao.

### FONTE

A rodada esta preservada em `docs/PATTY_METHOD_SURVEY_20260926.md`. As secoes de acompanhamento, formato do protocolo, excecoes e caso real ficaram sem resposta naquela rodada. A definicao de bom resultado foi parcialmente esclarecida em 2026-09-27: mudanca numerica coerente com o objetivo e valida; evolucao contra o objetivo ou numeros em geral estagnados nao sao considerados resultado valido. Os criterios operacionais para automatizar essa leitura continuam abertos.
## 2026-09-26 - Solicitacao de treino como gate explicito

### DECISAO DE PRODUTO/TECNICA

Como a Patty confirmou que so prescreve treino para clientes que solicitam o servico, o sistema passa a preservar essa solicitacao como fato estruturado append-only em `client_training_requests`.

A Patty registra o fato sob admin/AAL2/assignment ativo. O registro nao gera treino, nao seleciona exercicios, nao altera protocolo e nao publica nada.

A progressao definitiva de treino continua aberta e nao e inferida desta decisao.
## 2026-09-26 - Avaliacao em rascunho antes da consolidacao

### DECISAO DE PRODUTO/TECNICA

A autoria operacional de Avaliacoes usa lifecycle `rascunho -> finalizada`.

Enquanto em rascunho, a Patty pode ajustar data/tipo, medidas e vinculos de fotos privadas. A finalizacao e explicita e torna esses dados imutaveis.

A escolha evita sobrescrever historico depois da consolidacao e permite fechar o fluxo operacional sem inventar o catalogo mensal completo ou unidades ainda abertas.

A classificacao quinzenal/mensal registra a cadencia confirmada, mas o banco nao infere completude por chaves de medida enquanto catalogo/unidades nao forem formalizados.

Decisoes profissionais de acompanhamento associadas a uma avaliacao so podem ser registradas depois da finalizacao.

## 2026-09-27 - Edicao controlada do Cadastro Atual

### DECISAO DE PRODUTO/TECNICA

O Cadastro Atual continua sendo estado corrente 1:1 de `clients`, separado de Auth, Profile e Anamnese historica.

Campos atualmente editaveis:
- Cidade;
- Telefone;
- Email de contato;
- Instagram.

Fluxos:
- cliente: edita o proprio Cadastro Atual em `/cliente/perfil`;
- Patty/admin: edita o Cadastro Atual da cliente pela tela administrativa, somente quando a cliente esta acessivel pelo assignment ativo e a sessao administrativa ja passou por MFA AAL2.

A escrita nao foi aberta diretamente ao browser/Data API. As Server Actions validam identidade/escopo com o cliente Supabase autenticado normal e somente depois chamam uma boundary `server-only` privilegiada para fazer o upsert de `client_registration`.

Email de login e email de contato permanecem conceitos independentes. Alterar `contact_email` nao chama Admin Auth, nao altera `auth.users` e nao sincroniza a Anamnese.

Os quatro campos continuam opcionais nesta etapa; a obrigatoriedade de um formulario cadastral ampliado permanece fora desta decisao.

Nao foi criado historico/versionamento do Cadastro Atual nesta etapa. `updated_at` representa somente o estado corrente; snapshots historicos continuam pertencendo aos dominios historicos correspondentes.

## 2026-09-27 - Pendencias operacionais sao fatos derivados

### DECISAO TECNICA/PRODUTO

O painel administrativo de pendencias nao possui tabela propria nesta etapa.

Cada item e derivado de um estado objetivo ja persistido e autorizado pelo RLS existente. O painel e uma visao de trabalho, nao uma nova fonte de verdade.

Estados inicialmente incluidos:
- Anamnese em draft;
- Anamnese enviada sem revisao registrada;
- esclarecimento sem resposta;
- avaliacao em draft;
- protocolo submetido sem aprovacao;
- protocolo aprovado sem publicacao;
- IA `started` sem estado terminal.

Nao inferir prioridade, prazo, urgencia, adesao, estagnacao ou decisao profissional a partir desses estados. Novas categorias so podem entrar quando houver estado objetivo documentado que as sustente.

