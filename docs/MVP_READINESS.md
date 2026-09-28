# Mapa de prontidao do sistema completo

Data de referencia: 2026-09-26 (atualizado apos validacao do update do draft canonico em producao).

Este documento e um mapa operacional do estado atual. Ele nao substitui `sistema completo.md`, `DECISIONS.md`, `BUSINESS_RULES.md` ou `OPEN_QUESTIONS.md`.

Estados usados:

- **IMPLEMENTADO**: codigo/schema existe no repositorio e esta integrado ao `master`;
- **CI VALIDADO**: passou pelo workflow atual de `npm ci`, `npm run typecheck`, testes determinísticos e `npm run build`;
- **SAAS VALIDADO**: estado relevante foi conferido no Supabase SaaS;
- **PRODUCAO VALIDADA**: o commit correspondente esta efetivamente publicado na Vercel e o fluxo foi conferido no ambiente de producao;
- **PARCIAL**: fundacao existe, mas falta fluxo necessario para o sistema completo;
- **BLOQUEADO POR DECISAO**: nao implementar sem resposta/documentacao;
- **INVENTARIADO**: levantamento existe, sem autorizacao de migracao/publicacao.

## Resumo executivo

### Pronto ou operacional em parte relevante

- Auth SSR, perfis, roles, clientes, assignments e RLS client-scoped;
- leitura real de clientes atribuidos e Cadastro Atual;
- Anamnese versionada em leitura para admin e cliente;
- notas internas append-only de revisao da Anamnese;
- boundary server-only de criacao/retomada do rascunho e UI parcial para editar respostas `text` e `single_choice` de rascunhos ja existentes; escolhas unicas sao revalidadas no servidor contra `options` da pergunta versionada;
- correcoes historicas append-only da Patty aplicadas no SaaS e integradas a uma UI administrativa que preserva a resposta original;
- esclarecimentos pos-Anamnese aplicados e validados em producao: Patty/admin cria pedido sob MFA, cliente correta responde, outra cliente permanece isolada e resposta original nao e alterada;
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
- fundacao auditavel de IA, provider OpenAI gated, observabilidade de executions nao terminais e tratamento de falhas com limites na aplicacao e no banco; migrations de IA correspondentes constam no historico remoto do Supabase;
- inventario inicial, manifesto e triagem machine-readable do Drive sem PII; nenhuma migracao/publicacao autorizada.

### Principais bloqueios atuais

- primeira `client-anamnesis` v1 ja esta publicada e validada; consentimento, inicio/retomada, INSERT/UPDATE de resposta e condicionalidade possuem evidencia de producao;
- definir a politica final de retencao/hard delete de arquivos privados;
- decidir infraestrutura/plano para habilitar `Leaked Password Protection`, recurso bloqueado no ambiente atual por exigir Pro ou superior;
- decidir entre upgrade ou SMTP customizado para permitir o template real `Invite user`; Site URL e redirect allowlist ja estao alinhados e o lifecycle sintetico de convite/ativacao passou E2E em producao;
- definir expiracao/reenvio, recuperacao e encerramento de contas de clientes;
- edicao controlada do Cadastro Atual;
- catalogo e regras finais de avaliacao/medidas;
- processo de autoria/revisao/publicacao das bibliotecas;
- taxonomia e direitos/licenciamento para migracao do Drive;
- exposicao da biblioteca de exercicios a cliente;
- avaliacao sintetica do modelo/effort, credencial de ambiente e conclusao do gate de dados de saude da OpenAI;
- regras profissionais ainda abertas do metodo.

## Matriz operacional

