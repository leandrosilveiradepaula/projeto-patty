# Questoes Abertas

Este documento concentra pontos ainda nao definidos. Cada item deve ser validado pelo responsavel adequado antes de virar decisao: regras do metodo e operacao profissional pela Patty; arquitetura, seguranca e produto tecnico pelo responsavel do projeto; temas juridicos/privacidade com validacao juridica quando aplicavel.

## Produto e usuarios

### FATO JA CONFIRMADO

A Patty ja possui o email da cliente e inicia o onboarding enviando um link para esse endereco. Nao existe cadastro publico/autonomo. O lifecycle tecnico de ativacao, definicao inicial de senha e login posterior esta implementado e passou E2E sintetico em producao. Site URL e redirect allowlist tambem estao alinhados.

### DECISAO DE INFRAESTRUTURA

O MVP usara o Gmail pessoal da Patty via Custom SMTP do Supabase Auth. A escolha de infraestrutura do email real de convite esta resolvida.

### PENDENCIA OPERACIONAL — BLOQUEADA NESTA SESSAO

A configuracao foi explicitamente adiada em 2026-09-24 por indisponibilidade operacional momentanea. Retomar quando houver acesso aos paineis Google/Supabase.

Ainda falta configurar no Google/Supabase:
- verificacao em duas etapas na conta Google;
- App Password exclusiva;
- Custom SMTP com `smtp.gmail.com`;
- template real `Invite user` usando `TokenHash` + `type=invite` para `/auth/confirm`;
- teste de entrega real com fixture sintetica.

A App Password deve ser inserida diretamente no Supabase e nao deve ser compartilhada no chat ou repositorio.

### QUESTAO ABERTA

Quais serao as regras de expiracao/reenvio do convite, recuperacao de acesso e encerramento da conta?

### PARCIALMENTE RESOLVIDO

O escopo preliminar confirmado do MVP ja esta registrado em `MVP.md`: fundacao segura, Anamnese/acompanhamento inicial, arquivos privados, avaliacoes, protocolos com controle humano, bibliotecas de conteudo/exercicios e IA assistiva em etapa posterior.

O que continua aberto nao e mais a lista macro de modulos, e sim o **recorte operacional exato do primeiro lancamento** diante dos bloqueios restantes.

### QUESTAO ABERTA

Quais fluxos precisam estar disponiveis para clientes no primeiro lancamento?

### QUESTAO ABERTA

Quais operacoes administrativas a Patty precisa executar no primeiro painel?

## Autenticacao

### QUESTAO ABERTA

Qual sera o tratamento de conta Auth excluida quando for necessario manter historico profissional?

## Autorizacao

### QUESTAO ABERTA POS-MVP

Se futuramente forem introduzidos assistentes, profissionais parceiros ou suporte operacional, quais papeis e permissoes client-scoped serao necessarios?

## Arquitetura e automacoes

## Modelo de dados

### PARCIALMENTE RESOLVIDO

Na Anamnese, todos os campos aplicaveis ao preenchimento final sao obrigatorios. O mapa nao juridico da v1, tipos, ordem e as 10 regras de aplicabilidade estao definidos; ANAM-046 continua pendente.

### QUESTAO ABERTA

Quais campos definitivos existirao em medidas, fotos, exames, protocolos e avaliacoes, e quais deles serao obrigatorios em cada fluxo?

### QUESTAO ABERTA

Qual sera a politica geral de retencao, arquivamento e exportacao de dados fora das decisoes ja confirmadas para preservacao do historico de IA?

### QUESTAO ABERTA

Quais serao os valores definitivos de `profiles.status`?

### QUESTAO ABERTA

Quais serao os valores definitivos de `clients.status`?

### QUESTAO ABERTA

Qual sera o formulario cadastral completo de `client_registration`?

### QUESTAO ABERTA

Como a cliente atualizara os dados cadastrais atuais: Perfil, fluxo dedicado de cadastro, confirmacao contextual durante a anamnese ou outro fluxo?

### QUESTAO ABERTA

Quem podera alterar cada dado cadastral atual da cliente, incluindo Cidade, Telefone, Email de contato e Instagram?

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

ANAM-046 permanece fora desse fechamento e exige controle proprio depois da definicao juridica.

### DECISAO DE PRODUTO

A v1 separa exatamente as 10 perguntas compostas explicitas do formato Sim/Nao + detalhe documentadas no mapa. ANAM-025 e ANAM-043 permanecem juntas.

Nenhuma separacao adicional deve ser inferida sem nova decisao.

### DECISAO DE PRODUTO E ESTADO APLICADO

A regra geral de exibicao condicional esta confirmada: pergunta dependente nao aplicavel fica oculta e nao obrigatoria.

