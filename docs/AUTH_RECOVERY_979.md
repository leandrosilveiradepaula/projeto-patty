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

## Pendências técnicas reais — issue #979 permanece aberta

1. **PKCE e e-mail real:** falta E2E sintético que exercite o pedido de e-mail, código PKCE, cookies/verifier e callback no mesmo navegador/perfil, além de negativo em outro contexto. O E2E da #986 exercita o caminho **OTP com `token_hash`**, não esses casos. Verificar o template/redirect efetivo por metadados e em ambiente descartável, sem copiar links reais.
2. **Sessão preexistente em visita direta:** a página `app/redefinir-senha/page.tsx` aceita uma sessão Supabase já válida e o `PasswordResetSessionGate` mostra o formulário sem prova da origem da recuperação; a action atualiza o usuário **da sessão corrente** após `getClaims()`. Não há evidência de troca de senha de terceiros por esse caminho, mas existe risco de confusão entre identidades no navegador. Falta desenho fail-closed verificável, inclusive para o fragmento implícito, sem depender de parâmetro facilmente forjável.
3. **Links utilizados, expirados ou inspecionados por scanners de e-mail:** a UX e os cenários negativos precisam ser avaliados no contexto dos templates e do provedor efetivo. Não declarar interoperabilidade cross-device sem prova.
4. **Homologação operacional profissional:** continuará ao final da implantação técnica de J1–J7, em sessão autorizada da Patty; CI sintético não equivale a uso real.

## Restrições permanentes

Não mudar senhas de pessoas reais nem alterar identidade, MFA, templates, RLS, migrations, Storage, dados sensíveis, permissões ou configurações de produção como parte de testes. Não imprimir código, token, URL de recuperação, cookies nem dados pessoais em logs. Qualquer nova alteração de Auth deve ter PR separada, revisão sensível e **merge manual**. Nenhuma regra do método profissional é inferida.
