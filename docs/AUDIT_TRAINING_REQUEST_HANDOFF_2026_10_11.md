# Auditoria operacional — solicitações de treino

**Data:** 2026-10-11. **Status:** código proposto em branch, ainda não publicado.

## Objetivo e escopo

Corrigir a navegação da visão geral até a solicitação exata e tornar a origem de cada pedido legível em ambas as interfaces. Evitar carregar o catálogo global de exercícios quando não há rascunho editável. Remontar formulário do rascunho quando valores persistidos mudam.

## Critérios

- Cliente e Patty consultam o histórico original com origem factual identificada pelo profile, sem supor decisão profissional.
- Atalhos da visão geral levam ao ID real da solicitação.
- Consulta de treino publicado, revisado ou ainda não solicitado não carrega catálogo global.
- Só rascunho não revisado oferece seletor de exercícios publicados.
- Permanecem intactos Auth, RLS, schema, migrations, decisões clínicas e publicação humana.

Verificar testes determinísticos, contratos operacionais, TypeScript, build e GitHub Actions. E2E autenticado real segue pendente.
