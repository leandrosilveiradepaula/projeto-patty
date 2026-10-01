# Auditoria desktop da interface administrativa — 2026-09-30

## Contexto

Auditoria visual realizada a partir de screenshots reais da interface administrativa desktop enviados pelo usuário.

Escopo desta rodada:
- desktop administrativo primeiro;
- mobile e PWA ficam explicitamente posteriores;
- nenhuma regra profissional, RLS, schema ou migration deve ser alterada por esta auditoria.

## Problemas observados nos screenshots

### 1. Dashboard redundante

O Dashboard repetia os mesmos destinos em:
- cards de resumo;
- cards de áreas operacionais;
- menu lateral.

Também havia muito espaço vertical para poucas informações.

### 2. Sidebar perde contexto ao rolar

Em páginas longas, a sidebar acompanhava a rolagem da página e deixava de manter a navegação principal visível.

### 3. Linguagem ainda muito técnica

Foram observados termos de implementação em telas operacionais, por exemplo:
- assignment;
- allowlist;
- Storage;
- credencial privilegiada;
- execution;
- started;
- completed_at;
- failed_at;
- RLS;
- identificadores internos.

Esses termos podem continuar na documentação técnica, mas não devem ser o vocabulário principal da Patty.

### 4. Estados vazios pouco acionáveis

Avaliações, Protocolos, Conteúdos e Exercícios mostravam apenas ausência de dados, sem orientar uma próxima ação segura quando existente.

### 5. Área de Arquivos pouco operacional

A tela listava clientes sem busca e o fluxo de upload ocupava largura excessiva, além de expor detalhes internos de implementação.

### 6. Navegação centrada em módulos

Após abrir uma cliente, a Patty ainda precisava pensar em módulos globais. O fluxo desejado é permanecer no contexto da cliente e trocar de área dentro dela.

## Implementado no PR #243

- Dashboard simplificado para Visão geral + Ações rápidas;
- cards de métrica compactos;
- sidebar desktop sticky, com rolagem própria quando necessária;
- sidebar reduzida de 280px para 264px;
- conteúdo principal pode usar até 1200px;
- Dashboard renomeado para Início na navegação;
- nome do usuário sem prefixo técnico "Admin:";
- tela de Pendências reduzida ao que exige acompanhamento;
- erro de regressão da lista de Pendências identificado em revisão estática e corrigido antes do merge;
- lista de clientes com linguagem de acompanhamento em vez de assignment;
- Arquivos com busca por cliente;
- textos técnicos de Arquivos e upload removidos;
- upload limitado a largura confortável no desktop;
- Avaliações e Protocolos com estado vazio orientado para Escolher cliente;
- Conteúdos e Exercícios com estados vazios mais naturais;
- IA renomeada para Análises da IA, removendo IDs e termos de lifecycle técnico da tela.

## Implementado no PR #244

Workspace contextual por cliente:
- Visão geral;
- Anamnese;
- Avaliações;
- Protocolos;
- Arquivos;
- Conteúdos;
- Check-ins.

Também:
- remoção de cartões redundantes na visão geral;
- foco da visão geral em Cadastro atual e Treino;
- encerramento do acompanhamento movido para o final;
- nenhuma rota inexistente adicionada.

## Ordem de validação

1. validar build do PR #243;
2. mergear e validar produção;
3. atualizar base do PR #244;
4. validar build do PR #244;
5. mergear e validar produção;
6. solicitar novos screenshots desktop;
7. fazer segunda auditoria visual;
8. somente depois retomar mobile/PWA.

## Bloqueio atual

A Vercel atingiu build-rate-limit em 2026-09-30.

Enquanto não houver capacidade de build:
- PR #243 permanece draft;
- PR #244 permanece draft;
- PR #242 PWA permanece draft;
- não empilhar mudanças não validadas em master.

## Fora de escopo

- redesign visual completo;
- branding definitivo;
- mobile;
- PWA;
- push notifications;
- regras nutricionais, de treino ou de progressão;
- mudança de RLS/permissão;
- automação de decisão profissional.
