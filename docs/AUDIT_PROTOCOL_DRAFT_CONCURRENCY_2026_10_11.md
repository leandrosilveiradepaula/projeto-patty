# Auditoria de edição concorrente no rascunho alimentar — 2026-10-11

## Problemas reproduzíveis por inspeção
As ações antigas de edição de nome e doses faziam `UPDATE` por identificador sem comparar os valores originais. Excluir uma dose também ignorava se a quantidade havia sido alterada por outra aba. Excluir variações vazias não explicava o vínculo com passos de ciclos. O comparador de versões exibia a contagem de passos, mas ocultava mudanças na ordem manual.

## Escopo e critérios
- Nome de variação: comparação otimista de `label` original, inclusive `NULL`, e escopo por plano.
- Nome de refeição: comparação otimista de `label`, `position`, vínculo com variação e identidade.
- Quantidade de dose: comparação de tipo, refeição e quantidade originais; só confirma update se uma linha foi efetivamente retornada.
- Exclusão de dose: as mesmas comparações impedem exclusão de valores recém-editados.
- Exclusão de refeição vazia: bloqueia quando a identificação/posição/nome de origem mudou, além da checagem já existente de doses.
- Exclusão de variação vazia: verifica nome, chave de identidade, refeições e referências em passos de ciclos; informa à Patty para remover etapas primeiro.
- Falha de concorrência preserva os campos do formulário e sugere atualizar a tela. Nenhuma falha de rede é tratada como sucesso.
- Comparação com a versão-base inclui sequência factual dos ciclos além de contagens.
- São snapshots técnicos de formulário, não fonte de autorização: role, assignment, policies e ciclo de vida seguem no servidor.
- Nada é publicado automaticamente; o protocolo permanece versionado.

## Fora de escopo
Não alterar RLS, schema, migrations aplicadas, macros, doses padrão, periodicidade, IA ou fase. Conflitos entre exclusão de subitens e submissão no mesmo instante ainda dependem do bloqueio existente no banco. A homologação E2E autenticada com dados sintéticos continua pendente.

## Validação
Testes de parsing de originais, regressões do editor, Typescript, build e GitHub Actions. O CI verifica código e contratos; não substitui teste com duas sessões reais.
