# Regras e workflows totalmente parametrizáveis

Última atualização: 2026-10-04.

## Decisão de produto e arquitetura

O Projeto Patty deve ser **totalmente parametrizável para regras de negócio, método profissional, workflows, cálculos e parâmetros operacionais**.

Nenhuma regra profissional deve depender de valor hardcoded espalhado pelo código da aplicação.

Os valores hoje existentes nas planilhas Excel passam a ser **templates iniciais versionados**. A Patty pode alterá-los no futuro sem alteração de código e pode também sobrescrevê-los para uma cliente específica.

### Direcao de produto confirmada em 2026-10-04

Embora o sistema seja usado inicialmente pela Patty e pelo metodo profissional dela, a arquitetura deve permitir evolucao futura para um produto comercializavel.

Consequencias:
- nenhuma regra profissional deve depender da identidade da Patty como singleton global;
- configuracoes profissionais devem ter dono/escopo explicito e nao pressupor uma unica profissional para sempre;
- valores, formulas, limites, sequencias, frequencias, horarios, canais, templates e workflows devem ser dados configuraveis/versionados quando pertencem ao metodo ou a operacao profissional;
- defaults atuais representam o metodo da Patty hoje, nao verdades universais do produto;
- uma futura comercializacao deve poder criar outros conjuntos de configuracao sem alterar o motor deterministico;
- a modelagem exata de organizacao/tenant nao e inferida por esta decisao e deve ser definida separadamente antes de implementacao multi-tenant.

O objetivo e parametrizar o **comportamento profissional e operacional**, nao tornar configuraveis invariantes de seguranca, integridade, auditoria ou separacao de responsabilidades.

## Regra central

A hierarquia conceitual é:

`template global/versionado -> configuração da cliente -> snapshot do protocolo/treino publicado`

Consequências:

- o template fornece os valores iniciais;
- a Patty pode editar qualquer parâmetro aplicável para cada cliente;
- alterar um template global não reescreve silenciosamente clientes/protocolos existentes;
- o protocolo/treino publicado preserva exatamente os parâmetros usados naquele momento;
- um override individual não vira regra geral automaticamente;
- histórico individual continua sendo histórico individual.

## Tudo que vier dos Excels como regra ou cálculo deve ser parametrizado

Isso inclui, sem limitar:

### Alimentação e macros

- g/kg;
- g a cada N kg;
- doses;
- equivalências;
- quantidades de alimento;
- conversões entre grupos;
- proporções;
- limites;
- mínimos e máximos;
- arredondamentos;
- distribuição por refeição;
- número de refeições;
- limites de grupos alimentares;
- Low/High;
- Linear;
- Dia 1/Dia 2;
- fases de Cutting;
- parâmetros de Bulking quando existirem;
- Reconhecimento Metabólico;
- meta de líquidos;
- refeição livre;
- demais valores e fórmulas das planilhas.

Exemplo:

Template inicial:

`1 g de proteína a cada 5 kg`

Para 60 kg:

`60 / 5 * 1 = 12 g`

A Patty pode editar o parâmetro para:

`1,5 g a cada 5 kg`

sem mudança de código.

### Treino

Também devem ser parametrizáveis:

- número de séries;
- repetições;
- descanso;
- carga/referência de carga quando aplicável;
- ordem dos exercícios;
- quantidade de exercícios;
- frequência;
- duração;
- técnica;
- observações;
- progressões quando futuramente formalizadas;
- parâmetros por exercício;
- parâmetros por bloco/sessão;
- parâmetros por cliente.

Exemplo:

Template:

`3 séries x 12 repetições`

Para uma cliente específica, a Patty pode alterar para:

`4 séries x 12 repetições`

sem alterar o template das demais clientes.

### Workflows

Também são configuração:

- sequência de fases;
- etapas habilitadas;
- etapas opcionais;
- retorno para fase anterior;
- repetição de fase;
- gates manuais;
- transições condicionais quando formalizadas;
- prazos;
- lembretes;
- frequência;
- critérios configurados;
- ativação/desativação de etapas.

Enquanto o critério profissional de uma transição não estiver formalizado, a transição permanece manual, mas ainda pertence ao workflow configurável.

## Templates iniciais

Os valores atuais das planilhas gerais e das regras confirmadas formam a primeira versão dos templates.

Importante:

- uma planilha geral pode originar um template;
- uma fórmula geral confirmada pode originar um template;
- um treino-base pode originar um template de treino;
- valores de uma planilha individual de cliente são importados para aquela cliente como histórico/configuração individual;
- um valor individual não se torna default global apenas porque aparece em um caso histórico.

## Escopos de configuração

O sistema deve suportar, quando aplicável:

1. template global;
2. template por família de protocolo;
3. template por fase;
4. template por subfase/dia;
5. template por treino/sessão;
6. configuração específica da cliente;
7. override específico de protocolo/treino;
8. snapshot final publicado.

