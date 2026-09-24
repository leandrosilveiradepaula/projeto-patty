# Anamnese Canonica v1 - Especificacao candidata

Data de referencia: 2026-09-24.

Status: **PRODUTO V1 DEFINIDO / NAO PUBLICAR AINDA — ANAM-046 PENDENTE**.


Manifesto machine-readable correspondente: `docs/anamnesis_canonical_v1_candidate.json`.

Mapa completo de campos candidato:
- `docs/ANAMNESE_FIELD_MAP_V1_CANDIDATE.md`;
- `docs/anamnesis_field_map_v1_candidate.json`.

O mapa cobre todos os 47 itens historicos e 51 campos de resposta. Tipos nao juridicos, os 10 desdobramentos/condicionais, ANAM-044 e a ordem foram aceitos como decisoes de produto da v1. ANAM-046 continua pendente. Nenhuma dessas decisoes cria regra profissional.

O manifesto e coberto por teste de invariantes para garantir:
- cobertura exata de `ANAM-000..ANAM-046`;
- manutencao de ANAM-005..008 fora da Anamnese;
- bloqueio explicito de publicacao enquanto tipos/condicionais/arquivos/consentimento estiverem pendentes.

Esta especificacao organiza o formulario atual confirmado pela Patty sem reescrever seu sentido profissional e sem criar regras novas.

## Objetivo

Preparar a primeira versao canonica futura com `form_key = client-anamnesis`, separando:

- o que permanece na Anamnese;
- o que sai para Avaliacao/Medidas;
- o que depende de decisao tecnica antes de publicacao;
- o que depende de texto juridico/operacional ainda nao fechado.

Esta especificacao nao cria registros no Supabase e nao publica versao.

## Regras ja confirmadas que governam esta versao

- As perguntas do formulario atual permanecem como base de conteudo.
- A experiencia pode ser reorganizada no aplicativo sem alterar silenciosamente o sentido profissional das perguntas.
- Dados cadastrais podem permanecer visiveis dentro da Anamnese, preservando a separacao tecnica de Cadastro Atual.
- Medidas corporais saem da Anamnese e ficam em fluxo proprio de Avaliacao/Medidas.
- Todos os campos **aplicaveis** sao obrigatorios no envio final.
- Campos dependentes nao aplicaveis ficam ocultos e deixam de ser obrigatorios.
- Rascunhos podem permanecer incompletos e ser retomados.
- Depois do envio final, a cliente nao altera a resposta original.
- Quando faltar informacao ou houver ambiguidade, a Patty solicita esclarecimento a cliente dentro do aplicativo.

## Escopo historico analisado

O inventario atual possui `ANAM-000` a `ANAM-046`.

### Fora da Anamnese final

Os seguintes itens nao devem virar perguntas da Anamnese canonica:

| Codigo | Item | Destino |
| --- | --- | --- |
| ANAM-000 | Conteudo de abertura/onboarding | Conteudo de interface, nao resposta |
| ANAM-005 | Ombros | Avaliacao/Medidas |
| ANAM-006 | Panturrilha | Avaliacao/Medidas |
| ANAM-007 | Peso atual | Avaliacao/Medidas |
| ANAM-008 | Altura | Avaliacao/Medidas |

A exclusao acima nao apaga a evidencia historica em `ANAMNESE.md`.

### Permanecem como conteudo-base da Anamnese

Entram como candidatos de conteudo, preservando o texto historico ate revisao editorial pontual:

- `ANAM-001` a `ANAM-004`: cadastro/contato;
- `ANAM-009` a `ANAM-043`: exames, saude, medicamentos/suplementacao, sono, comportamento, rotina, alimentacao, autoimagem, atividade fisica e objetivos;
- `ANAM-045`: motivo da escolha do plano;
- `ANAM-046`: declaracao de anuencia, **somente depois de texto/versionamento juridico definidos**.

### Upload historico

`ANAM-044` nao vira pergunta nem `anamnesis_answer`. Na v1, a secao Arquivos orienta a cliente e aponta para `/cliente/arquivos`. A finalidade do arquivo permanece no dominio privado por `file_kind` (`photo`, `exam` ou `document`).

A Anamnese nao duplica upload, bytes, metadados ou referencias como resposta. Sem nova regra profissional confirmada, upload nao bloqueia o envio final.

## Ordem de secoes definida para a v1

O agrupamento abaixo e a decisao de produto da v1, baseada somente nas categorias ja documentadas. Nao altera o sentido profissional das perguntas.

1. **Cadastro**
   - ANAM-001 a ANAM-004
   - ANAM-010 permanece aqui na v1.

2. **Historico de saude e exames**
   - ANAM-009
   - ANAM-011 a ANAM-020
   - ANAM-023

3. **Medicamentos e suplementacao**
   - ANAM-021
   - ANAM-022
   - ANAM-024

4. **Sono e rotina**
   - ANAM-025 a ANAM-027
   - ANAM-034

5. **Comportamento e contexto**
   - ANAM-028 a ANAM-033
   - ANAM-041

6. **Alimentacao**
   - ANAM-035 a ANAM-037

7. **Autoimagem**
   - ANAM-038 a ANAM-040