| Area | Estado atual | Escrita operacional | Validacao | Principal proximo gate |
| --- | --- | --- | --- | --- |
| Auth / sessao | login por email/senha IMPLEMENTADO; MFA administrativo TOTP IMPLEMENTADO; RLS AAL2 aplicado; senha minima Auth alinhada em 8 | admin exige `aal2` em SSR, rotas, server actions, Data API/RLS e Storage | CI + SAAS VALIDADO; smoke pos-apply PASS; Auth config auditado | HIBP depende de Pro+; manter smoke E2E de MFA |
| Profiles / roles | IMPLEMENTADO | sem UI administrativa de gestao | RLS existente | definir bootstrap/admin e quem gerencia roles |
| Clients / assignments | leitura + encerramento + inicio de assignment no onboarding IMPLEMENTADOS | Patty inicia onboarding por convite server-side; provisionamento cria vinculos relacionais e assignment com compensacao em falha | CI VALIDADO; encerramento E2E PASS; onboarding sintetico E2E PASS; Site URL/allowlist alinhados | template SSR real exige upgrade ou SMTP customizado; depois validar email real |
| Cadastro Atual | leitura + edicao controlada IMPLEMENTADAS | cliente edita proprio estado atual; Patty/admin edita sob AAL2 + assignment ativo; login email permanece separado | CI cobre validacao e boundary privilegiada server-only | sem migration nova; formulario ampliado/historico cadastral permanecem fora do escopo atual |
| Anamnese versionada | leitura, rascunho e submissao final IMPLEMENTADOS; mapa v1 + consentimento checkbox DEFINIDOS; esclarecimentos pos-envio IMPLEMENTADOS | cliente salva `text`/`single_choice`; aplicabilidade oculta dependentes; envio explicito exige ANAM-046 na forma canonica | CI + smoke SQL PASS; consent E2E `36072067063`; start/resume `36074218960`; fluxo consolidado de draft `36257567841` PASS; esclarecimentos `36053370894` PASS | manter versionamento para mudancas futuras e nao reabrir gates ja validados sem nova evidencia |
| Avaliacoes / medidas | leitura + autoria operacional de rascunho/finalizacao IMPLEMENTADAS | draft editavel; finalizacao imutavel; acompanhamento profissional somente apos finalizacao | CI/build PASS + pre-apply `ROLLBACK` PASS + schema aplicado | `20260927002227` aplicada; definir catalogo, unidades, obrigatoriedade e correcao historica pos-finalizacao |
| Arquivos privados | upload/listagem/download da cliente IMPLEMENTADOS; acesso admin permanente sem assignment, upload administrativo e liberacao explicita IMPLEMENTADOS | smoke E2E da cliente PASS; smoke E2E administrativo PASS em producao; cron de temporarios VALIDADO; auditoria estatica confirmou RLS/rotas coerentes com a excecao da Patty | definir retencao/hard delete |
| Protocolos | leitura + lifecycle manual IMPLEMENTADOS | submit/approve/publish | CI + SAAS VALIDADO; lifecycle com guarda determinística testada | criar/editar plano somente quando fluxo profissional estiver formalizado |
| Plano alimentar publicado | cliente ve variantes, refeicoes, doses e ciclo | nao | CI VALIDADO | equivalentes visiveis continuam abertos |
| Conteudo educacional | leitura admin/cliente por release IMPLEMENTADA | release manual | CI VALIDADO; elegibilidade de release testada | taxonomia, autoria/revisao e primeiro lote do Drive |
| Exercicios | leitura admin IMPLEMENTADA | nao | CI VALIDADO | definir exposicao a cliente e campos finais |
| Progresso de conteudo | schema existe | fluxo nao implementado | PARCIAL | definir quem registra abertura/conclusao |
| IA | fundacao de banco + failure handling + boundary server-side + provider OpenAI + Structured Outputs + aliases + contrato `anamnesis_review` IMPLEMENTADOS | execucao externa continua bloqueada para dados reais | prompt v1 aplicado; CI cobre adapter/contrato/boundaries; failure handling confirmado no SaaS | executar avaliacao sintetica com credencial de ambiente e concluir `OPENAI_HEALTH_DATA_GATE.md` |
| Drive | INVENTARIADO + revisao controlada iniciada | nenhuma migracao fisica | video da balanca aprovado; Vercel Private Blob definido; lote 1 machine-readable preparado | criar/conectar o store privado e somente depois migrar/verificar/versionar o primeiro item |
| Regras deterministicas do metodo | IMPLEMENTADO PARCIAL | sem automacao de protocolo | CI VALIDADO | ampliar somente com formulas exatas confirmadas/documentadas |
| CI | IMPLEMENTADO | automatico no GitHub Actions + smoke E2E manual de arquivos privados | `npm ci` + audit high/critical de producao + typecheck + suites deterministicas + `test:security-boundaries` + build; core Actions em v7; E2E de producao PASS nos fluxos ja estabilizados | ampliar E2E somente para fluxos estaveis e sinteticos |

## Regras deterministicas confirmadas

Ja estao em codigo testavel, sem ligacao automatica com decisao de fase ou publicacao:

- 1 dose de proteina = 15 g;
- 1 dose de carboidrato = 12 g;
- 1 dose de gordura = 6 g;
- limite diario do grupo de proteina com maior teor de gordura = metade das doses totais de proteina, arredondando para cima;
- referencia inicial geral do Reconhecimento Metabolico = 2 g/kg de proteina, 2 g/kg de carboidrato e 50 g/dia de gordura.

A referencia do Reconhecimento pode ser individualizada.

A equivalencia **2 doses de legumes = 1 dose de carboidrato na contagem total** esta confirmada documentalmente. Exemplo: em 6 doses totais, 2 doses de legumes no almoco contabilizam 1 dose de carboidrato e 2 doses de legumes no jantar contabilizam outra, restando 4 doses para distribuicao entre carboidrato e gordura.

Ainda nao esta pronta para automacao completa a redistribuicao do saldo entre carboidrato e gordura, porque a conversao exata permanece aberta. Cutting aproximado, fases 5/6 e demais regras abertas tambem nao foram codificados.

## Observacoes por fluxo

### Autenticacao e MFA

A decisao de MFA obrigatorio para contas administrativas esta parcialmente materializada. O fluxo de login identifica o AAL da sessao apos email/senha. Admin sem fator verificado e direcionado para enrollment TOTP; admin com fator verificado e sessao em `aal1` e direcionado para challenge; apenas `aal2` entra em `/admin`.

A mesma guarda esta centralizada em `requireRole("admin")`, portanto cobre o layout administrativo e as server actions/rotas administrativas que ja usam essa boundary. O fluxo da cliente nao foi alterado e nao exige MFA.

O enforcement equivalente no banco/Storage esta aplicado pela migration `20260923113835_admin_mfa_rls_enforcement.sql`. Ela adiciona policies `RESTRICTIVE` que exigem `aal2` quando o usuario autenticado possui role relacional `admin`, preservando `user_roles` em `aal1` apenas para o roteamento ao MFA. O smoke pos-aplicacao confirmou: admin `aal1` ve o proprio role, mas nao clientes/perfis protegidos; admin `aal2` recupera o acesso normal; cliente `aal1` nao e afetada.

O Auth hospedado foi auditado via Management API. A senha minima foi alinhada de 6 para 8 caracteres, igualando a validacao server-side ja existente. `Leaked Password Protection` continua desativado: a tentativa de habilitacao retornou HTTP 402 e a documentacao atual limita o recurso a Pro+. Nao foi criada regra adicional de composicao de senha.

No nivel de aplicacao, as boundaries de `/admin`, `/cliente`, Server Actions/Route Handlers e paginas de MFA agora possuem regressao automatica em CI. Helpers que usam o cliente administrativo derivam a identidade da sessao em vez de aceitar identidade administrativa do caller.


### Seguranca da aplicacao e supply chain

O Next.js esta pinado em `16.3.6`. O CI audita dependencias de producao para severidade alta/critica e usa `actions/checkout@v7` / `actions/setup-node@v7`. Headers globais incluem anti-framing, `nosniff`, `no-referrer`, Permissions Policy restritiva e CSP parcial segura para a arquitetura atual.

