# Inventario inicial de conteudos do Google Drive

Data do levantamento: 2026-09-22.

## Objetivo

Registrar uma primeira fotografia da estrutura de conteudos nao client-scoped encontrada no Google Drive compartilhado da Consultoria Corpo e Mente.

Este inventario:

- usa somente metadados de Drive;
- nao copia arquivos para o aplicativo;
- nao publica nenhum material;
- nao avalia nem concede direito de distribuicao;
- nao inclui pastas de clientes ou outros materiais com PII;
- nao substitui uma revisao completa do Drive.

A origem principal identificada foi a pasta compartilhada `Consultoria Corpo e Mente`, ID `1faC7qUZ47E9lDZvSm9fSqrimH6mZxpab`.

## Manifesto machine-readable

Os mesmos 89 arquivos estao registrados em `drive_content_manifest.json` com:

- ID do arquivo de origem;
- ID e nome da pasta de origem;
- titulo original;
- MIME type;
- tamanho em bytes;
- data de modificacao quando informada pelo Drive;
- biblioteca de destino confirmada apenas no nivel `educational` ou `exercise`;
- `rights_status = unreviewed`;
- `migration_status = inventory_only`.

O manifesto existe para rastreabilidade e futura importacao controlada. Ele nao e tabela de publicacao, nao autoriza distribuicao e nao substitui a decisao ainda aberta sobre como referencias de origem serao persistidas no modelo de dados.

A triagem posterior baseada exclusivamente nesses metadados esta documentada em `DRIVE_CONTENT_TRIAGE.md` e `drive_content_triage.json`. Ela nao le o conteudo dos arquivos nem altera `rights_status` ou `migration_status`.

Uma revisao de segunda passada em 2026-09-23 revalidou os 89 itens sem divergencias e identificou 21 arquivos adicionais em outras pastas nao client-scoped aparentes da raiz. Essa revisao esta em `DRIVE_CONTENT_INVENTORY_REVIEW.md` e `drive_content_inventory_review.json`. O manifesto original foi preservado para manter a proveniencia da primeira passada.

## Resumo da primeira passada

Foram inventariados 89 arquivos em ramos claramente educacionais ou de exercicios:

- biblioteca educacional: 15 arquivos, aproximadamente 927,7 MiB;
- biblioteca de exercicios: 74 videos, aproximadamente 2,13 GiB;
- total desta primeira passada: aproximadamente 3,04 GiB.

A separacao abaixo e classificacao de inventario, nao taxonomia final de produto.

## Biblioteca educacional

| Origem no Drive | Folder ID | Arquivos | Tipos observados | Tamanho aproximado |
| --- | --- | ---: | --- | ---: |
| Sugestao de um cardapio visto pelos olhos da Corpo e Mente | `1nc_SfXESsawLzTtqWBtrxvhVmyuhZ72u` | 1 | XLSX | < 0,1 MiB |
| Formulas by Patty Torres | `1T6M8oOKMoBvTloQ_SCPGJz-Y-7rJhtir` | 1 | PPTX | 0,2 MiB |
| Como utilizar a BALANCA DE ALIMENTOS | `1UPCZshVCGtiTYOsdp3F3kxeV7BO9XQZ7` | 1 | MP4 | 117,6 MiB |
| ASSISTIR TODOS OS DIAS | `1TISQWTIMDJqB9XO4W9pz34xweTBhrjbD` | 1 | MP4 | 202,9 MiB |
| WHEY, Como tomar? | `1RosLXgnk55im1NrpPkgyTkg5KGLyFkzZ` | 1 | MP4 | 325,4 MiB |
| Apresentacao METODOLOGIA | `1HFAbyGrMLaTSIotwuR7YI--HvPwc4pB4` | 6 | video/mpeg | 245,9 MiB |
| Receitas | `1iGWZ15AHvTuP1aXCKvgKRsZMSq1d4e_0` | 4 | PDF, PNG, MP4 | 35,8 MiB |

### Observacoes factuais

- `Apresentacao METODOLOGIA` contem seis partes de video.
- `Receitas` contem um PDF, uma imagem PNG e dois videos MP4.
- Os materiais acima ainda precisam de classificacao quanto a autoria, direito de uso, audiencia, revisao e versao antes de qualquer publicacao no aplicativo.

## Biblioteca de exercicios

A origem identificada foi `EXERCICIOS PARA FAZER EM CASA`, folder ID `19YbA436OR9syVhJ4sY8-jDbt9ZJDreuw`.

| Origem no Drive | Folder ID | Arquivos | Tipos observados | Tamanho aproximado |
| --- | --- | ---: | --- | ---: |
| TREINO MASCULINO | `1BX8KnL4uCb33qa9226yu8KuxGK0ncONO` | 37 | MP4 | 1.030,0 MiB |
| TREINO FEMININO | `1BRO9OUXnSAwyKDpIR5Mhak-P1VcH8v7t` | 37 | MP4 | 1.151,3 MiB |

Os nomes dos arquivos indicam demonstracoes individuais de exercicios, mas nomes historicos nao definem a taxonomia final nem programacao de treino.

Nao foi feita nesta etapa avaliacao tecnica do movimento, prescricao, progressao, publico, equipamento, grupo muscular ou adequacao clinica.

## Itens deliberadamente fora desta primeira passada

- pastas ou arquivos de clientes;
- fotos, exames e documentos client-scoped;
- materiais cuja relacao com a biblioteca nao esteja clara pelo metadado;
- leitura do conteudo interno dos arquivos;
- migracao fisica;
- upload para Supabase Storage;
- criacao automatica de registros em `educational_contents` ou `exercises`;
- definicao de release para clientes.

## Estado apos revisao de segunda passada

Os 89 itens deste inventario continuam consistentes com o Drive atual para as pastas originalmente cobertas.

A segunda passada acrescentou 21 arquivos conhecidos por metadado, elevando a cobertura conhecida para 110 arquivos. Esses 21 itens nao foram incorporados ao manifesto original porque possuem gates distintos de privacidade, finalidade, direitos ou revisao profissional.

Consultar `DRIVE_CONTENT_INVENTORY_REVIEW.md`.

## Proximos gates antes da migracao

### PENDENCIA DE PRODUTO

Definir a taxonomia final da biblioteca educacional e da biblioteca de exercicios.

### PENDENCIA DE CONTEUDO

Para cada material candidato a migracao, registrar pelo menos:

- origem;
- titulo normalizado;
- biblioteca de destino;
- autoria;
- direito/licenca de uso e distribuicao;
- necessidade de revisao da Patty;
- audiencia;
- status de aprovacao;
- arquivo fonte exato;
- versao publicada, quando houver.

### PENDENCIA DE MIGRACAO

Definir quais conteudos do Drive podem ser migrados primeiro.

Nenhum item deste inventario deve ser liberado automaticamente por fase ou para cliente.
