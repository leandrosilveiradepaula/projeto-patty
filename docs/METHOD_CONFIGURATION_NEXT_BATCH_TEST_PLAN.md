# Matriz de testes — próximo lote de configuração

Última atualização: 2026-10-02.

## Objetivo

Definir a evidência mínima exigida antes de materializar e consumir os próximos templates profissionais.

## Gates comuns

Para cada template:

1. baseline atual reproduzido com dados sintéticos;
2. valor alternativo válido altera o resultado sem mudança de runtime;
3. campo desconhecido é rejeitado;
4. unidade incompatível é rejeitada quando aplicável;
5. ausência de configuração obrigatória falha explicitamente;
6. template possui uma única versão ativa;
7. baseline de sistema usa proveniência `system/system_baseline`;
8. cliente não recebe acesso direto à configuração global;
9. override de cliente A nunca afeta cliente B;
10. snapshot anterior não muda após nova versão.

## Equivalência de legumes

Golden:
- 2 doses -> 1 dose de carboidrato;
- 4 -> 2;
- 1 -> 0,5.

Negativos:
- dose negativa;
- NaN/infinito;
- divisor zero;
- output ausente;
- unidade diferente de `dose`.

Não testar como regra:
- carboidrato -> gordura;
- distribuição por almoço/jantar.

## Lembrete de esclarecimento

Golden:
- created_at + 24h;
- exatamente no marco = devido;
- antes do marco = não devido.

Alternativo:
- 12h produz due date diferente sem mudança de código.

Negativos:
- valor <= 0;
- unidade diferente de `hour`;
- timestamps inválidos.

Separação obrigatória:
- due não cria registro de envio;
- due não escolhe canal.

## Carb Cycle

Golden por fase:
- steps e coeficientes reconciliados com a fonte;
- média Linear deriva apenas de `linearAverageStepKeys`.

Alternativos:
- quantidade diferente de steps;
- labels diferentes;
- coeficiente válido diferente.

Negativos:
- step duplicado;
- média referencia step inexistente;
- coeficiente negativo/não finito;
- unidade diferente de `g_per_kg`;
- array vazio.

Não testar como regra:
- Fases 4/5/6 não confirmadas;
- progressão automática;
- pareamento Cutting↔fase não documentado.

## Avaliação — catálogo de tipos

Golden:
- `fortnightly -> basic -> Básica`;
- `monthly -> complete -> Completa`.

Negativos:
- historicalCode duplicado;
- semanticKey duplicada;
- campo desconhecido.

Não interpretar os códigos como número de dias.

## Avaliação — definição Básica/Completa

Golden Básica:
- peso, cintura, abdômen, quadril.

Golden Completa:
- catálogo confirmado;
- pelo menos uma foto.

Negativos:
- alias ambíguo;
- chave duplicada;
- requisito vazio;
- minimumCount inválido;
- campo extra como `cadenceDays`.

## Taxonomia de líquidos

Golden:
- água pura;
- outro líquido zero calorias.

Alternativo:
- novo tipo elegível pode ser representado no parser sem alterar seu código, desde que uma futura versão aprovada o contenha.

Negativos:
- chave duplicada;
- classe desconhecida;
- ausência de qualquer categoria `pure_water`;
- campo de proporção não suportado.

Não testar como regra:
- percentual mínimo de água pura.

## Testes de banco antes do apply

Cada migration futura precisa de pgTAP transacional cobrindo:
- template criado;
- versão 1 ativa;
- proveniência;
- JSON exato ou campos semânticos essenciais;
- unicidade de versão ativa;
- constraints/RLS relevantes;
- nenhuma alteração em migration antiga.

## Testes após apply

- `list_migrations` contém o timestamp esperado;
- query direta confirma template e versão ativa;
- advisors de segurança e performance revisados;
- nenhum dado sintético persistente;
- documentação atualizada somente depois da confirmação remota.


## Estado de preparação — Lote A

Propostas revisáveis preparadas fora da árvore oficial de migrations:

- `docs/NEXT_TEMPLATE_BATCH_A_MIGRATION_PROPOSAL.sql`;
- `docs/NEXT_TEMPLATE_BATCH_A_PGTAP_PROPOSAL.sql`.

Esses arquivos não alteram produção e não devem ser aplicados diretamente.

Gate para materialização oficial:

1. gerar o arquivo com `supabase migration new seed_next_method_templates_batch_a`;
2. copiar o SQL revisado da proposta sem inventar timestamp manualmente;
3. mover/adaptar o pgTAP para `supabase/tests/database`;
4. executar static gate + pgTAP + dry-run;
5. somente depois merge/apply pelo workflow oficial.

O Lote A não troca consumidores operacionais. A equivalência de legumes e o intervalo de lembrete continuam sendo valores versionados, com alterações futuras por nova versão/configuração e não por hardcode.