A fundacao tecnica versionada esta aplicada no Supabase SaaS e a v1 possui exatamente 10 dependencias aprovadas no mapa, todas derivadas das perguntas compostas explicitas Sim/Nao + detalhe e ativadas por igualdade JSON exata com `"Sim"`.

A UI e a validacao de envio final usam a aplicabilidade versionada. Nenhuma dependencia adicional deve ser inferida.

### DECISAO DE PRODUTO

A ordem e o agrupamento descritos em `ANAMNESE_CANONICAL_V1_CANDIDATE.md` estao aceitos para a v1, com ANAM-010 em Cadastro.

O nome do arquivo preserva o sufixo `CANDIDATE` por historico; o conteudo nao juridico correspondente ja foi promovido a decisao de produto. ANAM-046 continua sendo o bloqueio de publicacao.

### FATO JA CONFIRMADO

A Patty confirmou que as medidas corporais podem ser separadas da Anamnese e tratadas em um fluxo proprio de Avaliacao/Medidas. O catalogo definitivo de medidas, unidades, obrigatoriedade e fluxo de correcao continuam abertos.

### FATO RESOLVIDO

ANAM-044 usa o dominio privado existente. A Anamnese orienta e aponta para `/cliente/arquivos`; cada arquivo e classificado por `file_kind` como `photo`, `exam` ou `document`. Nao existe upload duplicado nem `anamnesis_answer` de arquivo.

### QUESTAO ABERTA

Qual politica concreta de retencao define quando um arquivo inativado/substituido pode ser removido fisicamente, considerando referencias historicas e auditoria?

### BLOQUEIO EXTERNO — ANAM-046

O gate objetivo esta documentado em `ANAMNESE_CONSENT_GATE.md`.

Continuam pendentes de validacao juridica/operacional: texto oficial, versao/vigencia, base legal/finalidade, efeito da recusa, revogacao/retirada, retencao, evidencia tecnica minima, reconsentimento e relacao com IA.

A engenharia nao deve materializar nem publicar ANAM-046 antes de todas essas respostas estarem documentadas.

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
- avaliacao sintetica do modelo/effort com credencial de ambiente;
- controles organizacionais de retencao/processamento da OpenAI;
- base legal/consentimento aplicavel;
- conclusao explicita do checklist `OPENAI_HEALTH_DATA_GATE.md`.

O modelo inicial ainda nao deve ser tratado como escolha definitiva enquanto a avaliacao sintetica nao for aprovada.

### QUESTAO ABERTA — EXPANSAO FUTURA

A taxonomia global de `purpose_key` para futuros usos de IA e os contratos de output desses outros purposes continuam abertos. Isso nao reabre o contrato v1 ja definido para `anamnesis_review`.

### QUESTAO ABERTA

Como uma edicao manual da Patty deve interagir com valor originado de calculo deterministico, sem sobrescrever silenciosamente o resultado ou atribuir esse calculo a IA?

### QUESTAO ABERTA

Quais consentimentos, bases legais e politicas legais de retencao, arquivamento, descarte e exportacao se aplicarao ao contexto e ao historico de IA?

### QUESTAO ABERTA

Como a futura entidade de materializacao entre rascunho de IA e `protocol_version` identificara hipoteses ainda presentes e impedira aprovacao/publicacao enquanto alguma permanecer sem confirmacao explicita da Patty?

### QUESTAO ABERTA

Qual sera a classificacao definitiva de cada campo da anamnese nas categorias estruturais do produto?

### QUESTAO ABERTA

Havera alertas ou bloqueios de saude derivados de respostas da anamnese? Se houver, quais regras serao validadas pela Patty?

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

Havera alguma acao explicita para sincronizar email de autenticacao e email de contato, ou eles permanecerao independentes apos a criacao inicial?

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

A Patty confirmou duas rotinas de avaliacao:
- **quinzenal**: cintura, abdomen, quadril e peso;
- **mensal**: avaliacao completa com todas as medidas, peso e fotos.

Continuam abertos:
- o catalogo exato de todas as medidas da avaliacao mensal;
- as unidades permitidas;
- eventuais campos adicionais;
- como a avaliacao mensal se relaciona operacionalmente com a ocorrencia quinzenal quando as datas coincidirem.

### QUESTAO ABERTA

Qual e o fluxo auditavel para correcao de uma avaliacao ou medida historica sem sobrescrever o registro anterior?

### QUESTAO ABERTA

Qual e a origem da percepcao de aderencia e quais partes do acompanhamento profissional poderao futuramente ser exibidas para a cliente?

## IA e revisao de Anamnese

### PARCIALMENTE RESOLVIDO

