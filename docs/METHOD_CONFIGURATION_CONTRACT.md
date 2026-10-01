# Contrato técnico da configuração profissional

Última atualização: 2026-10-01.

## Status

### DECISÃO TÉCNICA DOCUMENTADA — NÃO IMPLEMENTADA

Este documento define o contrato mínimo para substituir hardcodes profissionais por configuração versionada sem transformar o Projeto Patty em um interpretador de código arbitrário.

Ainda não existe migration, tabela nova ou runtime novo decorrente deste documento.

A implementação deve começar pequena, reproduzir o comportamento atual e manter compatibilidade com dados/snapshots históricos.

## Requisitos de produto já confirmados

A fundação deve suportar:

- templates profissionais versionados;
- alteração futura dos valores atuais sem deploy de código;
- override por cliente;
- override por protocolo/treino quando aplicável;
- preservação da origem do valor;
- snapshot do que foi efetivamente usado;
- histórico não retroativo;
- fórmulas profissionais estruturadas em dados;
- motor determinístico genérico em código;
- revisão humana antes de publicação para a cliente quando o domínio exigir;
- nenhuma promoção automática de exemplo histórico individual para regra global.

A hierarquia conceitual continua:

`template versionado -> override aplicável -> configuração resolvida -> snapshot do artefato`

## Princípio arquitetural

A configuração profissional não é código.

O banco armazena dados declarativos validados. O runtime conhece um conjunto fechado de schemas e operadores.

Consequências:

- sem JavaScript configurável;
- sem SQL configurável;
- sem Python configurável;
- sem expression string avaliada com `eval`;
- sem template textual capaz de chamar funções arbitrárias;
- sem `scope_type + scope_id` genérico para apontar recursos do domínio sem FK;
- sem JSON livre usado diretamente por regra de negócio sem validação por schema conhecido.

## Camadas

### 1. Identidade lógica da configuração

Entidade conceitual: `method_configuration_templates`.

Responsabilidade:

- representar uma regra/configuração profissional estável;
- agrupar suas versões;
- informar domínio e schema de validação.

Campos conceituais mínimos:

- `id uuid`;
- `template_key text unique`;
- `domain_key text`;
- `config_schema_key text`;
- `display_name text`;
- `description text nullable`;
- `created_by_profile_id uuid`;
- `created_at timestamptz`.

Exemplos de `template_key`:

- `nutrition.dose.protein`;
- `nutrition.dose.carbohydrate`;
- `nutrition.dose.fat`;
- `nutrition.recognition.macros`;
- `nutrition.higher_fat_protein_limit`;
- `hydration.daily_target`;
- `nutrition.carb_cycle.phase_1`;
- `assessment.basic`;
- `assessment.complete`;
- `workflow.anamnesis_clarification_reminder`.

`template_key` identifica semântica; não contém PII e não referencia cliente.

### 2. Versões do template

Entidade conceitual: `method_configuration_versions`.

Responsabilidade:

- armazenar uma versão completa e validada de um template;
- preservar autoria e origem;
- permitir comparação entre versões.

Campos conceituais mínimos:

- `id uuid`;
- `template_id uuid`;
- `version_number integer`;
- `schema_version integer`;
- `configuration jsonb`;
- `source_kind text`;
- `source_reference text nullable`;
- `created_by_profile_id uuid`;
- `created_at timestamptz`;
- `activated_at timestamptz nullable`;
- `activated_by_profile_id uuid nullable`;
- `retired_at timestamptz nullable`;
- `retired_by_profile_id uuid nullable`.

Invariantes:

- `unique(template_id, version_number)`;
- conteúdo de `configuration` não muda depois da ativação;
- ativar/aposentar só altera metadata de lifecycle controlada;
- no máximo uma versão ativa por template;
- nova mudança profissional cria nova versão;
- reverter significa criar/ativar nova versão baseada em uma configuração anterior, sem reescrever histórico;
- `source_kind` diferencia, por exemplo, configuração criada pela Patty, migração de Excel ou baseline do código existente.

### 3. Overrides por cliente

Entidade conceitual: `client_method_configuration_override_versions`.

Responsabilidade:

- registrar ajuste explícito feito pela Patty para uma cliente;
- manter o template/versão de origem;
- não alterar o template global.

