# Rodada 2 de decisoes com a Patty

Objetivo desta rodada: resolver as 20 decisoes que hoje mais destravam o MVP, sem repetir perguntas ja respondidas e sem transformar exemplos historicos em regra geral.

Esta rodada parte das decisoes ja documentadas em `DECISIONS.md`, `BUSINESS_RULES.md` e `MVP_READINESS.md`.

## O que nao precisa ser perguntado novamente

Ja esta decidido, entre outros pontos:

- somente a Patty sera admin/profissional de negocio no MVP;
- login principal sera email + senha;
- MFA e obrigatorio para admin;
- cliente entra por convite/ativacao controlada, sem cadastro publico;
- somente a Patty inicia/encerra assignments;
- formatos, limites de tamanho e fluxo de upload privado ja estao definidos;
- nao ha limite rigido de quantidade de arquivos no MVP;
- upload da cliente fica visivel para ela por padrao;
- upload da Patty fica oculto ate liberacao explicita;
- o primeiro MVP nao tera antimalware dedicado;
- o fluxo principal confirmado do metodo termina, por enquanto, em Cutting 2: 2 Low / 1 High.

## 1. Anamnese final

1. Quais perguntas do formulario atual precisam obrigatoriamente permanecer no novo aplicativo?

2. Quais perguntas do formulario atual podem ser removidas sem prejudicar sua avaliacao inicial?

3. Quais perguntas precisam ser reformuladas antes de entrar no aplicativo? Se possivel, diga a pergunta atual e como voce prefere perguntar.

4. Quais perguntas devem ser obrigatorias para permitir o envio da Anamnese?

5. Quais perguntas devem aparecer somente quando uma resposta anterior tornar aquela pergunta relevante? Para cada uma, qual resposta deve disparar a pergunta seguinte?

6. Qual deve ser a ordem final das secoes da Anamnese? Se a ordem atual ja estiver boa, basta confirmar isso.

7. As medidas que hoje aparecem na Anamnese devem:
   - permanecer apenas como resposta da Anamnese;
   - criar tambem uma avaliacao inicial;
   - ou sair da Anamnese e ficar somente em Avaliacoes?

8. Depois de enviada, a cliente podera corrigir uma resposta da Anamnese? Se sim, voce prefere uma nova versao/correcao historica sem apagar a resposta original?

## 2. Cadastro Atual e conta da cliente

9. Onde a cliente deve atualizar Cidade, Telefone, Email de contato e Instagram: em Perfil/Cadastro Atual, durante a Anamnese, ou em ambos com uma fonte principal definida?

10. Para cada um desses quatro campos, quem pode alterar: cliente, Patty ou ambos?

11. Quais mudancas cadastrais precisam ficar registradas em historico/auditoria? Por exemplo: troca de telefone ou email de contato.

12. Quando uma cliente nova entra no sistema, qual fluxo operacional voce prefere?
   - Patty cria/seleciona a cliente e envia convite;
   - a cliente recebe o convite, cria a senha e ativa a conta;
   - outro fluxo.
   Descreva apenas as etapas humanas que voce espera executar.

13. Quando o acompanhamento termina, o login da cliente deve ser desativado imediatamente, permanecer ativo apenas para consulta do historico publicado, ou seguir outra regra?

## 3. Avaliacoes e medidas

14. Quais medidas fazem parte do conjunto padrao de uma avaliacao no seu metodo e qual unidade deve ser usada para cada uma?

15. Alguma medida e obrigatoria para considerar uma avaliacao completa, ou isso varia caso a caso?

16. Se uma medida antiga foi registrada errada, voce prefere:
   - registrar uma correcao com historico;
   - criar nova avaliacao;
   - permitir editar o valor antigo;
   - outra regra?

## 4. Conteudos e exercicios

17. Quais conteudos educacionais do material atual voce considera prioridade para o primeiro lote no aplicativo? Pode responder por tema/categoria, sem listar todos os arquivos.

18. A biblioteca de exercicios deve aparecer para a cliente de que forma no MVP?
   - nenhum exercicio visivel ainda;
   - somente exercicios liberados manualmente pela Patty;
   - todos os exercicios publicados;
   - outra regra.

## 5. Arquivos e proxima formalizacao do metodo

19. Em quais situacoes um arquivo privado ja aceito poderia ser removido fisicamente no futuro? Exemplos para decidir: arquivo enviado por engano, substituicao, pedido da cliente, fim do acompanhamento. Se voce nao quiser definir isso agora, diga explicitamente que prefere preservar tudo ate uma politica posterior.

20. Depois de fechar Anamnese, Cadastro e Avaliacoes, qual tema profissional deve ser formalizado primeiro?
   - Fases 5 e 6 do Carb Cycle;
   - etapas posteriores ao Cutting 2;
   - Bulking;
   - Consolidacao;
   - hidratacao;
   - suplementacao/manipulados;
   - treino/progressao/cardio;
   - criterios finais de avaliacao;
   - alertas profissionais.

## Como responder

Pode responder em linguagem simples, por numero.

Nao e necessario responder arquitetura, banco, Supabase, IA, n8n ou LangGraph nesta rodada.

Depois das respostas:

1. registrar cada regra confirmada em `DECISIONS.md`;
2. atualizar o documento aplicavel;
3. remover de `OPEN_QUESTIONS.md` apenas o que realmente ficou resolvido;
4. implementar somente depois da documentacao.

Se alguma resposta depender de caso individual, marcar como criterio de julgamento da Patty, nao como regra automatica.
