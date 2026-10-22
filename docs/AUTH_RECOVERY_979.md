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

## Correção e E2E PKCE — implementação na PR #995, ainda sem CI final

- **Risco identificado na revisão:** o `amr=otp` de um JWT Supabase também pode indicar login comum via magic link. Por isso, aceitar somente `sub`, `session_id` e `amr=otp` **não prova** recuperação de senha e foi substituído. O callback PKCE exige `amr=recovery` verificado; o callback OTP exige execução bem-sucedida de `verifyOtp({type:"recovery"})` e compara a identidade Auth resultante com os claims. Somente esses callbacks emitem um grant de curta duração assinado pelo servidor, vinculado a `sub` e `session_id`.
- **Autorização no servidor:** a página e a server action exigem simultaneamente um JWT verificado e o grant assinado em cookie `HttpOnly`, `SameSite=Lax`, `Secure` em produção, path restrito e validade de 10 minutos. A chave de assinatura é `SUPABASE_SECRET_KEY` já existente apenas no servidor, com separação de domínio na função HMAC; nenhuma chave é exposta no navegador, nenhuma migration ou secret adicional foi criado. O grant é apagado após atualização bem-sucedida da senha. Ele não deve ser descrito como um registro durável de consumo único: replay simultâneo exigiria armazenamento atômico e permanece limite técnico.
- **Legado implícito:** fragments que carregam `access_token`/`refresh_token` não comprovam ao servidor que houve recovery em vez de login OTP. Por segurança, essa modalidade agora falha fechada e oferece solicitar novo link PKCE; não há instalação silenciosa de sessão via fragmento. Um desenho para compatibilidade de links legados sem criar bypass continua pendente.
- **Cobertura incluída, ainda em validação:** testes determinísticos verificam assinatura, expiração, identidade, sessão, adulteração, AMR de recovery e rejeição de OTP comum; Playwright J1 usa Supabase + Mailpit descartáveis para pedir email, verificar ausência de PKCE verifier em outro navegador, efetuar recuperação legítima, preservar outra identidade, negar magic link comum e recusar replay. Nenhum segredo é registrado. O teste de replay foi corrigido para reconhecer rejeição diretamente pelo GoTrue antes de chegar ao callback do aplicativo.
- **Dependência reconcilidada:** a PR #995 também recebeu os manifests exatos do Next.js `16.4.2`, já integrado e publicado separadamente pela [#997](https://github.com/leandrosilveiradepaula/projeto-patty/pull/997). Contra a nova `master`, isso não deve representar uma atualização independente de dependências no diff de Auth.
- **Status restrito:** esta versão na branch NÃO possui resultado `Validate application` + Playwright J1 no SHA final. O commit de referência/CI exibido pela API da PR pode estar atrasado em relação à ref Git; reconciliar antes de merge. A origem histórica do primeiro link inválido **continua desconhecida**.

## Pendências técnicas reais — issue #979 permanece aberta

1. **Checks e revisão sensível da PR atual:** validar `Validate application` e `Validate J1 local client onboarding browser` no mesmo SHA antes de considerar a correção testada. Alteração de Auth exige merge manual.
2. **Links utilizados, expirados ou inspecionados por scanners de e-mail:** o cenário de replay é coberto no ambiente local; comportamento de scanners e do provedor real permanece questão operacional. Não declarar interoperabilidade cross-device além do negativo PKCE demonstrado e não mudar template SaaS sem decisão específica.
3. **Incidente original:** o erro observado pela Patty continua sem reprodução causal. Não atribuí-lo a PKCE, sessão, scanner ou configuração sem evidência adicional.
4. **Suporte ao fragmento implícito e consumo concorrente:** sem prova server-side da finalidade do fragmento, solicitar novo link PKCE; sem estado servidor persistente não afirmar irrevogabilidade atômica de grant entre requests concorrentes. Documentar decisão de compatibilidade.
5. **Homologação operacional profissional:** continuará ao final da implantação técnica de J1–J7, em sessão autorizada da Patty; CI sintético não equivale a uso real.

## Restrições permanentes

Não mudar senhas de pessoas reais nem alterar identidade, MFA, templates, RLS, migrations, Storage, dados sensíveis, permissões ou configurações de produção como parte de testes. Não imprimir código, token, URL de recuperação, cookies nem dados pessoais em logs. Qualquer nova alteração de Auth deve ter PR separada, revisão sensível e **merge manual**. Nenhuma regra do método profissional é inferida.