Campos conceituais mínimos:

- `id uuid`;
- `client_id uuid`;
- `template_id uuid`;
- `based_on_template_version_id uuid`;
- `version_number integer`;
- `override_configuration jsonb`;
- `protocol_version_id uuid nullable`;
- `created_by_profile_id uuid`;
- `created_at timestamptz`;
- `activated_at timestamptz nullable`;
- `activated_by_profile_id uuid nullable`;
- `retired_at timestamptz nullable`;
- `reason text nullable`.

Escopos inicialmente suportados:

1. cliente: `protocol_version_id IS NULL`;
2. protocolo específico: `protocol_version_id IS NOT NULL`.

Treino não deve usar FK genérica antecipada. Quando existir entidade versionada real de prescrição de treino, adicionar FK explícita em migration própria ou entidade específica equivalente.

Invariantes:

- override referencia template e versão concretos;
- override é validado pelo mesmo `config_schema_key`;
- override não pode introduzir chave/operação que o schema do template proíba;
- após ativação, conteúdo é imutável;
- alterar override cria nova versão;
- override de protocolo não vale para outro protocolo;
- override individual nunca promove valor para template global.

### 4. Configuração resolvida

A resolução acontece server-side, antes de cálculo/publicação.

Entrada mínima do resolver:

- `template_key`;
- contexto da cliente;
- contexto de protocolo quando aplicável;
- inputs profissionais necessários, por exemplo peso;
- instante de resolução.

Precedência inicial:

1. versão ativa do template;
2. override ativo da cliente baseado naquela linha semântica;
3. override ativo do protocolo, quando houver.

O mais específico prevalece apenas nas chaves permitidas pelo schema.

A resolução deve retornar objeto explícito:

- `template_id`;
- `template_version_id`;
- `client_override_version_id nullable`;
- `protocol_override_version_id nullable`, caso a implementação futura separe os escopos;
- `resolved_configuration`;
- `inputs`;
- `results`;
- `engine_contract_version`;
- warnings/erros determinísticos.

Não existe fallback silencioso para constante hardcoded quando uma configuração obrigatória não puder ser resolvida. Durante a migração, qualquer fallback temporário precisa ser explícito, testado e inventariado.

## Snapshot

### Snapshot set

Entidade conceitual: `method_configuration_snapshot_sets`.

Responsabilidade:

- agrupar todas as configurações usadas para materializar um artefato;
- ser referenciada pelo domínio consumidor por FK explícita.

Campos mínimos:

- `id uuid`;
- `client_id uuid`;
- `created_by_profile_id uuid`;
- `created_at timestamptz`;
- `engine_contract_version integer`.

### Snapshot item

Entidade conceitual: `method_configuration_snapshots`.

Campos mínimos:

- `id uuid`;
- `snapshot_set_id uuid`;
- `template_id uuid`;
- `template_version_id uuid`;
- `override_version_id uuid nullable`;
- `template_key text`;
- `input_values jsonb`;
- `resolved_configuration jsonb`;
- `result_values jsonb`;
- `created_at timestamptz`.

Invariantes:

- snapshot é append-only/imutável;
- snapshot guarda valores resolvidos, não apenas IDs;
- excluir/aposentar template não invalida snapshot antigo;
- alterar template não recalcula snapshot antigo;
- snapshot não depende do Excel em runtime.

### Vínculo com domínios

Evitar uma coluna genérica `consumer_type + consumer_id`.

Cada domínio que precisar de snapshot deve ganhar FK explícita para `method_configuration_snapshot_sets`.

Exemplos futuros:

- `protocol_versions.method_configuration_snapshot_set_id`;
- `client_hydration_targets.method_configuration_snapshot_set_id`;
- uma definição/versionamento de Avaliação pode registrar o snapshot aplicável;
- workflow de lembrete pode guardar a versão/configuração resolvida no momento em que a instância é criada.

A FK só deve ser adicionada quando o domínio correspondente entrar na migração.

## Contrato de `configuration jsonb`

`configuration` é JSON estruturado, mas nunca livre.

Toda versão declara `config_schema_key` pela identidade do template e `schema_version`.

O runtime possui validadores conhecidos para cada schema.

Exemplo conceitual de uma configuração simples:

