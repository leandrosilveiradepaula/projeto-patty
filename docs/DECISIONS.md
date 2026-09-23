# Decisoes

## 2026-09-23 - Retomada parcial de rascunho da Anamnese na UI da cliente

### DECISAO TECNICA/PRODUTO

A UI da cliente pode editar somente um rascunho de Anamnese que ja exista e pertença a propria cliente.

Nesta etapa:
- apenas perguntas com `answer_type = text` sao editaveis;
- cada resposta e salva individualmente no rascunho;
- resposta vazia continua permitida no rascunho, pois obrigatoriedade vale para o envio final;
- submission enviada permanece somente leitura;
- valor estruturado inesperado em pergunta `text` nao e sobrescrito pela UI;
- a Server Action exige role `client`, ownership do rascunho, mesma `form_version_id` e tipo esperado `text`.

A UI **nao**:
- cria uma nova submission automaticamente;
- escolhe a versao publicada que deve ser preenchida;
- implementa os tipos finais de input;
- define autosave definitivo;
- envia a Anamnese.

Esses pontos continuam dependentes das definicoes finais do questionario e da regra de disponibilidade de versao.

### FATO DE TESTE

O formulario persistente `e2e-correction-*` e os perfis `E2E Correction ...` existentes no SaaS pertencem ao smoke administrativo de correcoes. Eles sao fixture sintetica de teste e nao representam uma versao real de Anamnese do produto. Nenhum fluxo de cliente deve selecionar automaticamente uma versao apenas por ela estar publicada.

## 2026-09-23 - Configuracao de Auth de producao auditada e parcialmente endurecida

### FATO TECNICO VALIDADO

A configuracao hospedada do Supabase Auth foi auditada pela Management API usando somente campos nao secretos.

O estado encontrado antes do ajuste era:
- `password_min_length = 6`;
- `password_hibp_enabled = false`;
- Site URL diferente da URL de producao usada pelos smokes;
- redirect allowlist sem a URL de producao;
- template de convite sem o link SSR por `TokenHash`;
- nenhum SMTP customizado configurado.

### DECISAO TECNICA APLICADA

A validacao server-side da aplicacao ja exigia senha com no minimo 8 caracteres. O Supabase Auth foi alinhado para `password_min_length = 8`, sem introduzir nova regra de composicao de senha.

A Site URL do Supabase Auth foi alinhada com a URL de producao ja usada em `E2E_BASE_URL`, e essa mesma origem foi incluida na redirect allowlist preservando entradas existentes.

### LIMITACAO EXTERNA CONFIRMADA

A tentativa de habilitar `password_hibp_enabled` retornou HTTP 402. A documentacao atual do Supabase informa que Leaked Password Protection esta disponivel no plano Pro e superiores. O advisor continua reportando esse unico warning de seguranca enquanto o projeto permanecer sem esse recurso.

A tentativa de alterar `mailer_templates_invite_content` retornou HTTP 400 com mensagem explicita de que projetos Free usando o provedor de email padrao nao podem modificar templates. A propria API informa duas alternativas tecnicas: upgrade de plano ou configuracao de SMTP customizado.

Portanto:
- Site URL e redirect allowlist estao corrigidos;
- senha minima do Auth esta alinhada em 8;
- HIBP permanece bloqueado pelo plano;
- o template real de convite SSR continua bloqueado pela combinacao Free + email provider padrao;
- o E2E sintetico de onboarding continua valido como teste do lifecycle tecnico, mas nao prova entrega/consumo do email real.

Nenhum fallback inseguro foi introduzido para contornar essas limitacoes.

## 2026-09-23 - Otimizacao das policies de correcoes da Anamnese aplicada

### DECISAO TECNICA DE PERFORMANCE

A migration `20260923150743_optimize_anamnesis_correction_rls.sql` foi aplicada no Supabase SaaS pelo workflow manual de migrations.

Ela remove checks diretos redundantes de `auth.jwt()->>'aal'` das policies especificas de `anamnesis_answer_corrections`.

A exigencia de MFA nao foi removida: continua sendo imposta pela policy transversal `RESTRICTIVE admin_mfa_aal2_required`. As policies especificas continuam responsaveis por role relacional `admin`, assignment ativo, autoria da correcao e submission enviada.

### VALIDACAO POS-APLICACAO

Foram confirmados:
- `migration list` local/remoto com `20260923150743` presente nos dois lados;
- admin em `aal1` continua bloqueado;
- admin em `aal2` continua autorizado quando o assignment esta ativo;
- zero chamadas diretas a `auth.jwt()` nas policies especificas de correcoes;
- os warnings `auth_rls_initplan` deixaram de aparecer no advisor de performance.

Os avisos restantes do advisor continuam sendo os 22 foreign keys sem indice de cobertura exata e indices sem uso observado. A decisao documentada de nao criar/remover indices mecanicamente permanece valida.

## 2026-09-23 - E2E sintetico de onboarding/ativacao aprovado

### FATO TECNICO VALIDADO

O workflow manual `E2E client onboarding activation smoke` foi executado em producao contra o `master` e concluiu com sucesso.

O teste sintetico validou o lifecycle tecnico sem depender de inbox real:
- geracao de convite administrativo sintetico;
- provisionamento de identidade/profile/role/client/assignment;
- consumo do token pela rota SSR `/auth/confirm`;
- sessao de ativacao em `/ativar-conta`;
- criacao da senha pela propria cliente;
- acesso subsequente a `/cliente/anamnese`;
- novo login por email + senha em sessao separada;
- cleanup do estado sintetico ao final.

A verificacao posterior no Supabase SaaS confirmou zero residuos do usuario sintetico em `auth.users`, `profiles`, `clients` e `client_assignments`.

Este PASS nao valida o template real de email do Supabase nem a Site URL/redirect allowlist. A configuracao/validacao do template `Invite user` continua como gate operacional separado.

## 2026-09-23 - Hardening de aplicacao e CI independente de regras profissionais

### DECISAO TECNICA DE SEGURANCA

A camada de aplicacao e o CI devem impedir regressao de autorizacao e dependencias vulneraveis sem depender de revisao manual recorrente.

Foram incorporados ao `master`:

- Next.js pinado em `16.3.6`, patch de seguranca upstream aplicado em substituicao a `16.3.5`;
- configuracao publica do Supabase separada fisicamente da leitura de `SUPABASE_SECRET_KEY`, que permanece em modulo `server-only`;
- secrets dos workflows E2E limitados aos passos que efetivamente os usam;
- regressao automatica para classificar toda `route.ts`/`actions.ts` e exigir as guards esperadas;
- regressao automatica das guards dos layouts `/admin`, `/cliente` e paginas de MFA;
- bloqueio em migrations novas de `auth.role()`, metadata editavel de usuario e `SECURITY DEFINER` sem revisao explicita;
- helpers privilegiados de assignment/onboarding derivam a identidade administrativa da sessao AAL2, sem aceitar `staffProfileId` do caller;
- headers HTTP basicos: anti-framing, `nosniff`, `no-referrer`, Permissions Policy restritiva e CSP parcial para `base-uri`, `frame-ancestors` e `form-action`;
- CI com `npm audit --omit=dev --audit-level=high`, bloqueando vulnerabilidades high/critical em dependencias de producao;
- workflows atualizados para `actions/checkout@v7` e `actions/setup-node@v7`, mantendo Node 22 como runtime do projeto.

A CSP permanece deliberadamente parcial. Restricoes completas de `script-src`, `style-src`, `img-src` e `connect-src` so devem ser introduzidas com teste de runtime para nao quebrar hidratacao Next.js, Supabase Auth ou MFA.

A configuracao dos headers passou typecheck, regressao de seguranca e build no CI. A verificacao independente dos headers no deployment de producao nao foi concluida porque o conector Vercel disponivel nesta sessao nao enxerga o time/projeto correspondente; isso e uma pendencia operacional de evidencia, nao falha conhecida do codigo.

## 2026-09-23 - Avisos de foreign keys sem indice nao geram migration automatica

### DECISAO TECNICA

O advisor de performance do Supabase reportou 22 foreign keys sem indice de cobertura exata. Esses avisos foram revisados individualmente antes de qualquer alteracao de schema.

Nao sera criada uma migration apenas para zerar o advisor neste momento.

