# Anamnese

Este documento registra o inventario funcional da anamnese atual da Patty e serve como base documental para migracao e especificacao futura do modulo.

O formulario atual da Patty e evidencia do processo existente e referencia de migracao. Ele nao define automaticamente a versao final do formulario no aplicativo.

Portanto:

- campo existente hoje nao significa campo automaticamente aprovado no novo app;
- campo obrigatorio no Google Forms nao significa campo obrigatorio automaticamente no novo app;
- tipo de controle atual nao significa tipo definitivo no novo app;
- limite tecnico do Google Forms nao significa limite do aplicativo;
- posicao ou pagina atual nao significa agrupamento final;
- pergunta existente nao significa regra do metodo;
- resposta de uma cliente nao significa regra geral.

Este documento nao cria inputs, migrations, banco, Supabase, logica clinica ou regras do metodo profissional.

## Legenda de evidencia

- `CONFIRMADO_FORMULARIO_ATUAL`: ha evidencia visual direta de que o campo ou pergunta existe no formulario atual.
- `CONFIRMADO_PRODUTO`: ha decisao documental explicita de que o conceito deve existir no aplicativo.
- `CLASSIFICACAO_PROVISORIA`: a categoria sugerida parece coerente com a arquitetura atual, mas ainda precisa de validacao.
- `PENDENTE_PATTY`: exige confirmacao da Patty ou decisao de produto.
- `LACUNA_DE_EVIDENCIA`: ha indicio de conteudo adicional, mas as capturas disponiveis nao permitem recuperar tudo.
- `RESTRICAO_PLATAFORMA_ATUAL`: limite observado no Google Forms historico, sem aprovacao automatica para o novo aplicativo.

## Evidencias analisadas

Foram analisadas evidencias do formulario atual armazenadas no acervo do projeto e fornecidas durante o levantamento. Os arquivos abaixo sao nomes de proveniencia; se nao estiverem fisicamente no repositorio, nao representam caminhos locais versionados.

| arquivo | evidencia registrada |
| --- | --- |
| `a96b6227-31ff-4500-b872-68361b6c7043.png` | pagina 1 de 7; abertura/onboarding do formulario |
| `7d09fa22-01de-4c3c-aeb9-f87cd6e14446.png` | pagina 2 de 7; cadastro/contato visivel |
| `5e9ed17c-bc01-4c01-989a-f74ffc05ef2e.png` | pagina 3 de 7; medidas visiveis |
| `201e1425-ae4e-4b08-9c9a-b91df8f21613.png` | perguntas de saude e exames |
| `8f6a31ac-5fa7-4ecc-891a-fd021c062031.png` | secao "Historico de Doencas" |
| `fbc33a92-4992-42ce-a53b-d537b8cfeb22.png` | lesoes, dor, cardio e desmaio |
| `e9017525-fa1a-47fa-a5dc-53d37e2afe26.png` | sono, relacoes sociais, humor e condicao financeira para suplementos/medicamentos |
| `7a53f342-69e7-4724-b8dc-8b679e20c269.png` | hidratacao, suplemento vitaminico e preferencia alimentar |
| `1142c265-5e30-4ac9-b805-aa576d7dc564.png` | alimentacao, relacao com comida e autoimagem |
| `4db59d52-263d-4ac6-9339-c7190b915ddf.png` | pagina 5 de 7; vicios, esporte competitivo e objetivos |
| `e9e38211-6a34-4f05-aff7-a2d14bbf7ab0.png` | pagina 6 de 7; upload de arquivos |
| `c117ce63-a777-486b-86cc-c0d17b998dfc.png` | pagina 7 de 7; motivacao/plano e declaracao de anuencia |

## Inventario dos itens observados

Os codigos `ANAM-000` a `ANAM-046` identificam itens do inventario historico, nao campos finais do aplicativo. Perguntas compostas observadas no formulario atual continuam marcadas como compostas e dependem de decisao futura antes de qualquer normalizacao em campos separados.

