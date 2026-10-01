# Revisão da proposta da foundation migration de configuração

Última atualização: 2026-10-01.

## Estado

**PROPOSTA — NÃO É MIGRATION OFICIAL — NÃO APLICADA**

Arquivos:

- `METHOD_CONFIGURATION_FOUNDATION_MIGRATION_PROPOSAL.sql`;
- `METHOD_CONFIGURATION_FOUNDATION_PGTAP_PROPOSAL.sql`.

Eles permanecem em `docs/` de propósito. O Supabase CLI não está disponível no ambiente desta sessão, e a regra operacional do projeto/skill exige criar o arquivo oficial com `supabase migration new <nome>` antes de colocá-lo em `supabase/migrations`.

Portanto:

- nenhum timestamp de migration foi inventado;
- nenhuma migration antiga foi alterada;
- nenhum SQL foi aplicado no Supabase SaaS;
- nenhuma tabela real foi criada;
- nenhum runtime passou a consumir a proposta.

## Objetivo desta primeira foundation

Criar apenas a infraestrutura relacional para:

1. templates profissionais;
2. versões de templates;
3. overrides por cliente/protocolo;
4. snapshot sets;
5. snapshots resolvidos.

A primeira foundation **não**:

- cria templates de proteína/carboidrato/hidratação;
- altera Carb Cycle;
- altera Avaliações;
- muda check-ins;
- conecta UI;
- implementa evaluator TypeScript;
- cria AST completa;
- altera protocolo publicado;
- altera regra profissional.

## Decisões de modelagem

### Configuração estruturada, não JSON livre

`configuration`, `override_configuration`, inputs e resultados usam `jsonb`, mas a proposta não considera JSON como auto-validado.

A validação semântica continuará sendo feita por `config_schema_key + schema_version` conhecidos pelo runtime antes de qualquer ativação.

No banco, esta foundation valida apenas invariantes estruturais que são independentes do schema específico:

- JSON precisa ser objeto;
- versão positiva;
- lifecycle consistente;
- referências relacionais válidas;
- somente uma versão ativa por escopo;
- snapshots imutáveis.

### Sem relação polimórfica genérica

A proposta não cria:

- `scope_type + scope_id`;
- `consumer_type + consumer_id`.

Override de protocolo usa FK concreta para `protocol_versions(id, client_id)`.

Snapshots não apontam genericamente para um consumidor. Cada domínio futuro adicionará sua FK explícita para `method_configuration_snapshot_sets` quando for migrado.

### Snapshot repete `client_id` intencionalmente

`method_configuration_snapshots.client_id` duplica o client do snapshot set para permitir:

- FK composta entre item e set;
- FK composta entre item e override;
- RLS client-scoped simples e auditável;
- bloqueio estrutural de override de outra cliente.

Essa duplicação tem responsabilidade de integridade, não de conveniência.

### Snapshot vincula override ao template version correto

Quando `override_version_id` existe, a FK composta também exige que:

- client coincida;
- template coincida;
- `template_version_id` coincida com `based_on_template_version_id` do override.

Assim, um override criado sobre v1 não pode ser silenciosamente registrado como se tivesse sido aplicado sobre v2.

## Lifecycle

### Template

Identidade técnica é imutável:

- `template_key`;
- `domain_key`;
- `config_schema_key`;
- autoria/data de criação.

`display_name` e `description` podem ser ajustados administrativamente sem mudar a semântica.

### Template version

Antes da ativação:

- configuração/schema/source podem ser corrigidos pela boundary controlada.

Depois da ativação:

- conteúdo e metadata de ativação ficam imutáveis;
- somente aposentadoria é permitida;
- aposentada, a versão fica totalmente imutável.

Há índice parcial garantindo no máximo uma versão ativa por template.

### Override

Segue o mesmo lifecycle:

- draft pode ser ajustado;
- após ativação, conteúdo fica imutável;
- mudança profissional cria nova versão;
- no máximo um override ativo para cliente/template;
- no máximo um override ativo para protocolo/template.

## Acesso e RLS

### Authenticated

`authenticated` recebe apenas `SELECT`.

Não recebe INSERT/UPDATE/DELETE em nenhuma tabela da foundation.

Isso garante que uma futura tela administrativa não consiga escrever diretamente pelo browser mesmo que uma policy permissiva seja adicionada acidentalmente.

### Templates globais

Admin AAL2 pode ler sem precisar de assignment, pois o template não pertence a uma cliente.

### Overrides e snapshots

Admin AAL2 precisa de assignment ativo da cliente.

Assignment encerrado não concede acesso atual.

### Cliente

Não recebe policy de leitura para nenhuma tabela da foundation.

A cliente continuará enxergando somente o artefato publicado pelo domínio correspondente, nunca o mecanismo interno que resolveu a regra.

### Service role

