# Esteira 33 — editor manual de ciclos alimentares (2026-10-11)

## Objetivo e evidência
A arquitetura já possuía `meal_plan_cycles`, `meal_plan_cycle_steps`, snapshots versionados e leitura para a cliente, mas faltavam controles de escrita na tela administrativa. O ciclo é opcional; não há sequência nutricional padrão imposta pelo aplicativo.

## Escopo implementado
- Criar ciclos vazios no rascunho autorizado, sem publicar.
- Selecionar variações existentes da mesma versão do plano.
- Adicionar e repetir variações como etapas do ciclo.
- Trocar a variação de uma etapa.
- Mover etapas para cima ou para baixo.
- Remover etapas mediante confirmação.
- Excluir ciclos vazios mediante confirmação.
- Reordenar as posições de 1 a N após alterações.
- Preservar os ciclos nas versões aprovadas/publicadas e na clonagem de versão.
- Comparar a fotografia original das etapas antes da gravação para identificar conflitos entre abas.
- Usar uma única RPC `security invoker` para reescrita transacional dos passos.
- Validar FK da variação para o plano, RLS, assignment e estado de rascunho.
- Bloquear envio à revisão de ciclos criados mas sem etapas; ausência total de ciclos continua permitida.
- Preservar o fluxo de revisão, aprovação e publicação exclusivamente humanas.
- Exibir estado de envio, mensagens de resultado e recuperação por atualização de página.
- Não presumir Low/High, fases, duração, número de etapas, macros ou outras regras clínicas.
- Manter leitura do portal da cliente e comparação de versões sem novo formato.
- Não alterar migrations previamente aplicadas nem enfraquecer policies.
- Não incluir dados reais de clientes, templates nutricionais ou automação de IA.

## Arquivos
Editor administrativo, server actions do protocolo, camada de dados Supabase, tipos da RPC, utilitário/testes de ciclo, readiness/testes, migration nova e este documento.

## Fora de escopo e riscos
A migration precisa ser aplicada no Supabase antes do uso da edição de etapas em produção. A UI não substitui a validação de RLS no banco. Não há testes E2E autenticados reais nesta entrega. Falhas de rede após a operação podem ter resultado incerto: atualizar o histórico antes de repetir.

## Aceitação e verificações
A tela deve permitir operações manuais exclusivamente em rascunhos; a versão revisada é somente leitura. Ciclos sem etapas não passam à revisão. As operações de passos devem falhar integralmente diante de edição concorrente ou publicação/revisão. CI de TypeScript, testes `test:protocol`, suites existentes e build devem passar. Testes de banco em Supabase SaaS permanecem pendentes até homologação.
