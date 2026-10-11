# Auditoria integrada - catálogo e recuperação de protocolos

**Data:** 2026-10-11. **Status:** implementado na branch; revisão, merge e deploy ainda necessários.

## Objetivo e evidências

O catálogo administrativo não possuía busca ou filtros, direcionava protocolos sem versão ao detalhe comum, e não expunha um caminho para retomar esses registros. A criação de protocolo podia escolher um registro inicial sem versão mesmo quando outro registro versionado já existia. Formulários de criação/retomada admitiam envios rápidos duplicados antes do processamento visual.

## Escopo

- Busca normalizada por nome canônico e nome histórico do perfil sem chavear vínculos por email.
- Filtros por presença real de versão, contagem, ordenação estável e recuperação do filtro vazio.
- Links identificam protocolo e cliente por IDs existentes; o workspace expõe a âncora exata.
- IDs malformados retornam 404 antes da consulta ao banco.
- Criação inicial e recuperação continuam ações server-side com verificação de role, cliente acessível e versão existente, protegidas na interface contra duplo clique.
- Formulários têm indicação acessível de processamento e disposição responsiva.
- Testes determinísticos e de contratos complementam o CI.

## Fora de escopo e riscos

Não alterar schema, Auth, RLS, acesso a ex-clientes, regras nutricionais, alimentação, treino, publicações ou histórico. A trava da interface não oferece idempotência entre abas e o backend continua sendo a autoridade. Testes E2E reais autenticados e configuração do ambiente de produção ainda dependem de validação específica.
