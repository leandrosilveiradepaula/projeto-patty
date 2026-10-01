# Instalação do Projeto Patty no celular

## Estado

A fundação PWA está implementada na branch `codex/installable-pwa`, reconciliada com o master atual e em validação de CI/build antes de merge/publicação.

## Objetivo

Permitir que Patty e clientes instalem o Projeto Patty na tela inicial do telefone e o abram em modo aplicativo, mantendo a mesma aplicação Next.js/Vercel.

## Android

Após a publicação da fundação PWA:

1. abrir o Projeto Patty no Chrome;
2. abrir o menu do navegador;
3. escolher **Instalar app** ou **Adicionar à tela inicial**;
4. confirmar.

A nomenclatura pode variar por fabricante/navegador.

## iPhone / iPad

Após a publicação da fundação PWA:

1. abrir o Projeto Patty no Safari;
2. tocar em **Compartilhar**;
3. escolher **Adicionar à Tela de Início**;
4. confirmar.

## Segurança desta primeira versão

A instalação não cria uma cópia offline dos dados de atendimento.

Nesta etapa:

- não existe service worker de cache privado;
- Anamnese, avaliações, protocolos, fotos, exames e documentos continuam sendo buscados do servidor autenticado;
- sair da conta continua encerrando a sessão conforme o fluxo atual;
- push notification não está habilitada.

## Ícone

O monograma `C&M` usado nesta fundação é um **asset técnico provisório**. Ele não deve ser tratado como identidade visual definitiva da Consultoria Corpo e Mente. Quando a identidade/logo oficial estiver disponível e aprovada, os ícones podem ser substituídos sem mudar a arquitetura PWA.
