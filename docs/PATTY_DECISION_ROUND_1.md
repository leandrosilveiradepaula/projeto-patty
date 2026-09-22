# Rodada 1 de decisoes com a Patty

Objetivo desta rodada: resolver primeiro as decisoes que mais desbloqueiam o MVP operacional, sem transformar exemplos historicos em regra geral.

As respostas desta rodada nao viram automacao por si so. Depois da conversa, cada regra confirmada deve ser registrada em `DECISIONS.md`, refletida em `BUSINESS_RULES.md` ou outro documento aplicavel e removida de `OPEN_QUESTIONS.md` somente quando realmente resolvida.

## 1. Anamnese final

1. Quais perguntas do formulario atual precisam obrigatoriamente permanecer no novo aplicativo?

2. Quais perguntas do formulario atual podem ser removidas sem prejudicar seu metodo?

3. Quais perguntas precisam ser reformuladas antes de entrar no novo aplicativo?

4. Quais perguntas devem ser obrigatorias para permitir a submissao da Anamnese?

5. Quais perguntas devem aparecer apenas quando uma resposta anterior tornar aquela pergunta necessaria?

6. A parte de Cadastro (Cidade, Telefone, Email de contato e Instagram) deve continuar dentro da Anamnese ou ficar apenas no Perfil/Cadastro Atual?

7. As medidas informadas na Anamnese devem permanecer como respostas da propria Anamnese, criar tambem uma avaliacao inicial, ou ficar somente no fluxo de Avaliacoes?

8. Depois que a cliente enviar a Anamnese, ela podera corrigir alguma resposta? Se sim, a correcao deve criar nova versao/historico em vez de substituir o envio original?

## 2. Uploads e arquivos privados

9. Quais tipos de arquivo a cliente deve poder enviar no primeiro MVP: fotos, exames, outros documentos ou apenas alguns desses?

10. Quem pode fazer upload de cada tipo de arquivo: somente cliente, somente Patty ou ambos?

11. Qual limite maximo por arquivo voce considera adequado para o MVP?

12. Existe um limite de quantidade por envio ou por avaliacao que voce quer aplicar?

13. A cliente pode excluir ou substituir um arquivo depois de enviado? Se sim, em quais situacoes?

14. Quais arquivos a cliente deve poder visualizar novamente depois do envio e quais devem permanecer somente no painel administrativo?

15. Quais formatos voce realmente precisa aceitar no primeiro MVP? Por exemplo: JPG/PNG para fotos e PDF para exames/documentos.

## 3. Avaliacoes e acompanhamento

16. Quais medidas fazem parte do conjunto padrao de uma avaliacao no seu metodo?

17. Quais unidades devem ser usadas para cada medida?

18. Alguma medida e obrigatoria para considerar uma avaliacao completa, ou isso varia por cliente?

19. Quando houver erro em uma avaliacao antiga, voce prefere corrigir criando um novo registro de correcao/historico ou permitir editar o registro existente?

20. Quais partes do acompanhamento profissional (dificuldade, percepcao de adesao, observacao, decisao e motivo) podem futuramente ser mostradas para a cliente, se alguma?

## 4. Operacao do MVP

21. No primeiro lancamento, somente voce sera admin/profissional ou ja precisamos suportar outras pessoas da equipe?

22. Quem deve poder criar, alterar ou encerrar a atribuicao de uma cliente a um profissional?

23. Como voce imagina a entrada de uma nova cliente no sistema no MVP: convite enviado por voce/equipe ou cadastro iniciado pela propria cliente?

24. Para login inicial, voce prefere senha, magic link por email ou outra forma?

## 5. Metodo profissional que bloqueia automacao futura

25. Entre estes temas ainda abertos, qual deve ser a proxima prioridade para formalizacao depois da Anamnese e uploads?
- Fases 5 e 6 do Carb Cycle;
- etapas posteriores ao Cutting 2;
- Bulking;
- Consolidacao;
- hidratacao;
- suplementacao/manipulados;
- treino/progressao/cardio;
- criterios finais de avaliacao;
- alertas profissionais.

## Como usar esta rodada

A ideia e responder apenas estas 25 perguntas agora.

Depois das respostas:

1. registrar cada regra confirmada na documentacao;
2. marcar como pendencia o que continuar indefinido;
3. atualizar `OPEN_QUESTIONS.md`;
4. somente entao implementar automacoes ou validacoes que dependam dessas decisoes.

Nao e necessario responder perguntas tecnicas de arquitetura, IA, n8n, LangGraph ou detalhes juridicos nesta rodada, salvo se alguma resposta acima depender diretamente deles.