| codigo_provisorio | texto_formulario_atual | tipo_observado | opcoes_observadas | obrigatorio_no_formulario_atual | origem_evidencia | categoria_provisoria | sensibilidade | uso_ia | decisao_novo_app | observacoes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ANAM-000 | Conteudo de abertura / onboarding do formulario atual | conteudo informativo | nao se aplica | nao confirmado | `a96b6227-31ff-4500-b872-68361b6c7043.png` | Historico de vida | baixa | nao necessario por padrao, decisao formal pendente | pendente de validacao | Nao e campo de resposta. Nao transformar automaticamente em texto do app. |
| ANAM-001 | Cidade | resposta curta | nao observado | sim | `7d09fa22-01de-4c3c-aeb9-f87cd6e14446.png` | Cadastro | dado cadastral | a definir / nao necessario por padrao, decisao formal pendente | pendente de validacao | Obrigatoriedade registrada apenas como historico do Google Forms. Ownership conceitual: cadastro atual da cliente; eventual copia na anamnese sera snapshot historico, nao fonte mestre. UI final ainda pendente. |
| ANAM-002 | Telefone | resposta curta | nao observado | sim | `7d09fa22-01de-4c3c-aeb9-f87cd6e14446.png` | Cadastro | dado cadastral pessoal | a definir / nao necessario por padrao, decisao formal pendente | pendente de validacao | Ownership conceitual: cadastro atual da cliente. Nao pertence primariamente ao Auth e nao implica WhatsApp. UI final ainda pendente. |
| ANAM-003 | Email | resposta curta | nao observado | sim | `7d09fa22-01de-4c3c-aeb9-f87cd6e14446.png` | Cadastro | dado cadastral pessoal | a definir / nao necessario por padrao, decisao formal pendente | pendente de validacao | Distinguir email de autenticacao, pertencente ao Auth, de email de contato, pertencente ao cadastro da cliente. Eventual valor na anamnese sera snapshot historico. UI final ainda pendente. |
| ANAM-004 | Instagram | resposta curta | nao observado | sim | `7d09fa22-01de-4c3c-aeb9-f87cd6e14446.png`; `DATA_MODEL.md` | Cadastro | dado cadastral informativo | nao enviar por padrao | pendente de validacao | Ownership conceitual: cadastro informativo da cliente. Produto confirma que Instagram e informativo e nao entra na IA por padrao. UI final ainda pendente. |
| ANAM-005 | Ombros (toda circunferencia) | resposta curta/numerica nao confirmada | nao observado | sim | `5e9ed17c-bc01-4c01-989a-f74ffc05ef2e.png` | Medidas | dado corporal sensivel | a definir campo a campo | pendente de validacao | Decidir se pertence a resposta de anamnese, registro inicial de medicao/avaliacao, ou fluxo separado. |
| ANAM-006 | Panturrilha | resposta curta/numerica nao confirmada | nao observado | sim | `5e9ed17c-bc01-4c01-989a-f74ffc05ef2e.png` | Medidas | dado corporal sensivel | a definir campo a campo | pendente de validacao | Decidir se pertence a resposta de anamnese, registro inicial de medicao/avaliacao, ou fluxo separado. |
| ANAM-007 | Peso atual | resposta curta/numerica nao confirmada | nao observado | sim | `5e9ed17c-bc01-4c01-989a-f74ffc05ef2e.png` | Medidas | dado corporal sensivel | a definir campo a campo | pendente de validacao | Nao define regra de avaliacao ou evolucao. |
| ANAM-008 | Altura | resposta curta/numerica nao confirmada | nao observado | sim | `5e9ed17c-bc01-4c01-989a-f74ffc05ef2e.png` | Medidas | dado corporal sensivel | a definir campo a campo | pendente de validacao | Nao define regra de avaliacao ou evolucao. |
| ANAM-009 | Tem o costume de realizar exames de sangue? | pergunta textual | nao observado | nao confirmado | `201e1425-ae4e-4b08-9c9a-b91df8f21613.png` | Exames e documentos | dado de saude sensivel | a definir campo a campo | pendente de validacao | Nao define obrigatoriedade de exame no app. |
| ANAM-010 | Possui plano de saude? Qual? | pergunta textual composta | nao observado | nao confirmado | `201e1425-ae4e-4b08-9c9a-b91df8f21613.png` | Cadastro | dado cadastral/sensivel a revisar | a definir campo a campo | pendente de validacao | Classificacao definitiva pendente. |
| ANAM-011 | Possui diabetes? Quanto tempo? Esta controlado? | pergunta textual composta | nao observado | nao confirmado | `201e1425-ae4e-4b08-9c9a-b91df8f21613.png` | Historico de saude | dado de saude sensivel | a definir campo a campo | pendente de validacao | Nao criar alerta, bloqueio ou interpretacao clinica. |
| ANAM-012 | Possui algum transtorno metabolico, como tireoide ou hipogonadismo? Qual(is), ha quanto tempo e esta controlado? | pergunta textual composta | nao observado | nao confirmado | `201e1425-ae4e-4b08-9c9a-b91df8f21613.png` | Historico de saude | dado de saude sensivel | a definir campo a campo | pendente de validacao | Texto historico pode exigir revisao editorial futura sem alterar a fonte aqui. |
| ANAM-013 | Possui alguma doenca cronica, como anemia, artrite, fibromialgia etc.? | pergunta textual | nao observado | nao confirmado | `8f6a31ac-5fa7-4ecc-891a-fd021c062031.png` | Historico de saude | dado de saude sensivel | a definir campo a campo | pendente de validacao | Nao define lista fechada de condicoes. |
| ANAM-014 | Ja realizou alguma cirurgia? Qual(is)? | pergunta textual composta | nao observado | nao confirmado | `8f6a31ac-5fa7-4ecc-891a-fd021c062031.png` | Historico de saude | dado de saude sensivel | a definir campo a campo | pendente de validacao | Pergunta composta; normalizacao futura pendente. |
| ANAM-015 | Possui alergia a alguma medicacao ou comida? Qual(is)? | pergunta textual composta | nao observado | nao confirmado | `8f6a31ac-5fa7-4ecc-891a-fd021c062031.png` | Historico de saude | dado de saude sensivel | a definir campo a campo | pendente de validacao | Nao define regras de bloqueio. |
| ANAM-016 | Ja fraturou ou teve alguma lesao importante que deixou sequela? Qual(is)? | pergunta textual composta | nao observado | nao confirmado | `fbc33a92-4992-42ce-a53b-d537b8cfeb22.png` | Historico de saude | dado de saude sensivel | a definir campo a campo | pendente de validacao | Nao cria restricao de treino. |
| ANAM-017 | Sente dor intensa em alguma parte do corpo? | pergunta textual | nao observado | nao confirmado | `fbc33a92-4992-42ce-a53b-d537b8cfeb22.png` | Historico de saude | dado de saude sensivel | a definir campo a campo | pendente de validacao | Nao cria alerta automatico. |
| ANAM-018 | Possui alguma doenca cardiovascular ou hipertensao arterial? | pergunta textual | nao observado | nao confirmado | `fbc33a92-4992-42ce-a53b-d537b8cfeb22.png` | Historico de saude | dado de saude sensivel | a definir campo a campo | pendente de validacao | Nao cria bloqueio automatico. |
| ANAM-019 | Ja sentiu dor no peito durante alguma atividade fisica? | pergunta textual | nao observado | nao confirmado | `fbc33a92-4992-42ce-a53b-d537b8cfeb22.png` | Historico de saude | dado de saude sensivel | a definir campo a campo | pendente de validacao | Nao cria alerta automatico. |
| ANAM-020 | Ja desmaiou alguma vez? Descricao e frequencia. | pergunta textual composta | nao observado | nao confirmado | `fbc33a92-4992-42ce-a53b-d537b8cfeb22.png` | Historico de saude | dado de saude sensivel | a definir campo a campo | pendente de validacao | Pergunta composta; normalizacao futura pendente. |
| ANAM-021 | Ja usou algum tipo de suplemento alimentar? Qual(is)? | pergunta textual composta | nao observado | nao confirmado | evidencia de medicamentos e suplementacao informada na task | Medicamentos e suplementacao | dado de saude/suplementacao sensivel | a definir campo a campo | pendente de validacao | Regras de suplementacao continuam pendentes de validacao da Patty. |
| ANAM-022 | O que esta administrando atualmente entre suplementos, fitoterapicos e medicamentos? | pergunta textual | nao observado | nao confirmado | evidencia de medicamentos e suplementacao informada na task | Medicamentos e suplementacao | dado de saude/suplementacao sensivel | a definir campo a campo | pendente de validacao | Nao criar regra sobre influencia desses dados. |
| ANAM-023 | Como esta sua libido? | pergunta textual | nao observado | nao confirmado | evidencia de medicamentos e suplementacao informada na task | Historico de saude | dado de saude sensivel | a definir campo a campo | pendente de validacao | Classificacao definitiva pendente. |
| ANAM-024 | Toma algum suplemento vitaminico? Qual(is)? | pergunta textual composta | nao observado | nao confirmado | `7a53f342-69e7-4724-b8dc-8b679e20c269.png` | Medicamentos e suplementacao | dado de saude/suplementacao sensivel | a definir campo a campo | pendente de validacao | Regras de suplementacao continuam pendentes. |
| ANAM-025 | Como esta a qualidade e o tempo do seu sono? | pergunta textual composta | nao observado | nao confirmado | `e9017525-fa1a-47fa-a5dc-53d37e2afe26.png` | Sono | dado sensivel de rotina/saude | a definir campo a campo | pendente de validacao | Decidir se pergunta composta permanece junta ou vira campos separados. |
| ANAM-026 | Demora a dormir? | pergunta textual | nao observado | nao confirmado | `e9017525-fa1a-47fa-a5dc-53d37e2afe26.png` | Sono | dado sensivel de rotina/saude | a definir campo a campo | pendente de validacao | Nao define regra de sono. |
| ANAM-027 | Acorda muitas vezes durante a noite? | pergunta textual | nao observado | nao confirmado | `e9017525-fa1a-47fa-a5dc-53d37e2afe26.png` | Sono | dado sensivel de rotina/saude | a definir campo a campo | pendente de validacao | Nao define regra de sono. |
| ANAM-028 | Como sao suas relacoes sociais? | pergunta textual | nao observado | nao confirmado | `e9017525-fa1a-47fa-a5dc-53d37e2afe26.png` | Comportamento | dado pessoal sensivel | a definir campo a campo | pendente de validacao | Nao criar interpretacao psicologica. |
| ANAM-029 | Considera-se paciente? | pergunta textual | nao observado | nao confirmado | `e9017525-fa1a-47fa-a5dc-53d37e2afe26.png` | Comportamento | dado pessoal sensivel | a definir campo a campo | pendente de validacao | Nao criar score comportamental. |
| ANAM-030 | Ja foi mais paciente do que e hoje? | pergunta textual | nao observado | nao confirmado | `e9017525-fa1a-47fa-a5dc-53d37e2afe26.png` | Comportamento | dado pessoal sensivel | a definir campo a campo | pendente de validacao | Nao criar score comportamental. |
| ANAM-031 | Como esta seu humor? | pergunta textual | nao observado | nao confirmado | `e9017525-fa1a-47fa-a5dc-53d37e2afe26.png` | Comportamento | dado pessoal sensivel | a definir campo a campo | pendente de validacao | Nao criar alerta ou interpretacao clinica. |
| ANAM-032 | Sente-se muito cansado para levantar da cama pela manha? | pergunta textual | nao observado | nao confirmado | `e9017525-fa1a-47fa-a5dc-53d37e2afe26.png` | Comportamento | dado sensivel de rotina/saude | a definir campo a campo | pendente de validacao | Nao criar alerta automatico. |
| ANAM-033 | Tem condicao financeira para gastos com suplementos/medicamentos? | multipla escolha | Sim; Nao; Talvez | nao confirmado | `e9017525-fa1a-47fa-a5dc-53d37e2afe26.png` | CLASSIFICACAO_PROVISORIA | dado economico sensivel | a definir campo a campo | pendente de validacao | Categoria definitiva pendente de Patty/produto. |
| ANAM-034 | Toma quantos litros de agua por dia? | multipla escolha | 1L; 1,5L; 2L; 2,5L; 3L; 3,5L; 4L; 4,5L; 5L ou mais; Nao sei | nao confirmado | `7a53f342-69e7-4724-b8dc-8b679e20c269.png` | Rotina | dado sensivel de rotina/saude | a definir campo a campo | pendente de validacao | Comprova pergunta atual, nao meta, formula, limite ou regra de hidratacao. |
| ANAM-035 | 3 alimentos preferidos | pergunta textual | nao observado | nao confirmado | `7a53f342-69e7-4724-b8dc-8b679e20c269.png`; `1142c265-5e30-4ac9-b805-aa576d7dc564.png` | Alimentacao | dado sensivel de habito alimentar | a definir campo a campo | pendente de validacao | Nao cria regra alimentar. |
| ANAM-036 | 3 alimentos que menos gostei | pergunta textual | nao observado | nao confirmado | `1142c265-5e30-4ac9-b805-aa576d7dc564.png` | Alimentacao | dado sensivel de habito alimentar | a definir campo a campo | pendente de validacao | Texto preservado da fonte historica; pode exigir revisao editorial futura. |
| ANAM-037 | Me fala um pouco como tu ve tua relacao com a comida | pergunta textual | nao observado | nao confirmado | `1142c265-5e30-4ac9-b805-aa576d7dc564.png` | Alimentacao | dado sensivel de habito alimentar | a definir campo a campo | pendente de validacao | Texto historico preservado sem reescrever como redacao final. |
| ANAM-038 | Quando tu te olha no espelho, o que tu enxerga? | pergunta textual | nao observado | nao confirmado | `1142c265-5e30-4ac9-b805-aa576d7dc564.png` | Autoimagem | dado pessoal sensivel | a definir campo a campo | pendente de validacao | Nao criar interpretacao psicologica ou score. |
| ANAM-039 | E como acredita que as pessoas te veem? | pergunta textual | nao observado | nao confirmado | `1142c265-5e30-4ac9-b805-aa576d7dc564.png` | Autoimagem | dado pessoal sensivel | a definir campo a campo | pendente de validacao | Normalizacao ortografica sem adotar redacao definitiva. |
| ANAM-040 | Me fala das tuas qualidades | pergunta textual | nao observado | nao confirmado | `1142c265-5e30-4ac9-b805-aa576d7dc564.png` | Autoimagem | dado pessoal sensivel | a definir campo a campo | pendente de validacao | Nao criar analise automatica. |
| ANAM-041 | Possui algum vicio (cigarro, bebidas alcoolicas, drogas ilicitas etc.)? | multipla escolha | Sim; Nao | nao confirmado | `4db59d52-263d-4ac6-9339-c7190b915ddf.png` | Comportamento | dado sensivel | a definir campo a campo | pendente de validacao | Nao criar severidade, score, alerta ou bloqueio. |
| ANAM-042 | E atleta competitivo de fisiculturismo ou outro esporte? Qual(is)? | pergunta textual composta | nao observado | nao confirmado | `4db59d52-263d-4ac6-9339-c7190b915ddf.png` | Atividade fisica | dado sensivel de atividade fisica | a definir campo a campo | pendente de validacao | Inventario de atividade fisica pode estar incompleto. |
| ANAM-043 | Quais sao seus objetivos a curto (3 meses), medio (12 meses) e longo (5 anos) prazo? | pergunta textual composta | nao observado | nao confirmado | `4db59d52-263d-4ac6-9339-c7190b915ddf.png` | Objetivos | dado pessoal sensivel | a definir campo a campo | pendente de validacao | Nao define trilha, fase ou meta do metodo. |
| ANAM-044 | Upload de arquivos | upload de arquivo no Google Forms | ate 10 arquivos; tipos apresentados incluem PDF/documento/imagem; maximo apresentado de 10 MB por arquivo; apos envio, arquivos nao podem ser editados/removidos | nao confirmado | `e9e38211-6a34-4f05-aff7-a2d14bbf7ab0.png` | Fotos; Exames e documentos | dado sensivel / arquivo privado | a definir campo a campo | pendente de validacao | Limites sao `RESTRICAO_PLATAFORMA_ATUAL`, nao requisito confirmado do novo app. Finalidade de cada upload ainda nao esta mapeada. |
| ANAM-045 | Por que optou por este plano? | pergunta textual | nao observado | nao confirmado | `c117ce63-a777-486b-86cc-c0d17b998dfc.png` | CLASSIFICACAO_PROVISORIA | dado pessoal/comercial a revisar | a definir campo a campo | pendente de validacao | Classificacao entre objetivo, motivacao, cadastro comercial ou acompanhamento permanece pendente. |
| ANAM-046 | Declaracao de Anuencia | aceite/nao aceite | concordancia; nao concordancia | sim | `c117ce63-a777-486b-86cc-c0d17b998dfc.png` | Consentimento | dado juridico/sensivel | nao necessario por padrao, decisao formal pendente | pendente de validacao | Nao copiar texto juridico historico como redacao final do app. Modelo conceitual ja preve versionamento, mas operacao esta pendente. |

