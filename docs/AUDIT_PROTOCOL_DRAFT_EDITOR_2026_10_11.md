# Auditoria operacional — montagem do rascunho de protocolo

**Data:** 2026-10-11. **Status:** proposta em PR, depende de merge/deploy.

## Problema comprovado
A montagem manual de plano alimentar, variações, refeições e doses utiliza dez formulários reais que invocavam server actions diretamente. O estado de carregamento só desabilitava o botão ao renderizar novamente; dois submits dentro do mesmo intervalo podiam atingir a mesma action antes de React atualizar `isPending`. A edição e remoção da mesma dose também possuíam formulários paralelos sem trava compartilhada. Isso podia duplicar itens, enviar comandos concorrentes ou registrar duas remoções desnecessárias.

## Mudanças
- Trava síncrona por instância em dez formulários; restauração após resposta da action. Estados de erro continuam permitindo corrigir e tentar novamente, e adições sucessivas continuam permitidas após sucesso e refresh.
- Criação de estrutura inicial e remoções bloqueiam novo submit depois de sucesso confirmado enquanto o workspace se atualiza.
- Campo de nome, macro e quantidade ficam desabilitados durante gravação. Formulários expõem `aria-busy` para indicação acessível.
- Os dois formulários na mesma dose compartilham trava, impedindo atualização/remocão simultânea pelo mesmo componente.
- O fluxo continua usando os mesmos actions do servidor, validações, regras de integridade, snapshots e checagens de role/RLS.
- Revisão, aprovação e publicação permanecem separadas e exclusivamente humanas.

## Fora de escopo
Nenhuma regra profissional numérica, macro, algoritmo nutricional, migration, policy, autorização, IA, progressão de fases ou publicação automática. A trava de UI não garante idempotência entre sessões/abas ou alterações concorrentes no banco. E2E autenticado no Supabase real continua pendente.

## Verificações
TypeScript, testes da jornada, contrato de estados e GitHub Actions; após merge, homologar manualmente a edição e os erros de rede com dados sintéticos.
