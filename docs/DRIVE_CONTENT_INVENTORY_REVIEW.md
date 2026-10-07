# Revisao do inventario de conteudos do Google Drive

Data da revisao: 2026-09-23.

## Objetivo

Revalidar o inventario inicial de 89 arquivos contra o Google Drive atual e revisar as pastas visiveis na raiz compartilhada que ficaram fora da primeira passada.

Esta revisao permanece **somente em metadados**:
- nenhum arquivo foi aberto;
- nenhum conteudo interno foi interpretado;
- nenhum material foi copiado, migrado ou publicado;
- nenhum direito de uso/distribuicao foi presumido;
- nomes historicos nao foram transformados em taxonomia ou regra profissional.

## Resultado da revalidacao dos 89 itens originais

Os 89 itens de `drive_content_manifest.json` foram comparados com o estado atual das nove pastas de origem inventariadas.

Resultado:
- 89/89 arquivos continuam presentes;
- 0 arquivos novos nessas pastas;
- 0 arquivos removidos;
- 0 divergencias de titulo;
- 0 divergencias de MIME type;
- 0 divergencias de tamanho;
- 0 divergencias de `modified_time`.

Portanto, o manifesto original continua consistente para seu escopo.

## Lacuna encontrada na raiz compartilhada

A raiz `Consultoria Corpo e Mente` contem outras pastas que nao entraram na primeira passada.

A pasta `PONTO DE PARTIDA 📍` contem apenas a subpasta `Apresentacao METODOLOGIA`, cujos seis arquivos ja fazem parte do inventario original. Ela nao adiciona arquivos novos.

Oito outras pastas adicionam **21 arquivos** e aproximadamente **158,9 MiB** de metadados ainda nao registrados no manifesto original:

| Pasta | Arquivos | Tipos | Tamanho aprox. | Tratamento nesta revisao |
| --- | ---: | --- | ---: | --- |
| Modelo de Medidas | 2 | JPEG | 3,0 MiB | referencia operacional; exige revisao de privacidade/conteudo |
| Videos motivacionais | 1 | MP4 | 25,2 MiB | candidato educacional por metadado; direitos/revisao pendentes |
| Livros | 7 | PDF | 23,1 MiB | referencia de terceiros; **hold de direitos antes de qualquer distribuicao** |
| Modelo fotos mensais | 4 | JPEG | 1,3 MiB | referencia operacional; exige privacidade/likeness/revisao humana |
| O Custo de 1kg | 2 | MP4 | 27,4 MiB | candidato educacional por metadado; direitos/revisao pendentes |
| Servir de olho | 1 | MP4 | 15,7 MiB | candidato educacional por metadado; direitos/revisao pendentes |
| Periodizacao | 2 | MP4 | 31,3 MiB | candidato educacional; revisao profissional obrigatoria; nao vira regra de treino |
| Cadencia | 2 | MP4 | 31,8 MiB | candidato educacional; revisao profissional obrigatoria; nao vira regra de treino |

O delta machine-readable esta em `drive_content_inventory_review.json`.

## Leitura operacional dos 21 itens

### Grupo A - candidatos educacionais por metadado

Oito videos aparecem em pastas cujos nomes sugerem material explicativo/educacional:
- Videos motivacionais;
- O Custo de 1kg;
- Servir de olho;
- Periodizacao;
- Cadencia.

Essa classificacao e **hipotese por pasta/nome**, nao aprovacao editorial, tecnica ou profissional.

Especialmente `Periodizacao` e `Cadencia` nao podem ser tratadas como regra atual de treino da Patty sem revisao e documentacao explicita.

### Grupo B - referencias visuais operacionais

Seis imagens aparecem em:
- Modelo de Medidas;
- Modelo fotos mensais.

Sem abrir os arquivos nao e possivel confirmar:
- quem aparece nas imagens;
- se existe PII/likeness;
- autoria;
- permissao de reutilizacao;
- finalidade final no aplicativo.

Por isso esses itens nao receberam biblioteca de destino nesta revisao.

### Grupo C - livros / referencias de terceiros

Sete PDFs na pasta `Livros` possuem nomes que aparentam corresponder a publicacoes de terceiros/autores identificaveis.

Isso **nao prova a situacao juridica dos arquivos**, mas e suficiente para impor um gate conservador:

> nao migrar nem distribuir esses PDFs para clientes sem comprovacao explicita de direitos/licenciamento.

Eles permanecem `inventory_only` e sem biblioteca de destino definida.

## Cobertura conhecida apos esta revisao

Considerando:
- 89 arquivos do manifesto original;
- 21 arquivos adicionais desta segunda passada;

ha **110 arquivos conhecidos por metadado** dentro do escopo de conteudos/referencias nao client-scoped revisado ate aqui.

Esse numero nao significa que todos os 110 sejam candidatos de migracao:
- 89 pertencem ao inventario inicial educacional/exercicios;
- 8 novos sao apenas candidatos educacionais por metadado;
- 6 novos exigem revisao de privacidade/likeness e finalidade;
- 7 novos ficam em hold de direitos de terceiros.

## Recomendacao de proxima revisao

### RECOMENDACAO TECNICA

Nao iniciar migracao fisica em lote ainda. O primeiro item aprovado pode seguir apenas pelo lote controlado ja preparado, mantendo os demais em triagem.

A proxima revisao deve priorizar:

1. **direitos/autoria dos materiais educacionais proprios aparentes**, comecando pelos arquivos que a Patty reconhece como produzidos pela propria Consultoria;
2. **hold separado para livros de terceiros**, sem upload ao aplicativo;
3. **revisao visual controlada das seis imagens operacionais**, apenas para decidir privacidade/finalidade e sem copiar dados reais para desenvolvimento;
4. **revisao profissional dos videos Periodizacao/Cadencia**, sem extrair regra automatica do conteudo historico;
5. somente depois escolher um primeiro lote de migracao explicitamente aprovado.

## Limites

- nenhum arquivo foi aberto;
- nenhuma pessoa foi identificada;
- nenhum direito foi confirmado;
- nenhuma taxonomia final foi definida;
- nenhuma migration, Storage ou registro de conteudo foi criado;
- nenhuma release para cliente foi criada.