Motivos:
- cinco dos 22 casos ja possuem indice ou chave primaria cujo primeiro campo corresponde ao primeiro campo da foreign key, oferecendo seletividade util para o acesso atual;
- a maior parte dos demais avisos esta na fundacao de IA, cujas tabelas estao vazias no SaaS e ainda nao possuem workload real;
- varios relacionamentos apontam para registros historicos que o produto deliberadamente preserva e nao costuma apagar, reduzindo o beneficio imediato de indices criados apenas para verificacao de `ON DELETE RESTRICT`;
- o mesmo advisor reporta 37 indices atualmente sem uso observado, portanto adicionar mais indices preventivos sem workload seria ruido e custo de escrita/armazenamento;
- indices novos devem responder a query, RLS, integridade ou volume observado, nao apenas a um lint informativo.

A decisao deve ser reavaliada quando a IA real, progresso de conteudo ou outro fluxo gerar volume mensuravel, ou quando planos de execucao mostrarem scans relevantes.

### FATO TECNICO

O advisor de seguranca reportou `Leaked Password Protection` desativado. A tentativa posterior de habilitacao pela Management API retornou HTTP 402; a documentacao do Supabase limita o recurso ao plano Pro e superiores. A pendencia passa a ser de plano/infraestrutura, nao de implementacao do aplicativo.

## 2026-09-23 - Correcoes historicas da Patty na Anamnese

### REGRA CONFIRMADA PELA PATTY

Depois do envio final, a cliente nao pode editar respostas. Somente a Patty pode registrar correcoes posteriores, sem apagar a resposta originalmente enviada.

### DECISAO TECNICA/PRODUTO

As correcoes posteriores sao modeladas como registros append-only em `anamnesis_answer_corrections`, vinculados a uma resposta original.

Cada correcao preserva:
- `answer_id`;
- valor corrigido separado em `corrected_answer_value`;
- `corrected_by_profile_id`;
- `created_at`.

A resposta em `anamnesis_answers.answer_value` nunca e sobrescrita pela correcao. Mais de uma correcao pode existir para a mesma resposta, preservando a sequencia historica.

Somente admin com assignment ativo para a cliente, sessao `aal2` e Anamnese ja submetida pode inserir correcao. A cliente nao recebe leitura nem escrita dessa tabela nesta fundacao.

UPDATE e DELETE sao bloqueados por privilegios e por trigger de imutabilidade, inclusive para proteger contra ampliacoes futuras de grants.

A migration `20260923114643_anamnesis_answer_corrections_foundation.sql` foi aplicada no Supabase SaaS em 2026-09-23. O smoke pos-aplicacao confirmou: AAL1 bloqueado, AAL2 permitido com assignment ativo, resposta original preservada e UPDATE/DELETE de correcoes bloqueados.

### FATO DE IMPLEMENTACAO

A aplicacao administrativa possui uma rota dedicada de correcoes para Anamneses enviadas. Ela apresenta separadamente a resposta original e todas as correcoes historicas em ordem cronologica e permite somente acrescentar uma nova correcao.

O valor corrigido e informado como JSON explicito para preservar o tipo estrutural sem inferir regra da pergunta. A Server Action exige admin autenticado em AAL2 por `requireRole("admin")`, valida que a resposta pertence a mesma submission e que ela ja foi enviada, e faz INSERT com o cliente Supabase autenticado normal. RLS, assignment ativo e as constraints/trigger append-only permanecem como autoridade final. Nao existe UPDATE/DELETE na UI e a cliente nao recebe acesso ao historico de correcoes.

## 2026-09-23 - Enforcement de MFA administrativo em RLS

### DECISAO TECNICA DE SEGURANCA

A exigencia de MFA da Patty/admin nao deve existir apenas na UI ou em server actions. Um token administrativo em `aal1` tambem deve ser bloqueado pela camada de RLS/Data API e pelo Storage privado.

A migration `20260923113835_admin_mfa_rls_enforcement.sql` adiciona uma segunda trava, sem substituir as policies atuais de role, ownership ou assignment:

- `user_roles` continua legivel pelo proprio usuario em `aal1`, pois o aplicativo precisa descobrir que a sessao pertence a um admin e encaminha-la para enrollment/challenge MFA;
- para usuarios sem role `admin`, a nova trava e neutra e o acesso continua dependendo das policies existentes;
- para role relacional `admin`, recursos protegidos exigem JWT com `aal = aal2`;
- a regra e adicionada como policy `RESTRICTIVE`, portanto nao concede acesso por si so e nao amplia nenhuma policy permissiva;
- `profiles` tambem exige AAL2 para admin; o fluxo de MFA nao depende dessa tabela;
- `storage.objects` recebe a mesma trava restritiva;
- a funcao auxiliar `current_user_admin_mfa_satisfied()` e `SECURITY INVOKER`, nao usa metadata editavel pelo usuario e nao e executavel por `anon`.

O dry-run transacional no Supabase SaaS confirmou que admin em `aal1` ainda le o proprio `user_roles`, mas nao le clientes nem perfis protegidos; em `aal2`, o acesso normal volta sujeito as policies preexistentes; cliente em `aal1` nao e afetada.

A migration foi aplicada no Supabase SaaS em 2026-09-23 via `supabase db push`. O smoke pos-aplicacao confirmou AAL1 bloqueado, AAL2 permitido e cliente AAL1 sem regressao.

## 2026-09-23 - Fundacao de persistencia do rascunho da Anamnese

### DECISAO TECNICA/PRODUTO

A cliente podera manter no maximo um rascunho ativo por versao publicada da Anamnese. O rascunho pertence exclusivamente ao proprio `client_id` autenticado e pode permanecer incompleto.

A escrita de rascunho deve usar privilegios minimos:
- a cliente pode criar a propria submission apenas com `client_id` e `form_version_id`;
- a cliente nao pode definir `submitted_at` na criacao;
- respostas podem ser inseridas no proprio rascunho e somente `answer_value` pode ser atualizado;
- a cliente nao pode trocar `submission_id`, `form_version_id` ou `question_id` de uma resposta existente;
- RLS continua impedindo leitura ou escrita em rascunhos de outra cliente.

A submissao final continua fora desta fundacao. Embora todos os campos sejam obrigatorios para o envio, as regras de perguntas condicionais/aplicabilidade ainda nao estao fechadas; portanto, `submitted_at` nao recebe permissao de escrita da cliente nesta etapa.

A migration `20260923113230_anamnesis_draft_write_foundation.sql` foi aplicada no Supabase SaaS em 2026-09-23. O smoke pos-aplicacao confirmou criacao/edicao do proprio rascunho, isolamento entre clientes e ausencia de privilegio para atualizar `submitted_at`.

## 2026-09-23 - Obrigatoriedade, rascunho e correcao da Anamnese

### REGRA CONFIRMADA PELA PATTY

Todos os campos da Anamnese sao obrigatorios para permitir o envio final.

Depois de enviada, a cliente nao pode corrigir nem sobrescrever respostas da Anamnese. Correcoes posteriores podem ser feitas somente pela Patty.

### DECISAO TECNICA/PRODUTO

Para permitir que a cliente preencha a Anamnese em mais de uma sessao, o sistema deve aceitar um rascunho incompleto e permitir retomada posterior. A exigencia de todos os campos preenchidos se aplica ao envio final, nao ao salvamento do rascunho.

Uma correcao feita pela Patty depois do envio nao deve apagar nem sobrescrever a resposta original. O sistema deve preservar a resposta originalmente enviada e registrar separadamente a correcao, o ator e o momento da alteracao, em coerencia com a regra geral de preservacao de historico.

## 2026-09-23 - Inicio do onboarding da cliente por link enviado pela Patty

### REGRA OPERACIONAL CONFIRMADA PELA PATTY

Quando uma cliente nova entra no sistema, a Patty ja possui o endereco de email da cliente e inicia o onboarding enviando um link para esse email.

O link leva a cliente para a interface do aplicativo onde ela respondera as perguntas que antes eram respondidas no formulario externo.

Nao existe cadastro publico/autonomo. A cliente nao inicia o proprio cadastro informando um email qualquer; o primeiro acesso nasce de uma acao explicita da Patty para o email que ela ja possui.

### DECISAO TECNICA/PRODUTO

No primeiro acesso do MVP, o link enviado pela Patty funciona como convite de ativacao, nao como metodo normal de login. O convite administrativo cria a identidade Auth e o backend provisiona `profile`, role `client`, `client` e assignment ativo da Patty. Se o provisionamento relacional falhar apos a criacao da identidade Auth, a aplicacao executa compensacao para remover o estado parcial e nao considera o acesso configurado.

Ao abrir um convite valido, a cliente entra em uma sessao de ativacao e deve criar a propria senha antes de seguir para a area de Anamnese. A Patty nao define, recebe nem armazena senha provisoria. Depois da ativacao, o metodo normal de acesso permanece email + senha em `/login`.

