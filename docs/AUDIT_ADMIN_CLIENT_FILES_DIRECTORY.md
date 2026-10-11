# Auditoria operacional: diretórios administrativos e arquivos privados

**Data:** 2026-10-10. **Escopo:** apenas busca, ordenação, estados e navegação de leitura existentes.

- A busca de clientes da Patty, os arquivos privados, o catálogo de exercícios e o catálogo de configurações não devem cair ao receber parâmetros de consulta repetidos. A busca administrativa de cliente também encontra um nome legado no profile, sem trocar a identidade canônica.
- O diretório privado conserva clientes ativas e inativas e as exibe alfabeticamente para localização operacional. O status de acompanhamento e o vínculo da conta aparecem separados. Acesso ao histórico não implica reativação.
- O detalhe de arquivos de cliente invalida IDs malformados antes de leitura.
- Não alteradas decisões profissionais, políticas Auth/RLS, leituras privilegiadas já autorizadas, permissões e visibilidade dos arquivos, uploads, liberação, schema, migrations ou dados.
- Verificações previstas: TypeScript, testes determinísticos de busca e contratos de UI, build e CI. Testes E2E autenticados reais permanecem pendentes.