A configuracao de headers passou CI/build e foi validada no runtime em 2026-09-24 contra `/login`: CSP, Permissions-Policy, `no-referrer`, `nosniff` e `DENY` estavam presentes. A evidencia funcional foi obtida com o codigo de aplicacao do commit `19d216bf2148e983d452f0555a2d1e740e1027ca`, ainda contido no `master`; merges documentais posteriores nao mudam o resultado. O deployment de producao do `master` permanece `READY`. O `vercel.json` continua bloqueando previews de branches `codex/**` para reduzir consumo desnecessario de builds.

### Anamnese

Run `36257567841` (`E2E canonical Anamnesis start smoke`) terminou `SUCCESS` em 2026-09-26 no `master` `bf49254edb9292801eb9ed80a83e1d68262b7b11`, com `1 passed (25.7s)` e cleanup efemero `SUCCESS`. O fail anterior `36170455838` foi fechado como corrida de UI por `router.refresh()` apos save comum; o PR #189 removeu esse refresh dos saves comuns e manteve navegacao apenas para controladores de aplicabilidade. Nenhuma alteracao de schema/RLS/grants foi necessaria.


A aplicacao preserva:

- definicao versionada;
- submission vinculada a versao exata;
- respostas originais;
- notas internas separadas.

O smoke de producao do rascunho identificou um bug operacional no DELETE privilegiado de drafts: o trigger de imutabilidade retornava `NEW` em `BEFORE DELETE`, cancelando silenciosamente a exclusao de rascunhos. A migration `20260923191554_fix_anamnesis_draft_delete_trigger.sql` corrige o retorno para `OLD` em DELETE, preservando o bloqueio `55000` para submissions enviadas. O workflow de migrations aplicou essa migration no Supabase SaaS em 2026-09-23 e o `migration list` pos-apply confirmou o mesmo timestamp local/remoto. Um smoke transacional pos-apply com dados sinteticos e `ROLLBACK` confirmou a exclusao real de draft nao submetido, a preservacao de submission enviada com bloqueio `55000` e o isolamento RLS entre clientes. Em 2026-09-24, o E2E de producao confirmou login da cliente sintetica e retomada do rascunho. Em 2026-09-26, o run `36257567841` validou em producao o fluxo consolidado de start/resume, INSERT e UPDATE da mesma resposta `text`, condicionalidade e cleanup efemero sem residuo, sobre o `master` `bf49254edb9292801eb9ed80a83e1d68262b7b11`.

A regra de preenchimento esta fechada para a v1 nao juridica: todos os campos aplicaveis sao obrigatorios para o envio final; rascunho incompleto pode ser salvo e retomado; depois do envio, a cliente nao edita mais e somente a Patty pode registrar correcao historica sem sobrescrever a resposta original. A fundacao de escrita do rascunho esta aplicada pela migration `20260923113230_anamnesis_draft_write_foundation.sql`, e a UI suporta `text`, `single_choice` e visibilidade condicional versionada com salvamento explicito por resposta. A submissao final esta aplicada pela migration `20260924142453_anamnesis_final_submission_foundation.sql`: o banco revalida versao publicada, grafo de aplicabilidade e respostas obrigatorias aplicaveis, normaliza `submitted_at` e preserva a imutabilidade posterior. A fundacao de correcoes segue aplicada pela migration `20260923114643_anamnesis_answer_corrections_foundation.sql`, com historico append-only, autoria, timestamp, assignment ativo e AAL2.

A aplicacao administrativa agora expoe `/admin/anamneses/[id]/correcoes` somente para Anamneses ja enviadas. A tela mostra a resposta original, o historico cronologico de correcoes e permite acrescentar novo valor como JSON explicito. A Server Action exige `requireRole("admin")` e usa o cliente Supabase autenticado normal; RLS continua sendo a autoridade final para AAL2, assignment ativo, autoria e submission enviada. A cliente nao recebe leitura dessa tabela, e o fluxo nao altera nem remove resposta/correcao existente.

A UI de correcoes foi validada em producao em 2026-09-24: a rota respondeu `200`, o fluxo administrativo com MFA carregou a resposta original e o caso de JSON invalido nao criou historico. A consulta pos-smoke confirmou ausencia de correcoes E2E residuais.

A migration `20260924153808_create_anamnesis_clarification_flow.sql` esta aplicada no SaaS. O smoke pos-apply confirmou request administrativo sob AAL2/assignment, leitura e resposta pela propria cliente, isolamento de outra cliente, multiplos complementos append-only e preservacao da resposta original. A UI correspondente passou typecheck, security boundaries e build no PR #146 e foi publicada no deployment READY do commit `492a7ab`. O E2E autenticado de producao passou no run `36053370894`; por criar historico append-only sintetico, esse workflow agora e manual-only, restrito ao `master` e exige confirmacao explicita `CREATE_E2E_HISTORY`.

Tipos nao juridicos, 10 condicionais, ordem, consentimento ANAM-046 e submissao final da v1 estao fechados. A primeira `client-anamnesis` ja foi materializada, publicada e validada em producao; mudancas futuras devem ocorrer por nova versao.

### Esclarecimentos - lifecycle ainda incompleto

A regra profissional esta fechada:
- resposta da cliente nao encerra automaticamente;
- Patty le e marca como resolvido;
- Patty pode questionar novamente;
- nao existe prazo de expiracao;
- enquanto aguarda resposta da cliente, deve haver lembrete a cada 24 horas.

A fundacao atual e append-only e ja suporta pedido/resposta, mas ainda nao implementa estado formal resolvido, re-questionamento como lifecycle operacional nem lembrete recorrente de 24 horas. O canal da notificacao tambem permanece aberto.

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

Os formatos e os limites de tamanho do sistema completo estao definidos: fotos em JPEG/PNG/WebP ate 10 MB; exames e documentos em PDF/JPEG/PNG ate 20 MB. A cliente faz upload direto do browser para Storage privado sob RLS, usando area temporaria e validacao server-side antes de o arquivo ser considerado valido. Paths nao contem PII, objetos nao sao sobrescritos e hard delete direto pelo browser nao e permitido. A validacao deterministica de formato/extensao, MIME detectado, tamanho e geracao de path com UUIDs internos esta implementada em `lib/validation/private-files.ts` e coberta por `test:validation`. A autorizacao remota usa `client_file_upload_sessions`, com path temporario gerado pelo banco, expiracao de 15 minutos e policy de INSERT limitada ao objeto `pending` exato.

