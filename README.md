# Projeto Patty

Aplicativo da Consultoria Corpo e Mente, da Patricia Torres, para digitalizar e apoiar parte do acompanhamento profissional sem substituir o julgamento humano.

## Fonte de verdade

A documentacao em `docs/` e o arquivo `AGENTS.md` sao a fonte de verdade do projeto.

Decisoes mais recentes registradas na documentacao prevalecem sobre conversas antigas. Regras do metodo da Patty so podem ser automatizadas quando estiverem confirmadas e documentadas.

## Stack atual

- Next.js com App Router e TypeScript;
- Vercel para hospedagem da aplicacao;
- Supabase SaaS para PostgreSQL, Auth, Storage privado e RLS;
- n8n, LangGraph e VPS somente quando houver necessidade concreta.

## Estado atual

A fundacao backend ja existe para:

- autenticacao e perfis;
- clientes e assignments;
- RLS client-scoped;
- Cadastro Atual;
- Anamnese versionada;
- avaliacoes e medidas;
- protocolos versionados, aprovacoes e publicacoes;
- planos alimentares e equivalentes;
- biblioteca educacional;
- biblioteca de exercicios;
- arquivos privados;
- fundacao auditavel de IA e tratamento de falhas de execution.

A aplicacao ja possui leitura real do backend em areas administrativas e da cliente. Entre os fluxos atualmente conectados estao clientes atribuidos, Cadastro Atual, Anamnese, avaliacoes, protocolos, conteudos, exercicios e leitura administrativa de arquivos privados.

Regras matematicas confirmadas do metodo ja com implementacao deterministica e testes incluem:
- conversoes de doses de proteina, carboidrato e gordura;
- limite do grupo de proteina com maior teor de gordura;
- referencia inicial geral de macros do Reconhecimento Metabolico.

Esses calculos nao escolhem fase, nao montam protocolo automaticamente e podem ser individualizados onde a regra documentada permitir.

Fluxos de escrita humana ja conectados e protegidos pelas RLS existentes incluem:
- notas append-only de revisao da Anamnese;
- acompanhamento profissional append-only de avaliacao;
- liberacao manual de versao publicada de conteudo para cliente;
- lifecycle manual de protocolo: submissao para revisao, aprovacao humana e publicacao explicita.
- guarda deterministica e testada para a proxima acao permitida do lifecycle de protocolo;
- elegibilidade deterministica e testada para liberacao manual de versao de conteudo;
- conjunto tipado e testado das decisoes profissionais de acompanhamento, sem automacao de mudanca de fase.

## Seguranca

- Auth User, Profile e Client sao entidades diferentes;
- email de login nao e chave de relacionamento;
- RLS e obrigatoria;
- cliente acessa somente dados permitidos da propria conta;
- Patty/admin acessa dados client-scoped somente com assignment ativo;
- arquivos privados permanecem em Storage privado;
- `service_role` e secrets nunca devem ir para o browser;
- dados reais nao devem ser usados em desenvolvimento ou testes;
- historico profissional deve ser preservado.

## IA

A IA auxilia a Patty e nunca publica diretamente.

O fluxo alvo e:

```text
dados
-> validacao
-> analise
-> pendencias/alertas
-> rascunho
-> revisao da Patty
-> ajustes
-> aprovacao
-> publicacao
-> cliente
```

Dado original, interpretacao da IA, rascunho, alteracoes humanas, versao aprovada e publicacao devem permanecer separaveis e auditaveis.

## Pendencias relevantes

Continuam dependentes de decisao ou validacao, entre outros pontos:

- questionario final e fluxo de preenchimento da Anamnese;
- upload, substituicao e exclusao de arquivos privados;
- regras definitivas de MIME types e controles adicionais de arquivos;
- operacoes administrativas de escrita ainda nao formalizadas;
- criterios profissionais ainda abertos;
- fases 5 e 6 do Carb Cycle;
- etapas posteriores ao Cutting 2;
- Bulking e Consolidacao detalhados;
- hidratacao, suplementacao e manipulados;
- progressao definitiva de treino;
- integracao real com provider/modelo de IA;
- migracao gradual do conteudo atual do Google Drive.

Consulte `docs/OPEN_QUESTIONS.md` para a lista vigente.

## Validacao automatica

O repositorio executa em GitHub Actions:

```text
npm ci
npm run typecheck
npm run test:method
npm run test:protocol
npm run test:content
npm run test:follow-up
npm run build
```

O workflow roda em pull requests, pushes para `master` e execucao manual.

## Documentos principais

- `docs/PRODUCT.md`
- `docs/MVP.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/RBAC_RLS.md`
- `docs/BUSINESS_RULES.md`
- `docs/CONTENT_LIBRARY.md`
- `docs/OPEN_QUESTIONS.md`
- `docs/DECISIONS.md`
- `docs/PATTY_DECISION_ROUND_1.md`
- `docs/MVP_READINESS.md`
- `AGENTS.md`