A proposta revoga defaults e concede explicitamente apenas o necessário:

- templates/versions/overrides: SELECT, INSERT, UPDATE;
- snapshots: SELECT, INSERT;
- DELETE: nenhum.

Isso antecipa a mudança do Supabase que passa a exigir grants explícitos para novas tabelas da Data API e evita depender de default privileges.

A presença de grant para `service_role` não autoriza seu uso no browser. Secrets continuam exclusivamente server-side.

## MFA

Cada tabela recebe novamente a policy RESTRICTIVE `admin_mfa_aal2_required`.

Isso é necessário porque a migration histórica que instalou MFA não conhece tabelas criadas no futuro.

A policy permissiva de SELECT não consegue, sozinha, enfraquecer MFA.

## Testes propostos

O companion pgTAP cobre:

- existência das cinco tabelas;
- RLS;
- grants mínimos;
- zero acesso de cliente;
- admin AAL1 bloqueado;
- admin AAL2 global sem assignment para template;
- assignment obrigatório para override/snapshot;
- assignment encerrado sem acesso;
- zero escrita direta de authenticated;
- JSON estrutural;
- uma versão ativa por template;
- imutabilidade após ativação;
- FK client-scoped de protocolo;
- um override ativo por escopo;
- coerência de template key no snapshot;
- imutabilidade de snapshots.

## Pendências antes de transformar em migration oficial

1. Gerar nome/timestamp com Supabase CLI:
   `supabase migration new create_method_configuration_foundation`.
2. Copiar o SQL revisado para o arquivo gerado.
3. Mover/adaptar o pgTAP para `supabase/tests/database/`.
4. Rodar static gate no SQL.
5. Rodar testes pgTAP em ambiente de teste apropriado.
6. Rodar advisors de segurança e performance.
7. Fazer pre-apply transacional/dry-run conforme o fluxo vigente do projeto.
8. Somente depois considerar apply no SaaS.

## Risco principal

A maior ameaça desta foundation não é performance; é transformar configuração em uma segunda linguagem de programação ou permitir que escopo client/protocol perca integridade relacional.

A proposta evita isso mantendo:

- schema conhecido;
- FKs concretas;
- lifecycle;
- RLS;
- snapshots;
- escrita server-side controlada;
- nenhum operador de fórmula dentro do banco nesta primeira migration.

O evaluator/AST entra em tarefa separada e testável.


## Dry-run transacional no Supabase SaaS - 2026-10-01

### PASS / ROLLBACK CONFIRMADO

A proposta foi executada no projeto Supabase SaaS Projeto Corpo e Mente dentro de uma unica transacao, com DDL e validacoes estruturais seguidas de ROLLBACK.

O gate confirmou: 5 tabelas criaveis; RLS nas 5; policy RESTRICTIVE de MFA nas 5; anon sem SELECT; authenticated com SELECT onde previsto e sem INSERT direto de template; service_role com INSERT explicito e sem DELETE de snapshot set.

Uma consulta separada apos o rollback confirmou `persisted_configuration_tables = 0`.

Resultado: sintaxe/DDL PASS; compatibilidade basica com o schema SaaS atual PASS; nenhuma persistencia; migration history nao alterada; runtime nao alterado.


## Revisao adicional - cadeia completa de overrides

### CHANGES REQUIRED

A proposta SQL atual nao deve ser promovida para migration oficial ainda.

Problema encontrado: `method_configuration_snapshots` possui apenas um `override_version_id`. Isso nao preserva integralmente a resolucao quando a configuracao final resulta de mais de um override aplicavel, por exemplo:

`template -> override da cliente -> override do protocolo -> resultado`

Guardar somente o override mais especifico perde a evidencia de que o override da cliente tambem participou da configuracao resolvida.

### Correcao de desenho

Substituir o unico `override_version_id` no snapshot por uma entidade associativa imutavel, conceitualmente `method_configuration_snapshot_overrides`, com uma linha para cada override efetivamente aplicado.

Campos minimos:
- `snapshot_id`;
- `client_id`;
- `template_id`;
- `template_version_id`;
- `override_version_id`;
- `precedence`;
- `created_at`.

Invariantes:
- FK concreta para o snapshot;
- FK concreta para o override;
- client/template/template_version devem coincidir nos dois lados;
- `precedence > 0`;
- `unique(snapshot_id, precedence)`;
- `unique(snapshot_id, override_version_id)`;
- entidade append-only/imutavel;
- mesma RLS client-scoped do snapshot;
- cliente sem acesso direto;
- admin exige AAL2 + assignment ativo.

Com isso, o snapshot preserva toda a cadeia de resolucao, inclusive quando cliente e protocolo contribuem simultaneamente.

### Consequencia

O dry-run anterior continua valido apenas para a versao anterior da proposta. Depois da correcao do SQL, o dry-run deve ser repetido antes de promover qualquer migration.