```json
{
  "parameters": {
    "protein_per_kg": { "value": 2, "unit": "g_per_kg" },
    "carbohydrate_per_kg": { "value": 2, "unit": "g_per_kg" },
    "fat_daily": { "value": 50, "unit": "g" }
  },
  "outputs": {
    "protein_grams": {
      "op": "multiply",
      "args": [
        { "op": "input", "key": "weight_kg" },
        { "op": "parameter", "key": "protein_per_kg" }
      ]
    }
  }
}
```

O exemplo é ilustrativo do formato técnico, não cria nova regra profissional.

## AST segura de fórmulas

### Operadores do contrato inicial

O motor v1 deve começar somente com o necessário para retirar os primeiros hardcodes:

- `literal`;
- `input`;
- `parameter`;
- `add`;
- `subtract`;
- `multiply`;
- `divide`;
- `min`;
- `max`;
- `ceil`;
- `floor`;
- `round`.

Operadores adicionais entram apenas com caso de uso documentado e teste.

`lookup`, composição de ciclos e agregação dinâmica podem ser introduzidos na etapa do Carb Cycle, em vez de aumentar o motor antes da necessidade.

### Validações obrigatórias

Antes de ativação e novamente antes de execução:

- operador pertence à allowlist;
- shape do node corresponde ao schema;
- profundidade máxima definida;
- quantidade máxima de nodes definida;
- referências a inputs/parâmetros existem;
- nenhum ciclo de referência;
- unidades são compatíveis;
- divisão por zero falha fechada;
- NaN/infinito não são resultados válidos;
- arredondamento precisa ser explícito quando a regra exigir;
- resultado deve respeitar constraints do schema de saída.

## Unidades

O engine não deve tratar `2`, `2 g`, `2 g/kg` e `2 mL/kg` como valores equivalentes.

O contrato de cada parâmetro inclui unidade semântica conhecida.

Unidades iniciais esperadas, sem limitar expansão futura:

- `g`;
- `kg`;
- `ml`;
- `g_per_kg`;
- `ml_per_kg`;
- `dose`;
- `hour`;
- `count`;
- `ratio`.

Conversões entre unidades não acontecem implicitamente.

## Workflow configurável

Workflow profissional usa configuração declarativa separada de segurança/lifecycle técnico.

Pode parametrizar quando confirmado:

- ordem de etapas profissionais;
- etapas habilitadas;
- repetição/retorno;
- intervalos de lembrete;
- gates humanos;
- transições profissionais formalizadas.

Não pode desabilitar:

- Auth;
- RLS;
- MFA;
- autorização;
- imutabilidade histórica;
- revisão/aprovação/publicação humana obrigatória;
- proibição de publicação direta pela IA.

Uma transição profissional sem critério confirmado permanece manual.

## Compatibilidade com o runtime atual

A migração deve ser incremental.

### Hidratação

A migration aplicada que calcula `round(weight_kg * 60)` permanece intacta.

Uma migration nova deverá permitir snapshots novos baseados em configuração sem invalidar linhas antigas.

Linhas históricas com `method_key = 'patty_60_ml_per_kg'` continuam legíveis.

Não editar a generated column antiga em migration já aplicada.

### Avaliações

Os códigos históricos `fortnightly` e `monthly` permanecem válidos para linhas existentes.

A nova configuração poderá associar esses códigos às definições Básica/Completa enquanto houver compatibilidade.

Remover o CHECK fixo exige migration nova e somente quando a leitura/escrita já estiver preparada para a nova fonte de verdade.

### Carb Cycle

O contrato atual `Low1/Low2/High` deve ser mantido por adapter durante a migração.

O novo modelo não deve assumir permanentemente três steps.

### Doses e Reconhecimento

São bons primeiros candidatos porque hoje vivem apenas no runtime TypeScript/testes, sem coluna gerada histórica no banco.

## RLS e autorização

### Templates globais

- `anon`: zero acesso;
- cliente: zero acesso direto;
- admin/Patty: leitura administrativa com role relacional `admin` + AAL2;
- escrita: somente boundary server-side controlada, após validação de schema e autorização;
- não exige `client_assignment`, pois template global não pertence a uma cliente.

### Overrides

