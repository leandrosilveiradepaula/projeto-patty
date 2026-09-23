# Mapa de prontidao do MVP

Data de referencia: 2026-09-23 (atualizado apos hardening de Anamnese/MFA, aplicacao e CI).

Este documento e um mapa operacional do estado atual. Ele nao substitui `MVP.md`, `DECISIONS.md`, `BUSINESS_RULES.md` ou `OPEN_QUESTIONS.md`.

Estados usados:

- **IMPLEMENTADO**: codigo/schema existe no repositorio e esta integrado ao `master`;
- **CI VALIDADO**: passou pelo workflow atual de `npm ci`, `npm run typecheck`, testes determinísticos e `npm run build`;
- **SAAS VALIDADO**: estado relevante foi conferido no Supabase SaaS;
- **PARCIAL**: fundacao existe, mas falta fluxo necessario para o MVP;
- **BLOQUEADO POR DECISAO**: nao implementar sem resposta/documentacao;
- **INVENTARIADO**: levantamento existe, sem autorizacao de migracao/publicacao.

## Resumo executivo

### Pronto ou operacional em parte relevante

- Auth SSR, perfis, roles, clientes, assignments e RLS client-scoped;
- leitura real de clientes atribuidos e Cadastro Atual;
- Anamnese versionada em leitura para admin e cliente;
- notas internas append-only de revisao da Anamnese;
- boundary server-only de criacao/retomada e autosave do rascunho da Anamnese, ainda sem UI final;
- fundacao append-only para correcoes posteriores da Patty, aplicada e validada no Supabase SaaS;
- avaliacoes e medidas em leitura;
- acompanhamento profissional append-only;
- fotos privadas de avaliacao para admin;
- upload, listagem e download de arquivos privados pela cliente, com smoke E2E de producao aprovado;
- listagem/download administrativo de arquivos privados;
- protocolos versionados em leitura;
- revisao administrativa da estrutura alimentar persistida;
- lifecycle manual de protocolo: submissao, aprovacao humana e publicacao;
- cliente ve protocolo publicado, variantes, refeicoes, doses e ciclo publicado;
- biblioteca educacional e de exercicios em leitura administrativa;
- liberacao manual de versao publicada de conteudo para cliente;
- cliente ve conteudos explicitamente liberados;
- CI de typecheck, audit de dependencias de producao, testes determinísticos, regressoes de boundaries de seguranca e build, em pull requests e `master`;
- Next.js 16.3.6 e headers HTTP basicos de seguranca integrados ao `master`;
- fundacao auditavel de IA e tratamento de falhas no banco;
- inventario inicial, manifesto e triagem machine-readable do Drive sem PII; nenhuma migracao/publicacao autorizada.

### Principais bloqueios atuais

- questionario final e fluxo de preenchimento/submissao da Anamnese;
- definir a politica final de retencao/hard delete de arquivos privados;
- habilitar e validar `Leaked Password Protection` no Supabase Auth;
- configurar e validar o template real de email `Invite user`/Site URL do Supabase; o lifecycle sintetico de convite/ativacao ja passou E2E em producao;
- definir expiracao/reenvio, recuperacao e encerramento de contas de clientes;
- edicao controlada do Cadastro Atual;
- catalogo e regras finais de avaliacao/medidas;
- processo de autoria/revisao/publicacao das bibliotecas;
- taxonomia e direitos/licenciamento para migracao do Drive;
- exposicao da biblioteca de exercicios a cliente;
- provider/modelo e fluxo server-side real de IA;
- regras profissionais ainda abertas do metodo.

## Matriz operacional

