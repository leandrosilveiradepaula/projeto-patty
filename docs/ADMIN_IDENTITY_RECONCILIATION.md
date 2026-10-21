# Reconciliação privada de identidades administrativas — pré-requisito do MVP

**Referência: 20/10/2026. Status: procedimento preparado, NÃO EXECUTADO.**

## 1. Fato confirmado e limite

Consulta agregada **somente de leitura** ao projeto Supabase SaaS confirmou mais de uma identidade distinta com `public.user_roles.role='admin'`. A migration `20261020191000_fix_private_storage_admin_read_after_assignment.sql` ainda **não está aplicada**. RLS em `storage.objects` e `public.client_files` segue ativa. Esses fatos não identificam a Patty, não atribuem legitimidade a contas e **não provam uso indevido** de arquivo de cliente.

Segundo `DECISIONS.md` (2026-10-14), a exceção de acesso administrativo a arquivos privados do MVP é projetada para **uma única administradora de negócio, Patty**, autenticada com MFA AAL2. Sem resolver a multiplicidade de roles, a migration de Storage deve continuar bloqueada. [Issue #950](https://github.com/leandrosilveiradepaula/projeto-patty/issues/950) é a dependência de autorização; [#951](https://github.com/leandrosilveiradepaula/projeto-patty/issues/951) trata do Storage após assignment encerrado.

## 2. Pré-condição e quem decide

Somente uma pessoa responsável e autorizada poderá identificar as contas em **ambiente privado do Supabase**, cotejando o uso real e a autorização vigente. Evitar exportações, capturas, IDs, email, telefone, MFA, nomes e dados clínicos em issues/PRs/chat. **Não** inferir titularidade pela presença de MFA, email de login, nome do profile ou criação recente. Não usar email como chave relacional.

Antes de qualquer mutação, registrar fora do repositório público:
- qual **Auth User / Profile** é a Patty titular e como essa identidade foi confirmada;
- qual a finalidade de cada outra role administrativa e se deve existir no produto;
- autorização explícita para manter ou revogar cada papel, com executor e trilha de auditoria;
- consequências de sessão/role e mecanismo de recuperação antes de alterar permissões;
- plano de reversão e verificação posterior.

Esses registros pessoais devem ficar em superfície privada autorizada, não em commits. A documentação pública recebe apenas o estado agregado e a decisão de produto, sem identificadores.

## 3. Duas decisões possíveis (ainda abertas)

**A — MVP mantém somente Patty como admin.** Após validação privada de identidade e autorização individual, uma operação controlada poderá **revogar apenas o papel relacional de identidades não autorizadas**, sem excluir `auth.users`, `profiles`, `clients`, `client_assignments`, MFA ou histórico. Nunca executar UPDATE/DELETE em massa, exclusão de conta ou merge por email. Em seguida verificar revogação real, comportamento de sessões e contagem de roles. Essa operação **não** está autorizada por este documento.

**B — várias contas administrativas serão mantidas.** A exceção ampla de `client_files`/Storage não é suficiente. Antes de qualquer migration, é preciso **nova decisão da Patty** sobre escopo client-scoped e um desenho específico de roles, assignments, MFA, policies/RLS e E2E, com revisão e migração versionada. Não aceitar a multiplicidade atual como decisão implícita do produto.

## 4. Gate não destrutivo antes de executar qualquer migration

O CLI de provisionamento de admin (`scripts/bootstrap-admin.ts`) agora consulta a **contagem exata** de roles `admin` antes de qualquer convite:
- 0 admins: permite somente provisionamento inicial para profile elegível;
- 1 admin: permite apenas **verificação idempotente do mesmo perfil**, sem criar outra role;
- 2 ou mais / contagem indisponível: recusa imediatamente, sem convite ou escrita.

Esse preflight é um bloqueio do **comando bootstrap**, não uma constraint transacional de unicidade do banco contra todos os meios de provisionamento. A migration `20261020191000` contém sua **própria guarda** de múltiplas admins. Não desativar nenhum guard para obter verde.

Após a decisão humana e eventual procedimento separado, verificar **somente estados agregados**:
1. a quantidade de roles administrativas é compatível com o modelo autorizado;
2. a conta autorizada dispõe de MFA AAL2 e as políticas restritivas permanecem intactas;
3. o `master` e a Vercel estão no mesmo SHA validado;
4. a lista de migrations pendentes do CLI contém apenas o conjunto revisado;
5. a autorização para `workflow_dispatch(mode=apply)` foi registrada para a migration exata;
6. aplicar pelo procedimento oficial versionado, nunca `execute_sql` ad hoc;
7. verificar histórico, RLS, URL privada temporária e negação de cliente não titular por sessão autorizada, sem escrever dados artificiais no SaaS.

O bloqueio pode continuar sendo o estado correto. Nunca alterar a migration antiga/guard já versionado só para acomodar dados de produção.

## 5. Fora de escopo e próximo passo

Este roteiro **não** consulta nomes ou dados de usuários, não faz reclassificação de roles, não modifica Auth, não cria conta técnica, não aplica migration e não inicia homologação profissional. Quando a decisão humana estiver documentada, abrir uma tarefa separada com escopo e rollback explícitos. A homologação conjunta da Patty segue a **última etapa**.