Para SSR, o template de email de convite do Supabase deve apontar para `/auth/confirm` usando `TokenHash` e tipo `invite`; a rota troca o token por sessao e redireciona para `/ativar-conta`. Site URL e redirect allowlist ja foram alinhados com a producao. O template ainda nao pode ser alterado no ambiente atual: a Management API confirmou que projetos Free com o provedor de email padrao precisam de upgrade ou SMTP customizado para modificar templates.

Expiracao/reenvio do convite, recuperacao de acesso e encerramento da conta continuam pendentes.

## 2026-09-22 - Limpeza de temporarios expirados de upload privado

### DECISAO TECNICA DE IMPLEMENTACAO

A expiracao de uma sessao de upload privado nao autoriza apagar o registro historico da sessao nem qualquer arquivo ja aceito em `client_files`.

A limpeza operacional deve atuar somente no namespace temporario `pending/`:

- sessoes `pending` com `expires_at <= now()` podem ser marcadas como `expired`;
- o objeto temporario correspondente pode ser removido do bucket privado;
- linhas de `client_file_upload_sessions` sao preservadas;
- arquivos aceitos e seus objetos finais nao entram nessa limpeza;
- a politica concreta de retencao/hard delete dos arquivos aceitos continua aberta.

Para evitar corrida entre finalizacao e limpeza, a finalizacao reserva uma sessao valida mudando `pending -> validating` antes de ler/mover o objeto. Somente uma sessao ainda `pending` e nao expirada pode ser reservada.

No deploy Vercel, a limpeza e acionada por rota server-side autenticada com `CRON_SECRET`. O secret nao e exposto ao browser nem armazenado no repositorio.

## 2026-09-22 - Autorizacao temporaria para upload da cliente

### DECISAO TECNICA DE IMPLEMENTACAO

O upload direto da cliente para o Storage usa uma sessao temporaria autorizada no banco antes do envio do objeto.

A sessao:

- pertence a propria cliente autenticada e ao respectivo `client_id`;
- aceita somente foto, exame ou documento dentro da allowlist e dos limites de tamanho ja definidos;
- gera o path temporario pelo banco em `pending/<client_id>/<session_id>.<ext>`, sem permitir que o browser escolha livremente o destino;
- inicia em estado `pending`;
- expira 15 minutos apos a criacao;
- nao concede `UPDATE` ou `DELETE` ao browser;
- autoriza somente `INSERT` no objeto temporario exato do bucket privado.

A migration `20260922231426_client_file_upload_session_foundation.sql` esta aplicada no Supabase SaaS e deve ser preservada sem reescrita. Essa fundacao nao considera o arquivo recebido como valido: a promocao para `client_files` continua dependente da validacao server-side de tamanho, extensao e tipo real/detectado.

## 2026-09-22 - Visibilidade de arquivos privados para a cliente

### DECISAO DE PRODUTO E SEGURANCA

No MVP, a visibilidade de arquivos privados para a cliente depende da autoria do upload:

- arquivo enviado pela propria cliente fica visivel para ela por padrao;
- arquivo enviado pela Patty em nome da cliente nao fica visivel automaticamente;
- a Patty pode liberar explicitamente um arquivo administrativo para a cliente;
- nenhum arquivo privado se torna publico por causa dessa liberacao.

A visualizacao pela cliente continua exigindo autenticacao, autorizacao e signed URL temporaria. O sistema deve preservar quem enviou o arquivo e, quando houver liberacao administrativa, quem liberou e quando.

A RLS de `client_files` e Storage diferencia a visibilidade para a cliente e o acesso administrativo permanente da Patty. O fluxo administrativo implementado cria sessao server-side, autoriza somente o path temporario por signed upload token, finaliza com validacao do conteudo real e registra o arquivo com `client_visible_at` nulo. A liberacao posterior e explicita e grava `client_visibility_set_by_profile_id` e `client_visible_at`.

## 2026-09-22 - Sem antimalware dedicado no primeiro MVP

### DECISAO TECNICA E DE SEGURANCA

O primeiro MVP nao tera servico dedicado de antivirus/antimalware para uploads privados.

Essa decisao considera o conjunto de controles ja definido: allowlist fechada de formatos, validacao server-side de extensao e tipo real/detectado, limites de tamanho, Storage privado, ausencia de execucao de arquivos e fluxo de validacao em duas etapas.

A ausencia de scanner dedicado nao transforma arquivos enviados em confiaveis nem autoriza execucao, conversao irrestrita ou exposicao publica. O sistema deve continuar tratando uploads como conteudo nao confiavel e manter validacao e isolamento.

A necessidade de antimalware dedicado devera ser reavaliada se o produto passar a aceitar formatos mais amplos, integracoes externas, processamento adicional de arquivos ou se surgir requisito especifico de seguranca/compliance.

## 2026-09-22 - Upload administrativo de arquivos pela Patty

### DECISAO DE PRODUTO, SEGURANCA E AUDITORIA

No MVP, a Patty podera enviar fotos, exames e documentos em nome da cliente por um fluxo administrativo server-side controlado.

O sistema deve registrar explicitamente a autoria administrativa do upload; um arquivo enviado pela Patty nao pode ser apresentado no historico como se tivesse sido enviado pela cliente.

O fluxo administrativo deve respeitar a mesma allowlist de formatos, os mesmos limites de tamanho, paths sem PII, imutabilidade dos objetos e validacao em duas etapas definidos para uploads privados.

A autorizacao da operacao segue a excecao ja confirmada para arquivos privados: no MVP, a Patty pode acessar e administrar esses arquivos mesmo sem assignment ativo. A implementacao usa boundary server-side para criar a sessao e o signed upload token do path exato; o browser nao recebe chave secreta. O arquivo administrativo permanece oculto para a cliente ate liberacao explicita.

## 2026-09-22 - Sem limite rigido de quantidade de arquivos no MVP

### DECISAO DE PRODUTO

O MVP nao tera um limite rigido de quantidade de fotos, exames ou documentos por cliente ou por finalidade.

Continuam valendo os limites por arquivo ja definidos e os controles de formato, validacao, autorizacao, privacidade e armazenamento.

Se volume, custo, abuso ou operacao demonstrarem necessidade de um teto quantitativo, uma regra futura devera ser baseada em uso observado e documentada antes de ser automatizada.

## 2026-09-22 - Auditoria de acesso a exames e documentos privados

### DECISAO DE SEGURANCA E AUDITORIA

No MVP, acessos administrativos a exames e documentos privados devem gerar trilha de auditoria quando a Patty solicitar visualizacao ou download. O registro nao deve conter o conteudo do arquivo.

A trilha deve preservar apenas metadados necessarios para rastreabilidade, incluindo identificador interno do usuario, identificador interno do arquivo, acao solicitada, data/hora e resultado da autorizacao.

Se no futuro outro papel receber acesso autorizado a exames/documentos, o mesmo requisito de auditoria se aplica a esse acesso.

A implementacao registra o evento na boundary controlada que autoriza o download e gera a signed URL. A tabela append-only `client_file_access_events` preserva ator, arquivo solicitado, acao, resultado da autorizacao, tipo do arquivo quando autorizado e timestamp, sem armazenar o conteudo. A migration `20260922230601_client_file_access_audit.sql` esta aplicada no Supabase SaaS. A emissao da signed URL nao deve ser interpretada como prova de que a transferencia do arquivo foi concluida pelo cliente.

## 2026-09-22 - Validade das signed URLs de arquivos privados

### DECISAO DE PRODUTO E SEGURANCA

Signed URLs para visualizacao ou download de fotos, exames e documentos privados terao validade de 5 minutos. Elas podem ser regeneradas quando necessario e nunca devem ser persistidas no banco.

As rotas administrativas de visualizacao e download usam signed URLs com validade de 5 minutos, sem persistir a URL.

## 2026-09-22 - Acesso permanente da Patty a arquivos privados

### DECISAO DE PRODUTO E SEGURANCA

No MVP, a Patty podera acessar fotos, exames e documentos privados das clientes mesmo sem `client_assignment` ativo.

Esta e uma excecao especifica para arquivos privados e para a Patty, que e a unica administradora/profissional de negocio do MVP. A regra geral de assignment ativo continua valendo para os demais dados client-scoped, salvo decisao documentada posterior.

Esta decisao substitui a regra anterior que removia o acesso da Patty aos arquivos quando o assignment era encerrado. A implementacao atual de RLS e das rotas de arquivos ainda depende de assignment ativo e deve ser reconciliada antes de esta decisao ser considerada implementada.

## 2026-09-22 - Validacao de upload em duas etapas

### DECISAO TECNICA E DE SEGURANCA