A Patty mantem acesso aos arquivos mesmo sem assignment ativo, e as rotas administrativas usam signed URLs com validade de 5 minutos. A dependencia de assignment e a visibilidade por autoria/liberacao foram reconciliadas pela migration `20260922230034_private_file_access_visibility_foundation.sql`, aplicada e verificada no Supabase SaaS.

Downloads administrativos de exames/documentos registram evento append-only em `client_file_access_events` antes da emissao da signed URL, sem copiar conteudo do arquivo. A migration `20260922230601_client_file_access_audit.sql` esta aplicada no Supabase SaaS; a rota registra ator, arquivo solicitado, acao, resultado da autorizacao e timestamp.

O sistema completo nao tera limite rigido de quantidade de arquivos. A Patty tambem podera enviar arquivos em nome da cliente por fluxo administrativo server-side controlado, com autoria administrativa explicita. Arquivos enviados pela cliente ficam visiveis para ela por padrao; uploads da Patty ficam ocultos ate liberacao explicita. O primeiro sistema completo nao tera antimalware dedicado; esse risco permanece mitigado por allowlist fechada, validacao de tipo real, limites de tamanho, Storage privado e ausencia de execucao.

A RLS/policy diferencia visibilidade para a cliente e acesso administrativo permanente da Patty. A auditoria estatica de 2026-09-23 confirmou que `client_files` e `storage.objects` permitem leitura administrativa por role `admin` sem assignment ativo, enquanto a policy MFA `RESTRICTIVE` continua exigindo AAL2. As rotas de listagem, download, upload administrativo e liberacao nao reintroduzem requisito de assignment. A fundacao do upload da cliente usa `client_file_upload_sessions` e esta aplicada no Supabase SaaS. Os tipos TypeScript foram regenerados a partir do schema real; como o Postgres expõe o campo gerado `temp_object_path` como anulavel no metadata, todos os pontos que o usam em Storage agora validam explicitamente sua existencia antes de prosseguir. A boundary de criacao/finalizacao server-side valida declaracao antes da sessao, reserva a sessao em `validating`, detecta assinatura binaria no objeto temporario, revalida tamanho/formato, promove para `client_files` e usa compensacao em falhas. A UI da cliente em `/cliente/arquivos` cria a sessao, envia o byte diretamente ao Storage privado, finaliza no servidor, atualiza o historico e permite download somente de arquivos visiveis pela RLS, via signed URL de 5 minutos. O smoke E2E manual em `e2e/client-private-files.spec.mjs`, acionado por `.github/workflows/e2e-private-files.yml`, foi executado em producao com conta sintetica e passou em login, upload, validacao/finalizacao, historico e download. A limpeza de temporarios expirados foi implementada sem apagar linhas historicas de sessao: o cron marca sessoes `pending` expiradas como `expired` e remove somente objetos no namespace `pending/`. O `CRON_SECRET` foi configurado em Production e o redeploy correspondente ficou READY. Em 2026-09-23, apos a janela agendada do cron, a validacao funcional da limpeza passou no Supabase SaaS: a sessao sintetica vencida estava `expired`, o objeto temporario correspondente nao existia mais em `storage.objects` e nao havia sessoes `pending` vencidas. O fluxo administrativo usa uma sessao server-side e `createSignedUploadUrl` para autorizar apenas o path temporario gerado; o browser recebe somente token temporario e envia direto ao Storage privado. A finalizacao usa a mesma validacao real do fluxo da cliente, grava autoria administrativa e mantem `client_visible_at` nulo. A Patty pode liberar explicitamente o arquivo depois, gravando ator e timestamp de visibilidade. Existe uma entrada dedicada em `/admin/arquivos`, limitada ao dominio de arquivos, para manter a excecao de acesso permanente sem ampliar os demais modulos client-scoped. O smoke E2E administrativo em `e2e/admin-private-files.spec.mjs`, acionado pelo workflow manual `.github/workflows/e2e-admin-private-files.yml`, foi executado em producao com contas sinteticas e passou. O teste confirmou login administrativo, selecao da cliente sintetica, upload administrativo, autoria administrativa, liberacao explicita, visibilidade subsequente para a cliente e download. O Supabase confirmou o arquivo sintetico com `uploaded_by_profile_id` e `client_visibility_set_by_profile_id` do admin sintetico e `client_visible_at` preenchido. Permanece aberta a politica concreta de retencao/hard delete dos arquivos aceitos.

### Assignments

A regra de gestao esta confirmada: somente a Patty pode iniciar ou encerrar assignments por fluxo administrativo server-side controlado. O encerramento de uma atribuicao ativa esta implementado no detalhe administrativo da cliente. A action exige role relacional `admin`, usa a identidade autenticada como `staff_profile_id`, atualiza somente assignments ativos dessa mesma Patty/cliente e preenche `ended_at` sem apagar a linha historica. Apos o encerramento, os demais dados client-scoped deixam de ser acessiveis pelas RLS normais; a excecao de arquivos privados permanece separada.

O inicio de assignment esta integrado ao onboarding controlado por convite administrativo, sem listagem privilegiada de clientes nao atribuidas nem bypass generico de RLS. O smoke sintetico de onboarding/ativacao foi executado em producao e passou; o cleanup posterior confirmou ausencia de residuos sinteticos. A Site URL e a redirect allowlist do Supabase foram alinhadas com a producao. O template SSR real continua separado desse teste e esta bloqueado no ambiente atual: a API do Supabase exige upgrade do plano Free ou SMTP customizado para permitir alteracao do template. O smoke E2E manual em `e2e/end-client-assignment.spec.mjs`, acionado por `.github/workflows/e2e-end-client-assignment.yml`, foi executado em producao com contas sinteticas e passou. O teste confirmou login administrativo, presenca da `E2E Client` na lista atribuida antes da acao, encerramento pela UI, redirecionamento de sucesso e ausencia da cliente na lista ativa depois da operacao. O Supabase confirmou que o mesmo registro historico foi preservado e recebeu `ended_at`, sem hard delete.

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