A configuração mais específica prevalece, mas deve preservar a origem do valor.

## Versionamento

Toda alteração de template deve gerar nova versão.

Exemplo:

- Reconhecimento v1: proteína 2,0 g/kg;
- Reconhecimento v2: proteína 1,8 g/kg.

A v2 não altera retroativamente protocolos gerados com a v1.

Cada versão deve preservar:

- autoria;
- data;
- estado;
- parâmetros;
- fórmula estruturada;
- unidades;
- notas;
- origem/importação quando aplicável.

## Configuração por cliente

A Patty precisa poder abrir uma cliente e editar os parâmetros derivados do template antes de aprovar/publicar.

O override individual deve preservar:

- template e versão de origem;
- valor original;
- valor alterado;
- unidade;
- autoria;
- timestamp;
- motivo opcional.

Esse override vale somente para o contexto definido e não altera o template global.

## Snapshot obrigatório

Ao gerar um protocolo ou treino, preservar:

- versão do template;
- inputs usados;
- parâmetros resolvidos;
- overrides da cliente;
- resultados calculados;
- fórmula/operadores usados;
- autoria;
- timestamps.

Depois de publicado, mudanças futuras de template não alteram esse snapshot.

## Motor determinístico

O código implementa o motor genérico, não os valores profissionais.

O motor deve conhecer:

- tipos de valor;
- unidades;
- operadores permitidos;
- validações;
- precedência;
- arredondamento;
- resolução de escopo;
- versionamento;
- auditoria;
- tratamento de erro.

Os parâmetros profissionais ficam em dados/configuração.

## Fórmulas seguras

Não permitir execução de JavaScript, SQL, Python ou texto arbitrário configurado pela Patty.

Usar uma linguagem declarativa/AST com operadores suportados.

Operadores esperados:

- constante;
- soma;
- subtração;
- multiplicação;
- divisão;
- proporção por kg;
- proporção por N kg;
- percentual;
- mínimo;
- máximo;
- clamp;
- arredondamento;
- lookup por faixa;
- lookup por chave/fase;
- referência a outro parâmetro;
- composição de operadores.

## Área administrativa

Criar área de **Método e Configurações**.

Ela deve permitir:

- visualizar templates;
- consultar versão ativa;
- criar nova versão;
- editar parâmetros;
- editar workflows;
- validar antes de ativar;
- simular cálculo com peso/inputs de exemplo;
- comparar versões;
- ativar;
- aposentar;
- consultar histórico;
- duplicar template;
- aplicar template a uma cliente;
- editar parâmetros da cliente.

## Segurança e integridade não são parâmetros profissionais

Continuam fora da configuração livre da Patty:

- RLS;
- autenticação;
- MFA;
- segregação Auth/Profile/Client;
- secrets;
- autorização;
- proteção de arquivos;
- constraints de integridade;
- imutabilidade/auditoria;
- política que impede IA de publicar diretamente;
- preservação de histórico.

Esses pontos são invariantes técnicas e não sliders/campos do método.

## Migração dos Excels

A migração deve classificar cada valor como:

- template/regra geral;
- catálogo;
- dado histórico da cliente;
- configuração individual;
- conteúdo;
- item ainda ambíguo.

Nunca promover automaticamente um dado histórico individual a template global.

Os Excels deixam de ser runtime depois da migração.

## Regra para código já existente

Qualquer fator profissional atualmente implementado como constante deve ser inventariado.

Exemplos já conhecidos que precisarão migrar para configuração:

- 60 mL/kg de líquidos;
- equivalências de doses;
- 2 doses de legumes = 1 dose de carboidrato;
- limite do grupo de proteína de maior teor de gordura;
- coeficientes do Carb Cycle;
- parâmetros Linear/Low/High;
- qualquer outro número, limite ou sequência profissional atualmente codificado.

O código pode continuar contendo temporariamente os valores atuais durante a migração, mas o estado final não deve depender deles hardcoded.


## Inventário técnico de hardcodes

O inventário auditado do runtime atual está em `PROFESSIONAL_RULE_HARDCODE_INVENTORY.md`. Ele deve ser consultado antes de criar migrations ou substituir constantes profissionais, e deve ser atualizado conforme novos acoplamentos forem encontrados durante a migração.


## Contrato tecnico de implementacao

O contrato minimo de entidades, precedencia, snapshots, AST segura, unidades, RLS e estrategia de migracao esta em `METHOD_CONFIGURATION_CONTRACT.md`.

Essa decisao evita dois extremos:

- manter regra profissional hardcoded;
- substituir hardcode por JSON livre ou codigo arbitrario.

A implementacao deve usar schema conhecido, operadores permitidos, versoes imutaveis apos ativacao e snapshots dos valores resolvidos.
