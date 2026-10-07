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