A Patty ja aprovou o video de uso da balanca como primeiro item elegivel, mas sua migracao fisica esta bloqueada pela infraestrutura atual: o arquivo original possui ~117,6 MiB e excede o limite de 50 MB do Supabase Free. O bucket `client-private` nao deve ser reutilizado para conteudo educacional. E necessario decidir infraestrutura de midia antes de criar o fluxo fisico de importacao.

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


## IA — execution boundary

A migration `20260924165942_harden_ai_execution_boundary.sql` esta aplicada no SaaS e passou smoke pos-apply com dados sinteticos. A fundacao agora possui vinculo direto da execution com a submission, minimizacao deterministica de contexto, sources congeladas no lifecycle e persistencia atomica de completion/failure por RPC interna `SECURITY INVOKER` exclusiva de `service_role`.

O codigo correspondente foi mergeado pelo PR #149 e publicado no deployment READY do commit `9b7bbba`. A verificacao de runtime consultada nao mostrou logs `error/fatal` na janela observada.

Isso nao significa integracao de provider pronta. Provider/modelo, prompt operacional, politica juridica aplicavel, chamada externa e UX humana dos findings continuam gates separados.


## OpenAI — revisao assistida da Anamnese

Provider confirmado: OpenAI.

Estado atual:
- adapter server-side para Responses API implementado;
- `store: false`;
- Structured Outputs;
- aliases efemeros no payload externo;
- default tecnico `gpt-5.6-terra`, reasoning `medium`;
- prompt v1 aplicado em `20260924193339_seed_openai_anamnesis_review_prompt.sql`;
- verificacao pos-apply: 1 prompt v1 e 0 executions;
- UI administrativa de revisao humana implementada;
- chamada externa bloqueada por padrao.

Antes de dados reais: configurar `OPENAI_API_KEY`, executar avaliacao sintetica representativa e revisar/habilitar explicitamente `OPENAI_HEALTH_DATA_PROCESSING_ENABLED=true`.


## Esclarecimentos — E2E autenticado

Em 2026-09-24, o workflow `E2E anamnesis clarification flow` passou em producao no run `36053370894`.

Cobertura comprovada:
- login admin com MFA AAL2;
- criacao do pedido pela Patty/admin;
- vinculo opcional a resposta original;
- login da cliente correta;
- leitura do pedido e registro do complemento;
- isolamento de outra cliente com 404;
- releitura do complemento pela Patty/admin;
- resposta original da Anamnese preservada;
- historico append-only mantido.

O smoke usa exclusivamente fixtures sinteticas persistentes. Nao existe cleanup que apague request/response porque isso violaria a imutabilidade intencional do dominio.


## Midia educacional privada

A infraestrutura binaria foi definida como Vercel Private Blob, mantendo Supabase como fonte de verdade de metadata, versionamento, releases e autorizacao.

A migration `20260924210600_create_educational_content_assets.sql` esta aplicada no SaaS. O smoke pos-apply sintetico confirmou:
- asset somente em versao draft;
- imutabilidade de asset apos publicacao;
- leitura client-scoped somente para versao explicitamente liberada;
- admin AAL1 bloqueado e AAL2 autorizado;
- anon bloqueado;
- provider v1 restrito a `vercel_blob`.

O PR #157 foi mergeado no commit `857daed` e publicado em deployment `READY`. Nenhum erro/fatal foi observado na janela consultada.

Ainda nao existe Blob store conectado nem arquivo fisico migrado. O video aprovado da balanca continua no Drive ate a operacao controlada de criacao/conexao do store, upload, verificacao de hash e publicacao/release.

## Midia educacional - lote 1 preparado

Estado: **PREPARADO / BLOQUEADO NO STORE**

A fundacao de metadata no Supabase permanece aplicada e vazia em producao. O primeiro lote controlado foi definido em `docs/educational_media_migration_batch_1.json` e possui teste de invariantes no CI.

O lote contem somente o video da balanca aprovado pela Patty e permanece deliberadamente sem `storage_path`, SHA-256, registros de conteudo/versao/asset, publicacao ou release enquanto o Vercel Private Blob store nao estiver criado/conectado.

A integracao Vercel usada nesta sessao nao oferece operacao de Storage, portanto a criacao/conexao do store continua uma pendencia operacional manual. O procedimento seguro foi versionado em `docs/VERCEL_BLOB_SETUP.md`. Isso nao bloqueia outras frentes tecnicas do sistema completo e nao autoriza migracao dos demais arquivos do Drive.

## IA - revisao humana de findings

Estado: **REGRA DE PRODUTO CONFIRMADA / UX OPERACIONAL PARCIAL**

A Patty pode aceitar um finding como observacao interna ou transforma-lo em anotacao propria.

Nenhum conteudo originado da IA pode ser enviado, publicado ou exibido para a cliente sem aprovacao explicita previa da Patty.

O sistema deve preservar separadamente o output original da IA, a decisao humana sobre o achado, a anotacao profissional resultante e eventual conteudo aprovado para comunicacao/publicacao.

A UX completa das demais acoes sobre findings ainda precisa ser fechada e implementada.

## IA - execution nao terminal

Estado: **VISIBILIDADE IMPLEMENTADA / RECOVERY AINDA ABERTO**

A UI administrativa identifica executions que permanecem `started` sem timestamp terminal e informa que exigem reconciliacao operacional. Nenhum timeout ou estado de falha e inferido automaticamente.

O Supabase SaaS foi consultado em 2026-09-24 e nao possui residuo atual desse tipo. Recovery/watchdog automatico permanece fora desta entrega.

