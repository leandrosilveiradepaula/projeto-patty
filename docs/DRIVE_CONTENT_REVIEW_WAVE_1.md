# Primeira onda de revisao controlada do Google Drive

Data: 2026-09-23.

## Objetivo

Testar o processo de revisao antes de qualquer migracao fisica do Drive.

Esta onda usa somente tres arquivos selecionados. Nenhum deles foi migrado, publicado, renomeado, movido, compartilhado ou excluido no Drive.

## Criterios

Os itens foram separados em tres estados diferentes:

- **candidato apos revisao humana**: parece adequado ao objetivo da biblioteca, mas ainda exige autoria/direitos e revisao completa;
- **exemplo historico**: pode ter valor documental, mas nao pode ser promovido a regra atual;
- **hold profissional**: envolve tema ainda aberto ou afirmacoes sensiveis e nao deve avancar para migracao/publicacao antes de decisao da Patty.

## 1. Como utilizar a BALANCA DE ALIMENTOS

Arquivo: `MovaviClips_Video_20220217-143151.mp4`  
Drive file ID: `1z61DpJfwp-6DMhYMpCRNafkSwX6h9LBE`

### FATO OBSERVADO

Uma amostragem visual controlada de tres frames, sem transcricao de audio, mostra uma apresentadora demonstrando uma balanca de alimentos junto de recipientes e embalagens de alimentos.

Isso e coerente com o titulo historico da pasta, mas nao comprova autoria, direitos ou a exatidao/atualidade da orientacao falada.

### CLASSIFICACAO

**Candidato apos revisao humana.**

Antes de migrar:
- confirmar autoria/ownership;
- revisar o audio/mensagem completa;
- confirmar que a orientacao continua atual;
- aprovar titulo e categoria finais;
- registrar decisao explicita de migracao.

Nao identificar automaticamente a pessoa do video nem inferir que seja a Patty apenas pela aparencia.

## 2. Sugestao de refeicoes

Arquivo: `Sugestao de refeições.xlsx`  
Drive file ID: `1RLHtDaLd_Wl9UEovYfO5h4U1yDz_k-Ba`

### FATO OBSERVADO

A planilha contem um exemplo alimentar com seis refeicoes, contagens de doses e combinacoes especificas de alimentos/quantidades.

### LIMITE DE INTERPRETACAO

O projeto ja possui regra confirmada de que **nao existe numero fixo de refeicoes**. Portanto, as seis refeicoes desta planilha sao um **exemplo historico individual/operacional**, nao uma regra geral do metodo.

### CLASSIFICACAO

**Referencia historica; nao autorizada para publicacao como protocolo.**

Antes de qualquer reaproveitamento:
- confirmar se o exemplo ainda tem utilidade educacional;
- confirmar autoria/direitos;
- decidir se deve permanecer apenas como referencia interna;
- se virar material educacional, reescrever/atualizar sem transformar seis refeicoes em regra.

## 3. Formulas

Arquivo: `Fórmulas.pptx`  
Drive file ID: `1gro0ae5lKTCrY9Apy8gRgiDuncUdTTOS`

### FATO OBSERVADO

O deck apresenta formulas/manipulados nomeados, afirmacoes relacionadas a retencao de liquido, pele/cabelo, sono, apetite, metabolismo, gordura corporal e outros efeitos, alem de contato de uma farmacia.

O titulo historico contém `By Patty Torres`, mas isso, isoladamente, nao substitui confirmacao formal de autoria/direitos.

### CONFLITO COM ESTADO ATUAL DO PROJETO

As regras de **suplementacao/manipulados** continuam abertas em `OPEN_QUESTIONS.md`.

Assim, este arquivo nao pode ser usado como fonte automatica de regra, recomendacao, protocolo ou orientacao para cliente.

### CLASSIFICACAO

**Hold profissional.**

Antes de qualquer migracao/publicacao:
- Patty precisa confirmar se o material ainda representa sua pratica atual;
- revisar todas as afirmacoes profissionais/saude;
- revisar referencias comerciais/farmacia;
- confirmar autoria e direito de distribuicao;
- definir se esse tipo de material pertence ao MVP.

## Resultado da onda 1

Nenhum dos tres arquivos esta autorizado para migracao fisica ainda.

O melhor candidato para uma eventual primeira migracao continua sendo o video de **uso da balanca**, condicionado a revisao integral e confirmacao de direitos/autoria.

A planilha de refeicoes deve ser tratada como exemplo historico, e o deck de formulas deve permanecer em hold profissional.

## Proximo passo recomendado

Preparar uma pergunta curta para a Patty por item:

1. `Balança`: este video e de autoria/uso da Consultoria, continua atual e pode ser distribuido as clientes?
2. `Sugestao de refeicoes`: quer preservar apenas como referencia interna ou transformar em conteudo educacional revisado?
3. `Formulas`: este material ainda deve existir no aplicativo? Se sim, precisa de revisao profissional completa antes de qualquer distribuicao.

Somente respostas confirmadas devem alterar `rights_status`, `migration_status` ou `publication_status`.
