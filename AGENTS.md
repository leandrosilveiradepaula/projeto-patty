# Instrucoes para agentes no Projeto Patty

## Fonte de verdade

### DECISAO CONFIRMADA

A documentacao deste repositorio e a fonte de verdade do Projeto Patty.

Antes de propor ou implementar mudancas, leia este `AGENTS.md`, depois `docs/PROJECT_STATUS.md` e, em seguida, os documentos relevantes em `docs/`.

`docs/PROJECT_STATUS.md` e o ponto de entrada operacional e deve apontar para as fontes de verdade detalhadas; ele nao substitui os documentos normativos.

Decisoes mais recentes registradas na documentacao prevalecem sobre conversas antigas.

## Trava de execucao por prioridade — decisao do responsavel em 2026-10-25

### REGRA OPERACIONAL OBRIGATORIA

O plano existente deve ser EXECUTADO, nao reinterpretado a cada conversa. A issue [#1008](https://github.com/leandrosilveiradepaula/projeto-patty/issues/1008) e a fila operacional de encerramento das jornadas J1–J7. Este AGENTS.md define a verificacao obrigatoria antes de trabalhar; a documentacao normativa segue prevalecendo para seguranca e metodo da Patty.

**Antes de abrir branch, codificar, pedir testes extras ou propor uma PR:**

1. Conferir `master`, working tree quando acessivel, `docs/PROJECT_STATUS.md`, #1008 e os documentos normativos afetados. Registros antigos sao historicos; confirmar estados atuais com GitHub, CI, Supabase ou Vercel somente quando necessario.
2. Selecionar a **proxima pendencia funcional NAO concluida da fila #1008**, respeitando a ordem vigente. Se a issue nao tiver uma unica proxima entrega executavel, primeiro registrar nela a decisao de ordenacao com fatos e pendencias existentes, sem inventar novo projeto.
3. Registrar na issue, antes da implementacao, um **cartao de execucao**: ID/jornada; evidencia de que a pendencia existe; objetivo observavel para Patty/cliente; arquivos permitidos; fora de escopo; criterios de aceitacao; testes minimos; riscos; dependencia/gate humano; proximo passo apos concluir. Uma mensagem curta e suficiente; nao criar novo documento.
4. Confirmar que nao e melhoria preventiva, auditoria repetida, reabertura de jornada concluida ou correcao cosmetica sem impacto no uso. Se for, **nao executar**: seguir para a proxima pendencia real.
5. Implementar pacote funcional completo e verificar apenas as provas relevantes ao diff e gates existentes. Falha de CI e corrigida na mesma branch. Nao enfraquecer seguranca para aprovar testes.
6. Ao concluir, registrar na #1008 evidencias e estado separado de **implementado / testado / migration aplicada / commitado / mergeado / publicado / homologado**, atualizar status documental junto de pacote funcional apropriado e identificar a **proxima pendencia unica**. Nao anunciar implantacao ou aceite sem prova.

**Excecoes permitidas fora da fila:** vulnerabilidade critica comprovada, incidente ativo que bloqueie uso, falha impeditiva reproduzida ou autorizacao explicita do responsavel para mudar a ordem. Registrar motivo, evidencia, impacto, escopo minimo e retorno a fila na #1008 antes de desviar; em emergencia, registrar assim que seguro. Hipoteses e oportunidades de limpeza nao sao excecoes.

**Limites inegociaveis:** nao insistir em onboarding/Auth ja estabilizado sem falha impeditiva comprovada; nao abrir tarefas derivadas so porque aparecem no codigo; nao criar PR apenas para atualizar relatarios rotineiros; nao repetir auditorias, pipelines, migracoes, deployments ou testes ja aprovados sem mudanca que justifique. Decisoes de saude, direitos autorais, privacidade, Auth/RLS e alteracoes de producao continuam com seus gates proprios; esta regra nao os dispensa. Homologacao conjunta da Patty J1–J7 permanece a **ultima tarefa**.

**Indicador de cumprimento:** cada PR funcional deve apontar para seu cartao na #1008, mostrar o fluxo de uso que foi concluido e indicar a proxima pendencia. Numero de PRs e testes verdes isolados nao significam progresso funcional.

## Metodo profissional e regras clinicas

### DECISAO CONFIRMADA

Nenhum agente pode inventar regras clinicas, nutricionais, comportamentais, de treino, suplementacao, hidratacao, avaliacao, alertas, mudanca de fase, reconhecimento metabolico ou qualquer regra do metodo profissional da Patricia Torres.

Se uma regra nao estiver definida pela Patty ou registrada como decisao confirmada, ela deve ser tratada como `QUESTAO ABERTA`.

Exemplos, casos individuais e hipoteses nao devem ser transformados em regra geral do metodo.


## Parametrizacao obrigatoria do metodo

### DECISAO CONFIRMADA

Antes de alterar runtime relacionado ao metodo, ler `docs/CONFIGURABLE_RULES.md`.

Nao introduzir como estado final novos valores profissionais hardcoded no codigo. Isso inclui formulas, coeficientes, g/kg, doses, equivalencias, limites, arredondamentos, series, repeticoes, descansos, sequencias de fases, frequencias, prazos e demais parametros do metodo.

Os valores atuais dos Excels e das regras confirmadas sao templates iniciais versionados. O codigo deve implementar o motor deterministico seguro; valores e formulas profissionais estruturadas pertencem a configuracao versionada, com override por cliente quando aplicavel e snapshot do que foi efetivamente usado.

Constantes profissionais ja existentes sao divida de migracao e nao precedente para novos hardcodes. Nao alterar comportamento apenas para antecipar a migracao; cada retirada de hardcode deve preservar historico, testes e auditabilidade.

RLS, Auth, MFA, secrets, autorizacao, constraints de integridade, protecao de arquivos, preservacao de historico e a proibicao de publicacao direta pela IA continuam invariantes tecnicas e nao configuracoes livres do metodo.

## Planejamento de tarefas

### DECISAO CONFIRMADA

As tarefas devem ser pequenas, verificaveis e bem delimitadas.

Cada tarefa deve declarar:

- objetivo;
- escopo;
- fora de escopo;
- criterios de aceitacao;
- testes ou verificacoes esperadas.

Implementacao, teste e publicacao sao estados diferentes. Uma tarefa implementada nao deve ser tratada como publicada sem instrucao explicita.

## Engenharia

### DECISAO CONFIRMADA

Nao introduzir dependencias, servicos, frameworks ou abstracoes sem necessidade clara.

Nao instalar pacotes, criar servicos externos, configurar Supabase, n8n, LangGraph, VPS ou Vercel sem instrucao explicita da tarefa.

Nao introduzir FastAPI ou outros servicos neste momento.

## Seguranca e privacidade

### DECISAO CONFIRMADA

Seguranca e privacidade sao requisitos desde o inicio.

Dados de saude sao sensiveis.

Nunca colocar dados reais, credenciais, tokens, chaves de API, dumps, fotos reais, exames reais ou documentos reais no repositorio.

Secrets devem permanecer fora do Git.

RLS sera obrigatoria quando o Supabase for implementado.

## Controle de versao e autorizacao de merge (atualizado em 2026-10-14)

### AUTORIZACAO EXPLICITA DO RESPONSAVEL

O responsavel ja autorizou criacao de branches, commits, pushes, PRs, correcoes de CI e **merge automatico de PRs elegiveis** durante o desenvolvimento do Projeto Patty. Nao pedir novamente "prossiga" ou autorizacao rotineira de merge. Esta decisao substitui a proibicao generica anterior neste escopo.

A esteira `.github/workflows/auto-merge-journeys.yml` permite merge automatico **apenas** quando o commit exato do PR tiver passado integralmente pelo workflow `Validate application`, cumprir o contrato de jornada e nao modificar arquivos sensiveis definidos pelo gate versionado. Merge nao significa deploy ou homologacao.

Mudancas em workflows, Auth/RLS, migrations, controles de IA/saude, seguranca, arquivos confidenciais, alteracoes destrutivas e regras profissionais **nao** entram no auto-merge: requerem revisao especifica antes da integracao. Falhas do CI sao corrigidas na mesma branch, nunca por PR corretivo paralelo. Nao enfraquecer testes, RLS ou gates para obter verde.

O trabalho deve ser estruturado por **jornada completa**, com um objetivo e inicio/fim observaveis, e nunca por contagem artificial de blocos ou PRs. O contrato da jornada, evidencias e impedimentos ficam em `docs/JOURNEY_HOMOLOGATION.md`.

Uma jornada permanece NAO HOMOLOGADA ate execucao autenticada fim a fim, verificacao de persistencia e escopo de acesso, confirmacao do SHA publicado na producao e evidencia de uso em mobile. CI verde isolado nao confirma nada disso.

Nao apagar historico nem sobrescrever versoes antigas sem justificativa e verificacao de seguranca.

## Relatorios

### RECOMENDACAO TECNICA

Ao finalizar uma tarefa, relatar:

- arquivos alterados;
- decisoes registradas ou alteradas;
- questoes abertas criadas ou resolvidas;
- itens propositalmente fora de escopo;
- verificacoes executadas;
- estado do Git quando relevante.

Quando a tarefa alterar materialmente o estado do projeto, atualizar tambem `docs/PROJECT_STATUS.md` antes de considerar a tarefa concluida. Exemplos incluem nova decisao, regra confirmada, questao resolvida, migration criada/aplicada, fluxo implementado, teste relevante, bloqueio, prioridade ou merge/publicacao.
