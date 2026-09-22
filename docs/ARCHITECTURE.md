# Arquitetura

## Stack definida

### DECISAO CONFIRMADA

A arquitetura definida para o projeto e:

- Next.js para a aplicacao;
- Vercel para hospedagem da aplicacao;
- Supabase para PostgreSQL, Auth, Storage e RLS;
- VPS Hostinger disponivel apenas para servicos persistentes quando realmente necessario;
- n8n disponivel para automacoes quando houver necessidade;
- LangGraph somente para fluxos de IA que realmente justifiquem essa complexidade.

## Ambientes e acesso administrativo

### DECISAO TECNICA

No MVP, os ambientes definidos sao somente desenvolvimento e producao. Nao ha staging nesta etapa; um terceiro ambiente so sera criado mediante necessidade concreta e documentada.

### DECISAO DE SEGURANCA

MFA e obrigatorio para contas administrativas, incluindo Patty/admin.

### DECISAO DE PRODUTO E SEGURANCA

Contas de clientes sao criadas somente por convite ou ativacao controlada. Nao existe cadastro publico/autonomo de clientes no MVP.

Os detalhes operacionais de convite, expiracao, reenvio, ativacao, recuperacao e encerramento de conta permanecem abertos.

### DECISAO DE SEGURANCA E OPERACAO

A primeira conta admin da Patty sera criada por procedimento administrativo controlado e unico. Nao existe fluxo publico ou autenticado de autoelevacao para `admin`. O provisionamento vincula Auth, Profile e role relacional sem alterar a regra geral de assignment ativo para acesso client-scoped. Decisao posterior criou uma excecao especifica para arquivos privados: no MVP, a Patty pode acessa-los mesmo sem assignment ativo.

No MVP, somente a Patty pode iniciar ou encerrar assignments, sempre por boundary server-side controlado. O browser nao recebe escrita direta em `client_assignments`; encerramentos preservam o registro historico e removem apenas o acesso atual.

## Restricoes atuais

### DECISAO CONFIRMADA

Nao introduzir FastAPI ou outros servicos neste momento.

A VPS Hostinger nao sera usada na primeira versao operacional do MVP enquanto Vercel e Supabase atenderem aos requisitos confirmados. n8n tambem nao sera usado inicialmente e so deve ser introduzido quando uma automacao externa ou orquestracao concreta justificar a ferramenta. LangGraph nao sera usado inicialmente; a primeira integracao real de IA deve permanecer server-side, simples, explicita e auditavel, e LangGraph so entra se estado, multiplas etapas ou ramificacoes complexas realmente justificarem a ferramenta.

### FATO CONFIRMADO DE IMPLEMENTACAO

A aplicacao Next.js ja esta integrada ao Supabase para Auth, PostgreSQL, Storage privado e RLS.

A UI de negocio ja possui leitura real do backend para areas administrativas e da cliente, incluindo clientes atribuidos, Cadastro Atual, Anamnese versionada, avaliacoes, protocolos publicados, conteudos, exercicios e arquivos privados administrativos.

Ja existem tambem boundaries server-side de escrita para notas internas de revisao de Anamnese, acompanhamento profissional append-only, liberacao manual de conteudo e lifecycle manual de protocolos. Essas escritas reutilizam a sessao autenticada, grants, RLS e constraints existentes, sem `service_role` no browser e sem publicacao automatica.

A rota raiz usa o contexto autenticado para encaminhar admin, cliente ou login.

Esses fatos de implementacao nao significam que todos os fluxos de escrita estejam definidos. Preenchimento final da Anamnese, implementacao do upload privado em duas etapas, reconciliacao do acesso da Patty a arquivos com a RLS atual, operacoes administrativas ainda abertas, automacoes e integracao real com provider de IA continuam sujeitos as decisoes e questoes abertas correspondentes.

### DECISAO HISTORICA SUBSTITUIDA

As restricoes anteriores que limitavam o repositorio a documentacao ou apenas a fundacao visual pertencem a fases historicas do projeto e nao descrevem o estado atual da aplicacao.

## Principios arquiteturais

### RECOMENDACAO TECNICA

Usar a menor quantidade de servicos necessaria para atender aos requisitos confirmados.

Preferir recursos nativos do Supabase e da Vercel antes de introduzir servicos persistentes adicionais.

Usar a VPS Hostinger somente quando houver necessidade real de processo persistente, worker, servico de longa duracao ou componente que nao se encaixe bem na Vercel/Supabase.

Usar n8n somente quando automacoes externas ou orquestracoes justificarem a ferramenta.

Usar LangGraph somente quando o fluxo de IA exigir estado, ramos, revisoes ou orquestracao complexa que nao sejam bem atendidos por uma chamada simples.

## Seguranca arquitetural

### DECISAO CONFIRMADA

RLS sera obrigatoria.