## Matriz das 15 categorias estruturais

| categoria | evidencia do formulario atual | confirmacao de produto/documentacao | incompletude e pendencias |
| --- | --- | --- | --- |
| Cadastro | Cidade; Telefone; Email; Instagram; Possui plano de saude? Qual? | `client_registration` existe como conceito; dados cadastrais ficam separados de dados clinicos/operacionais. | Formulario cadastral completo, duplicidade com Auth/perfil e uso de IA campo a campo ainda precisam ser definidos. |
| Medidas | Ombros; Panturrilha; Peso atual; Altura. | Produto preve medidas e avaliacoes. | Definir se medidas ficam na anamnese, criam avaliacao inicial ou migram para fluxo separado. |
| Historico de vida | Apenas conteudo de abertura/onboarding foi registrado como item historico nao-campo. | Categoria usada na estrutura de UI da anamnese. | Campos especificos ainda nao completamente identificados nas evidencias disponiveis. |
| Historico de saude | Diabetes; transtorno metabolico; doenca cronica; cirurgia; alergia; fratura/lesao; dor intensa; cardiovascular/hipertensao; dor no peito; desmaio; libido. | Dados de saude sao sensiveis. | Lista completa, campos condicionais, obrigatoriedade, tipo final, alertas e bloqueios dependem da Patty. |
| Medicamentos e suplementacao | Uso anterior de suplemento; administracao atual de suplementos/fitoterapicos/medicamentos; suplemento vitaminico. | Regras de suplementacao permanecem pendentes em `BUSINESS_RULES.md`. | Uso de IA e regras de suplementacao nao devem ser inferidos. |
| Sono | Qualidade/tempo de sono; demora a dormir; acorda durante a noite. | Categoria usada na estrutura de UI da anamnese. | Campos condicionais, tipos finais e normalizacao de perguntas compostas permanecem pendentes. |
| Comportamento | Relacoes sociais; paciencia; paciencia anterior; humor; cansaco matinal; vicios. | Regras de comportamento permanecem pendentes em `BUSINESS_RULES.md`. | Nao ha scores, severidade, alertas ou regras confirmadas. |
| Rotina | Consumo diario de agua. | Categoria usada na estrutura de UI da anamnese. | Campos especificos ainda nao completamente identificados; hidratacao nao possui meta, formula ou regra confirmada. |
| Atividade fisica | Atleta competitivo de fisiculturismo ou outro esporte. | Produto preve exercicios como area funcional separada. | Inventario pode estar incompleto; nao inferir questionario completo de atividade fisica. |
| Alimentacao | Alimentos preferidos; alimentos que menos gostou; relacao com comida. | Regras de alimentacao permanecem pendentes em `BUSINESS_RULES.md`. | Redacao final, classificacao e uso de IA precisam ser definidos campo a campo. |
| Objetivos | Objetivos de curto, medio e longo prazo; por que optou por este plano. | Categoria usada na estrutura de UI da anamnese. | Classificacao de motivacao/plano entre objetivo, cadastro comercial ou acompanhamento permanece pendente. |
| Autoimagem | Espelho; como acredita que as pessoas veem; qualidades. | Categoria usada na estrutura de UI da anamnese. | Nao ha interpretacao psicologica, score ou analise automatica confirmada. |
| Fotos | Ha upload de arquivos no formulario atual, mas a captura nao comprova finalidade especifica de foto para cada upload. | Produto preve fotos e Storage privado para arquivos sensiveis. | Identificar quais uploads sao fotos e decidir se pertencem a anamnese inicial, avaliacao ou ambos. |
| Exames e documentos | Costume de realizar exames de sangue; upload de arquivos sem finalidade completamente identificada. | Produto preve exames e documentos privados. | Finalidade de cada upload, documentos solicitados, tipos, tamanho, quantidade, substituicao e exclusao seguem pendentes. |
| Consentimento | Declaracao de Anuencia com opcoes de concordancia/nao concordancia. | Modelo conceitual preve preservacao/versionamento de informacoes e historico. | Texto juridico definitivo, base legal, aceite, revogacao, retencao e impacto da recusa seguem pendentes. |

