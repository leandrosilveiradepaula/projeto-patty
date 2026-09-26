# Vercel Private Blob - provisionamento do lote educacional

Data de referencia: 2026-09-26.

Este runbook cobre somente a criacao/conexao do Vercel Blob privado necessario ao primeiro lote de midia educacional.

Ele nao autoriza:
- baixar ou alterar o original do Google Drive;
- enviar qualquer arquivo antes da verificacao do store;
- criar asset no Supabase;
- publicar versao de conteudo;
- liberar conteudo para cliente.

A fonte de verdade do lote permanece `docs/educational_media_migration_batch_1.json`.

## Pre-condicoes

Antes de executar:
- trabalhar a partir do projeto Vercel de producao ja existente do Projeto Patty;
- nao criar um novo projeto Vercel;
- confirmar que o repositorio esta associado ao projeto correto;
- manter o store com acesso `private`;
- nao copiar tokens ou secrets para chat, issue, PR, log ou arquivo versionado.

## Caminho preferencial - Vercel CLI

No repositorio do Projeto Patty, usando uma sessao Vercel autenticada:

```bash
vercel link
vercel blob list-stores --all
```

Se nao existir um store privado conectado ao projeto, criar um store dedicado para a biblioteca educacional:

```bash
vercel blob create-store projeto-patty-educational-media --access private --environment production --yes
```

Nao definir outra regiao por suposicao. Se houver necessidade de escolher regiao diferente do default da Vercel, registrar a decisao antes.

Depois da criacao:

```bash
vercel blob list-stores
```

O resultado esperado e um unico store selecionado para este uso, com acesso privado e conectado ao projeto correto.

## Caminho alternativo - Dashboard

Se o CLI nao puder ser usado, criar o store pelo dashboard da Vercel no projeto existente:
1. abrir Storage / Blob do projeto;
2. criar um Blob store dedicado;
3. selecionar acesso privado;
4. conectar ao ambiente de producao do Projeto Patty;
5. confirmar que o projeto recebeu a configuracao necessaria do Blob sem expor o valor de qualquer token.

## Gate de verificacao

Somente considerar esta etapa concluida quando todos os itens abaixo forem verdadeiros:
- store existe;
- store esta conectado ao projeto correto;
- acesso e `private`;
- configuracao do projeto para acesso ao Blob existe;
- nenhum arquivo foi enviado ainda;
- nenhum asset foi criado no Supabase;
- nenhum conteudo foi publicado ou liberado.

Nao registrar valores de `BLOB_READ_WRITE_TOKEN`, `VERCEL_OIDC_TOKEN` ou qualquer secret na documentacao.

## Proxima sequencia permitida

Depois de o store estar confirmado, seguir exatamente a ordem do manifesto:
1. baixar a fonte aprovada sem modificar o original;
2. conferir tamanho e MIME;
3. calcular SHA-256;
4. criar ou selecionar versao educacional ainda nao publicada;
5. gerar path opaco sem PII;
6. enviar o Blob privado;
7. verificar tamanho, MIME e SHA-256 do objeto enviado;
8. registrar `educational_content_asset` enquanto a versao estiver em draft;
9. revisao humana;
10. publicacao explicita;
11. release explicita para cliente.

Qualquer falha de integridade interrompe o lote. Nao corrigir tamanho, MIME, hash ou path por estimativa.
