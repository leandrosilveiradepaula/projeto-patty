## Biblioteca de exercicios e visibilidade por cliente

### REGRA CONFIRMADA PELA PATTY EM 2026-10-06

A biblioteca de exercicios e um catalogo global administrado pela Patty. Ela pode cadastrar todos os exercicios que considerar disponiveis para composicao profissional de treinos.

Cada cliente recebe um subconjunto individual escolhido pela Patty. A publicacao de uma versao na biblioteca apenas a torna disponivel para selecao profissional; nao libera o exercicio globalmente para clientes.

A cliente deve visualizar somente os exercicios que pertencem ao treino selecionado e publicado para ela. O conjunto pode variar entre clientes e pode ser alterado manualmente pela Patty, com preservacao do historico do treino efetivamente publicado.

# Biblioteca de Conteudo

## Conteudo existente

### DECISAO CONFIRMADA

Todo o conteudo atual do Google Drive deve ser preservado.

O aplicativo substituira gradualmente o Drive para os clientes.

## Separacao de bibliotecas

### DECISAO CONFIRMADA

A biblioteca educacional deve ser separada da biblioteca de exercicios.

## Migracao gradual

### FATO CONFIRMADO DE LEVANTAMENTO

Uma primeira passada de inventario de metadados do Google Drive foi registrada em `DRIVE_CONTENT_INVENTORY.md`, separando materiais educacionais de exercicios e excluindo deliberadamente pastas client-scoped.

O inventario nao representa autorizacao de migracao ou publicacao.

Uma triagem adicional somente por metadados foi registrada em `DRIVE_CONTENT_TRIAGE.md` e `drive_content_triage.json`. Ela cobre os 89 itens individualmente, mas suas categorias sao apenas hipoteses derivadas de nome de arquivo/pasta. Direitos continuam `unreviewed`, nenhuma migracao foi autorizada e nenhum rótulo historico de audiencia foi promovido a taxonomia do produto.

A triagem identificou 16 grupos de possiveis duplicidades por nome normalizado entre as pastas historicas de exercicios e 9 videos com nomes genericos que exigem inspecao antes ate mesmo da definicao do titulo final.

Uma segunda passada de metadados em 2026-09-23 revalidou os 89 itens originais sem divergencias e identificou 21 arquivos adicionais, totalizando 110 arquivos conhecidos por metadado no escopo revisado. Os 21 adicionais incluem 8 videos candidatos educacionais, 6 imagens operacionais que exigem revisao de privacidade/likeness e 7 PDFs em `Livros` que devem permanecer em hold de direitos antes de qualquer distribuicao. Consultar `DRIVE_CONTENT_INVENTORY_REVIEW.md`.

Uma primeira onda de revisao controlada foi registrada em `DRIVE_CONTENT_REVIEW_WAVE_1.md` e `drive_content_review_wave_1.json`. Naquele momento, os tres itens ainda estavam sem autorizacao final; as confirmacoes posteriores da Patty registradas abaixo substituem esse estado de triagem inicial.

### REGRA CONFIRMADA PELA PATTY

O video `Como utilizar a BALANCA DE ALIMENTOS` foi confirmado pela Patty como material da Consultoria/Patty, atual e autorizado para disponibilizacao as clientes.

Ele e o primeiro conteudo atualmente elegivel para migracao controlada. Elegivel nao significa migrado ou publicado: o arquivo ainda precisa passar pela operacao tecnica de copia para o aplicativo, registro/versionamento e liberacao explicita.

### BLOQUEIO TECNICO DE MIDIA

O arquivo aprovado da balanca possui 123.262.796 bytes (~117,6 MiB). O Supabase atual esta no plano Free e nao aceita uploads acima de 50 MB. Alem disso, o bucket `client-private` e exclusivo do dominio de arquivos privados de clientes e nao deve ser reaproveitado para conteudo educacional.

A estrategia de armazenamento foi definida tecnicamente como Vercel Private Blob para a primeira versao operacional. O Supabase continua como fonte de verdade de metadata/versionamento/releases. A documentacao atual da Vercel recomenda cautela para entrega de blobs privados acima de 100 MB; como o video aprovado possui ~117,6 MiB, o store privado pode ser provisionado, mas publicacao/release desse arquivo exige validacao de entrega e transferencia no ambiente real antes de ser considerado operacional.

