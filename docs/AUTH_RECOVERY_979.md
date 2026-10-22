# Recuperação de senha — evidências e pendências da issue #979 (22/10/2026)

## Incidente relatado — fato, não causa comprovada

A Patty encontrou a mensagem **"Link inválido ou expirado"** depois de abrir um e-mail de recuperação; uma solicitação posterior permitiu trocar a senha. O erro inicial **não foi reproduzido nem atribuído a uma causa específica**. Não associar o episódio a uma identidade, dispositivo, código, token ou configuração sem evidência.

## Correção de callbacks — implementada, mergeada e publicada

- [PR #984](https://github.com/leandrosilveiradepaula/projeto-patty/pull/984) corrigiu os callbacks `app/auth/recovery/route.ts` (PKCE) e `app/auth/recovery-token/route.ts` (OTP hash): os cookies de sessão passam a ser escritos na **mesma resposta 303** retornada, com destino relativo, `no-store`, `no-referrer` e sem repassar código/token na URL de saída. Falha de troca rejeita a resposta com cookies de sucesso.
- A mesma PR tornou a página de redefinição dinâmica, acrescentou orientação de uso único e do mesmo navegador/perfil e introduziu contratos determinísticos.
- A #984 foi integrada ao commit `88106683a8e2fb5a254f73e2621eb54555695a40`, com [Validate application pós-merge #39803402231](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39803402231) aprovado e Vercel `dpl_8pz7G5zPP6ZWN3pZsPMf92Ce5ddv` em `READY` nesse SHA. Isso **não comprova a causa** do primeiro link inválido.

## Recuperação por OTP no navegador — E2E sintético aprovado

- [PR #986](https://github.com/leandrosilveiradepaula/projeto-patty/pull/986) acrescentou somente teste Playwright em `e2e/j1-local-onboarding.spec.mjs`. O fluxo usa duas identidades `example.invalid` em Supabase Docker descartável: sessão anterior de outra cliente, OTP de tipo incorreto rejeitado, verificação de token válido com cookie no redirect, troca de senha da destinatária, preservação da senha da outra identidade e rejeição de replay do OTP.
- [Validate application #39810446625](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39810446625) e [J1 Playwright #39810446797](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39810446797) concluíram `success` no mesmo head `22a6006fa3ea16fbc71e7f90ad594b16d9a5eed1` (`2 passed`), com limpeza do ambiente descartável. Falhas iniciais do teste foram de seleção de campos; foram corrigidas na **mesma branch** e não representam incidentes de Auth.
- A #986 foi integrada à `master` em `399c6af77dc5996468861f14f740d9b3680e71e1`, [CI pós-merge #39811578137](https://github.com/leandrosilveiradepaula/projeto-patty/actions/runs/39811578137) aprovado, Vercel de origem Git `dpl_joKT5JBvgDKEPKVoGLjfGUVUmEoD` em `READY`, com alias `projeto-patty.vercel.app` no SHA exato.

## Correção e E2E PKCE — implementados, aguardando checks da PR #990

- A autorização de reset agora depende de claims JWT verificados por `auth.getClaims()`: `sub`, `session_id` e o método `amr` emitido pelo GoTrue para a recuperação. O PKCE usa `recovery`; os caminhos de recovery por OTP hash e fragmento implícito usam `otp` após a verificação server-side do token de recovery. Sessão de login por senha não satisfaz esse contrato. O mesmo predicado é aplicado antes de devolver cookies de callbacks PKCE/OTP, antes de mostrar o formulário e antes de `updateUser`; nenhum parâmetro, cookie aplicativo ou metadado editável autoriza reset.
- O E2E local J1 foi ampliado para solicitar o e-mail por `resetPasswordForEmail`, consumir somente a mensagem gerada pelo Inbucket descartável e confirmar o comportamento PKCE em perfil original versus outro perfil, alteração da identidade correta, senha antiga recusada e replay bloqueado. Não revela link, código, token, cookie ou senha. O ambiente local desta estação não possui Docker: a execução Playwright é **PENDENTE DO CI** e não deve ser declarada aprovada antes do SHA final.

## Pendências técnicas reais — issue #979 permanece aberta

1. **Checks e revisão sensível da PR atual:** aguardar `Validate application` e `Validate J1 local client onboarding browser` no mesmo SHA antes de considerar a correção testada. Alteração de Auth exige merge manual.
2. **Links utilizados, expirados ou inspecionados por scanners de e-mail:** o cenário de replay é coberto no ambiente local; comportamento de scanners e do provedor real permanece questão operacional. Não declarar interoperabilidade cross-device além do negativo PKCE demonstrado e não mudar template SaaS sem decisão específica.
3. **Incidente original:** o erro observado pela Patty continua sem reprodução causal. Não atribuí-lo a PKCE, sessão, scanner ou configuração sem evidência adicional.
4. **Homologação operacional profissional:** continuará ao final da implantação técnica de J1–J7, em sessão autorizada da Patty; CI sintético não equivale a uso real.

## Restrições permanentes

Não mudar senhas de pessoas reais nem alterar identidade, MFA, templates, RLS, migrations, Storage, dados sensíveis, permissões ou configurações de produção como parte de testes. Não imprimir código, token, URL de recuperação, cookies nem dados pessoais em logs. Qualquer nova alteração de Auth deve ter PR separada, revisão sensível e **merge manual**. Nenhuma regra do método profissional é inferida.