O upload privado do MVP sera tratado em duas etapas:

1. o browser envia o objeto para uma area privada temporaria e nao publicada;
2. o servidor valida tamanho, extensao e tipo real/detectado do arquivo;
3. somente depois da validacao o arquivo e registrado/promovido como valido e disponivel;
4. objetos invalidos sao removidos da area temporaria e nunca aparecem como documentos efetivamente recebidos.

No primeiro MVP nao sera usado servico dedicado de antivirus/antimalware. Essa necessidade deve ser reavaliada se o risco ou o escopo de arquivos aumentar.

## 2026-09-22 - Upload direto do browser para Supabase Storage

### DECISAO TECNICA E DE SEGURANCA

No MVP, a cliente autenticada podera enviar os bytes diretamente do browser para o Supabase Storage, sem encaminhar arquivos grandes pelo servidor Next.js e sem expor `service_role`/secret ao browser.

O upload deve ficar rigidamente limitado por grants/policies/RLS ao espaco autorizado da propria cliente. O caminho e os identificadores aceitos pelo Storage devem ser gerados ou validados pelo sistema; o browser nao recebe liberdade para gravar em paths arbitrarios.

O registro de metadados e o vinculo do objeto ao recurso de negocio continuam sujeitos a validacao server-side e RLS. Esta decisao autoriza o fluxo da cliente. Decisao posterior tambem autorizou upload administrativo pela Patty por boundary server-side controlada, com autoria administrativa explicita.

## 2026-09-22 - Exclusao controlada de arquivos privados

### DECISAO DE PRODUTO, SEGURANCA E OPERACAO

A cliente nao podera apagar fisicamente um arquivo ja enviado por uma escrita direta do browser.

Quando houver necessidade de remocao, o fluxo devera passar por boundary server-side controlado, verificar referencias e regras de retencao e registrar auditoria apropriada. Quando fizer sentido preservar historico, o registro podera ser inativado ou substituido logicamente sem destruicao imediata do objeto.

A politica concreta de retencao e as condicoes para hard delete definitivo continuam pendentes.

## 2026-09-22 - Imutabilidade dos objetos enviados

### DECISAO DE SEGURANCA E AUDITORIA

Um arquivo privado ja persistido nao sera sobrescrito no mesmo path. Correcao ou substituicao gera novo objeto com identificador proprio, preservando o historico e as referencias anteriores.

O browser nao recebe permissao para sobrescrever diretamente um objeto existente.

## 2026-09-22 - Paths de Storage sem PII

### DECISAO DE PRIVACIDADE E SEGURANCA

Paths de objetos privados nao devem conter nome, email, CPF, telefone ou outros dados pessoais legiveis.

O sistema usara apenas identificadores internos/UUIDs no path. O nome original do arquivo pode ser preservado como metadado no banco quando houver necessidade de produto, mas nao deve determinar livremente o path do Storage.

## 2026-09-22 - Armazenamento privado e referencia de objeto

### DECISAO DE SEGURANCA

Fotos, exames e documentos das clientes permanecem em Storage privado, sem URL publica permanente.

O banco deve persistir apenas o identificador/path do objeto e os metadados necessarios. Signed URLs sao temporarias, regeneraveis e nao devem ser salvas como referencia permanente.

## 2026-09-22 - Limites de tamanho para arquivos privados

### DECISAO DE PRODUTO E SEGURANCA

No MVP:

- fotos: maximo de 10 MB por arquivo;
- exames/documentos: maximo de 20 MB por arquivo.

Arquivos acima do limite devem ser rejeitados. O registro definitivo em `client_files` e a disponibilizacao do arquivo so ocorrem apos validacao. Se a validacao em duas etapas exigir objeto temporario, qualquer objeto acima do limite ou invalido deve ser removido e nunca considerado upload aceito.

## 2026-09-22 - Formatos permitidos para arquivos privados no MVP

### DECISAO DE PRODUTO E SEGURANCA

O MVP usara allowlist fechada de formatos para uploads privados:

- fotos: JPEG (`image/jpeg`, extensoes `.jpg`/`.jpeg`), PNG (`image/png`, `.png`) e WebP (`image/webp`, `.webp`);
- exames/documentos: PDF (`application/pdf`, `.pdf`), JPEG (`image/jpeg`, `.jpg`/`.jpeg`) e PNG (`image/png`, `.png`).

Word, Excel, ZIP, executaveis e qualquer outro formato fora dessa allowlist nao serao aceitos no MVP.

A validacao futura de upload deve conferir no servidor a extensao e o tipo real/detectado do arquivo; o nome do arquivo e o `Content-Type` informado pelo cliente nao sao suficientes por si so. Divergencia entre extensao e tipo detectado deve rejeitar o upload.

Esta decisao fecha os formatos aceitos. Decisoes posteriores tambem fecharam limites de tamanho, upload da cliente, imutabilidade/substituicao, exclusao controlada, paths sem PII, validacao em duas etapas, acesso da Patty e validade de signed URLs. Permanece aberta, entre outros pontos, a politica concreta de retencao. A visibilidade para a cliente ja esta definida por autoria/liberacao: uploads da propria cliente ficam visiveis por padrao; uploads administrativos da Patty exigem liberacao explicita. O MVP nao tera limite rigido de quantidade de arquivos, a Patty podera fazer upload administrativo em nome da cliente e nao havera antimalware dedicado no primeiro MVP.

## 2026-09-22 - Gestao de assignments no MVP

### DECISAO DE PRODUTO, SEGURANCA E OPERACAO

No MVP, somente a Patty pode iniciar ou encerrar um `client_assignment`, por fluxo administrativo server-side controlado. O browser nao recebe privilegio direto para inserir, atualizar ou excluir assignments.

O encerramento preserva o registro historico do assignment e remove apenas sua validade atual, usando o estado/tempo de encerramento previsto no modelo. Nao deve haver hard delete de assignment historico como operacao normal do produto.

### FATO DE IMPLEMENTACAO

O encerramento de assignment ativo esta implementado por boundary server-side. A operacao exige a sessao atual com role relacional `admin`, limita a escrita a `client_id` + `staff_profile_id` da Patty autenticada, preenche somente `ended_at` de linhas ainda ativas e preserva integralmente os registros historicos. Nenhum `INSERT`, `UPDATE` ou `DELETE` direto em `client_assignments` foi concedido ao browser.

O inicio de assignment possui agora uma boundary server-only preparada para o onboarding controlado. Ela recebe apenas `client_id` e o `staff_profile_id` da Patty autenticada, reutiliza o indice parcial que garante no maximo um assignment ativo para o mesmo par e trata chamadas repetidas/concorrentes de forma idempotente. Nenhuma UI de onboarding, criacao de conta Auth, criacao automatica de `client`, envio de convite ou ativacao foi inferida nesta etapa.

Os detalhes operacionais de convite/ativacao permanecem abertos. A boundary de inicio somente deve ser acionada por uma futura server action que exija `requireRole("admin")` e parta de uma cliente identificada por um fluxo de onboarding ja confirmado/documentado.

A operacao deve permanecer auditavel e, como regra geral, nao pode conceder acesso client-scoped sem role relacional `admin` e assignment ativo. Decisao posterior criou uma excecao especifica para o acesso da Patty a arquivos privados, sem generalizar essa excecao para os demais dados client-scoped. Fluxos futuros de transferencia, reatribuicao ou outros profissionais ficam fora desta decisao.

## 2026-09-22 - Bootstrap controlado da primeira conta admin

### DECISAO DE SEGURANCA E OPERACAO

A primeira conta administrativa da Patty sera provisionada por procedimento administrativo controlado e unico. O provisionamento cria ou vincula a identidade Auth da Patty ao `profile` correspondente e registra o role relacional `admin` fora de qualquer fluxo publico de autoatendimento.

Nao existira botao, endpoint publico, cadastro autonomo ou mecanismo de autoelevacao que permita a um usuario se tornar `admin` pelo aplicativo.

O procedimento deve usar privilegios administrativos somente durante o provisionamento necessario, ser executado de forma auditavel e nao alterar o principio de que o acesso client-scoped continua dependendo de role relacional e assignment ativo.

Esta decisao resolve apenas o bootstrap inicial da Patty. A gestao de assignments no MVP esta definida separadamente: somente a Patty, por fluxo administrativo server-side controlado, pode iniciar ou encerrar assignments preservando historico.

## 2026-09-22 - Unica administradora/profissional de negocio no MVP

### DECISAO DE PRODUTO E SEGURANCA

No MVP, a Patty sera a unica administradora/profissional de negocio com acesso administrativo aos dados das clientes. Nao serao criados papeis operacionais para assistentes, profissionais parceiros ou suporte nesta primeira versao.