A fundacao de metadata de assets foi preparada em `educational_content_assets`. Em 2026-10-03 o store privado `projeto-patty-blob` foi criado e conectado ao projeto Vercel de producao, em `iad1`, usando a conexao OIDC padrao e sem token read-write persistente. O arquivo aprovado ainda nao foi copiado. A migracao fisica continua separada: baixar novamente o original, conferir SHA-256/tamanho/MIME, gerar path opaco, enviar ao Blob privado, verificar o objeto, registrar o asset na versao draft, revisar, publicar e liberar explicitamente.

A Patty confirmou tambem que a planilha historica `Sugestao de refeicoes` deve ser transformada em **conteudo educacional revisado** para clientes. O arquivo historico pode servir como fonte editorial, mas a versao publicada no aplicativo nao deve cristalizar seis refeicoes como regra, porque o metodo confirmado nao possui numero fixo de refeicoes.

Conteudos sobre formulas/manipulados tambem foram confirmados pela Patty como parte do aplicativo. O arquivo historico `Fórmulas.pptx` nao esta autorizado para publicacao direta: ele deve passar por revisao profissional completa, atualizacao de alegacoes, validacao de referencias comerciais e confirmacao de direitos antes de gerar uma versao publicavel.

### RECOMENDACAO TECNICA

Antes de migrar os demais conteudos para o aplicativo, completar a classificacao por tipo, publico, status de revisao, permissao de uso e relacao com protocolos.

Conteudos devem ser publicados no aplicativo apenas apos validacao da Patty quando envolverem orientacoes sensiveis ou metodo profissional.

## Privacidade

### DECISAO CONFIRMADA

Fotos, exames e documentos de clientes devem ser privados.

Nao usar dados reais no desenvolvimento inicial.

## Questoes abertas

### QUESTAO ABERTA

Ainda e necessario definir a taxonomia da biblioteca educacional. Categorias derivadas de nomes de pastas/arquivos do Drive continuam sendo apenas hipoteses de triagem e nao devem virar taxonomia por importacao.

### QUESTAO ABERTA

Ainda e necessario definir a taxonomia da biblioteca de exercicios. Rotulos historicos como "TREINO FEMININO"/"TREINO MASCULINO" e categorias propostas por metadado nao sao taxonomia de produto nem regra de elegibilidade para clientes.

### PARCIALMENTE RESOLVIDO

O video `Como utilizar a BALANCA DE ALIMENTOS` e o primeiro item aprovado pela Patty para migracao controlada. Ainda e necessario decidir os proximos itens e o tamanho/ordem dos lotes seguintes.

### QUESTAO ABERTA

Ainda e necessario definir processo de revisao, aprovacao e versionamento dos conteudos.

## Primeiro lote de migracao controlada

### FATO DE IMPLEMENTACAO

O primeiro lote tecnico foi materializado em `educational_media_migration_batch_1.json` e possui teste automatizado de invariantes.

O lote contem somente:
- Drive file ID `1z61DpJfwp-6DMhYMpCRNafkSwX6h9LBE`;
- `MovaviClips_Video_20220217-143151.mp4`;
- `video/mp4`;
- 123.262.796 bytes;
- destino `vercel_blob` privado;
- asset `primary`.

O arquivo original deve permanecer preservado no Drive. O path final deve ser opaco e sem PII. Tamanho, MIME e SHA-256 devem ser conferidos a partir dos bytes reais antes do registro de `educational_content_assets`. O manifesto/testes atuais tambem impedem que asset, publicacao ou release sejam marcados como avancados antes de um upload Blob verificado.

### ESTADO OPERACIONAL RECONCILIADO 2026-10-07

O Blob store privado esta criado/conectado. A fonte aprovada foi reobtida read-only em 2026-10-07 e tamanho/MIME foram reconfirmados; o SHA-256 previamente verificado continua sendo gate e deve ser recomputado a partir dos bytes usados no upload. Nenhum upload Blob, registro de asset, publicacao ou release foi executado. O lote permanece fail-closed antes da transferencia fisica e da validacao de entrega privada do video acima de 100 MB.