| Area | Estado atual | Escrita operacional | Validacao | Principal proximo gate |
| --- | --- | --- | --- | --- |
| Auth / sessao | login por email/senha IMPLEMENTADO; MFA administrativo TOTP IMPLEMENTADO na aplicacao; enforcement RLS AAL2 aplicado no SaaS | admin exige `aal2` em SSR, rotas, server actions, Data API/RLS e Storage | CI + SAAS VALIDADO; smoke pos-apply PASS para AAL1/AAL2 | habilitar Leaked Password Protection e manter smoke E2E de MFA |
| Profiles / roles | IMPLEMENTADO | sem UI administrativa de gestao | RLS existente | definir bootstrap/admin e quem gerencia roles |
| Clients / assignments | leitura + encerramento + inicio de assignment no onboarding IMPLEMENTADOS | Patty inicia onboarding por convite server-side; provisionamento cria vinculos relacionais e assignment com compensacao em falha | CI VALIDADO; encerramento E2E PASS; onboarding/ativacao sintetico E2E PASS em producao com cleanup verificado | configurar e validar o template real de email do Supabase/Site URL |
| Cadastro Atual | leitura IMPLEMENTADA | nao | CI VALIDADO | definir quem pode alterar cada campo e auditoria |
| Anamnese versionada | leitura IMPLEMENTADA; boundary server-only de rascunho/autosave IMPLEMENTADA | nota interna append-only; schema de rascunho e correcoes aplicado no SaaS | CI + SAAS VALIDADO; smoke pos-apply PASS para rascunho, isolamento e correcoes append-only | UI/submissao final continuam bloqueadas pelas definicoes finais do questionario |
| Avaliacoes / medidas | leitura IMPLEMENTADA | acompanhamento profissional append-only | CI VALIDADO; conjunto de decisoes profissionais tipado e testado | definir catalogo, unidades, obrigatoriedade e correcao |
| Arquivos privados | upload/listagem/download da cliente IMPLEMENTADOS; acesso admin permanente, upload administrativo e liberacao explicita IMPLEMENTADOS | smoke E2E da cliente PASS; smoke E2E administrativo PASS em producao; cron de temporarios VALIDADO; SAAS VALIDADO | definir retencao/hard delete |
| Protocolos | leitura + lifecycle manual IMPLEMENTADOS | submit/approve/publish | CI + SAAS VALIDADO; lifecycle com guarda determinística testada | criar/editar plano somente quando fluxo profissional estiver formalizado |
| Plano alimentar publicado | cliente ve variantes, refeicoes, doses e ciclo | nao | CI VALIDADO | equivalentes visiveis continuam abertos |
| Conteudo educacional | leitura admin/cliente por release IMPLEMENTADA | release manual | CI VALIDADO; elegibilidade de release testada | taxonomia, autoria/revisao e primeiro lote do Drive |
| Exercicios | leitura admin IMPLEMENTADA | nao | CI VALIDADO | definir exposicao a cliente e campos finais |
| Progresso de conteudo | schema existe | fluxo nao implementado | PARCIAL | definir quem registra abertura/conclusao |
| IA | fundacao de banco + validador deterministico de output `anamnesis_review` IMPLEMENTADOS | provider real e boundary de execution ainda nao integrados | SAAS VALIDADO; contrato de output coberto por testes determinísticos | definir provider/modelo, prompt versionado e boundary server-side de execution |
| Drive | INVENTARIADO + TRIADO POR METADADOS | nenhuma migracao fisica | 89 itens; 16 grupos de possiveis duplicidades; 9 videos com titulo generico; direitos ainda nao revisados | revisar direitos/taxonomia e escolher lote inicial |
| Regras deterministicas do metodo | IMPLEMENTADO PARCIAL | sem automacao de protocolo | CI VALIDADO | ampliar somente com formulas exatas confirmadas/documentadas |
| CI | IMPLEMENTADO | automatico no GitHub Actions + smoke E2E manual de arquivos privados | `npm ci` + audit high/critical de producao + typecheck + suites deterministicas + `test:security-boundaries` + build; core Actions em v7; E2E de producao PASS nos fluxos ja estabilizados | ampliar E2E somente para fluxos estaveis e sinteticos |

## Regras deterministicas confirmadas

Ja estao em codigo testavel, sem ligacao automatica com decisao de fase ou publicacao:

- 1 dose de proteina = 15 g;
- 1 dose de carboidrato = 12 g;
- 1 dose de gordura = 6 g;
- limite diario do grupo de proteina com maior teor de gordura = metade das doses totais de proteina, arredondando para cima;
- referencia inicial geral do Reconhecimento Metabolico = 2 g/kg de proteina, 2 g/kg de carboidrato e 50 g/dia de gordura.

A referencia do Reconhecimento pode ser individualizada. Cutting aproximado, redistribuicao carboidrato/gordura, fases 5/6 e demais regras abertas nao foram codificados.

## Observacoes por fluxo

### Autenticacao e MFA

A decisao de MFA obrigatorio para contas administrativas esta parcialmente materializada. O fluxo de login identifica o AAL da sessao apos email/senha. Admin sem fator verificado e direcionado para enrollment TOTP; admin com fator verificado e sessao em `aal1` e direcionado para challenge; apenas `aal2` entra em `/admin`.

A mesma guarda esta centralizada em `requireRole("admin")`, portanto cobre o layout administrativo e as server actions/rotas administrativas que ja usam essa boundary. O fluxo da cliente nao foi alterado e nao exige MFA.