## IA - retencao de falhas limitada

Estado: **IMPLEMENTADO / TESTADO NO BOUNDARY DA APLICACAO**

A aplicacao limita a resposta bruta de falha a 128 KiB UTF-8 e a mensagem sanitizada a 1.024 code points antes da chamada ao RPC interno. Respostas truncadas passam a `text` com marcador explicito, evitando persistir JSON truncado como se fosse estruturalmente valido.

Nenhuma migration foi necessaria nesta etapa porque o SaaS nao continha failure responses ou failure messages reais. O gate de envio de dados reais para OpenAI permanece fechado e independente desta mudanca.

## Anamnese/IA - identidade da condicao financeira

Estado: **IMPLEMENTADO / TESTAVEL**

A condicao financeira usa o `question_key` estavel `financial_capacity_for_supplements`, associado a ANAM-033. A resposta continua excluida da IA por padrao e so entra mediante inclusao explicita da Patty por execution.

O contrato e centralizado no runtime e verificado contra o field map v1 por teste automatizado.

## IA - reconciliacao de prontidao do primeiro fluxo

Estado: **IMPLEMENTADO TECNICAMENTE / GATE EXTERNO FECHADO**

O primeiro purpose `anamnesis_review` ja possui provider OpenAI, configuracao tecnica inicial de modelo/effort, prompt versionado, Structured Outputs, minimizacao de contexto, aliases efemeros, validacao deterministica, persistencia auditavel e revisao humana.

Nao confundir fundacao tecnica pronta com liberacao para dados reais. Ainda faltam credencial de ambiente, avaliacao sintetica aprovada e conclusao humana do gate de processamento de dados de saude.

## IA - limites de falha tambem protegidos no banco

Estado: **SAAS VALIDADO**

A migration `20260924215415_add_ai_failure_retention_constraints` aplica no Postgres os mesmos tetos do boundary da aplicacao: 128 KiB para resposta bruta e 1024 caracteres para `failure_message`.

Isso cria defesa em profundidade contra futuras escritas privilegiadas que contornem acidentalmente o helper server-side. Nenhuma RLS ou politica de acesso foi alterada.

## IA - observabilidade de execution nao terminal

Estado: **IMPLEMENTADO**

A administracao possui uma visao central de executions `started` sem estado terminal e uma contagem no dashboard. A listagem segue RLS/assignment e permite navegar para a revisao da Anamnese quando a execution estiver vinculada a uma submission.

Recovery/watchdog automatico continua fora do escopo atual.

## Anamnese - consentimento do sistema completo

Estado: **PRODUCAO VALIDADA**

ANAM-046 e um checkbox obrigatorio apenas no envio final da Anamnese canonica. O valor persistido e `Concordo`; o texto pertence a versao da pergunta. Rascunhos continuam salvaveis sem aceite.

Nao ha tabela juridica separada, IP ou fingerprint. O uso de dados reais pela OpenAI continua submetido a gate proprio.

## Anamnese canonica v1 publicada

Estado: **PRODUCAO VALIDADA POR GATES COMPLEMENTARES**

A primeira `client-anamnesis` versao 1 esta publicada no Supabase SaaS pela migration `20260924230322_publish_canonical_anamnesis_v1`.

Estrutura confirmada:
- 10 secoes;
- 51 perguntas;
- 10 condicionais;
- ANAM-046 como checkbox obrigatorio no envio final, persistindo `Concordo`.

A validacao de runtime esta fechada por gates complementares: browser para inicio/retomada/edicao/condicionais e consentimento; SQL transacional com `ROLLBACK` para o submit final completo. Essa estrategia evita criar historico sintetico imutavel apenas para teste.

## Anamnese canonica v1 - smoke de envio completo

Estado: **SAAS VALIDADO**

A `client-anamnesis` v1 publicada passou por um envio completo transacional no Supabase SaaS com `ROLLBACK`, usando somente dados sinteticos.

Foram validados em conjunto:
- perguntas obrigatorias aplicaveis;
- condicionais;
- ANAM-046 = `Concordo`;
- finalizacao da submission;
- preservacao da evidencia de aceite.

Nao executar submit final sintetico apenas para obter um E2E de browser: uma submission enviada e historica/imutavel e deixaria residuo artificial em producao. O submit final completo permanece validado pelo smoke transacional com `ROLLBACK`, enquanto o browser cobre os fluxos editaveis e o consentimento.

## E2E canônico de consentimento

Estado: **PRODUCAO VALIDADA**

Existe um smoke de browser dedicado a ANAM-046 na `client-anamnesis` v1 publicada. O desenho evita criar historico sintetico imutavel: uma pergunta obrigatoria permanece vazia, de modo que a tentativa com consentimento marcado persiste `Concordo` mas a submission continua rascunho e pode ser removida no cleanup.

O envio completo da mesma versao passou em smoke SQL transacional com `ROLLBACK`. O E2E de browser foi executado no run `36072067063` e passou com `1 passed (15.3s)`, sem residuo de draft canonico apos o cleanup.

## Anamnese canonica v1 - inicio e retomada

Estado: **PRODUCAO VALIDADA**

O workflow `E2E canonical Anamnesis start smoke` valida que uma cliente sintetica inicia um draft da versao canônica v1 publicada e depois retoma exatamente o mesmo registro.

O teste nao conclui envio final e limpa o draft no final, evitando historico sintetico permanente. O envio/consentimento ja possui validacoes separadas.

## Anamnese canonica v1 - inicio e retomada validados

Estado: **PRODUCAO VALIDADA**

O workflow `E2E canonical Anamnesis start smoke` passou no run `36074218960` com `1 passed (15.2s)`.

Foram validados no browser contra producao:
- descoberta da versao publicada;
- criacao do draft;
- vinculo a cliente e form version corretas;
- retomada do mesmo draft;
- cleanup completo;
- 0 drafts canonicos residuais ao final.

O consentimento e o envio completo possuem evidencias separadas ja aprovadas.

