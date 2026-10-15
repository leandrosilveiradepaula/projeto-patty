# Jornada 1 — homologação profissional de avaliação e publicação

**Estado:** roteiro de execução; **NÃO HOMOLOGADO**. Atualizado em 2026-10-15 (UTC).

## Objetivo e limites

Comprovar uma jornada real e consentida, sem dados clínicos de teste em produção e sem publicar um protocolo fictício para uma cliente real:

**Anamnese enviada → revisão profissional → avaliação finalizada → protocolo nutricional v1 → submissão para revisão → aprovação explícita da Patty → publicação explícita da mesma versão → leitura pela cliente autorizada.**

A ordem de trabalho acima é uma **jornada de produto**, não uma regra clínica, nem obrigação de gerar protocolo automaticamente após uma avaliação. Patty decide se/quando um protocolo é adequado. A IA não aprova nem publica.

**Não usar** `service_role`, SQL privilegiado, admin sintético, impersonação de sessão, substituição de MFA, ou atribuição artificial para produzir um PASS. Não editar/apagar histórico de saúde, aprovações e publicações para limpar a prova. Usar conta administrativa habitual com MFA normal da Patty e acesso legítimo à cliente; a cliente autentica-se na própria conta. Registro de resultado deve conter apenas estado PASS/FAIL e IDs técnicos estritamente necessários, sem respostas, fotos, prescrições ou nomes em logs de CI.

## Ponto de partida verificado (read-only, 2026-10-15)

Consulta agregada no Supabase de produção, sem selecionar identificadores ou dados pessoais:

| Indicador | Contagem |
| --- | ---: |
| Clientes registrados | 2 |
| Anamneses com `submitted_at` | 1 |
| Avaliações | 0 |
| Protocolos | 0 |
| Versões de protocolo | 0 |
| Versões submetidas à revisão | 0 |
| Versões aprovadas | 0 |
| Versões publicadas | 0 |

CI do `master` `0eac9b72` **PASS**: GitHub Actions #38757814943. Playwright da cliente **PASS** #38757884934, com segundo PASS #38757996405. O teste da cliente **não** exercita MFA da Patty, aprovação ou publicação profissional. A rota `/cliente/protocolo` já consulta somente `listPublishedProtocolsForCurrentClient(client.id)`; esta implementação e testes de contrato **não** substituem uma prova autenticada com uma publicação existente.

## Execução autorizada

Cada linha requer evidência pontual do estado antes/depois e da conta correta, sem capturar dados de saúde em relatórios. Se não existir caso apropriado e consentido, registrar **BLOQUEADO (dependência humana)**, jamais forçar o fluxo.

| Marco | Ação observável | Resultado obrigatório |
| --- | --- | --- |
| J1.01 | Patty inicia/acompanha convite pela interface administrativa | Ativação vinculada ao `client_id` correto, sem troca de email de login por chave de relacionamento |
| J1.02–03 | Cliente conclui Cadastro Atual e envia a Anamnese explicitamente | Campos persistidos; `submitted_at` presente, histórico original preservado |
| J1.04 | Arquivos privados, se fizerem parte do caso | Somente cliente/autorizado; preview e download auditáveis; sem acesso cruzado |
| J1.05 | Patty lê submissão enviada e registra sua observação | Nota separada da resposta original; rascunho não aceita nova revisão profissional |
| J1.06 | Patty cria e finaliza uma avaliação quando clinicamente indicada | `client_id` correto; histórico da avaliação anterior preservado; nenhuma finalização automática |
| J1.07 | Patty prepara uma versão de protocolo indicada para o caso | Estrutura salva na versão exata, sem duplicar o protocolo; rascunho não visível para a cliente |
| J1.08 | Patty submete e revisa a versão congelada | `submitted_for_review_at` confirmado; aprovação ainda ausente antes da decisão humana |
| J1.09 | Patty confirma **aprovação** e, separadamente, **publicação** | `protocol_version_approvals` e `protocol_publications` vinculam a mesma versão/cliente; uma transição nunca executa a outra |
| J1.10 | Cliente entra novamente e abre `/cliente/protocolo` | Apenas a versão efetivamente publicada, doses/ciclos/variações daquela publicação; sem drafts, versões não liberadas ou protocolo de outra cliente |

**Teste negativo obrigatório:** com a cliente autenticada, consultar ID de publicação fora do conjunto autorizado. O aplicativo deve permanecer no seu próprio plano atual ou vazio e não revelar a existência do ID externo. Não expor ID de outra cliente em logs. Em todas as etapas, conferir mobile e reinício de sessão.

## Consulta de integridade não destrutiva

Executar **somente leitura** e registrar apenas contagens, não identificadores:

```sql
select
  (select count(*) from public.protocol_version_approvals) as approved_versions,
  (select count(*) from public.protocol_publications) as published_versions,
  (select count(*) from public.protocol_publications p
   left join public.protocol_version_approvals a on a.id = p.approval_id
   where a.id is null
      or a.client_id is distinct from p.client_id
      or a.protocol_version_id is distinct from p.protocol_version_id) as mismatched_publications;
```

Zero `mismatched_publications` é necessário, mas **não suficiente**: também é obrigatório inspecionar na UI a versão exata liberada e sua leitura sob o login da própria cliente.

## Critério de encerramento

Homologar a Jornada 1 **apenas** depois de registrar: SHA efetivamente publicado (não apenas merge), CI correspondente, prova da Patty autenticada com MFA, aprovação e publicação manuais distintas, leitura da versão exata pela cliente autorizada, negativas de acesso cruzado, persistência após novo login, revisão mobile e pendências remanescentes. Um caso real não vira regra clínica universal. Se faltar um dos marcos, atualizar `docs/JOURNEY_HOMOLOGATION.md` como **PARCIAL/BLOQUEADO**, sem declarar a J1 completa.

**Proibição:** não habilitar automação de publicação nem contornar RLS/MFA para concluir a homologação.