O enforcement equivalente no banco/Storage esta aplicado pela migration `20260923113835_admin_mfa_rls_enforcement.sql`. Ela adiciona policies `RESTRICTIVE` que exigem `aal2` quando o usuario autenticado possui role relacional `admin`, preservando `user_roles` em `aal1` apenas para o roteamento ao MFA. O smoke pos-aplicacao confirmou: admin `aal1` ve o proprio role, mas nao clientes/perfis protegidos; admin `aal2` recupera o acesso normal; cliente `aal1` nao e afetada.

O advisor de seguranca do Supabase tambem reporta `Leaked Password Protection` desativado no Auth. A habilitacao e uma pendencia de configuracao externa, separada do fluxo de MFA e sem dependencia de regra da Patty.

No nivel de aplicacao, as boundaries de `/admin`, `/cliente`, Server Actions/Route Handlers e paginas de MFA agora possuem regressao automatica em CI. Helpers que usam o cliente administrativo derivam a identidade da sessao em vez de aceitar identidade administrativa do caller.


### Seguranca da aplicacao e supply chain

O Next.js esta pinado em `16.3.6`. O CI audita dependencias de producao para severidade alta/critica e usa `actions/checkout@v7` / `actions/setup-node@v7`. Headers globais incluem anti-framing, `nosniff`, `no-referrer`, Permissions Policy restritiva e CSP parcial segura para a arquitetura atual. A configuracao passou CI e build; a verificacao independente desses headers no deployment Vercel permanece sem evidencia nesta sessao porque o conector Vercel nao enxerga o projeto correspondente.

### Anamnese

A aplicacao preserva:

- definicao versionada;
- submission vinculada a versao exata;
- respostas originais;
- notas internas separadas.

A regra de preenchimento agora esta parcialmente fechada: todos os campos sao obrigatorios para o envio final; rascunho incompleto pode ser salvo e retomado; depois do envio, a cliente nao edita mais e somente a Patty pode registrar correcao historica sem sobrescrever a resposta original. A fundacao de escrita do rascunho esta aplicada pela migration `20260923113230_anamnesis_draft_write_foundation.sql`: um rascunho ativo por cliente/versao publicada, INSERT restrito da propria submission e INSERT/UPDATE apenas de `answer_value` das respostas do proprio rascunho. A boundary server-only em `lib/anamnesis/draft.ts` resolve a cliente pela sessao, cria/reutiliza o rascunho e insere/atualiza somente a resposta da pergunta pertencente a mesma versao; ela ainda nao esta conectada a UI. A fundacao de correcoes esta aplicada pela migration `20260923114643_anamnesis_answer_corrections_foundation.sql`, com historico append-only, autoria, timestamp, assignment ativo e AAL2. O smoke pos-aplicacao confirmou criacao/edicao do proprio rascunho, isolamento entre clientes, bloqueio de `submitted_at`, correcao administrativa apenas em AAL2, preservacao da resposta original e bloqueio de UPDATE/DELETE das correcoes. A submissao final continua bloqueada ate fechar perguntas condicionais/aplicabilidade, tipos de input e ordem/agrupamento do formulario.

### Banco e performance

O advisor de performance reporta 22 foreign keys sem indice de cobertura exata e indices sem uso observado. A revisao mostrou que parte dos avisos de foreign key ja possui indice seletivo pelo primeiro campo e que a maioria restante pertence a tabelas historicas/IA ainda vazias. Nenhum indice novo foi criado apenas para zerar o lint. A politica e adicionar indice quando houver workload, RLS, integridade ou plano de execucao que justifique o custo.

Os dois warnings `auth_rls_initplan` introduzidos nas policies de `anamnesis_answer_corrections` foram resolvidos pela migration `20260923150743_optimize_anamnesis_correction_rls.sql`, aplicada e validada no SaaS. AAL1 continua bloqueado e AAL2 permitido pela policy MFA `RESTRICTIVE` transversal.

### Arquivos privados

O bucket `client-private` permanece privado.

Ja existe:

- acesso administrativo permanente a arquivos, inclusive sem assignment ativo;
- foto de avaliacao por rota server-side autorizada;
- download administrativo por signed URL curta, nao persistida;
- rejeicao deterministica de identificadores de arquivo malformados antes de consulta ao banco.

Os formatos e os limites de tamanho do MVP estao definidos: fotos em JPEG/PNG/WebP ate 10 MB; exames e documentos em PDF/JPEG/PNG ate 20 MB. A cliente faz upload direto do browser para Storage privado sob RLS, usando area temporaria e validacao server-side antes de o arquivo ser considerado valido. Paths nao contem PII, objetos nao sao sobrescritos e hard delete direto pelo browser nao e permitido. A validacao deterministica de formato/extensao, MIME detectado, tamanho e geracao de path com UUIDs internos esta implementada em `lib/validation/private-files.ts` e coberta por `test:validation`. A autorizacao remota usa `client_file_upload_sessions`, com path temporario gerado pelo banco, expiracao de 15 minutos e policy de INSERT limitada ao objeto `pending` exato.

