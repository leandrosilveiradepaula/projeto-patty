# Auditoria de UX e navegabilidade — 2026-09-30

## Objetivo

Revisar a interface atual do Projeto Patty com foco em navegabilidade, clareza de ações, feedback, linguagem operacional, prevenção de erros e consistência entre a área administrativa e a área da cliente.

Esta auditoria não altera regras profissionais, autorização, RLS ou lógica clínica/nutricional.

## Evidência revisada

- estrutura de rotas `app/admin` e `app/cliente`;
- shells e navegação administrativa/cliente;
- componentes compartilhados de UI;
- dashboard da Patty;
- área inicial da cliente;
- lista e detalhe de clientes;
- fluxos de Anamnese, avaliações, protocolos, conteúdos, arquivos e check-ins;
- server actions associadas a ações críticas;
- página pública de login no deployment de produção.

## Problemas identificados e corrigidos neste lote

### 1. Linguagem excessivamente técnica

Algumas telas expunham termos úteis para desenvolvimento, mas inadequados para operação diária, como `backend`, `client-scoped`, `assignment`, `snapshot`, `append-only`, detalhes de bucket e identificadores UUID.

Correção:
- preservar esses conceitos na documentação e nas boundaries;
- usar linguagem de atendimento nas telas;
- remover identificadores internos de listas quando não ajudam a Patty.

### 2. Ações críticas com pouca fricção

Ações com impacto relevante podiam ser disparadas diretamente:
- submeter versão de protocolo;
- aprovar versão;
- publicar para cliente;
- encerrar atribuição;
- liberar arquivo administrativo para cliente.

Correção:
- confirmação explícita na interface;
- mesma confirmação validada no server action;
- RLS e autorização existentes permanecem como camada independente.

### 3. Falta de feedback em check-ins

O registro de líquido, atividade física e nova meta de líquidos não apresentava confirmação visual clara e os formulários não tinham estado de envio padronizado.

Correção:
- feedback de sucesso após o registro;
- botão reutilizável com estado `pending`;
- retorno para a mesma tela já atualizada.

### 4. Navegação de cliente em rotas fora da barra inferior

`Arquivos` e `Check-ins` são acessíveis pela home, mas não pertencem à barra inferior de cinco itens. Nessas telas faltava retorno explícito.

Correção:
- adicionar `Voltar ao início`;
- não ampliar a barra inferior sem necessidade;
- não expor `Jornada` enquanto a própria página permanecer indisponível.

### 5. Busca de clientes

A lista administrativa exigia varredura visual completa.

Correção:
- busca por nome sobre o conjunto de clientes já autorizado e retornado pelo backend;
- normalização de acentos e caixa;
- sem consulta adicional que amplie o escopo autorizado.

### 6. Contexto no cabeçalho administrativo mobile

No mobile, o cabeçalho mostrava apenas a ação de abrir navegação.

Correção:
- exibir a marca Corpo & Mente;
- reduzir o rótulo visual para `Menu`;
- manter rótulo acessível explícito.

### 7. Datas operacionais em UTC

Algumas telas administrativas formatavam datas em UTC, enquanto outras já usavam o fuso operacional do projeto.

Correção:
- padronizar as telas revisadas para `America/Sao_Paulo`.

## Decisão de UX preservada

A rota `/admin/configuracoes` existe, mas ainda não oferece funcionalidade. Ela **não foi adicionada ao menu**, porque expor um destino vazio aumentaria a fricção.

Da mesma forma, a área `/cliente/jornada` continua fora da navegação principal enquanto sua composição não estiver formalizada.

## Itens para próximas rodadas de UX

Sem depender de nova regra profissional, ainda podem ser avaliados em tarefas separadas:

- contexto/breadcrumb consistente entre a ficha da cliente e suas subáreas;
- revisão de densidade e hierarquia visual das páginas longas de protocolo e Anamnese;
- estados vazios com próxima ação quando existir uma ação segura;
- consistência de rótulos de botões e links (`Abrir`, `Ver`, `Acessar`);
- acessibilidade de foco, ordem de tabulação e leitura por screen reader;
- revisão responsiva das telas administrativas em tablet;
- redução adicional de textos de implementação em telas de operação;
- feedback uniforme para demais server actions;
- confirmação contextual para outras ações irreversíveis que forem identificadas.

## Fora de escopo desta auditoria

- novas regras do método;
- mudança automática de fase;
- automação de decisão profissional;
- mudança de permissões/RLS;
- schema/migrations;
- exposição de funcionalidades ainda incompletas;
- redesign de marca ou alteração estética ampla sem necessidade funcional.
