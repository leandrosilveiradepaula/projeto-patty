# Auditoria integrada: biblioteca de exercícios

Objetivo: recuperação de cadastros sem versão, localização por nomes históricos e segurança da edição concorrente.

Mudanças: leitura autenticada paginada de cadastros-pai; exibição explícita de cadastros sem versão; filtro específico de recuperação; busca em todas as versões já acessíveis; retorno ao catálogo com filtros preservados; acesso ao registro exato; confirmação de versão inicial apenas depois da gravação; bloqueio do formulário em envio e após sucesso; manutenção do texto digitado após falha; e atualização condicional de rascunho pelo nome original para evitar sobrescrever edições feitas em outra sessão.

Nenhuma versão é publicada ou atribuída a clientes automaticamente. Direitos permanecem sob RLS existente; sem alteração de schema, migrations, regras profissionais ou bibliotecas do portal da cliente. A proteção de concorrência de nomes é um controle otimista limitado ao campo nome, não um lock transacional genérico. E2E autenticado com Supabase real permanece pendente.