8. **Atividade fisica e objetivos**
   - ANAM-042
   - ANAM-043
   - ANAM-045

9. **Arquivos**
   - orientacao e link para `/cliente/arquivos`; sem `anamnesis_answer`.

10. **Consentimento**
   - ANAM-046, depois de texto/versionamento juridico aprovados.

## Perguntas compostas

As perguntas historicas abaixo contem mais de uma informacao na mesma frase e nao devem ser separadas automaticamente sem especificacao:

- ANAM-010;
- ANAM-011;
- ANAM-012;
- ANAM-014;
- ANAM-015;
- ANAM-016;
- ANAM-020;
- ANAM-021;
- ANAM-024;
- ANAM-025;
- ANAM-042;
- ANAM-043.

A versao canonica deve preservar o sentido original. Separar em campos menores pode melhorar UX, mas exige mapeamento explicito para garantir que nenhuma parte seja perdida.

## Condicionais candidatas que ainda precisam de mapa explicito

A regra geral de ocultar dependencias nao aplicaveis esta confirmada, mas as relacoes pergunta-a-pergunta ainda nao estao fechadas.

A fundacao tecnica `20260924105003_add_anamnesis_question_applicability_foundation.sql` esta aplicada e verificada no Supabase SaaS. Ela permite uma condicao exata por pergunta dependente, sempre ligada a uma pergunta controladora da mesma versao. Isso resolve **onde** armazenar a regra, mas nao decide **quais** regras profissionais existem.

Perguntas que claramente **podem exigir** uma resposta-base antes de detalhes, sem assumir ainda a regra exata:

- plano de saude -> qual;
- diabetes -> tempo / controle;
- transtorno metabolico -> qual / tempo / controle;
- cirurgia -> qual;
- alergia -> qual;
- fratura/lesao -> qual;
- desmaio -> descricao / frequencia;
- suplemento anterior -> qual;
- suplemento vitaminico -> qual;
- atleta competitivo -> qual esporte.

Status: **MAPA PENDENTE**.

Nenhuma dessas dependencias deve ser implementada em schema ou UI apenas por inferencia textual. O mapa final deve registrar:
- pergunta controladora;
- valor(es) que tornam o detalhe aplicavel;
- pergunta(s) dependente(s);
- comportamento quando deixa de ser aplicavel;
- validacao de envio final.

## Tipos de input

O schema atual possui `answer_type`, `required` e `options`, mas o inventario historico nao fornece evidencia suficiente para definir todos os tipos finais.

Tipos candidatos permitidos nesta etapa de especificacao:
- `text`;
- `single_choice`;
- eventualmente tipos estruturados adicionais apenas se o schema/produto os formalizar antes da publicacao.

Nao publicar a versao usando tipos improvisados apenas para caber no schema atual.

## Obrigatoriedade

Regra da versao futura:

- toda pergunta aplicavel no envio final deve estar respondida;
- pergunta nao aplicavel por regra condicional documentada nao e obrigatoria;
- durante rascunho, respostas podem faltar.

O campo `required` do schema atual sozinho nao representa toda a regra, porque obrigatoriedade depende de aplicabilidade condicional.

## Dados cadastrais

Cidade, telefone, email de contato e Instagram podem aparecer dentro da Anamnese.

Limite tecnico:
- Cadastro Atual continua sendo entidade propria;
- login email continua separado de email de contato;
- valores preservados na submission sao snapshot historico;
- editar Cadastro Atual nao reescreve Anamnese historica;
- editar/corrigir Anamnese nao altera silenciosamente Cadastro Atual.

## Saude e IA

Nenhuma pergunta de saude desta versao cria automaticamente:
- diagnostico;
- bloqueio;
- score;
- severidade;
- alerta clinico;
- decisao de protocolo.

O uso de cada resposta pela IA continua sujeito a minimizacao e revisao humana.

Instagram e outros dados informativos nao devem ser enviados a IA sem necessidade.

## Bloqueios para publicar a primeira `client-anamnesis`

A primeira versao canonica **nao deve ser publicada** ate fechar:

1. texto, versionamento e operacao de ANAM-046 / consentimento;
2. fluxo tecnico de submissao final com validacao dos campos aplicaveis;
3. materializacao, revisao e publicacao explicita da definicao completa.

A cobertura historica deixou de ser um bloqueio tecnico: o mapa candidato e seus testes garantem representacao exata de ANAM-000..046 e preservam ANAM-005..008 fora da Anamnese.

## Criterio de pronto para publicacao

A especificacao estara pronta para gerar a primeira versao no Supabase quando existir uma lista versionavel deterministica contendo, para cada pergunta:

- `question_key`;
- secao;
- ordem;
- label final;
- `answer_type`;
- `required`;
- options quando aplicavel;
- regra de aplicabilidade quando condicional;
- politica de uso pela IA quando relevante;
- proveniencia `ANAM-xxx`.

Somente depois disso:
1. criar `anamnesis_forms.form_key = client-anamnesis` se ainda inexistente;
2. criar versao 1 como draft;
3. popular secoes/perguntas;
4. validar integridade e RLS;
5. revisar com a Patty;
6. publicar explicitamente;
7. executar E2E de criacao inicial de rascunho.

