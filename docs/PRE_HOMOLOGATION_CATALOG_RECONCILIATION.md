# Consolidação pré-homologação — catálogo profissional e PRs antigos

## Objetivo e classificação

A homologação operacional com a Patty continua reservada **para a última tarefa**, depois dos testes sintéticos, correções, triagem dos PRs e implantação do código. A biblioteca de exercícios não publica nem seleciona automaticamente versões para clientes.

## Reconciliação verificada em 19/10/2026

PRs anteriores abertos em versões antigas do master foram conferidos sem cherry-pick nem merge de histórico obsoleto: #646, #653, #654, #655, #667, #688 e #697 encerrados como superados, com notas de rastreabilidade em cada PR. Isso não significa merge desses PRs nem homologação profissional.

PR #698 ainda tinha diferenciais legítimos de descoberta profissional: ordenação por nome, datas, publicação e quantidade de versões. O master já implementava busca, paginação de 16 itens e seleção da versão exata no treino individual. Este pacote reconcilia **somente a ordenação** sobre o código atual, mantendo as demais capacidades recentes e a consulta sob RLS existente.

## Regras da interface (decisões técnicas, não profissionais)

- Filtros GET `q` e `status` continuam inalterados.
- O filtro `ordem` aceita estritamente `recent`, `oldest`, `name-asc`, `name-desc`, `published` e `versions`. Valores desconhecidos/repetidos usam a ordem existente.
- `recent` mantém a ordenação atual, enquanto opções alternativas reordenam os registros autorizados **antes** da paginação existente.
- `versions` conta as versões efetivamente registradas e autorizadas, **não** usa números que podem conter saltos históricos.
- Datas inválidas não são convertidas em sucesso ou publicação; ficam após datas válidas. Empates têm ID estável.
- Links entre catálogo e detalhe preservam pesquisa, filtro, ordenação e página. Os dados de exercício já armazenados e a versão publicada permanecem intocados.

## Escopo, testes e riscos

Arquivos: catálogo administrativo, detalhe, helper puro e testes de domínio/contrato. Fora de escopo: schema, migrations, RLS, grants, Auth, prescrições clínicas, séries/repetições, mudança automática de treino, liberação para cliente, processamento de dados reais e homologação profissional.

Aceite técnico: `Validate application` e `Validate J5 local training lifecycle browser` verdes no SHA do PR, merge seguro, CI pós-merge e Vercel no mesmo SHA. O E2E da J5 opera exclusivamente em ambiente descartável; a homologação real continua bloqueada até o encerramento global.

Questões abertas: melhorias de UX remanescentes não equivalem a regras profissionais. O gate de IA externa para dados reais de saúde permanece desabilitado.