A Patty confirmou a regra geral de aplicabilidade e o mapa v1 de 10 dependencias esta definido, versionado e consumido pela UI/validacao de envio.

A obrigatoriedade geral permanece: todos os campos aplicaveis da versao devem estar preenchidos no envio final.

O contrato deterministico de `missing_answer` esta implementado no validador: usa `target_question_id`, permite `source_answer_ids` vazio e exige que o target esteja na allowlist de perguntas previamente verificadas como aplicaveis e sem resposta para a mesma execution/submission.

A montagem server-side da allowlist foi implementada de forma deterministica a partir da submission, perguntas versionadas, answers e aplicabilidade. Continuam separados e abertos: provider/modelo, prompt version operacional e a UX humana dos findings.

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

### QUESTAO ABERTA — PENDENCIA RECONFIRMADA PELA PATTY

A Patty confirmou em 2026-09-24 que as Fases 5 e 6 da Planilha Carb Cycle continuam **pendentes**.

Nao implementar, inferir ou reaproveitar formulas de outras fases para preencher essa lacuna ate nova confirmacao explicita.

### PARCIALMENTE RESOLVIDO

A Patty confirmou que, apos `Cutting 2: 2 Low / 1 High`, a etapa seguinte e **Cutting 3 com protocolo linear**.

Continuam abertas:
- as regras detalhadas do Cutting 3 Linear;
- quais etapas, se houver, seguem depois dele.

### QUESTAO ABERTA

Quais sao as regras detalhadas de Bulking e Consolidacao?

### QUESTAO ABERTA

Quais sao as regras de hidratacao?

### QUESTAO ABERTA

Quais sao as regras de suplementacao e manipulados?

### QUESTAO ABERTA

Qual sera a montagem e progressao definitiva de treino, incluindo volume, progressao e cardio quando aplicavel?

### QUESTAO ABERTA

Quais criterios profissionais determinam avancar, simplificar ou retornar entre etapas alem do fluxo ja confirmado, sem criar score automatico de adesao?

### QUESTAO ABERTA

Quais sao os criterios profissionais finais de avaliacao e reavaliacao?

### QUESTAO ABERTA

Quais alertas profissionais devem existir, quais sao apenas informativos e quais, se algum, bloqueiam uma acao?

### QUESTAO ABERTA

Quais regras de comportamento ainda precisam ser formalizadas alem do principio confirmado de adaptar o protocolo a dificuldade relatada e priorizar adesao?

## Cadastro e Anamnese

### QUESTAO ABERTA

Quem pode criar ou alterar o Cadastro Atual e por qual fluxo controlado?

### FATO RESOLVIDO

O salvamento de rascunho, as permissoes minimas de escrita e a submissao final estao aplicados no SaaS.

A cliente pode retomar rascunho, salvar respostas `text` e `single_choice`, receber a visibilidade condicional versionada e enviar explicitamente a Anamnese. O banco revalida todos os campos obrigatorios aplicaveis antes de aceitar o envio. Autosave nao e requisito da v1.

### QUESTAO ABERTA

A especificacao da primeira Anamnese canonica permanece em `ANAMNESE_CANONICAL_V1_CANDIDATE.md`.

Tipos nao juridicos, 10 condicionais, perguntas compostas, ANAM-044, ordem, UX de salvamento e submissao final estao definidos e implementados. O envio final e revalidado deterministicamente no banco e a migration correspondente esta aplicada.

O bloqueador restante para materializar/publicar a primeira versao canonica e o texto/versionamento/operacao juridica de ANAM-046.

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

Continuam abertos:
- notificacao fora da tela de Anamnese;
- prazo/expiracao;
- eventual estado formal de aberto/resolvido;
- regras de encerramento ou reabertura;
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

### QUESTAO ABERTA

Quais campos, tipos de protocolo e elementos profissionais compoem um protocolo alem da estrutura versionada inicial?

### QUESTAO ABERTA

Quais regras profissionais ainda pendentes devem completar a criacao, revisao e aprovacao de um plano alimentar, sem reabrir as regras do metodo ja confirmadas em `BUSINESS_RULES.md` e `DECISIONS.md`?

### QUESTAO ABERTA

Qual catalogo de equivalentes sera validado, quem podera versiona-lo e qual parte, se alguma, podera ser exibida a cliente em um protocolo publicado?


## OpenAI — modelo e controles de dados

### FATO CONFIRMADO

O provider do primeiro fluxo `anamnesis_review` sera OpenAI.

### QUESTOES/OPERACOES AINDA ABERTAS

- validar `gpt-5.6-terra` + reasoning `medium` com avaliacao sintetica antes de enviar dados reais; o model ID pode ser sobrescrito por `OPENAI_MODEL`;
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