Acesso tecnico ao repositorio, infraestrutura ou operacao da plataforma nao constitui papel de negocio dentro da aplicacao e nao deve, por si so, conceder acesso client-scoped na interface ou contornar RLS.

Novos papeis de negocio so devem ser introduzidos quando houver necessidade operacional concreta, com permissoes e escopo definidos antes da implementacao.

## 2026-09-22 - Metodo principal de login

### DECISAO DE PRODUTO E SEGURANCA

O metodo principal de login no MVP sera email + senha para clientes e administradores. Contas administrativas continuam com MFA obrigatorio.

Links enviados por email podem ser usados nos fluxos controlados de convite, ativacao e recuperacao de acesso, mas magic link nao sera o metodo normal de login no MVP.

## 2026-09-22 - Uso de LangGraph no MVP

### DECISAO TECNICA

LangGraph nao sera usado inicialmente no MVP. A primeira integracao real de IA deve usar um fluxo server-side simples, explicito e auditavel. LangGraph so deve ser introduzido se surgirem fluxos de IA com estado persistente, multiplas etapas, ramificacoes ou orquestracao complexa que nao sejam bem atendidos por uma implementacao mais simples.

## 2026-09-22 - Uso de n8n no MVP

### DECISAO TECNICA

n8n nao sera usado inicialmente no MVP. A ferramenta so deve ser introduzida quando existir uma automacao externa ou orquestracao concreta, documentada e com beneficio claro sobre uma solucao mais simples dentro de Next.js, Vercel e Supabase.

## 2026-09-22 - Uso de VPS no MVP

### DECISAO TECNICA

A VPS Hostinger nao sera usada na primeira versao operacional do MVP enquanto Vercel e Supabase atenderem aos requisitos confirmados. Ela so deve ser introduzida se surgir necessidade tecnica concreta e documentada que exija processo persistente, worker, servico de longa duracao ou componente que nao se encaixe adequadamente na arquitetura atual.

## 2026-09-22 - Ambientes, MFA administrativo e onboarding de clientes

### DECISAO TECNICA/PRODUTO

No MVP, o projeto tera somente dois ambientes operacionais definidos: desenvolvimento e producao. Nao sera criado ambiente de staging neste momento. Um terceiro ambiente so deve ser introduzido se surgir necessidade concreta e documentada.

### DECISAO DE SEGURANCA

MFA sera obrigatorio para contas administrativas, incluindo Patty/admin.

### FATO DE IMPLEMENTACAO PARCIAL

A camada da aplicacao exige `aal2` para acesso administrativo. Depois do login por email/senha, uma conta `admin` sem fator verificado e direcionada ao enrollment TOTP; uma conta com fator verificado, mas sessao ainda em `aal1`, e direcionada ao challenge. Paginas, rotas server-side e server actions que usam `requireRole("admin")` nao prosseguem sem `aal2`.

O enrollment/challenge usa as APIs nativas de MFA do Supabase Auth. A chave secreta TOTP exibida no enrollment pertence ao usuario autenticado e nao e persistida pela aplicacao.

Esta implementacao ainda nao encerra a decisao de MFA por completo: a protecao equivalente em RLS, para impedir uso direto de um token administrativo `aal1` contra a Data API/Storage, permanece como gate tecnico separado antes de considerar MFA plenamente aplicado fim a fim.

### DECISAO DE PRODUTO E SEGURANCA

A criacao de conta de cliente no MVP sera somente por convite ou ativacao controlada. Nao havera cadastro publico/autonomo de clientes.

Esta decisao nao fecha ainda os detalhes operacionais de envio do convite, expiracao, reenvio, ativacao, recuperacao ou encerramento de conta.

## 2026-09-22 - Fluxos humanos de escrita ja operacionais

### FATO CONFIRMADO DE IMPLEMENTACAO

Os seguintes fluxos de escrita humana estao conectados na aplicacao usando sessao autenticada, grants e RLS existentes:

- notas internas append-only de revisao de Anamnese;
- acompanhamento profissional append-only ligado a avaliacao;
- liberacao manual de uma versao publicada de conteudo educacional para uma cliente;
- lifecycle manual de protocolo: submissao para revisao, aprovacao humana e publicacao explicita.

No lifecycle de protocolo, cada etapa e independente. Submeter nao aprova; aprovar nao publica; publicar exige uma aprovacao existente da mesma versao. A aplicacao revalida acesso e estado atual antes da escrita, e o banco continua sendo a autoridade final por RLS, constraints, FKs, triggers e unicidade.

### LIMITE DE ESCOPO

Esses fluxos nao autorizam inferir outras operacoes administrativas ainda abertas, como edicao do Cadastro Atual, upload/exclusao de arquivos, preenchimento final da Anamnese ou automacoes de protocolo. A gestao de assignments foi definida posteriormente como fluxo administrativo server-side controlado da Patty.

## 2026-09-22 - Leitura administrativa de arquivos privados

### FATO CONFIRMADO DE IMPLEMENTACAO E DECISAO TECNICA HISTORICA

Arquivos privados permanecem no bucket privado `client-private`, sem URL publica permanente e sem signed URL persistida.

Fotos privadas vinculadas a uma avaliacao podem ser exibidas no detalhe administrativo por uma rota server-side dedicada. A rota exige role relacional `admin`, consulta o `client_file` sob as RLS existentes e cria sob a sessao atual uma signed URL com validade de 60 segundos. O redirecionamento nao deve ser armazenado em cache.

A area administrativa da cliente pode listar metadados de `client_files` acessiveis pelas RLS existentes. Para download administrativo de fotos, exames ou documentos, uma rota server-side igualmente exige `admin`, resolve o arquivo sob RLS e cria signed URL de 60 segundos com comportamento de download forcado. Isso evita decidir renderizacao inline de exames ou documentos antes da definicao de MIME types e controles adicionais.

Na implementacao atual, a autorizacao dessas rotas ainda depende de assignment ativo, e nenhuma delas usa `service_role` nem bypass de RLS. A decisao posterior de produto determina que a Patty mantenha acesso aos arquivos privados mesmo sem assignment ativo; portanto RLS/rotas atuais precisam ser alteradas antes de a implementacao estar alinhada com a decisao vigente.

### LIMITE DE ESCOPO

Esta decisao implementa somente leitura e download administrativos de arquivos ja cadastrados.

Decisoes posteriores passaram a definir upload da cliente, limites de tamanho, imutabilidade/substituicao, exclusao controlada, validacao em duas etapas, acesso permanente da Patty e signed URLs de 5 minutos.

Continuam abertos nesta area:

- politica concreta de retencao e hard delete.

## 2026-09-22 - Reconciliacao documental das regras confirmadas do metodo

### DECISAO CONFIRMADA

Esta secao registra no repositorio regras ja confirmadas pela Patty e elimina a classificacao antiga que tratava todo o metodo como indefinido.

Todo acompanhamento comeca pelo Reconhecimento Metabolico, protocolo linear inicial.

A sequencia atualmente confirmada do fluxo principal e:

```text
Reconhecimento Metabolico
-> Cutting 1 Dia 1 / Dia 2
-> Cutting 1: 2 Low / 1 High
-> Up Metabolico
-> Cutting 2 Linear
-> Cutting 2 Dia 1 / Dia 2
-> Cutting 2: 2 Low / 1 High
```

Nao inferir automaticamente etapas posteriores.

### DECISAO CONFIRMADA

O Reconhecimento Metabolico pode ser reutilizado em caso de baixa adesao, dificuldade de execucao ou retorno apos afastamento.

Adesao e central. A Patty adapta o protocolo a dificuldade relatada e pode simplificar ou retornar antes de avancar.

Nao criar score automatico de adesao.

### DECISAO CONFIRMADA

Nao existe numero fixo de refeicoes. A quantidade e adaptada a rotina e preferencia da cliente, com foco em adesao.

Horarios individuais nao constituem regra geral. No jejum intermitente explicado pela Patty, normalmente sao usadas 3 refeicoes, com a ultima ate 12 horas apos a primeira e horarios internos flexiveis.

### DECISAO CONFIRMADA

A referencia inicial geral do Reconhecimento Metabolico e proteina 2 g/kg, carboidrato 2 g/kg e gordura 50 g/dia como referencia, com possibilidade de individualizacao.

Conversoes confirmadas:

- 1 dose de proteina = 15 g;
- 1 dose de carboidrato = 12 g;
- 1 dose de gordura = 6 g.

Doses podem ser fracionadas. Parte das doses inicialmente associadas ao carboidrato pode ser redistribuida para gordura.