## Anamnese canonica v1 - edicao e condicionais

Estado: **PRODUCAO VALIDADA**

O workflow consolidado `E2E canonical Anamnesis start smoke` cobre, contra producao, inicio/retomada, persistencia e atualizacao de respostas da propria v1 publicada e uma condicional real do formulario. O run `36257567841` passou com `1 passed (25.7s)` e cleanup efemero `SUCCESS`.

Escopo do gate:
- insert/update de resposta textual;
- single_choice real;
- exibicao/ocultacao de campo condicional;
- persistencia do detalhe quando aplicavel;
- draft continua nao enviado;
- cleanup sem historico sintetico permanente.
## Solicitacao de treino estruturada

Estado: **SAAS APLICADO / UI IMPLEMENTADA**

A Patty confirmou que so prescreve treino para clientes que solicitam esse servico. O sistema agora registra esse fato em `client_training_requests`, de forma append-only, sob admin relacional + AAL2 + assignment ativo.

Migrations aplicadas:
- `20260926233725_create_client_training_requests`;
- `20260926233849_optimize_client_training_request_rls`.

O registro nao cria treino, nao escolhe exercicios, nao altera protocolo e nao publica nada. Progressao, intensidade, volume, cardio e eventual retirada/cancelamento da solicitacao continuam abertos.


## Avaliacoes - lifecycle de rascunho

Estado: **APLICADO NO SAAS / UI IMPLEMENTADA**

O fluxo operacional permite criar avaliacao em rascunho, editar data/tipo, medidas e vinculos de fotos privadas existentes e finalizar explicitamente.

A nomenclatura profissional confirmada passa a ser:
- **Avaliacao Completa**: ancora mensal definida pela data de inicio do acompanhamento;
- **Avaliacao Basica**: avaliacao intermediaria entre duas Completas.

Exemplo confirmado: Avaliacao Completa no dia 2 -> Avaliacao Basica no dia 17.

Depois da finalizacao, triggers bloqueiam mutacao da avaliacao, medidas e vinculos. Acompanhamentos profissionais ligados a uma avaliacao exigem que ela esteja finalizada.

A migration foi validada em transacao com `ROLLBACK`, o PR #210 passou CI/build e o Supabase SaaS registrou `20260927002227_create_assessment_draft_lifecycle`. O smoke pos-apply confirmou o lifecycle completo com fixture sintetica e `ROLLBACK`, incluindo isolamento AAL1/cross-assignment e imutabilidade depois da finalizacao, com 0 residuos.

O schema/runtime ainda usa os identificadores tecnicos historicos de tipo; esta atualizacao documental nao autoriza migration de enum/constraint sem tarefa tecnica separada.

O catalogo e as unidades da Avaliacao Completa estao confirmados: peso (kg); cintura, abdomen, coxa, biceps, quadril, ombros e panturrilhas (cm), alem da medida do torax em cm - nomeada **busto para mulher** e **peito para homem** - e das fotos. Para medidas unilaterais, utiliza-se somente o lado direito do corpo.

A Patty distinguiu nova avaliacao de acompanhamento de correcao de erro:
- nova avaliacao sempre preserva a anterior e recebe nova data;
- erro de lancamento deve ser corrigido na avaliacao existente, fazendo o valor incorreto deixar de ser o dado valido.

O runtime atual torna avaliacao/medidas finalizadas imutaveis, portanto a forma auditavel de permitir essa correcao ainda exige tarefa tecnica separada antes de ser considerada implementada.

Continua aberto: regra para datas-ancora 29/30/31 em meses sem o mesmo dia e desenho tecnico da correcao auditavel pos-finalizacao.

## Protocolos - progressao profissional

Estado: **REGRA DE PROGRESSAO CONFIRMADA / CRITERIOS OBJETIVOS AINDA ABERTOS**

A sequencia profissional deve ser preservada, mas nenhuma mudanca de fase e automatica.

A adesao e o resultado observado pela Patty funcionam como gates:
- se a cliente adere e o resultado e considerado valido, a sequencia pode continuar;
- se nao ha adesao adequada, a progressao para e exige decisao profissional;
- se o resultado nao e considerado valido, a progressao tambem para e exige decisao profissional.

A Patty considera valido qualquer resultado em que existam mudancas nos indicadores numericos e a evolucao nao esteja indo contra o objetivo buscado pela propria cliente. Nao considera valido quando a evolucao vai contra esse objetivo ou quando os numeros, no geral, permanecem estagnados.

Essa regra esta documentada para apoio a decisao humana, mas ainda nao esta pronta para automacao. Permanecem abertos os indicadores usados, a janela de estagnacao, o limiar de ruido, a combinacao entre peso/medidas e a direcao esperada por objetivo.

O Cutting 2 reinicia a estrutura de Cutting com menos doses de macros que o ciclo anterior. A reducao exata ainda nao esta formalizada.

O Cutting 3 tambem teve sua estrutura confirmada: Linear -> Dia 1/Dia 2 -> 2 Low/1 High -> Up Metabolico. As quantidades diminuem conforme o peso da cliente com base em tabelas Excel de proteina e carboidrato. Os valores e formulas exatos dessas tabelas ainda precisam ser reconciliados antes de qualquer implementacao deterministica.

Nao implementar score automatico de adesao, deteccao automatica de estagnacao ou mudanca automatica de fase.

## Protocolos - escopo de edicao manual confirmado

Estado: **REGRA DE PRODUTO CONFIRMADA / IMPLEMENTACAO PARCIAL**

A Patty precisa conseguir editar manualmente no acompanhamento, quando aplicavel:
- fase/protocolo;
- proteina, carboidrato e gordura;
- numero de refeicoes e distribuicao de doses;
- alimentos/equivalentes;
- ciclo Low/High;
- refeicao livre;
- observacoes, data de inicio e orientacoes;
- treino quando o cliente solicitar;
- suplementacao;
- manipulados.

