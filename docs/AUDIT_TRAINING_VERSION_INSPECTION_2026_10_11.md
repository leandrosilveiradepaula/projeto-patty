# Esteira 33 — auditoria de inspecao de treino, 2026-10-11

## Objetivo
Dar visibilidade operacional as mudancas de um treino antes da revisao/publicacao e permitir a cliente conferir somente publicacoes que ja podem ser lidas. Paginar solicitacoes sem eliminar o historico.

## Correcoes e criterios verificaveis
1. Comparar titulo preservado entre versoes.
2. Comparar observacoes gerais, inclusive ausencia.
3. Usar a ultima publicacao cronologica real como base, nao a maior versao numerica.
4. Distinguir primeira versao sem base anterior.
5. Preservar identidade de versao e data original.
6. Ordenar comparacao por posicao registrada.
7. Detectar exercicios de posicao incluida.
8. Detectar exercicios de posicao removida.
9. Detectar mudanca de nome no mesmo slot.
10. Detectar alteracao textual de series.
11. Detectar alteracao textual de repeticoes.
12. Detectar alteracao textual de descanso.
13. Detectar alteracao textual de orientacoes.
14. Detectar troca da versao de exercicio vinculado sem expor UUID em comparacoes.
15. Nao converter texto de repeticoes em numero ou progressao.
16. Sinalizar posicoes historicas duplicadas como ambiguas.
17. Nao reordenar nem modificar snapshots persistidos.
18. Exibir contagem de exercicios anterior e atual.
19. Exibir contagem de slots iguais, alterados, incluidos, removidos ou ambiguos.
20. Oferecer comparacao na tela profissional sem abrir historico manualmente.
21. Preservar links para publicacao anterior completa.
22. Oferecer comparacao factual na tela da cliente.
23. Manter versoes nao publicadas invisiveis para cliente.
24. Paginar pedidos historicos em blocos de 10 no administrativo.
25. Paginar pedidos anteriores da cliente sem ocultar o pedido mais recente.
26. Validar pagina de URL e preservar ancora de navegacao.
27. Manter revisao e publicacao humanas independentes.

## Fora do escopo
Progressao automatica, alteracao de prescricoes, interpretacoes clinicas, metas, RLS e migrations. Comparacao por posicao e uma comparacao factual de slots, nao prova de continuidade do mesmo exercicio.

## Verificacao
Testes de campos e limites, contratos de interfaces, TypeScript, suites e build em GitHub Actions. E2E em ambiente real com dados sinteticos permanece pendente.
