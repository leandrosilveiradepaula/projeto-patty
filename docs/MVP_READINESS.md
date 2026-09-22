# Mapa de prontidao do MVP

Data de referencia: 2026-09-22.

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
- avaliacoes e medidas em leitura;
- acompanhamento profissional append-only;
- fotos privadas de avaliacao para admin;
- listagem/download administrativo de arquivos privados;
- protocolos versionados em leitura;
- revisao administrativa da estrutura alimentar persistida;
- lifecycle manual de protocolo: submissao, aprovacao humana e publicacao;
- cliente ve protocolo publicado, variantes, refeicoes, doses e ciclo publicado;
- biblioteca educacional e de exercicios em leitura administrativa;
- liberacao manual de versao publicada de conteudo para cliente;
- cliente ve conteudos explicitamente liberados;
- CI de typecheck, testes determinísticos do método, lifecycle de protocolo, liberação de conteúdo e decisões de acompanhamento profissional, além do build, em pull requests e `master`;
- fundacao auditavel de IA e tratamento de falhas no banco;
- inventario inicial e manifesto machine-readable do Drive sem PII.

### Principais bloqueios atuais

- questionario final e fluxo de preenchimento/submissao da Anamnese;
- upload, substituicao e exclusao de arquivos privados;
- criacao/ativacao/encerramento de contas de clientes;
- administracao de roles e assignments;
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
| Auth / sessao | IMPLEMENTADO | login por email/senha | CI VALIDADO | decidir onboarding, convite/cadastro, MFA |
| Profiles / roles | IMPLEMENTADO | sem UI administrativa de gestao | RLS existente | definir bootstrap/admin e quem gerencia roles |
| Clients / assignments | IMPLEMENTADO | sem gestao administrativa de assignment | RLS existente | definir quem cria/altera/encerra assignments |
| Cadastro Atual | leitura IMPLEMENTADA | nao | CI VALIDADO | definir quem pode alterar cada campo e auditoria |
| Anamnese versionada | leitura IMPLEMENTADA | nota interna append-only | CI VALIDADO | fechar questionario e fluxo de preenchimento |
| Avaliacoes / medidas | leitura IMPLEMENTADA | acompanhamento profissional append-only | CI VALIDADO; conjunto de decisoes profissionais tipado e testado | definir catalogo, unidades, obrigatoriedade e correcao |
| Arquivos privados | leitura/download admin IMPLEMENTADOS | upload/delete nao | SAAS VALIDADO | Patty definir tipos, limites, upload, exclusao e visibilidade da cliente |
| Protocolos | leitura + lifecycle manual IMPLEMENTADOS | submit/approve/publish | CI + SAAS VALIDADO; lifecycle com guarda determinística testada | criar/editar plano somente quando fluxo profissional estiver formalizado |
| Plano alimentar publicado | cliente ve variantes, refeicoes, doses e ciclo | nao | CI VALIDADO | equivalentes visiveis continuam abertos |
| Conteudo educacional | leitura admin/cliente por release IMPLEMENTADA | release manual | CI VALIDADO; elegibilidade de release testada | taxonomia, autoria/revisao e primeiro lote do Drive |
| Exercicios | leitura admin IMPLEMENTADA | nao | CI VALIDADO | definir exposicao a cliente e campos finais |
| Progresso de conteudo | schema existe | fluxo nao implementado | PARCIAL | definir quem registra abertura/conclusao |
| IA | fundacao de banco IMPLEMENTADA | provider real nao integrado | SAAS VALIDADO | escolher provider/modelo, contrato de output e boundary server-side |
| Drive | INVENTARIADO | nenhuma migracao fisica | 89 itens no manifesto inicial | revisar direitos/taxonomia e escolher lote inicial |
| Regras deterministicas do metodo | IMPLEMENTADO PARCIAL | sem automacao de protocolo | CI VALIDADO | ampliar somente com formulas exatas confirmadas/documentadas |
| CI | IMPLEMENTADO | automatico no GitHub Actions | `npm ci` + typecheck + `test:method` + `test:protocol` + `test:content` + `test:follow-up` + build | adicionar testes funcionais quando houver cenarios estaveis |

## Regras deterministicas confirmadas

Ja estao em codigo testavel, sem ligacao automatica com decisao de fase ou publicacao:

- 1 dose de proteina = 15 g;
- 1 dose de carboidrato = 12 g;
- 1 dose de gordura = 6 g;
- limite diario do grupo de proteina com maior teor de gordura = metade das doses totais de proteina, arredondando para cima;
- referencia inicial geral do Reconhecimento Metabolico = 2 g/kg de proteina, 2 g/kg de carboidrato e 50 g/dia de gordura.

A referencia do Reconhecimento pode ser individualizada. Cutting aproximado, redistribuicao carboidrato/gordura, fases 5/6 e demais regras abertas nao foram codificados.

## Observacoes por fluxo

### Anamnese

A aplicacao preserva:

- definicao versionada;
- submission vinculada a versao exata;
- respostas originais;
- notas internas separadas.

Nao existe ainda fluxo final para a cliente preencher/salvar rascunho/submeter porque obrigatoriedade, campos condicionais, ordem final e demais regras continuam abertas.

### Arquivos privados

O bucket `client-private` permanece privado.

Ja existe:

- leitura administrativa sob assignment ativo;
- foto de avaliacao por rota server-side autorizada;
- download administrativo por signed URL curta, nao persistida.

Nao existe upload porque regras de produto sobre tipo, tamanho, quantidade, substituicao, exclusao, MIME e visibilidade da cliente ainda nao estao fechadas.

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

Antes da importacao e necessario resolver direitos/licenciamento, taxonomia e lote inicial.

A liberacao manual ja implementada considera elegivel somente uma versao publicada ainda nao liberada para a mesma cliente. A UI e a server action compartilham a mesma guarda deterministica, enquanto RLS e unicidade no banco continuam sendo a autoridade final.

### IA

A fundacao de banco preserva lifecycle, sources, output original, drafts, hypotheses e falhas de execution.

Ainda nao existe integracao real com provider/modelo. Isso continua bloqueado por decisoes de privacidade, contrato estruturado, provider/modelo e caminho server-side de escrita.

## Proxima rodada de decisoes da Patty

Usar `PATTY_DECISION_ROUND_1.md` como primeira conversa curta.

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
