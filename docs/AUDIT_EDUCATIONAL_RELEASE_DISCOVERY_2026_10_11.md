# Auditoria: consulta de materiais educacionais e liberacao individual

## Objetivo
Permitir localizar materiais ja liberados e selecionar versoes elegiveis a liberar, sem ampliar o acesso.

## Escopo e criterios reais
1. Busca pelo titulo da versao liberada.
2. Busca pelos nomes de categoria ja registrados.
3. Busca pelo tipo ja registrado.
4. Normalizacao de acentos de busca.
5. Normalizacao de caixa e espacos.
6. Filtro por categoria obtida dos releases visiveis.
7. Filtro por tipo obtido dos releases visiveis.
8. Filtro de releases com arquivos.
9. Filtro de releases sem arquivos.
10. Ordenacao por data de liberacao mais recente.
11. Ordenacao por data antiga.
12. Ordenacao alfabetica de titulos.
13. Ordenacao pela contagem de arquivos.
14. Desempate estavel entre liberacoes no mesmo instante.
15. Tratamento de timestamp historico invalido.
16. Paginacao local de doze versoes ja autorizadas.
17. Limpeza dos filtros e retorno a primeira pagina.
18. Limites da pagina anterior/proxima e estado vazio.
19. Contadores de materiais disponiveis e faltantes.
20. Contagens relativas aos filtros atuais.
21. Preservar o link autenticado de download por asset.
22. Preservar o link de release por identidade exata.
23. Buscar opcoes administrativas por titulo.
24. Buscar opcoes administrativas por numero da versao.
25. Manter a opcao selecionada durante pesquisas administrativas.
26. Confirmar explicitamente a versao exata antes de liberar.
27. Preservar catalogo exclusivo da Patty e o fluxo de liberacao humana.

## Fora de escopo
Novas taxonomias, distribuicao de materiais sem direitos, migracao do Drive, autorizacao no browser, controle de conclusao, publicacao automatica, migrations e RLS.

## Testes
Unitarios de busca/ordenacao/paginacao, suites de regressao, typecheck e build no GitHub Actions; fluxo autenticado real ainda pendente.
