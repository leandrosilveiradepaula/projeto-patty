# RBAC-ADMIN-STORAGE-READ-01 - conciliacao da PR #1056

Em 2026-11-02, a PR #1056 original estava em conflito com master, pois docs/PROJECT_STATUS.md acumulou registros mais recentes. Esta branch reaplica somente as alteracoes funcionais e testes da #1056 sobre master sem sobrescrever historico.

## Evidencia do gate

No Supabase Projeto Corpo e Mente, a lista de migrations inclui 20261101121000_admin_global_read_aal2 e 20261101124800, 20261101133000, 20261101135000 e 20261101141500. Consulta apenas a metadados em pg_policies confirma admin_global_select_aal2 em public.clients e public.profiles, com role relacional admin e AAL2; a policy RESTRICTIVE admin_mfa_aal2_required permanece nas duas tabelas e em storage.objects. Isto confirma a presenca das policies, nao um teste operacional com dados reais ou homologacao.

## Escopo e limites

Leituras administrativas do diretorio privado e resolucao de Client usam sessao SSR, requireRole(admin) e RLS. Preservam clientes inativas e sem Profile; nao mudam upload, publicacao, Storage, migrations ou gestao de permissoes. Testes operacionais e de seguranca vieram da #1056; CI da nova branch deve ser verificada antes de merge. Publicacao na Vercel e homologacao J1-J7 seguem separadas.
