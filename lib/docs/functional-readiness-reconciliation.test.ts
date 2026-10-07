import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test("product docs do not reopen technical recovery of access as missing", () => {
  const product = read("docs/PRODUCT.md");
  assert.match(product, /recuperacao de acesso ja possui fluxo tecnico/);
  assert.doesNotMatch(
    product,
    /expiracao\/reenvio do convite, recuperacao de acesso, encerramento da conta/,
  );
});

test("content library reflects the current fail-closed migration state", () => {
  const content = read("docs/CONTENT_LIBRARY.md");
  assert.match(content, /ESTADO OPERACIONAL RECONCILIADO 2026-10-07/);
  assert.match(content, /Nenhum upload Blob, registro de asset, publicacao ou release foi executado/);
  assert.match(content, /lote permanece fail-closed/);
});

test("readiness separates deterministic helpers from automatic professional protocol generation", () => {
  const readiness = read("docs/MVP_READINESS.md");
  assert.match(readiness, /Boundary de automacao de protocolo 2026-10-07/);
  assert.match(readiness, /nao autoriza gerar automaticamente um protocolo completo/);
  assert.match(readiness, /revisao e publicacao humanas obrigatorias/);
});


test("remaining administrative client surfaces prefer the canonical client name", () => {
  const protocolList = read("app/admin/protocolos/page.tsx");
  const assessmentList = read("app/admin/avaliacoes/page.tsx");
  const privateFilesList = read("app/admin/arquivos/page.tsx");
  const evolution = read("app/admin/clientes/[clienteId]/evolucao/page.tsx");
  const contentReleases = read("app/admin/clientes/[clienteId]/conteudos/page.tsx");

  for (const source of [
    protocolList,
    assessmentList,
    privateFilesList,
    evolution,
    contentReleases,
  ]) {
    assert.match(source, /full_name/);
  }

  assert.match(
    privateFilesList,
    /client\.full_name\?\.trim\(\) \|\| client\.profiles\?\.display_name\?\.trim\(\)/,
  );
  assert.match(
    evolution,
    /client\.full_name\?\.trim\(\) \|\| client\.profiles\?\.display_name\?\.trim\(\)/,
  );
  assert.match(
    contentReleases,
    /client\.full_name\?\.trim\(\) \|\| client\.profiles\?\.display_name\?\.trim\(\)/,
  );
});


test("readiness does not present historical hydration formulas as current automation", () => {
  const readiness = read("docs/MVP_READINESS.md");
  assert.match(readiness, /AUTOMACAO DE HIDRATACAO SUSPENSA/);
  assert.match(readiness, /nenhuma avaliacao gera meta de hidratacao automaticamente/i);
  assert.match(readiness, /referencias historicas de 60 mL\/kg ou 35 mL\/kg nao autorizam automacao vigente/);
  assert.doesNotMatch(readiness, /meta de liquidos calculada por `peso_kg \* 60` e persistida como snapshot/);
});

