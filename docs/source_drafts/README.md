# Fonte historica desidentificada - catalogo alimentar

Este diretorio guarda apenas **fontes de migracao em rascunho** extraidas de materiais historicos fornecidos para o Projeto Patty.

## food_equivalent_catalog_historical_source.json

Origem: workbook historico `Macros.xlsx`, aba `Planilha Base`.

Estado: `historical_source_draft_review_required`.

Regras de uso:
- nao publicar automaticamente;
- nao tratar marca, grafia, quantidade ou agrupamento historico como regra profissional atual sem revisao;
- nao importar suplementos, manipulados, recursos ergogenicos ou modelos historicos de refeicoes por este snapshot;
- preservar a separacao entre fonte historica e catalogo versionado aprovado;
- qualquer publicacao para cliente exige revisao humana e versao explicitamente aprovada.

O snapshot preserva os valores de referencia 15 g proteina, 12 g carboidrato, 6 g gordura e 6 g legumes observados na fonte. A equivalencia atual confirmada pela Patty de 2 doses de legumes = 1 dose de carboidrato e registrada separadamente na documentacao oficial.

Este arquivo nao contem nomes de clientes nem dados individuais.

## Gate automatico da fonte

O helper `lib/content/food-equivalent-source.ts` valida somente a integridade da fonte de migracao:
- status continua como rascunho historico sujeito a revisao;
- referencias confirmadas de doses nao sofreram drift;
- relacao 2 doses de legumes = 1 dose de carboidrato permanece registrada;
- grupos possuem chaves unicas;
- itens preservam a tupla historica `[alimento, quantidade, doses]`;
- duplicidades dentro do mesmo grupo sao sinalizadas.

Mesmo quando a validacao estrutural passa, o resultado permanece `publishable: false`. A validacao nunca equivale a aprovacao profissional/editorial e nao grava o snapshot nas tabelas ativas de equivalentes.
