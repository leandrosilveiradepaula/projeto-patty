# Consentimento da Anamnese — ANAM-046

Data de referencia: 2026-09-24.

## Estado

**DEFINIDO PARA O MVP**

A decisao operacional confirmada e simples:

- ANAM-046 e apresentado como um checkbox obrigatorio na finalizacao da Anamnese;
- a cliente precisa marcar o checkbox para enviar a Anamnese canonica;
- o texto versionado da v1 e:
  "Concordo com o tratamento das informações fornecidas nesta Anamnese, inclusive dados de saúde, para realização do meu acompanhamento pela Consultoria Corpo & Mente.";
- o valor persistido da resposta e `Concordo`;
- desmarcado significa ausencia de aceite e bloqueia apenas o envio final;
- rascunhos continuam podendo ser salvos e retomados sem aceite;
- o aceite pertence a versao exata da Anamnese e fica preservado como `anamnesis_answer`;
- nao coletar IP, device fingerprint, localizacao ou metadados adicionais para esse aceite;
- o aceite da Anamnese nao autoriza por si so o envio de dados reais para OpenAI.

## Contrato tecnico

ANAM-046 usa a estrutura versionada ja existente:

- `question_key = consent_acceptance`;
- `answer_type = single_choice`;
- `required = true`;
- `options = ["Concordo"]`;
- a UI da finalizacao apresenta essa opcao como checkbox, nao como radio;
- no envio final server-side, a aplicacao revalida que a pergunta pertence a versao da submission, e obrigatoria e possui exatamente a opcao `Concordo`;
- o banco continua executando a validacao deterministica de respostas obrigatorias antes de definir `submitted_at`.

A evidencia minima fica naturalmente composta por:
- identidade autenticada vinculada a cliente;
- `anamnesis_submission`;
- `form_version_id`;
- pergunta versionada ANAM-046;
- resposta `Concordo`;
- timestamps da resposta e da submission.

Nao existe tabela juridica paralela para o MVP.

## Efeito da nao concordancia

A cliente pode:
- iniciar a Anamnese;
- salvar respostas;
- sair e continuar depois.

Sem marcar o checkbox, nao pode executar o envio final.

## Historico e versoes futuras

O aceite antigo nao e reescrito. Se o texto mudar no futuro, a nova redacao deve pertencer a uma nova versao da Anamnese; a regra de eventual reconsentimento fora de uma nova Anamnese pode ser definida futuramente se surgir necessidade concreta.

## IA

ANAM-046 cobre somente o tratamento das informacoes para realizacao do acompanhamento pela Consultoria Corpo & Mente.

Ele nao libera automaticamente:
- `OPENAI_HEALTH_DATA_PROCESSING_ENABLED`;
- envio de dados reais para OpenAI;
- novos `purpose_key` de IA.

O gate `OPENAI_HEALTH_DATA_GATE.md` continua independente.

## Criterio de implementacao

Com esta decisao:
1. o bloqueio ANAM-046 deixa de impedir a materializacao da primeira `client-anamnesis`;
2. a UI precisa exigir o checkbox no envio final;
3. a definicao canonica v1 pode ser materializada e revisada;
4. a publicacao continua explicita;
5. depois da publicacao, executar E2E sintetico do fluxo completo.

## Fora de escopo

Continuam separados:
- politica geral de retencao/hard delete;
- marketing;
- WhatsApp;
- uso de dados reais por IA;
- regras profissionais de saude, alimentacao ou treino.
