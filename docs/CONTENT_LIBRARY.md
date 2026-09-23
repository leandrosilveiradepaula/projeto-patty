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

Uma primeira onda de revisao controlada foi registrada em `DRIVE_CONTENT_REVIEW_WAVE_1.md` e `drive_content_review_wave_1.json`. Ela revisou somente tres itens selecionados:
- video de uso da balanca: candidato apos revisao humana, ainda sem autorizacao;
- planilha `Sugestao de refeicoes`: referencia historica, nao regra atual de numero de refeicoes;
- `Fórmulas.pptx`: hold profissional porque suplementacao/manipulados continuam abertos e o material contem afirmacoes sensiveis/comerciais.

Nenhum dos tres foi autorizado para migracao ou publicacao.

### RECOMENDACAO TECNICA

Antes de migrar conteudos para o aplicativo, completar o inventario do Drive e classificar os materiais por tipo, publico, status de revisao, permissao de uso e relacao com protocolos.

Conteudos devem ser publicados no aplicativo apenas apos validacao da Patty quando envolverem orientacoes sensiveis ou metodo profissional.

## Privacidade

### DECISAO CONFIRMADA

Fotos, exames e documentos de clientes devem ser privados.

Nao usar dados reais no desenvolvimento inicial.

## Questoes abertas

### QUESTAO ABERTA

Ainda e necessario definir a taxonomia da biblioteca educacional.

### QUESTAO ABERTA

Ainda e necessario definir a taxonomia da biblioteca de exercicios.

### QUESTAO ABERTA

Ainda e necessario definir quais conteudos do Drive podem ser migrados primeiro.

### QUESTAO ABERTA

Ainda e necessario definir processo de revisao, aprovacao e versionamento dos conteudos.