## Fatos confirmados

- Existe no formulario atual uma pagina inicial de abertura/onboarding.
- Existem campos de cadastro/contato visiveis: Cidade, Telefone, Email e Instagram.
- Existem campos de medidas visiveis: Ombros, Panturrilha, Peso atual e Altura.
- Existem perguntas observadas sobre exames, historico de saude, medicamentos, suplementacao, sono, comportamento, hidratacao, alimentacao, autoimagem, atividade fisica, objetivos, uploads e anuencia.
- O Google Forms atual apresenta upload de arquivos com limites historicos: ate 10 arquivos, tipos apresentados como PDF/documento/imagem, maximo de 10 MB por arquivo e aviso de que arquivos enviados nao podem ser editados/removidos apos envio.
- A declaracao de anuencia existe no formulario atual e aparece como obrigatoria.

## Decisoes confirmadas do produto relacionadas

- O produto tera suporte a anamnese, medidas, fotos, exames, protocolos, avaliacoes, conteudos, exercicios e painel administrativo da Patty.
- Dados de saude sao sensiveis.
- Fotos, exames e documentos devem ser privados.
- Endereco, escolaridade e Instagram sao dados informativos e nao devem ser enviados a IA por padrao.
- A IA sera assistiva e nao publicara protocolos automaticamente.
- A Patty sempre revisara e aprovara protocolos antes da publicacao.
- O sistema deve preservar resposta original, interpretacao da IA, alteracoes da Patty, versao aprovada e historico das versoes.

