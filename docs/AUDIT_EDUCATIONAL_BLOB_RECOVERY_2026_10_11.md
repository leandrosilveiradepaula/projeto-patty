# Auditoria de upload educacional privado — 11/10/2026

## Objetivo

Corrigir o bloqueio de reenvio após um upload incompleto e vincular o objeto Blob à versão autorizada, sem flexibilizar Auth/RLS, publicações ou liberações.

## Evidências de mudanças

1. A emissão de cada nova URL assinada usa pathname único, com UUID aleatório no escopo de conteúdo + versão. Se a tentativa anterior gravou um objeto e o navegador perdeu a resposta, uma nova tentativa não recebe o mesmo pathname ocupado.
2. O registro exige que MIME, conteúdo e versão correspondam ao pathname da concessão. Um POST direto com path de outra versão ou arquivo não pertencente à biblioteca é recusado antes da verificação criptográfica.
3. Paths determinísticos emitidos antes desta alteração ainda são aceitos estritamente para seu conteúdo, versão e MIME, evitando interromper uma transferência iniciada.
4. Um registro já existente impede outra validação custosa do mesmo asset. A constraint única no banco continua sendo a proteção final contra corridas.
5. A interface de registro sinaliza quando a resposta é inconclusiva e oferece conferência do histórico antes de repetir, sem reenviar o binário automaticamente.
6. Após uma liberação individual bem-sucedida, a lista de versões elegíveis é atualizada e o seletor pode voltar a ser usado para liberar outro material à mesma cliente, mediante nova confirmação humana.

## Invariantes

- Verificação streaming de tamanho, assinatura MIME e SHA-256 introduzida no PR #704 é preservada.
- Nenhuma alteração nas permissões, políticas RLS, migrations, credenciais ou dados reais.
- Assets continuam privados, versão publicada continua imutável e a liberação é manual por cliente.
- Não registrar abertura ou conclusão de material a partir de mero download. As regras de progresso continuam pendentes.

## Limitações

- Arquivos enviados mas nunca registrados podem permanecer órfãos no Blob; nenhuma limpeza automática sem auditoria e decisão apropriada.
- Um timeout após a inserção continua sendo resultado ambíguo; a UI orienta verificar a lista antes de repetir, sem declarar sucesso indevidamente.
- E2E autenticado com Blob/Supabase reais, teste de uploads grandes e medição de tempo/custo não realizados pelo CI sintético; homologação de runtime pendente.