### DECISAO CONFIRMADA

Proteinas possuem grupo de maior teor de gordura e grupo de menor teor de gordura.

O limite diario do grupo de maior teor de gordura e metade das doses totais de proteina, arredondando para cima. "Sem restricao" nao significa proteina ilimitada.

### DECISAO CONFIRMADA

No Cutting Dia 1 / Dia 2, a proteina permanece praticamente igual e o carboidrato e a principal variavel. O protocolo linear anterior e a referencia: Dia 1 usa aproximadamente metade do carboidrato e Dia 2 aproximadamente a quantidade do linear. A gordura pode permanecer ou diminuir.

A etapa 2 Low / 1 High usa a Planilha Carb Cycle baseada no peso. Somente formulas confirmadas e documentadas podem ser implementadas em codigo deterministico. As Fases 5 e 6 continuam abertas.

### DECISAO CONFIRMADA

No fluxo confirmado, o Up Metabolico inclui uma refeicao livre semanal. Outras regras nao devem ser inferidas.

### QUESTAO ABERTA

Permanecem abertas, entre outros pontos: Fases 5 e 6 do Carb Cycle, etapas posteriores ao Cutting 2, Bulking detalhado, Consolidacao, hidratacao, suplementacao/manipulados, montagem e progressao definitiva de treino, alertas profissionais e criterios finais de avaliacao.

## 2026-09-22 - Primeira versao assistiva de IA

### DECISAO DE PRODUTO CONFIRMADA

A IA pode identificar respostas ausentes, contraditorias ou que precisam de esclarecimento, sugerir perguntas de acompanhamento para a Patty e auxiliar a preparacao de rascunhos completos de alimentacao e treino. A execucao continua assistiva, depende de revisao humana e so inicia quando a Patty a solicitar; nao ha execucao automatica em background por entrada de novos dados.

Sugestoes de pendencia ou de perguntas para a cliente nao criam pendencia operacional nem sao enviadas diretamente. A Patty deve revisar, pode editar e deve confirmar antes de qualquer criacao ou envio.

### DECISAO DE PRODUTO E PRIVACIDADE CONFIRMADA

As respostas da Anamnese entram automaticamente no contexto de IA, exceto a condicao financeira, que so entra quando a Patty a selecionar explicitamente. Essa decisao inclui os dados de saude, medicamentos, suplementacao, sono, autoimagem, comportamento, habitos alimentares e saude reprodutiva ja existentes no questionario; nao autoriza inferir novos campos de Anamnese.

Todas as medidas factuais registradas podem entrar automaticamente no contexto, sem autorizar diagnostico ou interpretacao diagnostica automatica. Fotos de avaliacao/evolucao, exames/documentos de saude, protocolos anteriores e historico de acompanhamento so entram quando a Patty selecionar explicitamente cada fonte ou registro.

Cidade, Telefone e Email de contato nao entram automaticamente a partir do Cadastro Atual. Endereco, escolaridade e Instagram tambem permanecem fora do contexto padrao sem necessidade especifica.

### DECISAO TECNICA E DE PRIVACIDADE CONFIRMADA

Cada execucao futura deve registrar referencias das fontes usadas, sem duplicar automaticamente todo o conteudo original para auditoria, e registrar versao da instrucao/prompt, modelo e provider. O provider escolhido deve ter configuracao e condicoes verificaveis para que dados da Patty e das clientes nao sejam usados no treinamento de modelos.

O historico de IA deve ser preservado junto ao historico da cliente, sem exclusao automatica: referencias de fontes, instrucao/prompt, modelo, provider, saida original, versoes editadas, autoria, timestamps e decisoes de aprovacao ou rejeicao quando aplicaveis. Essa decisao nao define politica legal geral de retencao.

### DECISAO TECNICA APROVADA PARA FUNDACAO

A fundacao futura usa `ai_prompt_versions`, `ai_executions`, `ai_execution_outputs`, `ai_execution_sources`, `ai_draft_versions` e `ai_hypotheses`. Sao entidades internas: a cliente nao as acessa. Prompts sao imutaveis e criados por deploy ou processo administrativo controlado, sem UI de gerenciamento na primeira versao.

`ai_executions` registra lifecycle e metadados da execucao, mas nao a saida original. `ai_execution_outputs` preserva essa saida em relacao 1:1 imutavel e pode nao existir quando a execucao esta em andamento ou falhou. Versoes de rascunho da Patty sao append-only; eventual descarte pode alterar somente metadata restrita, nunca o conteudo da versao.

As fontes de uma execucao usam FKs concretas mutuamente exclusivas, e nao uma referencia generica por tipo e UUID. A fundacao deve carregar `client_id` nas entidades internas client-scoped e validar propriedade da fonte por constraints compostas e validacoes estreitas na migration futura.

### DECISAO DE PRODUTO CONFIRMADA

A saida original da IA, cada versao editada pela Patty, a versao aprovada e a publicacao sao artefatos distintos. Nenhuma versao anterior deve ser sobrescrita silenciosamente. A rejeicao ou o descarte de uma analise/rascunho pode registrar motivo, mas esse motivo e opcional.

Antes de gerar um rascunho, a Patty escolhe a fase/protocolo do metodo. A IA nao escolhe automaticamente a fase. Regras matematicas confirmadas permanecem em codigo deterministico e testavel; a IA recebe ou utiliza seus resultados, sem derivar formulas por raciocinio generativo.

Quando faltar uma regra profissional confirmada, a IA pode apresentar sugestao provisoria marcada como HIPOTESE. A hipotese nao vira regra do metodo, nao pode ser baseada em exemplo historico individual como regra geral e exige confirmacao explicita da Patty antes de aprovacao ou publicacao. Uma aprovacao geral de protocolo nao pode ocultar hipotese pendente.

Cliente nao acessa analises da IA, hipoteses, rascunhos, versoes internas ou comentarios internos da Patty. Ve somente conteudo aprovado/publicado para ela.

`protocol_versions` continua sendo versao de protocolo e nunca rascunho de IA. A futura materializacao de um rascunho de IA deve usar entidade de ligacao propria, sem alterar agora a semantica de `protocol_versions`.

## 2026-09-22 - Modelo tecnico para falhas de execution de IA

### DECISAO TECNICA

Uma `ai_execution` representa uma tentativa operacional explicitamente iniciada, vinculada a prompt, provider e modelo ja definidos, e pode realizar no maximo uma chamada ao provider. Ela pode terminar `failed` antes dessa chamada. Nova tentativa explicita cria nova execution; retry automatico e entidade `attempts` permanecem fora da v1.

Quando prompt, provider e modelo estao definidos, mas falta configuracao operacional server-side, como credential, a execution pode ser criada e terminar `failed` com `failure_stage = preflight` e `failure_code = provider_not_configured`. Quando prompt, provider ou modelo ainda nao estao definidos, a execution nao deve ser criada e nao se usam valores ficticios para satisfazer campos obrigatorios.

### DECISAO TECNICA

O boundary transacional da execution separa persistencia curta de chamada externa. TX1 cria a execution `started` e registra suas sources, seguida de commit. A chamada ao provider ocorre sem transacao longa de banco aberta. Em TX2 de sucesso, a insercao do unico `ai_execution_output` valido e a transicao para `completed` ocorrem atomicamente. Em TX2 de resposta invalida, a insercao de `ai_execution_failure_responses`, os metadados de falha e a transicao para `failed` ocorrem atomicamente.

O deferred constraint de output valido permanece: `completed` exige exatamente um `ai_execution_output`; `started` e `failed` exigem zero outputs validos. Output valido permanece imutavel, `failed` permanece terminal e descarte continua restrito a `completed`. Uma failure response nao e output valido.

### DECISAO TECNICA

A extensao futura de `ai_executions` usa `failure_stage`, `failure_code` e `failure_message` nullable somente quando `status = failed`. Stage e code sao obrigatorios na falha e os tres campos devem permanecer nulos nos demais estados. Apos terminalizacao, eles nao podem ser reescritos.

`failure_message` e sanitizada pela aplicacao para diagnostico operacional interno, opcional e nao vazia quando presente. Nao contem resposta bruta do provider, stack trace completo, token, secret ou PII desnecessaria. Seu tamanho maximo permanece aberto.

Os pares fechados da v1 sao `preflight` -> `provider_not_configured`, `provider_request` -> `provider_request_failed`, `output_parse` -> `invalid_json`, `output_validation` -> `invalid_output_schema` e `persistence` -> `persistence_failed`. A futura migration deve protege-los com CHECK ou constraint deterministica.

### DECISAO TECNICA

