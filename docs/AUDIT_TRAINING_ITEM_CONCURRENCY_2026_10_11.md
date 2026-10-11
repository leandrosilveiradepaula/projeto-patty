# Auditoria operacional: edição e remoção concorrente de treinos

Data: 2026-10-11. Branch: `codex/training-item-complete-concurrency-v178`. Estado: implementado no código, testes de CI pendentes; sem deploy.

## Objetivo
Impedir que a Patty perca edições do rascunho ou remova um exercício que outra sessão já atualizou. Complementa a proteção parcial do PR #677, sem criar regras de treino.

## Correções verificáveis
1. Comparar `rest_text` original ao editar.
2. Comparar `execution_notes` original ao editar.
3. Comparar `exercise_version_id` original ao editar.
4. Comparar `position` original ao editar.
5. Escopar SQL do update à `training_plan_version_id` esperada.
6. Usar `IS NULL` para campos históricos nulos, distinguindo ausência de texto.
7. Validar o identificador de exercício original como UUID opcional, sem aceitar File.
8. Validar posição original como inteiro positivo no limite int4.
9. Comparar os snapshots do formulário ao registro lido pelo servidor.
10. Rejeitar conflito material com mensagem de recarregamento antes do update.
11. Enviar snapshots originais completos no formulário de edição.
12. Validar snapshots completos antes de uma remoção.
13. Escopar exclusão ao registro e à versão do treino.
14. Fazer delete condicional de todos os campos originais, inclusive nulos, contra corrida entre leitura e escrita.
15. Remontar o formulário quando posição/ordem persistida mudar e manter o histórico/revisão/publicação intactos.

## Fora do escopo
Nenhum novo score, regra de exercícios, avanço de fase, alteração de schema, RLS, migration, dados históricos, publicação automática, delete amplo ou transação global entre abas. O CAS é por campos do item; ele não representa um lock transacional geral do treino. O E2E autenticado com Supabase real segue pendente.

## Critérios de aceitação
Em edições/deleções de item, uma mudança concorrente nos campos originais deve resultar em zero linhas afetadas, sem confirmação falsa. Operações legítimas sob a versão correta continuam permitidas. Os testes determinísticos e de contrato, TypeScript, build e CI devem passar.
