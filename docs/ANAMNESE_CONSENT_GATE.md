# Gate de Consentimento da Anamnese — ANAM-046

Data de referencia: 2026-09-24.

## Objetivo

Este documento transforma ANAM-046 em um gate objetivo de publicacao da primeira `client-anamnesis`.

Ele **nao redige texto juridico**, nao define base legal e nao substitui validacao juridica. Seu papel e registrar quais respostas precisam existir para que a engenharia consiga materializar, versionar, testar e publicar o consentimento sem inventar regra.

## Estado atual

Fatos ja confirmados:
- o formulario historico possui uma Declaracao de Anuencia;
- o inventario historico registra opcoes de concordancia/nao concordancia;
- a primeira Anamnese canonica nao deve ser publicada enquanto ANAM-046 estiver juridicamente/operacionalmente indefinido;
- o restante do fluxo tecnico da Anamnese v1 — rascunho, tipos nao juridicos, 10 condicionais, ordem, arquivos e submissao final — ja esta definido/implementado.

Estado: **BLOQUEIO EXTERNO / NAO PUBLICAR**.

## Respostas obrigatorias para liberar o gate

O responsavel juridico/operacional precisa fornecer respostas explicitas para todos os itens abaixo.

### 1. Texto juridico oficial

Fornecer:
- texto integral aprovado;
- titulo apresentado a cliente;
- texto exato da acao de concordancia;
- texto exato da acao de nao concordancia, se houver.

Nao reaproveitar automaticamente a redacao historica do Google Forms.

### 2. Identificacao de versao

Definir:
- identificador de versao juridica;
- data de vigencia;
- responsavel pela aprovacao;
- regra para quando uma alteracao de texto cria nova versao obrigatoria.

A versao aceita pela cliente precisa permanecer vinculada ao registro historico; alteracoes futuras nao podem reescrever aceites antigos.

### 3. Base legal e finalidade

Definir explicitamente:
- base legal aplicavel;
- finalidade coberta pelo consentimento/anuencia;
- se a anuencia cobre apenas o acompanhamento ou tambem tratamento de dados especificos;
- quais finalidades **nao** estao cobertas e exigem base/consentimento separado.

Engenharia nao deve inferir base legal a partir do texto.

### 4. Efeito da nao concordancia

Definir uma unica regra operacional clara:
- impede iniciar a Anamnese;
- impede enviar a Anamnese;
- impede iniciar o acompanhamento;
- ou outro comportamento explicitamente aprovado.

Sem essa resposta, nao implementar bloqueio automatico.

### 5. Revogacao ou retirada

Definir:
- se existe revogacao/retirada aplicavel;
- como a cliente solicita;
- a partir de quando produz efeito;
- o que acontece com historico ja necessario para obrigacao profissional/legal;
- se uma revogacao exige novo estado no produto ou apenas registro administrativo.

Nao apagar historico automaticamente.

### 6. Retencao do registro de aceite

Definir:
- por quanto tempo preservar o aceite;
- quais elementos precisam ser preservados como prova do aceite;
- quando, se algum dia, o registro pode ser anonimizado ou eliminado;
- relacao com a politica geral de retencao de dados.

### 7. Evidencia tecnica minima do aceite

O juridico/operacao deve confirmar quais evidencias precisam ser persistidas. Candidatos tecnicos a avaliar, **nao aprovados por este documento**:
- versao juridica aceita;
- instante do aceite;
- identidade autenticada associada;
- submission/form version relacionada;
- texto/hash da versao;
- origem/interface do aceite.

Nao coletar IP, device fingerprint ou metadado adicional sem necessidade e aprovacao explicita.

### 8. Reconsentimento

Definir:
- quais mudancas exigem novo aceite;
- se cliente com aceite antigo pode concluir nova Anamnese sem novo aceite;
- como tratar versoes anteriores ainda historicamente validas.

### 9. Relacao com dados sensiveis e IA

Definir separadamente:
- se ANAM-046 autoriza algum uso de dados sensiveis pela IA;
- se isso exige texto/base legal especifica;
- se o consentimento da Anamnese deve permanecer independente de eventual consentimento de IA.

Por padrao, **nao assumir** que aceitar ANAM-046 autoriza envio de dados para IA.

## Contrato tecnico somente depois do gate aprovado

Depois que os nove blocos acima estiverem respondidos e documentados, a engenharia pode definir a implementacao exata.

A implementacao devera preservar:
- texto/versionamento imutavel;
- aceite historico auditavel;
- separacao entre definicao juridica e resposta da cliente;
- RLS;
- nenhuma escrita direta de definicao pela cliente;
- nenhuma publicacao automatica;
- revisao humana antes de publicar a versao canonica.

## Criterios de liberacao da primeira client-anamnesis

ANAM-046 passa de **BLOQUEADO** para **DEFINIDO** somente quando:

1. texto oficial estiver aprovado;
2. versao e vigencia estiverem definidas;
3. base legal/finalidade estiverem registradas;
4. efeito da recusa estiver definido;
5. revogacao/retirada estiver definida ou explicitamente declarada nao aplicavel;
6. retencao estiver definida;
7. evidencia tecnica minima estiver definida;
8. regra de reconsentimento estiver definida;
9. relacao com IA estiver definida ou explicitamente separada;
10. a decisao estiver registrada em `DECISIONS.md` e as questoes correspondentes removidas de `OPEN_QUESTIONS.md`.

Somente depois:
- materializar a definicao versionada;
- adicionar testes determinísticos;
- revisar a versao completa;
- publicar explicitamente;
- executar E2E de inicio, preenchimento, condicionais, aceite e envio final.

## Fora de escopo deste gate

Este documento nao decide:
- politica geral de exclusao/anonimizacao;
- retencao de arquivos privados;
- consentimento para marketing;
- consentimento para comunicacao por WhatsApp;
- provider/modelo de IA;
- regras profissionais de saude, dieta ou treino.
