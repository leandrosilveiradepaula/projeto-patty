# Triagem de metadados dos conteudos do Drive

Data da triagem: 2026-09-23.

## Escopo e limite

Esta triagem usa exclusivamente o manifesto de metadados já existente em `drive_content_manifest.json`.

Ela **não**:

- abre ou interpreta o conteúdo interno dos arquivos;
- confirma autoria;
- confirma direito/licença de uso ou distribuição;
- define taxonomia final;
- transforma as pastas históricas `TREINO FEMININO` e `TREINO MASCULINO` em regra de produto;
- aprova migração;
- aprova publicação;
- cria release para cliente.

Toda categoria registrada em `drive_content_triage.json` tem status `hypothesis_from_metadata`.

## Resultado objetivo

Foram triados os mesmos 89 itens do inventário:

- 15 itens educacionais;
- 74 vídeos de exercícios;
- 65 vídeos de exercícios possuem nomes descritivos suficientes para uma **hipótese de título**, ainda sujeita a revisão técnica;
- 9 vídeos da pasta histórica `TREINO MASCULINO` possuem nomes numéricos/genéricos e não permitem inferir com segurança qual exercício demonstram;
- 16 nomes normalizados aparecem em ambas as pastas históricas de exercícios, totalizando 32 arquivos candidatos a comparação de duplicidade;
- 0 itens tiveram direitos confirmados;
- 0 itens foram autorizados para migração;
- 0 itens foram autorizados para publicação.

## Possíveis duplicidades por metadado

Os seguintes nomes aparecem nas duas pastas históricas de exercícios. Isso **não prova** que os arquivos tenham o mesmo vídeo; significa apenas que merecem comparação antes de criar dois registros de exercício:

- Agachamento;
- Agachamento búlgaro;
- Agachamento isométrico;
- Coice;
- Desenvolvimento;
- Desenvolvimento Arnold;
- Elevação lateral frontal;
- Elevação posterior de ombros;
- Flexor deitado;
- Flexor em pé;
- Meio terra;
- Panturrilhas;
- Pull over;
- Rosca direta;
- Serrote;
- Stiff.

A decisão de manter versões distintas, consolidar ou renomear depende de revisão visual/técnica futura.

## Categorias propostas para revisão

### Educacional

As categorias abaixo são apenas agrupamentos derivados do nome da pasta de origem:

| Pasta histórica | Categoria proposta | Observação |
| --- | --- | --- |
| Apresentação METODOLOGIA | `methodology_presentation` | seis arquivos; ordem/série precisa ser revisada |
| ASSISTIR TODOS OS DIAS | `daily_viewing_material` | título final e finalidade precisam ser revisados |
| Como utilizar a BALANÇA DE ALIMENTOS | `food_scale_how_to` | orientação educacional aparente pelo nome da pasta |
| Fórmulas by Patty Torres | `formulas_reference` | autoria aparece no nome histórico, mas não está confirmada documentalmente |
| Receitas | `recipes` | mídia mista: PDF, PNG e MP4 |
| Sugestão de um cardápio visto pelos olhos da Corpo e Mente | `meal_suggestion_reference` | planilha; não é protocolo/regra automática |
| WHEY, Como tomar? | `whey_guidance` | orientação educacional aparente pelo nome da pasta |

### Exercícios

Para arquivos com nomes descritivos, a triagem usa `exercise_demonstration` como categoria genérica de revisão. Isso não valida execução, prescrição, progressão, equipamento, grupo muscular ou adequação para qualquer cliente.

Arquivos numéricos recebem `exercise_video_unclassified_title` e exigem inspeção do conteúdo antes até mesmo de definir o nome do exercício.

## Ondas recomendadas de revisão

Estas ondas são uma **recomendação operacional de revisão**, não prioridade de publicação:

1. **wave_1_educational_clear_source_group** — materiais educacionais com pasta de origem semanticamente clara;
2. **wave_2_educational_mixed_media** — pasta `Receitas`, por combinar formatos e exigir revisão de origem/direitos de cada item;
3. **wave_3_exercise_descriptive_titles** — exercícios com nomes descritivos, começando por checagem técnica e duplicidades;
4. **wave_4_exercise_generic_titles** — nove vídeos cujo nome não identifica o exercício.

## Gate mínimo antes de qualquer migração física

Para cada arquivo candidato, ainda é necessário registrar:

- autoria confirmada ou origem responsável;
- direito/licença de uso e distribuição;
- título final;
- categoria/taxonomia final;
- necessidade e resultado da revisão da Patty quando houver orientação profissional;
- para exercício, revisão técnica do movimento e metadados finais;
- arquivo de origem exato;
- decisão explícita de migrar;
- somente depois, versão publicada e eventual release.

## Arquivo machine-readable

`drive_content_triage.json` contém a triagem dos 89 itens individualmente, incluindo:

- categoria proposta e sua base;
- título normalizado quando o metadado permite;
- rótulo histórico de audiência, sem tratá-lo como regra;
- grupo de possível duplicidade;
- flags de revisão;
- onda recomendada de revisão;
- estados de direitos, migração e publicação.

O arquivo é uma ferramenta de revisão. Não deve alimentar publicação automática.