## Hipoteses e classificacoes provisorias

- Algumas perguntas compostas podem vir a ser separadas em campos especificos, mas isso ainda exige decisao.
- `Por que optou por este plano?` pode se relacionar a objetivos, motivacao, cadastro comercial ou acompanhamento.
- A pergunta sobre condicao financeira para suplementos/medicamentos ainda nao possui categoria definitiva.
- A pergunta de consumo diario de agua foi classificada provisoriamente em Rotina, sem criar regra de hidratacao.
- Os uploads podem corresponder a fotos, exames ou documentos, mas a finalidade de cada arquivo ainda precisa ser identificada.

## Prototipo atual da UI

Os campos Cidade, Telefone, Email e Instagram atualmente demonstrados em `/cliente/anamnese` sao prototipo de migracao do formulario historico.

Essa demonstracao nao define que:

- a cliente editara seu cadastro definitivo dentro da anamnese;
- os valores serao persistidos como respostas da anamnese;
- todos os campos continuarao visiveis nessa tela na versao final;
- email de autenticacao e email de contato serao sincronizados automaticamente.

A UI podera ser reorganizada depois da decisao de fluxo. Qualquer alteracao do cadastro mestre deve ser uma operacao explicita sobre o cadastro da cliente, e nao efeito colateral silencioso da submissao da anamnese.

