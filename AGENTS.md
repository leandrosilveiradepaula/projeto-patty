# Instrucoes para agentes no Projeto Patty

## Fonte de verdade

### DECISAO CONFIRMADA

A documentacao deste repositorio e a fonte de verdade do Projeto Patty.

Antes de propor ou implementar mudancas, leia este `AGENTS.md`, depois `docs/PROJECT_STATUS.md` e, em seguida, os documentos relevantes em `docs/`.

`docs/PROJECT_STATUS.md` e o ponto de entrada operacional e deve apontar para as fontes de verdade detalhadas; ele nao substitui os documentos normativos.

Decisoes mais recentes registradas na documentacao prevalecem sobre conversas antigas.

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
