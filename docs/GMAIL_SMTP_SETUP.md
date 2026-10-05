# Gmail SMTP no MVP

## Decisao atual

No MVP, a conta Gmail da Patty atende dois usos separados:

1. autenticacao/convite via Custom SMTP do Supabase Auth;
2. lembrete operacional do Feedback Semanal via worker server-side do aplicativo.

Essa e uma decisao operacional de baixo volume. Nenhum dos dois fluxos depende do ChatGPT/Gmail connector.

## Arquitetura

Fluxo de autenticacao:

`Patty/admin -> inviteUserByEmail -> Supabase Auth -> Custom SMTP -> smtp.gmail.com -> cliente`

Fluxo de lembrete semanal:

`Supabase agenda o lembrete -> Vercel cron -> worker server-only -> Gmail SMTP -> cliente -> evento de entrega auditavel`

O codigo de onboarding continua separado do worker de notificacao.

## Configuracao recomendada

No Google:
- habilitar verificacao em duas etapas na conta da Patty;
- criar uma App Password exclusiva para o Custom SMTP do Supabase Auth;
- criar uma segunda App Password exclusiva para o worker de lembretes do aplicativo;
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


### Worker de lembretes no Vercel

Variaveis server-only:
- `GMAIL_SMTP_USER`: Gmail da Patty;
- `GMAIL_SMTP_APP_PASSWORD`: App Password exclusiva do worker;
- `GMAIL_SMTP_FROM_NAME`: nome do remetente, baseline `Consultoria Corpo e Mente - Patty`.

Esses valores devem ser configurados no ambiente de producao da Vercel. Nenhum deles usa prefixo `NEXT_PUBLIC_`.

O cron `/api/cron/weekly-feedback-email-delivery` roda tecnicamente a cada hora. A funcao de claim do banco so libera trabalho no dia de lembrete configurado para o Feedback Semanal. Portanto a cadencia tecnica nao cria uma nova regra profissional de horario.

Se as credenciais Gmail nao estiverem configuradas, o worker retorna sem fazer claim e sem criar tentativa falsa.

### Auditoria de entrega

O evento original de quarta-feira permanece imutavel.

Para email:
- `queued_external`: lembrete apto ao worker;
- tentativa `started`: worker adquiriu lease;
- `delivery_failed`: tentativa SMTP falhou, sem marcar envio;
- `delivered`: Gmail aceitou a mensagem via SMTP.

Tentativas sao auditaveis, possuem lease e retry limitado. Um evento entregue nao e reescrito.

O texto do lembrete e operacional e nao aplica consequencia automatica ao atendimento.

### Limite operacional atual

A implementacao esta pronta no codigo e no banco, mas o envio real em producao so deve ser considerado ativo depois de:
- configurar `GMAIL_SMTP_USER` e `GMAIL_SMTP_APP_PASSWORD` na Vercel;
- publicar o master contendo o worker;
- validar com conta sintetica de teste;
- confirmar recebimento e registro `delivered`.

Nao usar cliente real no teste inicial.
