# Roteiro preparado para homologação operacional conjunta — Projeto Patty

> **Estado atualizado em 2026-10-23: PREPARADO, NÃO EXECUTADO.** Este roteiro organiza a última etapa futura do projeto; não convoca a sessão nem equivale a aceite profissional. As fontes normativas continuam sendo `DECISIONS.md`, `BUSINESS_RULES.md`, `OPEN_QUESTIONS.md` e `AGENTS.md`. Dados e regras não confirmados permanecem pendentes.

## 1. Evidências técnicas disponíveis, sem extrapolação

- A recertificação técnica conjunta **mais recente concluída** antes deste novo pacote é a [PR #975](https://github.com/leandrosilveiradepaula/projeto-patty/pull/975): **8/8 checks `success`** (`Validate application` e Playwright J1–J7) no mesmo head `4e2d8fb2716ab1fec40dcbc7c92471aa6fb53298`, integrada no commit `1238b98c98469047e39fcf32377f7fd699be14fa` com CI pós-merge aprovado. Os testes usaram banco/Auth/Storage descartáveis. As recertificações [#955](https://github.com/leandrosilveiradepaula/projeto-patty/pull/955) e [#945](https://github.com/leandrosilveiradepaula/projeto-patty/pull/945) são históricas. **Ainda não é homologação da Patty.**
- As [PRs #957](https://github.com/leandrosilveiradepaula/projeto-patty/pull/957) e [#958](https://github.com/leandrosilveiradepaula/projeto-patty/pull/958) consolidaram o bloqueio de E2Es legados que modificavam produção e o guard de bootstrap de admin única. `master` `16fba37f09f53f188b8a5258a3ee9d6abe7a0566`, [CI pós-merge #39531246728](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39531246728) `success` e Vercel `READY` no mesmo commit. A J1 também passou no head da #958. Antes da sessão futura, confirmar novamente **HEAD = SHA publicado**; esta é uma fotografia histórica.
- [Matriz técnica J1–J7](PREHOMOLOGATION_MATRIX.md) detalha o que os testes sintéticos provam e **não** provam. A migração real do vídeo `Como utilizar a BALANCA DE ALIMENTOS` está registrada em `CONTENT_LIBRARY.md`, mas o material continua em rascunho e **não foi publicado/liberado a cliente**.
- A navegação profissional da J2 em **390 px/touch** é coberta pela suíte local `e2e/j2-weekly-feedback-lifecycle.spec.mjs` presente na recertificação #975. Depois desse baseline, as [PRs #1004](https://github.com/leandrosilveiradepaula/projeto-patty/pull/1004) e [#1005](https://github.com/leandrosilveiradepaula/projeto-patty/pull/1005) testaram J1/J6 e foram publicadas; a [#1006](https://github.com/leandrosilveiradepaula/projeto-patty/pull/1006) ampliou o teste J1 mobile e está pronta para merge manual, ainda não considerada integrada neste registro. Essas validações específicas **não equivalem a uma nova aprovação simultânea J1–J7**; o novo gate é acompanhado na [matriz técnica](PREHOMOLOGATION_MATRIX.md). Nenhuma delas substitui inspeção em aparelho real.

- Os nove workflows de E2E legados apontados ao Supabase SaaS foram desativados na [PR #957](https://github.com/leandrosilveiradepaula/projeto-patty/pull/957). A sessão humana **não** deve reativá-los ou guardar senha/TOTP da Patty no GitHub. Consulte [LEGACY_PRODUCTION_E2E_BLOCK.md](LEGACY_PRODUCTION_E2E_BLOCK.md) e [ADMIN_IDENTITY_RECONCILIATION.md](ADMIN_IDENTITY_RECONCILIATION.md).

## 2. Condições de entrada — confirmar somente na etapa final

| Condição | Comprovação exigida | Se ausente |
| --- | --- | --- |
| Aplicação correta no ar | SHA do `master` = SHA do deployment de produção `READY`; CI do SHA sem falhas | Não iniciar |
| Responsável autorizada | Patty na conta administrativa existente, login e MFA AAL2 pela interface normal; não compartilhar credenciais, TOTP ou cookies | Não iniciar operações administrativas |
| Identidades e arquivos privados | **Aplicação técnica já confirmada em 21/10:** reconciliação autorizada para **uma única admin de negócio** ([#950](https://github.com/leandrosilveiradepaula/projeto-patty/issues/950)), migration `20261020191000_fix_private_storage_admin_read_after_assignment.sql` aplicada no SaaS pelo [workflow #39701416284](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39701416284), 91/91 migrations e RLS/MFA AAL2 preservados ([#951](https://github.com/leandrosilveiradepaula/projeto-patty/issues/951)). Na sessão final, reconferir role atual, MFA AAL2 e **download real** permitido à Patty após encerramento, sem inferir resultado de E2E local | Se role/MFA/policy atual divergir ou o download real não for autorizado, registrar bloqueio e não prosseguir com essa operação; **não reaplicar** migration nem ampliar acessos automaticamente |
| Cliente participante | Perfil, Client e assignment atual coerentes; cliente real com autorização adequada para a sessão e conta própria. Não criar conta/registro fictício no SaaS para forçar a demonstração | Não usar dados ou conta de terceiro |
| Dados e material | Somente registros de participante autorizado, arquivos e conteúdo com base de uso definida; sem upload de arquivo real em CI | Pular bloco e registrar pendência |
| Roteiro e segurança | Dispositivos móveis/desktop definidos, operador, vínculo ativo e pessoas autorizadas, possibilidade de interromper ações sem publicar | Não aceitar o caso sem evidência |
| Decisões profissionais | Só a Patty confirma resultados, critérios clínicos, versão de protocolo, conteúdo, treino e eventual publicação/liberação | Registrar **questão aberta**, nunca automatizar |
| Privacidade | Evidência de teste sem dados de saúde, nomes, emails, fotos, documentos, URLs assinadas, cookies ou tokens em PRs, logs ou chat | Restringir evidências ao ambiente autorizado |

**Não criar staging, duplicar clientes, gerar convites ou configurar novos acessos como pré-requisito automático.** A infraestrutura prevista continua com desenvolvimento e produção, sem terceiro Supabase. O cadastro principal continua distinto de Auth User/Profile; email não é relacionamento nem substituto de Client.

## 3. Sequência de execução futura, sob responsabilidade humana

A sessão só deverá ser iniciada **depois** de concluídas as tarefas técnicas restantes, com data e participantes definidos pelo responsável. Execute cada bloco abaixo no aplicativo autenticado, anote se a operação realmente persistiu, valide a autorização antes/depois e teste navegação desktop e mobile (incluindo rolagem horizontal, botões tocáveis, foco e retorno após recarga). Use o registro de evidências da seção 5.

| Jornada | Percurso operacional sugerido | Resultado que precisa ser observado |
| --- | --- | --- |
| J1 — Onboarding | Convite/ativação autorizados, `/cliente/perfil`, Cadastro Atual, anamnese, `/cliente/arquivos` e arquivo privado do mesmo cliente | Sessão correta, salvamento/versionamento, arquivo privado recuperável e ausência de acesso indevido; convite de produção exige aprovação humana |
| J2 — Feedback | `/cliente/feedback-semanal` → rascunho/revisão/envio consciente → `/admin/feedback-semanal` → resposta original, comparação, link à avaliação | Envio não automático, respostas originais imutáveis, autoria e acesso profissional com MFA, comparação factual sem score de adesão; mobile profissional legível |
| J3 — Avaliações | `/admin/clientes/[clienteId]/avaliacoes` → avaliação/medidas/fotos privadas → finalização explícita → evolução e correção histórica | Lançamento original preservado, correção separada, escopo e histórico; nada finalizado implicitamente |
| J4 — Alimentação | `/admin/clientes/[clienteId]/protocolos` → rascunho → revisão/versão aprovada → publicação humana → `/cliente/protocolo` | Cliente vê **somente** versão publicada e aprovada; doses e regras profissionais dependem de configurações confirmadas |
| J5 — Treinos | Solicitação pela cliente, preparação/seleção profissional, publicação, `/cliente/treino` e histórico; somente se autorizado, encerramento de vínculo | Exercícios individuais, versões intactas, nenhuma publicação automática; assignment encerrado não concede acesso profissional geral atual e não apaga histórico. A exceção estrita de **arquivos privados da única Patty AAL2** é verificada separadamente na J1, sem virar acesso geral aos demais dados |
| J6 — Educação | `/admin/conteudos` → revisão/publicação explícita de versão apropriada → liberação exata para cliente → `/cliente/conteudos` e leitura autorizada | Mídia realmente recuperável pela cliente autorizada, bloqueio a não titular, comportamento de vídeo privado/seek/Range no provedor **real**; direitos revisados. **Não publicar o vídeo da balança por antecipação** |
| J7 — IA assistiva | Fluxos `/admin/anamneses` e `/admin/ia` disponíveis à profissional, fontes, findings, rascunhos, revisão e decisões registradas | Resposta original ≠ interpretação IA ≠ ajuste Patty; proveniência e auditoria; **nenhuma publicação/diagnóstico direto pela IA** |

As rotas com `[clienteId]` são apenas notação documental: usar navegação do aplicativo para o Client autorizado, **não** adivinhar ou divulgar IDs, URLs temporárias e caminhos privados.

## 4. Cenários de segurança e mobile da sessão final

1. Confirmar que login de cliente **não** concede funções administrativas; ações críticas da única Patty/admin exigem MFA AAL2. Um assignment encerrado não concede acesso profissional geral atual, e a conta de cliente inativa não apaga histórico. **Exceção já confirmada de escopo limitado:** a única Patty com AAL2 pode ler arquivos privados com metadados autorizados mesmo após encerramento, conforme a policy aplicada; isso não autoriza uma segunda admin nem acesso indiscriminado a avaliações/anamneses/protocolos.
2. Confirmar que fotos, exames, documentos e conteúdos privados não são acessíveis por cliente não titular, anônimo ou quem não tenha autorização específica, preservando a exceção restrita da Patty AAL2 para arquivos mesmo sem assignment atual. **Não** enviar arquivos pessoais para runners, screenshots públicas ou artefatos de CI. Não inspecionar dados de terceiros sem autorização.
3. Confirmar a leitura de mídia **real** do Vercel Blob quando houver conteúdo e liberação aprovados: vídeo completo, seek/Range, MIME, acesso somente autorizado, URLs temporárias sem exposição em logs. O PDF sintético da J6 cobre somente o simulador local.
4. Em aparelho real, conferir menus, cards, filtros, formulários, comparação, botões e navegação de retorno nas áreas cliente e profissional. O Playwright em 390 px é evidência técnica suplementar, não aceite visual da Patty.
5. Mudança de protocolo, publicação, correção e qualquer desativação real devem ser feitas **somente** se necessárias ao atendimento e autorizadas na ocasião. Não produzir efeitos clínicos apenas para preencher um checklist.

## 5. Registro mínimo de cada caso

Não incluir PII ou dados de saúde no repositório. A pasta de evidências sensíveis, caso necessária, deverá ter controle privado próprio, sem compartilhar URL assinada/token em documento público.

| Campo | Registrar na sessão futura |
| --- | --- |
| ID do caso | J1–J7 + número sequencial sem identificar cliente |
| Ambiente / SHA | produção, commit exato e deployment consultados no momento |
| Papel / acesso | cliente próprio / Patty AAL2 / acesso negado, sem nomes ou emails |
| UI e dispositivo | rota funcional, largura/dispositivo, navegador |
| Antes → ação → depois | estados observáveis de persistência/autorização, sem valores clínicos |
| Resultado | `aprovado`, `falhou`, `não executado` ou `bloqueado` |
| Pendência e responsável | ação concreta e autorização requerida, quando aplicável |
| Aceite da Patty | explícito, associado à versão e ao caso; ausência de assinatura significa **não homologado** |

Se houver falha, preservar o histórico, classificar impacto/risco, abrir correção pequena com reprodução segura e repetir o teste após publicar SHA corrigido. **Não** converter aprovação automática de CI em decisão profissional.

## 6. Itens que não podem ser marcados como resolvidos por este roteiro

- Autorização de cliente participante, data e execução da sessão profissional conjunta.
- Teste de reprodução e proteção de Vercel Private Blob real **pela cliente** depois de release explicitamente aprovado.
- Taxonomias e direitos ainda pendentes da biblioteca; migração gradual completa do Drive.
- Questões clínicas de `OPEN_QUESTIONS.md`: critérios finais de avaliação/treino, hidratação, suplementação, fases futuras e demais regras não formalizadas.
- Eventuais problemas de Auth/convites reais ou ajustes operacionais que dependam de decisão/autorizações futuras.

**Status:** roteiro de preparação técnica. **Homologação operacional da Patty permanece a última tarefa e está pendente.**