test("readiness reflects the merged client-specific training prescription", () => {
  const readiness = read("docs/MVP_READINESS.md");
  const status = read("docs/PROJECT_STATUS.md");

  assert.match(readiness, /prescricao versionada individual deixou de ser lacuna/);
  assert.match(readiness, /PR #445/);
  assert.match(status, /prescricao versionada por cliente ja foi implementada e mergeada posteriormente pelo PR #445/);
  assert.doesNotMatch(
    status,
    /prescricao versionada de treino por cliente continua sendo uma lacuna separada/,
  );
});


test("open questions do not reopen implemented content and exercise lifecycles", () => {
  const questions = read("docs/OPEN_QUESTIONS.md");

  assert.doesNotMatch(
    questions,
    /Qual sera o processo de revisao, aprovacao e versionamento dos conteudos\?/,
  );
  assert.match(questions, /processo de autoria da biblioteca educacional ja e versionado/);
  assert.match(questions, /biblioteca de exercicios ja expoe para clientes autenticadas somente versoes publicadas/);
  assert.match(questions, /prescricao individual tambem ja possui lifecycle versionado/);
});

test("open questions keep hydration historical values non-authoritative", () => {
  const questions = read("docs/OPEN_QUESTIONS.md");

  assert.match(questions, /HISTORICO SUPERADO \/ RECONCILIADO EM 2026-10-07/);
  assert.match(questions, /35 mL\/kg.*nao e regra profissional automatica vigente/);
  assert.doesNotMatch(
    questions,
    /formula e unidade vigentes para novas metas: 35 mL\/kg\/dia/,
  );
});

test("weekly feedback open questions distinguish implemented schedule from actual gaps", () => {
  const questions = read("docs/OPEN_QUESTIONS.md");

  assert.match(questions, /periodo automatico = semana anterior completa/);
  assert.match(questions, /geracao recorrente, origem auditavel e idempotencia implementadas/);
  assert.match(questions, /provedor, opt-in\/consentimento e fallback do WhatsApp/);
});


test("open questions no longer present historical hydration or post-Cutting material as current rules", () => {
  const questions = read("docs/OPEN_QUESTIONS.md");

  assert.match(questions, /nao existe regra automatica vigente de hidratacao/);
  assert.doesNotMatch(
    questions,
    /O valor vigente de \*\*35 mL\/kg\/dia\*\* e a referencia profissional confirmada/,
  );
  assert.match(
    questions,
    /REGISTRO HISTORICO — BULKING E CONSOLIDACAO METABOLICA/,
  );
  assert.match(
    questions,
    /REGISTRO HISTORICO — ESTRUTURA DO CUTTING 3/,
  );
  assert.match(
    questions,
    /Nao usar para implementar etapa posterior ao Cutting 2 sem nova confirmacao documentada da Patty/,
  );
});


test("decisions reflect implemented password recovery and assignment administration", () => {
  const decisions = read("docs/DECISIONS.md");

  assert.match(decisions, /Recuperacao de acesso deixou de ser pendencia/);
  assert.match(decisions, /Patty tambem pode gerar link manual de recovery/);
  assert.match(decisions, /caminho administrativo deixou de estar totalmente pendente/);
  assert.match(decisions, /Patty pode encerrar o assignment atual pela ficha da cliente/);
  assert.doesNotMatch(
    decisions,
    /O caminho administrativo para criar, alterar ou encerrar assignments continua pendente/,
  );
});

test("historical post-Cutting sequence is explicitly superseded in decisions", () => {
  const decisions = read("docs/DECISIONS.md");

  assert.match(decisions, /HISTORICO SUPERADO/);
  assert.match(
    decisions,
    /reconciliacao de 2026-10-07 limita o fluxo confirmado a `Cutting 2: 2 Low \/ 1 High`/,
  );
});


test("decisions no longer block the published anamnesis v1 on resolved ANAM-046", () => {
  const decisions = read("docs/DECISIONS.md");

  assert.match(decisions, /ANAM-046 deixou de estar pendente para a v1/);
  assert.match(decisions, /client-anamnesis.*ja foi publicada\/validada/);
  assert.doesNotMatch(decisions, /primeira `client-anamnesis` permanece \*\*NAO PUBLICAVEL\*\*/);
});

test("readiness describes the OpenAI boundary as implemented but health-data gated", () => {
  const readiness = read("docs/MVP_READINESS.md");
  const status = read("docs/PROJECT_STATUS.md");

  assert.match(readiness, /integracao server-side com OpenAI e o boundary de execution ja existem/);
  assert.match(readiness, /dados reais de saude continuam bloqueados/);
  assert.doesNotMatch(readiness, /Ainda nao existe integracao real com provider\/modelo/);
  assert.match(status, /O runtime atual possui:/);
  assert.match(status, /gate de dados de saude permanece fechado/);
});


test("readiness no longer treats educational media infrastructure as undecided", () => {
  const readiness = read("docs/MVP_READINESS.md");

  assert.match(readiness, /binarios educacionais usam Vercel Private Blob/);
  assert.match(readiness, /store privado ja existe/);
  assert.doesNotMatch(
    readiness,
    /E necessario decidir infraestrutura de midia antes de criar o fluxo fisico de importacao/,
  );
});

test("older AI execution-boundary section does not reopen provider integration", () => {
  const readiness = read("docs/MVP_READINESS.md");

  assert.match(readiness, /A integracao de provider ja existe para `anamnesis_review`/);
  assert.doesNotMatch(readiness, /Isso nao significa integracao de provider pronta/);
});

test("historical hydration 35 apply is not presented as current runtime behavior", () => {
  const status = read("docs/PROJECT_STATUS.md");

  assert.match(status, /REGISTRO HISTORICO SUPERADO - Hidratacao v2 em 35 mL\/kg/);
  assert.match(status, /35 mL\/kg nao e regra profissional automatica atual/);
  assert.doesNotMatch(
    status,
    /Novas metas resolvidas pelo runtime configuravel passam a usar a versao ativa/,
  );
});


test("project status does not present historical runner and migration states as current", () => {
  const status = read("docs/PROJECT_STATUS.md");

  assert.match(status, /esse bloqueio foi resolvido em 2026-10-01/);
  assert.match(status, /20261001235018.*posteriormente APLICADA/);
  assert.match(status, /MERGEADO \/ BOUNDARY APLICADO NO SAAS/);
  assert.match(status, /UI de `\/admin\/configuracoes` ja esta mergeada no `master`/);
  assert.doesNotMatch(status, /GitHub Actions continua com falha operacional de runner/);
  assert.doesNotMatch(status, /A UI esta implementada nesta branch, mas ainda precisa passar CI, merge e publicacao/);
});

test("decisions do not describe onboarding assignment as future-only", () => {
  const decisions = read("docs/DECISIONS.md");

  assert.match(decisions, /onboarding administrativo por convite ja cria a identidade Auth/);
  assert.match(decisions, /assignment ativo da Patty/);
  assert.doesNotMatch(
    decisions,
    /boundary de inicio somente deve ser acionada por uma futura server action/,
  );
});


test("weekly feedback docs no longer present automation as wholly inactive", () => {
  const status = read("docs/PROJECT_STATUS.md");
  const decisions = read("docs/DECISIONS.md");

  assert.match(status, /geracao recorrente, elegibilidade apos primeiro protocolo/);
  assert.match(status, /worker de email ja foram implementados\/aplicados/);
  assert.doesNotMatch(status, /Automacao externa do Feedback Semanal ainda nao foi ativada/);
  assert.match(decisions, /criacao manual continua disponivel, mas deixou de ser o unico fluxo/);
  assert.match(decisions, /WhatsApp permanece desacoplado/);
});

test("historical branch and deployment wording is not presented as current readiness", () => {
  const status = read("docs/PROJECT_STATUS.md");
  const decisions = read("docs/DECISIONS.md");

  assert.match(status, /IMPLEMENTADO \/ MERGEADO/);
  assert.match(status, /REGISTRO HISTORICO — ENGINE V1 ANTES DA INTEGRACAO COM CONSUMIDORES/);
  assert.match(decisions, /nao deve ser tratada como blocker atual sem nova evidencia/);
});


test("final source-of-truth cleanup supersedes stale branch and foundation checkpoints", () => {
  const status = read("docs/PROJECT_STATUS.md");
  const readiness = read("docs/MVP_READINESS.md");

  assert.match(status, /PRs #242, #243, #244 e #245.*estado e historico/);
  assert.match(status, /REGISTRO HISTORICO SUPERADO - proposta da foundation migration/);
  assert.match(status, /20261001213333_create_method_configuration_foundation\.sql.*criada, testada, aplicada e verificada/);
  assert.match(status, /Compatibilidade com convite implicito do Supabase[\s\S]*MERGEADA \/ DISPONIVEL NO MASTER/);
  assert.match(readiness, /diagnostico historico.*steps: null.*janela anterior ao restabelecimento do runner/);
});

test("educational media decision reflects the provisioned private Blob store", () => {
  const decisions = read("docs/DECISIONS.md");

  assert.match(decisions, /Vercel Private Blob privado `projeto-patty-blob` foi criado\/conectado/);
  assert.match(decisions, /primeiro video aprovado ainda nao foi fisicamente enviado/);
  assert.doesNotMatch(decisions, /Nenhum Blob store foi criado e nenhum arquivo foi migrado nesta etapa/);
});


test("final audit keeps the confirmed method sequence capped at Cutting 2", () => {
  const decisions = read("docs/DECISIONS.md");

  assert.match(decisions, /sequencia vigente confirmada termina em `Cutting 2: 2 Low \/ 1 High`/);
  assert.match(decisions, /REGISTRO HISTORICO SUPERADO - Sequencia com Cutting 3/);
  assert.match(decisions, /REGISTRO HISTORICO SUPERADO - Estrutura do Cutting 3/);
  assert.doesNotMatch(
    decisions,
    /-> Cutting 2: 2 Low \/ 1 High\n-> Cutting 3 Linear/,
  );
});

test("final audit prevents historical hydration values from becoming current rules", () => {
  const decisions = read("docs/DECISIONS.md");
  const status = read("docs/PROJECT_STATUS.md");

  assert.match(decisions, /REGISTRO HISTORICO SUPERADO - Revisao da regra de hidratacao/);
  assert.match(decisions, /peso_kg \* 35 mL.*nao e regra profissional automatica vigente/);
  assert.match(status, /automacao de hidratacao esta hoje suspensa/);
});

test("final audit supersedes the remaining pre-apply foundation checkpoint", () => {
  const status = read("docs/PROJECT_STATUS.md");

  assert.match(status, /REGISTRO HISTORICO SUPERADO - Foundation configuravel V2 antes da migration oficial/);
  assert.match(status, /20261001213333_create_method_configuration_foundation\.sql.*materializada, testada, aplicada e verificada/);
});

test("draft-delete migration checkpoint points to the later successful apply", () => {
  const decisions = read("docs/DECISIONS.md");

  assert.match(decisions, /Estado posterior que prevalece.*20260923191554_fix_anamnesis_draft_delete_trigger\.sql.*aplicada com sucesso/);
});
