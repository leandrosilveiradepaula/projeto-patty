# Esteira 33 — leitura prática de protocolos publicados (2026-10-11)

## Objetivo
Reduzir a dificuldade de navegar pela versão liberada de um plano alimentar, sem escolher automaticamente fase, dia, refeição ou alternância nutricional.

## Lacunas verificadas
A listagem de versões ocupava a página inteira, deixando o plano atual visualmente distante. O ciclo aparecia abaixo de todas as refeições, sem navegação para a variação citada em cada passo. A ordenação das variações usava a chave técnica aleatória do rascunho em vez da ordem factual de cadastro. Nomes ausentes podiam expor essas chaves para a cliente.

## Escopo implementado
- Seleção explícita de publicação vigente ou anterior, sempre limitada às publicações visíveis da cliente autenticada.
- Consulta à versão-base escolhida em URL e fallback seguro ao plano atual para identificadores inacessíveis.
- Distinção visual entre histórico e versão atual sem substituição automática.
- Ciclos publicados apresentados antes das refeições, com etapas ligadas à variação existente na mesma publicação.
- Âncoras estáveis por publicação e por variação, inclusive quando nomes se repetem.
- Links de navegação por seções e variações em dispositivos móveis.
- Rótulos de variação sem exibir chaves internas aleatórias.
- Ordenação cronológica técnica de inclusão das variações, com desempate estável e sem presumir ordem nutricional.
- Ordenação factual de refeições e passos pela posição persistida.
- Resumos quantitativos de variantes, refeições, ciclos e passos sem score nem interpretação clínica.
- Preservação da apresentação de doses, da versão exata liberada e do histórico em leitura.
- Sem schema ou migration nova, RLS alterada, publicação automática ou alteração de dados clínicos.

## Testes e riscos
Testes unitários da visão publicada e seleção autorizada; testes de contrato da navegação e ordenação; TypeScript, testes e build no GitHub Actions. Como o repositório não permite execução remota via Git local deste ambiente, as verificações são feitas pelo CI do GitHub. E2E autenticado real ainda exige homologação posterior.

## Dependência operacional anterior
A migration `20261011063500_replace_draft_meal_plan_cycle_steps.sql` do PR #682 aparece no repositório e não constava na última consulta ao histórico de migrations do Supabase remoto. Essa aplicação deve ser reconciliada no fluxo existente de deploy antes de depender do editor de etapas em produção; esta entrega não aplica nem altera a migration.