- `anon`: zero acesso;
- cliente: zero acesso direto;
- admin/Patty: leitura client-scoped somente com assignment ativo + AAL2;
- escrita: boundary server-side controlada com a mesma verificação;
- nenhuma escrita direta genérica pelo browser.

### Snapshots

- client-scoped;
- admin lê somente com autorização válida para a cliente e AAL2;
- cliente não recebe leitura genérica da tabela de snapshots;
- o cliente vê apenas o artefato publicado que o domínio já autoriza;
- snapshots são insert-only/imutáveis depois de criados.

## Auditoria

A ativação/retirada de template e override é ação profissional crítica.

Preservar no mínimo:

- ator;
- timestamp;
- versão anterior;
- versão nova;
- contexto;
- motivo opcional;
- resultado da validação.

A auditoria não deve copiar PII ou payload clínico desnecessário para logs.

## API interna do motor

Contrato conceitual:

```text
resolveConfiguration(context, templateKey)
  -> resolved configuration

evaluateConfiguration(resolvedConfiguration, inputs)
  -> deterministic results

createSnapshotSet(context, resolutions)
  -> immutable snapshot set
```

O engine não escolhe qual fase profissional uma cliente deve seguir.

A escolha da fase continua dependente das regras confirmadas e dos gates humanos documentados.

## Estratégia de testes

Cada template inicial migrado deve ter golden tests comparando:

`resultado do hardcode atual == resultado da configuração v1`

para um conjunto sintético de entradas.

Testes adicionais obrigatórios:

- versão ativa correta;
- override de cliente prevalece;
- override de protocolo prevalece sobre cliente;
- cliente A não afeta cliente B;
- mudança de template não altera snapshot anterior;
- config inválida não ativa;
- operador não permitido é rejeitado;
- unidade incompatível é rejeitada;
- divisão por zero falha fechada;
- ausência de config obrigatória falha explicitamente;
- RLS/authorization não regride.

Somente dados sintéticos nos testes.

## Sequência de implementação proposta

### Etapa 1 — fundação sem consumo

- migration nova com templates/versões/overrides/snapshots;
- RLS/grants/boundaries;
- validador e evaluator mínimos;
- nenhum fluxo existente passa a depender disso ainda.

### Etapa 2 — doses e Reconhecimento

- seed das versões iniciais com os valores atuais;
- adapter de compatibilidade;
- golden tests;
- remover constantes somente após equivalência comprovada.

### Etapa 3 — limite de proteína e hidratação

- migrar fórmula de limite;
- criar caminho novo de hidratação com snapshot;
- preservar linhas históricas antigas.

### Etapa 4 — Carb Cycle

- introduzir representação de steps;
- migrar coeficientes;
- manter adapter Low1/Low2/High enquanto UI antiga depender dele.

### Etapa 5 — Avaliações e lembretes

- definições versionadas Básica/Completa;
- compatibilidade de códigos históricos;
- intervalo de lembrete como configuração de workflow.

### Etapa 6 — catálogo alimentar e treino

- promover somente itens aprovados;
- treino nasce já sobre configuração versionada.

## Fora de escopo desta decisão

Ainda não estão definidos por este contrato:

- UI final de edição dos templates;
- regras profissionais ainda abertas;
- critérios de estagnação;
- fases 5/6 do Carb Cycle;
- Bulking;
- Consolidação;
- regras completas de suplementação/manipulados;
- progressão definitiva de treino;
- proporção exata de água pura;
- regra de calendário para Avaliação em dias 29/30/31.

Esses itens continuam pendentes até confirmação/documentação própria.


### Cadeia completa de overrides no snapshot

A revisao da proposta de migration em 2026-10-01 identificou que um unico `override_version_id` no snapshot nao e suficiente quando a configuracao resolvida combina mais de um override aplicavel.

A decisao tecnica passa a ser: cada `method_configuration_snapshot` deve preservar uma colecao ordenada de overrides efetivamente aplicados, por uma entidade associativa imutavel (conceitualmente `method_configuration_snapshot_overrides`).

Ela deve registrar pelo menos `snapshot_id`, `client_id`, `template_id`, `template_version_id`, `override_version_id`, `precedence` e `created_at`, com FKs concretas e RLS client-scoped.

Isso preserva, por exemplo, a cadeia `template -> override da cliente -> override do protocolo`, sem perder nenhuma origem na auditoria.