Isso define escopo de UI/autoria humana, nao regras automaticas. Treino, suplementacao e manipulados continuam sem formulas/criterios automatizaveis confirmados.

## Protocolos - equivalentes de proteina

Estado: **REGRA DE SELECAO CONFIRMADA / CATALOGO COMPLETO AINDA PENDENTE**

A cliente pode escolher livremente substituicoes dentro do grupo permitido pelo protocolo.

Para proteinas:
- grupo de maior teor de gordura: possui limite diario igual a metade das doses totais, arredondado para cima;
- ao atingir esse limite, as doses restantes devem ser escolhidas no grupo de menor teor de gordura;
- "livre escolha" no grupo de menor teor de gordura continua limitada ao total de doses de proteina do protocolo.

Ainda falta fechar o catalogo/versionamento completo de equivalentes e suas regras de exibicao.

## Cliente - protocolo publicado e check-in

Estado: **FORMULA DE LIQUIDOS CONFIRMADA / CHECK-IN AINDA PARCIALMENTE ABERTO**

A cliente deve visualizar:
- sua rotina de alimentacao publicada;
- sua rotina de treinos, quando houver treino prescrito.

Ela nao precisa registrar execucao dentro do protocolo publicado.

O produto deve prever check-in separado para:
- registrar liquidos ao longo do dia e acompanhar uma meta baseada no peso da cliente;
- receber lembretes relacionados a essa meta;
- registrar diariamente se fez ou nao fez atividade fisica, independentemente do treino prescrito;
- visualizar progresso como estimulo.

As metas/configuracoes individuais podem ser definidas na entrega do primeiro protocolo da cliente.

A formula profissional confirmada para liquidos e **60 mL/kg/dia**. Exemplo: 60 kg -> 3.600 mL/dia. A maior parte deve ser agua pura e o restante pode ser complementado, em menor quantidade, por liquidos zero calorias.

Ainda faltam parametros de produto: proporcao minima/exata de agua pura, regra de recalculo por peso, frequencia dos lembretes e visibilidade/correcao pela Patty.

Nao tratar o check-in como score automatico de adesao.

## Escopo completo - Patty/admin

Estado: **ESCOPO CONFIRMADO / PRONTIDAO TECNICA A RECONCILIAR**

"Sistema completo" significa a primeira versao pronta para uso real no atendimento.

A Patty confirmou que todas as operacoes da pergunta 8 sao obrigatorias antes desse marco:
- convite/cadastro de cliente;
- edicao do Cadastro Atual;
- leitura e correcao historica da Anamnese;
- solicitacao de esclarecimentos;
- acesso a arquivos privados autorizados;
- criacao e comparacao de avaliacoes;
- criacao/edicao/versionamento de protocolos;
- revisao, aprovacao e publicacao;
- liberacao de conteudos;
- administracao de solicitacoes de treino;
- painel de pendencias;
- assistencia de IA na revisao da Anamnese.

Esta decisao nao altera o estado tecnico de cada fluxo; implementado, testado, aplicado e publicado continuam estados separados.

## Escopo completo - cliente

Estado: **ESCOPO CONFIRMADO / IMPLEMENTACAO AINDA A RECONCILIAR**

A Patty confirmou que todos os itens da pergunta 7 sao obrigatorios no sistema completo para a cliente:
- Perfil/Cadastro Atual;
- Anamnese;
- fotos;
- exames/documentos;
- avaliacoes/medidas;
- protocolo alimentar;
- conteudos educacionais;
- biblioteca de exercicios;
- solicitacao de treino;
- visualizacao do treino quando houver prescricao;
- esclarecimentos no aplicativo;
- evolucao.

Nenhum desses itens deve ser tratado como segunda fase do lancamento inicial. A prontidao tecnica de cada fluxo deve ser avaliada individualmente; esta decisao de escopo nao transforma item pendente em implementado.

## Cadastro Atual - edicao controlada

Estado: **IMPLEMENTADO / SEM AMPLIAR GRANTS DO BROWSER**

Os campos atuais `city`, `phone`, `contact_email` e `instagram` podem ser criados/atualizados pela propria cliente em Perfil e pela Patty/admin na tela da cliente.

A escrita usa boundary server-side privilegiada apenas depois de:
- cliente: `requireRole("client")` + resolucao do proprio `client_id`;
- admin: `requireRole("admin")` (AAL2) + leitura da cliente sob assignment ativo/RLS.

`authenticated` continua sem INSERT/UPDATE direto em `client_registration`.

Nao existe sincronizacao automatica com email de login nem com snapshots historicos da Anamnese.

## Alertas profissionais iniciais

Estado: **REGRA CONFIRMADA / NENHUMA AUTOMACAO INICIAL NECESSARIA**

Relatos iniciais de alimentacao emocional, culpa, compulsao, restricao, doencas ou alteracoes em exames nao geram automaticamente destaque especial, revisao obrigatoria, esclarecimento, encaminhamento ou bloqueio.

O acompanhamento inicia normalmente e a Patty observa a evolucao da cliente. Eventuais intervencoes posteriores permanecem decisoes humanas e nao constituem um gate tecnico pendente para o comportamento inicial do sistema.

Se no futuro houver desejo de automatizar algum alerta especifico, sera necessaria nova regra profissional documentada.

## Painel de pendencias operacionais

Estado: **IMPLEMENTADO SEM SCORE OU PRIORIZACAO AUTOMATICA**

A administracao possui uma area consolidada de estados operacionais abertos em Anamnese, esclarecimentos, avaliacoes, protocolos e IA.

O painel deriva os itens dos registros reais e respeita o RLS/assignment ja existente. Nao existe tabela paralela de pendencias e nenhum item altera automaticamente o fluxo que representa.

Ficam deliberadamente fora:
- classificacao por urgencia;
- atraso inferido por tempo;
- score de adesao;
- interpretacao clinica;
- avaliacao de estagnacao;
- obrigacao de prescrever treino a partir de uma solicitacao;
- inferencia de acao profissional a partir de arquivo recebido.

