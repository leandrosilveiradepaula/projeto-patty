# Gmail SMTP no MVP

## Decisao atual

No MVP, os emails de autenticacao/convite serao enviados pelo Gmail pessoal da Patty via Custom SMTP do Supabase Auth.

Essa e uma decisao operacional de baixo volume. O fluxo de aplicacao continua usando o Supabase Auth; o aplicativo nao envia email diretamente pelo Gmail e nao depende de ChatGPT/Gmail connector.

## Arquitetura

Fluxo:

`Patty/admin -> inviteUserByEmail -> Supabase Auth -> Custom SMTP -> smtp.gmail.com -> cliente`

O codigo de onboarding existente nao precisa mudar por causa do provider SMTP.

## Configuracao recomendada

No Google:
- habilitar verificacao em duas etapas na conta da Patty;
- criar uma App Password exclusiva para o SMTP do Projeto Patty;
- nao usar a senha principal da conta.

No Supabase Auth > Email > SMTP Settings:
- Enable Custom SMTP: ligado;
- Sender email: o endereco Gmail da Patty;
- Sender name: Consultoria Corpo e Mente - Patty;
- Host: `smtp.gmail.com`;
- Port: `587` com STARTTLS, ou `465` com SSL;
- Username: o endereco Gmail completo da Patty;
- Password: App Password gerada pelo Google.

## Seguranca

A App Password:
- nao entra no repositorio;
- nao entra em migrations;
- nao entra em variaveis `NEXT_PUBLIC_*`;
- nao deve ser enviada em chat, screenshot, issue ou PR;
- deve ser digitada diretamente no painel do Supabase.

Se houver suspeita de exposicao, revogar a App Password no Google e gerar outra.

## Template de convite

Depois do Custom SMTP estar ativo, configurar o template `Invite user` do Supabase para usar o fluxo SSR do aplicativo por `TokenHash` e `type=invite`, apontando para `/auth/confirm`.

O fluxo esperado permanece:

`email de convite -> /auth/confirm -> sessao de ativacao -> /ativar-conta -> cliente define a propria senha`

A Patty nunca cria, recebe ou armazena senha provisoria da cliente.

## Validacao antes de considerar concluido

Usar somente uma conta de teste, nunca dados reais de cliente, para validar:
- envio real do convite;
- recebimento no inbox;
- remetente correto;
- link de convite correto;
- consumo unico do token;
- redirecionamento para `/ativar-conta`;
- definicao de senha;
- novo login email + senha;
- cleanup da fixture sintetica.

## Limites e migracao futura

Gmail foi escolhido porque o volume previsto no MVP e baixo.

Se surgirem problemas de entregabilidade, bloqueio da conta, crescimento de volume ou necessidade de observabilidade/SLA, migrar o Custom SMTP para um provedor transacional dedicado sem alterar o fluxo de onboarding da aplicacao.
