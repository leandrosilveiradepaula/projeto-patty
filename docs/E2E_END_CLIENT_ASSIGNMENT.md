# E2E - encerramento de assignment

Smoke manual para validar o encerramento controlado de um assignment sintetico.

Fluxo:

`admin login -> clientes atribuidos -> E2E Client -> encerrar atribuicao -> cliente deixa a lista ativa`

O teste usa apenas a conta administrativa sintetica, incluindo o MFA TOTP dessa conta, e depende de um assignment sintetico previamente ativo para exercitar a escrita na primeira execucao.

Os secrets administrativos necessarios sao `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` e `E2E_ADMIN_TOTP_SECRET`. A chave TOTP deve pertencer somente a conta E2E e nunca a conta real da Patty.

Depois que o assignment ja estiver encerrado, execucoes seguintes confirmam o estado idempotente sem recriar vinculo nem conceder acesso.

O smoke nao cria contas, nao cria assignments, nao altera schema/RLS e nao usa dados reais.