## Lacunas de evidencia

- As capturas disponiveis sao parciais.
- Paginas podem possuir campos acima ou abaixo dos trechos capturados.
- Nao ha evidencia suficiente para declarar que a lista e completa.
- Nem todos os campos podem ser classificados definitivamente nas 15 categorias.
- Obrigatoriedade do formulario atual nao esta validada para o app.
- Tipos finais de input nao estao aprovados.
- Validacoes nao estao aprovadas.
- Campos condicionais nao foram mapeados.
- Ordem final nao esta aprovada.
- Regras de visibilidade nao estao aprovadas.
- Quais dados irao para IA precisam ser definidos campo a campo.
- Alertas e bloqueios de saude continuam pendentes da Patty.
- O mapa completo dos arquivos solicitados na pagina de upload ainda nao esta identificado.

## Pendencias para especificacao futura

- Confirmar o mapa completo de campos do formulario atual.
- Decidir manter, alterar ou remover cada pergunta.
- Definir obrigatoriedade por campo no novo app.
- Definir tipo final de input por campo.
- Decidir se perguntas compostas permanecem juntas ou sao normalizadas em campos separados.
- Mapear campos condicionais.
- Definir ordem e agrupamento final.
- Decidir se medidas informadas na anamnese pertencem a resposta de anamnese, criam registro inicial de medicao/avaliacao ou migram para fluxo separado.
- Definir uploads: tipo, tamanho, quantidade, substituicao e exclusao.
- Separar finalidade de foto, exame e documento.
- Definir consentimento: texto definitivo, versao, base legal aplicavel, data/hora, forma de aceite, possibilidade/regras de revogacao, retencao e relacao entre consentimento e inicio do acompanhamento.
- Definir quais campos podem ser enviados a IA.
- Validar classificacao de cada campo.
- Definir, com Patty, se havera alertas ou bloqueios de saude.
- Definir em quais fluxos dados cadastrais precisarao coexistir entre Auth, cadastro da cliente ou snapshot de anamnese, especialmente Email.