A Patty mantem acesso aos arquivos mesmo sem assignment ativo, e as rotas administrativas usam signed URLs com validade de 5 minutos. A dependencia de assignment e a visibilidade por autoria/liberacao foram reconciliadas pela migration `20260922230034_private_file_access_visibility_foundation.sql`, aplicada e verificada no Supabase SaaS.

Downloads administrativos de exames/documentos registram evento append-only em `client_file_access_events` antes da emissao da signed URL, sem copiar conteudo do arquivo. A migration `20260922230601_client_file_access_audit.sql` esta aplicada no Supabase SaaS; a rota registra ator, arquivo solicitado, acao, resultado da autorizacao e timestamp.

O MVP nao tera limite rigido de quantidade de arquivos. A Patty tambem podera enviar arquivos em nome da cliente por fluxo administrativo server-side controlado, com autoria administrativa explicita. Arquivos enviados pela cliente ficam visiveis para ela por padrao; uploads da Patty ficam ocultos ate liberacao explicita. O primeiro MVP nao tera antimalware dedicado; esse risco permanece mitigado por allowlist fechada, validacao de tipo real, limites de tamanho, Storage privado e ausencia de execucao.

A RLS/policy diferencia visibilidade para a cliente e acesso administrativo permanente da Patty. A fundacao do upload da cliente usa `client_file_upload_sessions` e esta aplicada no Supabase SaaS. A boundary de criacao/finalizacao server-side valida declaracao antes da sessao, reserva a sessao em `validating`, detecta assinatura binaria no objeto temporario, revalida tamanho/formato, promove para `client_files` e usa compensacao em falhas. A UI da cliente em `/cliente/arquivos` cria a sessao, envia o byte diretamente ao Storage privado, finaliza no servidor, atualiza o historico e permite download somente de arquivos visiveis pela RLS, via signed URL de 5 minutos. O smoke E2E manual em `e2e/client-private-files.spec.mjs`, acionado por `.github/workflows/e2e-private-files.yml`, foi executado em producao com conta sintetica e passou em login, upload, validacao/finalizacao, historico e download. A limpeza de temporarios expirados foi implementada sem apagar linhas historicas de sessao: o cron marca sessoes `pending` expiradas como `expired` e remove somente objetos no namespace `pending/`. O `CRON_SECRET` foi configurado em Production e o redeploy correspondente ficou READY. Em 2026-09-23, apos a janela agendada do cron, a validacao funcional da limpeza passou no Supabase SaaS: a sessao sintetica vencida estava `expired`, o objeto temporario correspondente nao existia mais em `storage.objects` e nao havia sessoes `pending` vencidas. O fluxo administrativo usa uma sessao server-side e `createSignedUploadUrl` para autorizar apenas o path temporario gerado; o browser recebe somente token temporario e envia direto ao Storage privado. A finalizacao usa a mesma validacao real do fluxo da cliente, grava autoria administrativa e mantem `client_visible_at` nulo. A Patty pode liberar explicitamente o arquivo depois, gravando ator e timestamp de visibilidade. Existe uma entrada dedicada em `/admin/arquivos`, limitada ao dominio de arquivos, para manter a excecao de acesso permanente sem ampliar os demais modulos client-scoped. O smoke E2E administrativo em `e2e/admin-private-files.spec.mjs`, acionado pelo workflow manual `.github/workflows/e2e-admin-private-files.yml`, foi executado em producao com contas sinteticas e passou. O teste confirmou login administrativo, selecao da cliente sintetica, upload administrativo, autoria administrativa, liberacao explicita, visibilidade subsequente para a cliente e download. O Supabase confirmou o arquivo sintetico com `uploaded_by_profile_id` e `client_visibility_set_by_profile_id` do admin sintetico e `client_visible_at` preenchido. Permanece aberta a politica concreta de retencao/hard delete dos arquivos aceitos.

### Assignments

A regra de gestao esta confirmada: somente a Patty pode iniciar ou encerrar assignments por fluxo administrativo server-side controlado. O encerramento de uma atribuicao ativa esta implementado no detalhe administrativo da cliente. A action exige role relacional `admin`, usa a identidade autenticada como `staff_profile_id`, atualiza somente assignments ativos dessa mesma Patty/cliente e preenche `ended_at` sem apagar a linha historica. Apos o encerramento, os demais dados client-scoped deixam de ser acessiveis pelas RLS normais; a excecao de arquivos privados permanece separada.