Quando uma execution `failed` for persistida com `invalid_json`, `invalid_output_schema` ou `persistence_failed`, ela deve ter exatamente uma failure response imutavel. `provider_not_configured` e `provider_request_failed` nao possuem failure response. Em `persistence_failed`, isso cobre somente o caso em que o banco permanece acessivel apos a falha de persistencia de sucesso.

Se o banco ou a conexao estiver indisponivel apos o provider responder, nao e possivel garantir a persistencia da resposta, dos metadados de falha ou da transicao para `failed`; a execution previamente criada pode permanecer `started`. Esse estado nao reconciliado e uma limitacao operacional, nao uma execution `failed/persistence_failed` sem failure response.

## 2026-09-22 - Limites confirmados para fundacao futura de IA

### DECISAO CONFIRMADA

A IA auxilia Patty; nao decide nem publica diretamente. Nao gera diagnostico automatico.

### DECISAO CONFIRMADA

Exemplos e historicos individuais nao podem ser transformados em regra geral do metodo profissional.

### DECISAO CONFIRMADA

Endereco, escolaridade e Instagram nao devem ser enviados ao contexto de IA sem necessidade especifica.

## 2026-09-18 - Arquivos privados, avaliacoes e acompanhamento profissional

### DECISAO CONFIRMADA

Metadados de fotos, exames e documentos ficam em `client_files`, separados de `storage.objects`. O bucket previsto e privado e nenhum URL publico permanente ou signed URL persistida e armazenado no modelo de negocio.

### DECISAO CONFIRMADA

Avaliacoes e medidas sao historicas: reavaliacao cria novo registro, medidas pertencem a uma avaliacao e fotos podem ser relacionadas por referencia ao arquivo privado existente. Esta implementacao nao define catalogo clinico de medidas nem realiza interpretacao automatica.

### DECISAO CONFIRMADA

O acompanhamento profissional e append-only e interno. Registra dificuldade, percepcao de aderencia, observacao da Patty, decisao profissional e motivo. As decisoes implementadas sao `maintain`, `simplify`, `advance` e `return`; registrar uma decisao nao executa mudanca de fase, protocolo, dieta ou treino.

Registro cronologico de decisoes confirmadas do Projeto Patty.

## 2026-09-18 - Cadastro Atual e Anamnese versionada

### DECISAO CONFIRMADA

`client_registration` e o Cadastro Atual 1:1 de `clients`, separado de Auth e de Anamnese. Nesta implementacao, seus campos sao Cidade, Telefone, Email de contato e Instagram.

### DECISAO CONFIRMADA

Definicoes de Anamnese sao versionadas e submissions preservam a versao exata utilizada. Respostas originais submetidas nao sao sobrescritas.

### DECISAO CONFIRMADA

Notas administrativas da Patty sao armazenadas separadamente das respostas originais e nao sao acessiveis pela cliente.

## 2026-09-18 - Fundacao operacional de identidade, clientes, RBAC e RLS

### DECISAO CONFIRMADA

A fundacao BACKEND-A1 implementa `profiles`, `user_roles`, `clients` e `client_assignments` como entidades separadas no Supabase local/versionado.

### DECISAO CONFIRMADA

O acesso a cliente e client-scoped: a propria cliente acessa somente o registro vinculado ao seu `profiles.id`; admin exige papel relacional `admin` e assignment ativo. Papel administrativo nao concede acesso global a clientes.

### DECISAO CONFIRMADA

`anon` nao recebe acesso a dados privados. Usuarios autenticados nao recebem escrita por browser em roles, assignments, clientes ou perfis nesta fase. A administracao desses vinculos aguardara mecanismo controlado proprio.

### DECISAO CONFIRMADA

Remover uma identidade Auth de cliente preserva o registro profissional e limpa somente `clients.profile_id`. Encerrar assignment preserva historico e remove sua permissao ativa.

### QUESTAO ABERTA

O caminho administrativo para criar, alterar ou encerrar assignments continua pendente. O bootstrap inicial da conta admin da Patty foi definido como procedimento administrativo controlado e unico; seeds e testes locais nao definem esse procedimento de producao.

## 2026-09-15 - Separacao entre autenticacao, cadastro do cliente e snapshot de anamnese

### DECISAO CONFIRMADA

Auth / `auth.users` nao e cadastro mestre da cliente. Auth e responsavel por identidade de autenticacao, credenciais, email de login quando aplicavel e metadados estritamente necessarios a autenticacao.

### DECISAO CONFIRMADA

Cidade, Telefone, Email de contato e Instagram pertencem ao cadastro atual da cliente.

### DECISAO CONFIRMADA

Email de autenticacao e email de contato sao conceitos diferentes. Eles podem inicialmente ter o mesmo valor, mas nao devem ser tratados como uma unica fonte sem decisao propria.

### DECISAO CONFIRMADA

A anamnese nao e fonte mestre dos dados cadastrais atuais da cliente.

### DECISAO CONFIRMADA

Eventual copia de dados cadastrais preservada junto de uma submissao de anamnese e snapshot historico daquele contexto.

Alterar o cadastro atual nao altera anamneses ja submetidas, e alterar uma anamnese historica nao altera silenciosamente o cadastro atual.

### DECISAO CONFIRMADA

Nao existe sincronizacao bidirecional automatica entre cadastro atual da cliente e historico de anamnese.

## 2026-09-15 - Formulario atual como baseline de migracao, nao especificacao definitiva

### DECISAO CONFIRMADA

As capturas do formulario atual da Patty sao evidencia do processo existente e devem ser preservadas como referencia de levantamento e migracao.

### DECISAO CONFIRMADA

Campos, textos, obrigatoriedade, tipos de controle, opcoes, validacoes, ordem e agrupamento do formulario atual nao sao automaticamente aprovados como especificacao final do novo aplicativo.

### DECISAO CONFIRMADA

Um campo marcado como obrigatorio no Google Forms historico nao define `required` futuro, validacao obrigatoria ou bloqueio de submissao no novo aplicativo sem decisao propria.

### DECISAO CONFIRMADA

Restricoes tecnicas observadas no Google Forms, como quantidade de arquivos, tamanho maximo, tipos apresentados e impossibilidade de edicao/remocao apos envio, nao devem ser herdadas automaticamente pelo novo aplicativo.

### DECISAO CONFIRMADA

A decisao de uso de dados da Anamnese pela IA depende de definicao de produto e privacidade, e nao da mera existencia do campo no formulario historico. A rodada de 2026-09-22 confirmou inclusao automatica das respostas de Anamnese, exceto condicao financeira, que exige selecao explicita da Patty.

## 2026-09-14 - Modelo conceitual inicial de identidade, clientes e autorizacao

### DECISAO CONFIRMADA

`auth.users` nao sera cadastro principal do cliente.

### DECISAO CONFIRMADA

Identidade, perfil da aplicacao e cliente da consultoria sao conceitos separados.

### DECISAO CONFIRMADA

Cliente pode existir sem conta Auth ativa.

### DECISAO CONFIRMADA

Historico de cliente nao depende da existencia permanente do login.

### DECISAO CONFIRMADA

RLS e obrigatoria.

### DECISAO CONFIRMADA

Autenticacao sozinha nao concede acesso a dados.

### DECISAO CONFIRMADA

Autorizacao client-scoped devera verificar vinculo com o cliente.

### DECISAO CONFIRMADA

Roles nao serao armazenados em `user_metadata`.

### DECISAO CONFIRMADA

Dados cadastrais sao separados de dados clinicos/operacionais.

### DECISAO CONFIRMADA

Cliente nao pode administrar papeis ou assignments.

## 2026-09-14 - Inicializacao da aplicacao frontend

### DECISAO CONFIRMADA

Esta autorizada a criacao da aplicacao web Next.js dentro do repositorio do Projeto Patty.

### DECISAO CONFIRMADA

A aplicacao deve usar Next.js com App Router e TypeScript.

### DECISAO CONFIRMADA

A inicializacao deve ser minima e nao deve implementar funcionalidades de negocio, conectar ao Supabase, implementar autenticacao, criar regras clinicas, implementar IA, gerar dieta ou treino, instalar bibliotecas de UI sem necessidade, instalar bibliotecas de estado, formularios ou icones preventivamente, introduzir n8n ou LangGraph, ou utilizar dados reais de clientes.

### DECISAO CONFIRMADA

A estrutura deve permanecer simples e auditavel, permitir evolucao posterior para as areas `/admin` e `/cliente`, priorizar Server Components quando aplicavel e manter acessibilidade e responsividade como requisitos desde a fundacao.

### DECISAO CONFIRMADA

