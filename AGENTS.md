# Instrucoes para agentes no Projeto Patty

## Fonte de verdade

### DECISAO CONFIRMADA

A documentacao deste repositorio e a fonte de verdade do Projeto Patty.

Antes de propor ou implementar mudancas, leia os documentos relevantes em `docs/` e este `AGENTS.md`.

Decisoes mais recentes registradas na documentacao prevalecem sobre conversas antigas.

## Metodo profissional e regras clinicas

### DECISAO CONFIRMADA

Nenhum agente pode inventar regras clinicas, nutricionais, comportamentais, de treino, suplementacao, hidratacao, avaliacao, alertas, mudanca de fase, reconhecimento metabolico ou qualquer regra do metodo profissional da Patricia Torres.

Se uma regra nao estiver definida pela Patty ou registrada como decisao confirmada, ela deve ser tratada como `QUESTAO ABERTA`.

Exemplos, casos individuais e hipoteses nao devem ser transformados em regra geral do metodo.

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

## Controle de versao

### DECISAO CONFIRMADA

Nao fazer commit, push, merge, rebase, tag ou pull request sem instrucao explicita.

Nao criar branches sem instrucao explicita.

Nao apagar historico nem sobrescrever versoes antigas sem instrucao explicita e justificativa clara.

## Relatorios

### RECOMENDACAO TECNICA

Ao finalizar uma tarefa, relatar:

- arquivos alterados;
- decisoes registradas ou alteradas;
- questoes abertas criadas ou resolvidas;
- itens propositalmente fora de escopo;
- verificacoes executadas;
- estado do Git quando relevante.