O inicio de assignment esta integrado ao onboarding controlado por convite administrativo, sem listagem privilegiada de clientes nao atribuidas nem bypass generico de RLS. O smoke sintetico de onboarding/ativacao foi executado em producao e passou; o cleanup posterior confirmou ausencia de residuos sinteticos. A configuracao do template real de email continua separada desse teste. O smoke E2E manual em `e2e/end-client-assignment.spec.mjs`, acionado por `.github/workflows/e2e-end-client-assignment.yml`, foi executado em producao com contas sinteticas e passou. O teste confirmou login administrativo, presenca da `E2E Client` na lista atribuida antes da acao, encerramento pela UI, redirecionamento de sucesso e ausencia da cliente na lista ativa depois da operacao. O Supabase confirmou que o mesmo registro historico foi preservado e recebeu `ended_at`, sem hard delete.

### Acompanhamento profissional

As decisoes atualmente registraveis permanecem exatamente `maintain`, `simplify`, `advance` e `return`. O conjunto e compartilhado pela UI e pela validacao server-side e possui teste automatizado. Registrar a decisao continua sem executar mudanca de fase, protocolo, dieta ou treino.

### Protocolos

O lifecycle manual atual e:

```text
draft
-> submissao para revisao
-> aprovacao humana
-> publicacao explicita
-> cliente
```

Submeter nao aprova. Aprovar nao publica. Publicacao depende de aprovacao da mesma versao.

A proxima acao permitida desse lifecycle e derivada por funcao deterministica compartilhada pela UI administrativa e pelas server actions, com cobertura automatizada no CI.

Isso nao autoriza geracao automatica de protocolo nem escolha automatica de fase.

### Conteudo e exercicios

O Supabase SaaS estava com 0 registros nas quatro tabelas-base de biblioteca no levantamento de 2026-09-22:

- `educational_contents`;
- `educational_content_versions`;
- `exercises`;
- `exercise_versions`.

O Drive possui manifesto inicial com 89 arquivos claramente nao client-scoped. Nenhum deles foi importado.

Uma triagem somente por metadados cobre todos os itens em `drive_content_triage.json`. Ela identificou 16 grupos de possiveis duplicidades por nome normalizado entre as pastas historicas de exercicios e 9 videos com nomes genericos que exigem inspecao do conteudo antes de receber titulo final. As categorias registradas sao hipoteses, os rotulos historicos "masculino/feminino" nao sao regra de produto e todos os itens continuam com direitos nao revisados e migracao/publicacao nao autorizadas.

Antes da importacao e necessario resolver direitos/licenciamento, taxonomia e lote inicial.

A liberacao manual ja implementada considera elegivel somente uma versao publicada ainda nao liberada para a mesma cliente. A UI e a server action compartilham a mesma guarda deterministica, enquanto RLS e unicidade no banco continuam sendo a autoridade final.

### IA

A fundacao de banco preserva lifecycle, sources, output original, drafts, hypotheses e falhas de execution.

O contrato estrutural do primeiro purpose `anamnesis_review` agora possui validador deterministico em codigo e testes. O validador aceita apenas os dois finding types confirmados, rejeita propriedades extras, exige sources autorizadas da execution e nao permite score/diagnostico/conclusao clinica. Ele nao decide se um finding e verdadeiro e nao substitui revisao humana.

Ainda nao existe integracao real com provider/modelo nem boundary server-side que crie execution, monte contexto minimizado, chame provider e persista sucesso/falha. Esses pontos continuam separados para evitar acoplamento prematuro a um provider.

## Proxima rodada de decisoes da Patty

Usar `PATTY_DECISION_ROUND_2.md` como proxima conversa curta. A Rodada 1 fica preservada como historico de levantamento; varias perguntas dela ja foram resolvidas e nao devem ser repetidas.

As respostas precisam ser reconciliadas em:

1. `DECISIONS.md`;
2. documento de regra aplicavel;
3. `OPEN_QUESTIONS.md`;
4. somente depois, implementacao.

## Regra de continuidade

Enquanto as respostas da Patty nao chegam, continuar apenas em tarefas que:

- nao inventem regra profissional;
- nao enfraquecam RLS;
- nao exponham arquivos/dados alem do que ja foi autorizado;
- melhorem rastreabilidade, leitura factual, validacao ou documentacao;
- possam ser validadas por CI ou pelo Supabase SaaS.