Documentos que afirmavam que nao deveria ser criada aplicacao, UI ou dependencias descreviam a fase anterior de documentacao. Essa restricao foi substituida exclusivamente quanto a inicializacao e fundacao do frontend.

## 2026-09-14 - Fundacao documental inicial

### DECISAO CONFIRMADA

O repositorio comeca pela fundacao documental, sem implementar aplicacao, banco ou Supabase nesta tarefa.

### DECISAO CONFIRMADA

O Projeto Patty sera um aplicativo para digitalizar e automatizar parte do atendimento da Consultoria Corpo e Mente da Patricia Torres.

### DECISAO CONFIRMADA

Cada cliente tera conta propria.

### DECISAO CONFIRMADA

O produto tera anamnese, medidas, fotos, exames, protocolos, avaliacoes, conteudos, exercicios e painel administrativo da Patty.

### DECISAO CONFIRMADA

A IA sera assistiva e nao publicara protocolos automaticamente.

### DECISAO CONFIRMADA

A Patty sempre revisara e aprovara protocolos antes da publicacao.

### DECISAO CONFIRMADA

O fluxo estrutural de protocolo separa versao, aprovacao humana e publicacao. Uma publication exige approval da mesma versao; a IA nao aprova nem publica. Conteudo submetido para revisao permanece historico e imutavel.

### DECISAO CONFIRMADA

Planos alimentares e catalogos de equivalentes sao versionados como estruturas de dados, sem catalogo real, calculo de doses, macros, fases ou regra metodologica. A referencia de um plano aponta uma versao especifica do catalogo.

## 2026-09-22 - Primeiro contrato operacional de IA para revisao de Anamnese

### DECISAO TECNICA/PRODUTO

O primeiro fluxo operacional de IA usa `purpose_key = anamnesis_review`, sem versao embutida. A versao pertence a `ai_prompt_versions`; provider e modelo pertencem a `ai_executions`.

### DECISAO TECNICA/PRODUTO

A revisao e iniciada somente por acao explicita de Patty/admin relacional autorizado, com assignment ativo da cliente e submission escolhida explicitamente. Nao existe execucao automatica ou em background nesta primeira versao.

### DECISAO TECNICA/PRODUTO

Cada execution `anamnesis_review` analisa uma submission selecionada. A mesma submission pode ter multiplas executions historicas por nova solicitacao explicita, versao de prompt ou modelo; nao existe unicidade submission -> execution.

### DECISAO TECNICA/PRODUTO

O contexto automatico da v1 limita-se a submission, `form_version_id`, `question_id`, `question_key`, `label` e `answer_value` original das answers selecionadas para envio da propria submission. A condicao financeira nao entra automaticamente: so pode ser incluida quando Patty a selecionar explicitamente para aquela execution. As demais answers autorizadas pelo contexto padrao permanecem automaticas. Fonte disponivel nao equivale necessariamente a fonte selecionada ou enviada. Cadastro Atual, avaliacoes, medidas, protocolos, follow-ups, fotos, exames, documentos, outros arquivos, endereco, escolaridade e Instagram ficam fora deste purpose. Essa minimizacao nao se generaliza automaticamente para outros purposes de IA.

### DECISAO TECNICA/PRODUTO

Na primeira implementacao, os findings permitidos sao somente `possible_contradiction` e `clarification_needed`. `missing_answer` continua objetivo do produto, mas fica bloqueado ate que obrigatoriedade e aplicabilidade condicional da Anamnese estejam formalizadas.

`possible_contradiction` e uma sinalizacao de possivel incompatibilidade ou ambiguidade, nunca conclusao definitiva, e exige ao menos duas respostas existentes. `clarification_needed` sinaliza resposta existente ambigua ou insuficiente para revisao humana segura e exige ao menos uma resposta existente.

Nenhum finding diagnostica, cria conclusao clinica, vira pendencia, e enviado a cliente, altera protocolo/fase ou publica conteudo automaticamente.

### DECISAO TECNICA/PRODUTO

Registrar em `ai_execution_sources` todas as `anamnesis_answers` efetivamente enviadas ao modelo, uma referencia por answer. Answers submetidas e suas definicoes versionadas sao protegidas contra alteracao/exclusao pelo schema atual; as referencias permitem reconstruir fontes utilizadas, mas nao constituem snapshot literal do payload enviado ao provider.

### DECISAO TECNICA/PRODUTO

O output valido original da IA permanece imutavel em `ai_execution_outputs`. Findings permanecem nesse output nesta versao e nao criam entidade operacional independente; tambem nao viram `ai_hypotheses` automaticamente.

Revisao e edicao humana devem ser persistidas separadamente em `ai_draft_versions`, de forma append-only. Nunca sobrescrever o output original da IA. `ai_hypotheses` fica reservado para proposicoes que realmente exigirem confirmacao explicita antes de eventual aprovacao ou publicacao futura.

### CONTRATO CONCEITUAL DE OUTPUT

O contrato conceitual da v1 e um objeto com `findings`, que pode ser vazio. Cada finding possui `type` (`possible_contradiction` ou `clarification_needed`), `source_answer_ids`, `explanation` interna com incerteza explicita e `suggested_follow_up_question` opcional e interna.

Propriedades extras devem ser rejeitadas. IDs devem pertencer a submission analisada e as sources da execution. O contrato nao inclui score, diagnostico ou conclusao clinica.

### FATO DE IMPLEMENTACAO

O primeiro validador deterministico deste contrato esta implementado em `lib/ai/anamnesis-review-output.ts` e nao depende de provider/modelo. Ele:

- aceita somente o objeto top-level `{ findings }`;
- rejeita propriedades extras no top-level e nos findings;
- aceita somente `possible_contradiction` e `clarification_needed`;
- exige UUIDs validos, distintos e presentes na allowlist de answers efetivamente autorizadas para a execution;
- exige ao menos duas sources para `possible_contradiction` e ao menos uma para `clarification_needed`;
- exige `explanation` nao vazia e, quando presente, `suggested_follow_up_question` nao vazia;
- aceita `findings: []`;
- nao cria score, diagnostico, conclusao clinica, pendencia, hipotese ou publicacao.

A validacao estrutural nao tenta inferir semanticamente se o texto da `explanation` expressa incerteza suficiente. Essa qualidade permanece responsabilidade do prompt, da revisao humana e de testes futuros baseados em contrato; nao sera implementada por heuristica lexical fragil.

## 2026-09-19 - Bibliotecas e liberacao explicita de conteudo

### DECISAO CONFIRMADA

Conteudo educacional e exercicio sao dominios separados e ambos preservam versoes publicadas. A biblioteca de exercicios nao e exposta globalmente a clientes nesta etapa.

### DECISAO CONFIRMADA

Liberacao educacional e explicita, por cliente e por versao publicada. Nao existe liberacao automatica por fase, avaliacao, protocolo, aderencia ou tempo. Progresso nao e score e a cliente nao recebe escrita enquanto a regra de negocio correspondente permanecer pendente.

### DECISAO CONFIRMADA

A arquitetura definida usa Next.js, Vercel e Supabase para PostgreSQL, Auth, Storage e RLS.

### DECISAO CONFIRMADA

A VPS Hostinger fica disponivel apenas para servicos persistentes quando realmente necessario.

### DECISAO CONFIRMADA

n8n fica disponivel para automacoes quando houver necessidade.

### DECISAO CONFIRMADA

LangGraph sera usado somente para fluxos de IA que realmente justifiquem essa complexidade.

### DECISAO CONFIRMADA

Nao introduzir FastAPI ou outros servicos neste momento.

### DECISAO CONFIRMADA

RLS e obrigatoria. Cliente so acessa os proprios dados. Patty/admin acessa clientes sob sua responsabilidade.

### DECISAO CONFIRMADA

Dados de saude sao sensiveis. Fotos, exames e documentos devem ser privados.

### DECISAO CONFIRMADA

Secrets nao devem ser armazenados no repositorio. Dados reais nao devem ser usados no desenvolvimento inicial.

### DECISAO CONFIRMADA

Autenticacao, perfil, cliente e dados clinicos/operacionais devem ser separados. `auth.users` nao sera a tabela principal de clientes.

### DECISAO CONFIRMADA

Preservar historico, nao sobrescrever versoes antigas e registrar auditoria de acoes criticas.

### DECISAO CONFIRMADA

Todo o conteudo atual do Google Drive deve ser preservado.

### DECISAO CONFIRMADA

A biblioteca educacional deve ser separada da biblioteca de exercicios.

### DECISAO CONFIRMADA

O aplicativo substituira gradualmente o Drive para os clientes.