Fotos, exames e documentos devem ser privados.

Uploads privados do MVP usam allowlist fechada: fotos em JPEG/PNG/WebP; exames e documentos em PDF/JPEG/PNG. A validacao deve conferir extensao e tipo real/detectado no servidor e rejeitar formatos fora da allowlist ou divergencias de tipo.

Limites do MVP: fotos ate 10 MB; exames/documentos ate 20 MB por arquivo.

Uploads privados devem usar paths gerados pelo sistema sem PII, nunca sobrescrever objetos existentes e nao permitir hard delete direto pelo browser. Substituicoes geram novo objeto e preservam historico.

A cliente autenticada podera enviar bytes diretamente ao Supabase Storage sob grants/policies/RLS estritos, usando area privada temporaria. O servidor valida tamanho, extensao e tipo real/detectado antes de registrar/promover o arquivo como valido; objetos rejeitados sao removidos e nao ficam visiveis como recebidos. A autorizacao de upload e materializada em `client_file_upload_sessions`, vinculada a propria cliente, com path `pending/<client_id>/<session_id>.<ext>` gerado pelo banco e expiracao de 15 minutos. O browser recebe apenas INSERT no objeto temporario exato autorizado; nao recebe UPDATE, DELETE ou escolha livre de path.

A finalizacao do objeto temporario e uma boundary server-only. Ela usa um cliente Supabase administrativo separado com `SUPABASE_SECRET_KEY`, nunca exposto ao browser, para baixar o objeto temporario, detectar o tipo por assinatura binaria, validar novamente tamanho/formato, mover para o path definitivo e persistir `client_files`. Falhas intermediarias usam compensacao para evitar deixar metadado valido apontando para objeto inexistente ou upload rejeitado tratado como recebido.

A Patty tambem podera enviar arquivos em nome da cliente, mas por fluxo administrativo server-side controlado. Esse fluxo deve registrar autoria administrativa e nunca atribuir o envio a cliente. As mesmas validacoes de formato, tamanho, path sem PII e imutabilidade se aplicam.

Na camada de visibilidade, uploads feitos pela propria cliente ficam disponiveis para ela por padrao. Uploads administrativos feitos pela Patty permanecem ocultos para a cliente ate liberacao explicita. A liberacao nao torna o objeto publico: acesso continua autenticado e por signed URL temporaria. A implementacao deve preservar autoria do upload e autoria/timestamp da liberacao.

Signed URLs sao temporarias, nao persistidas e terao validade de 5 minutos. No MVP, a Patty podera acessar arquivos privados mesmo sem assignment ativo; esta excecao e especifica para arquivos e nao altera a regra geral de autorizacao dos demais dados client-scoped.

O primeiro MVP nao usara servico dedicado de antivirus/antimalware. Essa simplificacao depende de manter allowlist fechada, validacao de tipo real, limites de tamanho, Storage privado e ausencia de execucao de arquivos. A necessidade deve ser reavaliada se o escopo ou o risco dos uploads aumentar.

Secrets nao devem ser armazenados no repositorio.

Dados reais nao devem ser usados no desenvolvimento inicial.

### RECOMENDACAO TECNICA

Toda funcionalidade que exponha dados de clientes deve ser desenhada com verificacao explicita de autorizacao, logs de auditoria e testes de isolamento de acesso.

Para exames e documentos privados, a boundary server-side que autoriza visualizacao/download administrativo e gera a signed URL deve registrar evento de auditoria sem incluir o conteudo do arquivo. O evento deve registrar identificadores internos, acao, timestamp e resultado da autorizacao.

## Infraestrutura Supabase atual

### FATO CONFIRMADO DE INFRAESTRUTURA

O projeto Supabase SaaS atual e `Projeto Corpo e Mente`, na regiao `us-west-2`.

## Integracao de aplicacao com Supabase

### DECISAO CONFIRMADA

A aplicacao Next.js usa clientes Supabase tipados, um para browser e outro para servidor, configurados com URL e publishable key. A sessao SSR usa cookies e `proxy.ts` no Next.js 16 para atualizar tokens. O codigo server-side verifica identidade com `getClaims()`; autorizacao de dados continua sob responsabilidade de grants e RLS, sem `service_role`, `user_metadata` ou papel local no browser.

### DECISAO CONFIRMADA

`/login` e a rota publica de entrada por email e senha, que permanece como metodo principal de login no MVP para clientes e administradores, sem cadastro publico. Contas administrativas exigem MFA. Links enviados por email podem ser usados para convite, ativacao e recuperacao de acesso, mas magic link nao e o metodo normal de login. As areas `/admin/*` e `/cliente/*` exigem identidade validada com `getClaims()` e o papel relacional correspondente em `user_roles`; o `proxy.ts` continua responsavel somente pelo refresh da sessao e cookies.

## Questoes abertas

