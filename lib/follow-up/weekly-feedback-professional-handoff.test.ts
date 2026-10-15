import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  manualDecisionAssessmentChoices,
  manualAssessmentDecisionFromComparisonHref,
  manualAssessmentDecisionFromSubmittedFeedbackHref,
  readWeeklyComparisonReturn,
  readWeeklyFeedbackDecisionReturn,
} from "./weekly-feedback-professional-handoff.ts";

const clientA = "a1100000-0000-4000-8000-000000000001";
const clientB = "b1100000-0000-4000-8000-000000000002";
const current = "c1100000-0000-4000-8000-000000000003";
const previous = "d1100000-0000-4000-8000-000000000004";
const assessment = "e1100000-0000-4000-8000-000000000005";

const row = (id: string, clientId: string, date: string, finalized: string | null) => ({
  id, client_id: clientId, assessed_at: date, finalized_at: finalized,
});

test("manual handoff offers only currently authorized, finalized assessments", () => {
  const rows = [
    row("recent", clientA, "2026-10-10", "2026-10-11T10:00:00Z"),
    row("older", clientA, "2026-09-15", "2026-09-15T12:00:00Z"),
    row("draft", clientA, "2026-10-15", null),
    row("other-client", clientB, "2026-10-14", "2026-10-14T12:00:00Z"),
    row("legacy-bad-date", clientA, "no-date", "2026-10-11T10:00:00Z"),
  ];
  assert.deepEqual(manualDecisionAssessmentChoices(rows, clientA).map(x => x.id), ["recent", "older"]);
  assert.deepEqual(manualDecisionAssessmentChoices(rows, clientB).map(x => x.id), ["other-client"]);
  assert.deepEqual(manualDecisionAssessmentChoices(rows, "unassigned"), []);
  assert.equal(rows.length, 5);
});

test("return context accepts only two distinct UUIDs and rejects arrays or unsafe values", () => {
  assert.deepEqual(readWeeklyComparisonReturn(current, previous), { currentId: current, previousId: previous });
  for (const [one, two] of [
    [current, current],
    ["not-uuid", previous],
    [current, "not-uuid"],
    [[current], previous],
    [current, [previous]],
    [null, previous],
    ["javascript:alert(1)", previous],
    [undefined, undefined],
  ]) {
    assert.equal(readWeeklyComparisonReturn(one, two), null);
  }
});

test("handoff link carries only record identifiers and the form anchor", () => {
  const href = manualAssessmentDecisionFromComparisonHref(assessment, current, previous);
  assert.equal(
    href,
    "/admin/avaliacoes/" + assessment +
      "?feedbackAtual=" + current + "&feedbackAnterior=" + previous + "#acompanhamento",
  );
  assert.doesNotMatch(href, /answer|resposta|reason|observacao|difficulty/i);
});

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("comparison offers an explicit decision route without creating, sending or approving anything", () => {
  const compare = read("app/admin/clientes/[clienteId]/feedback-semanal/comparar/page.tsx");
  const evaluation = read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
  assert.match(compare, /listRecentFinalizedAssessmentsForClient\(client\.id\)/);
  assert.match(compare, /manualDecisionAssessmentChoices\(finalizedAssessments, client\.id\)/);
  assert.match(compare, /manualAssessmentDecisionFromComparisonHref\(/);
  assert.match(compare, /Nenhuma avaliação finalizada/);
  assert.match(compare, /A decisão ficará registrada na avaliação escolhida/);
  assert.match(evaluation, /readWeeklyComparisonReturn\(\s*filters\.feedbackAtual,\s*filters\.feedbackAnterior,?\s*\)/);
  assert.match(evaluation, /weeklyFeedbackComparisonHref\(\s*assessment\.client_id/);
  assert.match(evaluation, /Voltar à comparação dos Feedbacks Semanais/);
  assert.doesNotMatch(compare, /addProfessionalFollowUp|createAccessibleProfessionalFollowUp|\.insert\(|\.update\(/);
});

test("evaluation action keeps the existing MFA, finalized assessment and explicit reason gates", () => {
  const action = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  assert.match(action, /await requireRole\("admin"\)/);
  assert.match(action, /if \(!assessment\.finalized_at\)/);
  assert.match(action, /isProfessionalDecision\(decisionValue\)/);
  assert.match(action, /!reasonValue\.trim\(\)/);
  assert.match(action, /createAccessibleProfessionalFollowUp\(/);
  assert.doesNotMatch(action, /weekly_feedback.*update|mark.*feedback.*reviewed/i);
});

test("narrow assessment candidates read no health answers and retain authenticated RLS", () => {
  const access = read("lib/supabase/data-access.ts");
  const name = "export async function listRecentFinalizedAssessmentsForClient(";
  const start = access.indexOf(name);
  assert.ok(start >= 0);
  const body = access.slice(start, start + 720);
  assert.match(body, /createClient\(\)/);
  assert.match(body, /\.from\("client_assessments"\)/);
  assert.match(body, /\.select\("id, client_id, assessed_at, finalized_at"\)/);
  assert.match(body, /\.eq\("client_id", clientId\)/);
  assert.match(body, /\.not\("finalized_at", "is", null\)/);
  assert.match(body, /\.limit\(5\)/);
  assert.doesNotMatch(body, /answers|service_role|createAdminClient/);
});

test("first submitted feedback has a safe manual handoff without any previous period", () => {
  assert.deepEqual(
    readWeeklyFeedbackDecisionReturn(current, undefined),
    { kind: "submitted", currentId: current },
  );
  assert.deepEqual(
    readWeeklyFeedbackDecisionReturn(current, previous),
    { kind: "comparison", currentId: current, previousId: previous },
  );
  assert.equal(
    manualAssessmentDecisionFromSubmittedFeedbackHref(assessment, current),
    "/admin/avaliacoes/" + assessment + "?feedbackAtual=" + current + "#acompanhamento",
  );
});

test("invalid, ambiguous, or mismatched submitted feedback navigation cannot create a return destination", () => {
  for (const [currentInput, previousInput] of [
    [undefined, undefined],
    [[current], undefined],
    ["not-uuid", undefined],
    [current, null],
    [current, ""],
    [current, [previous]],
    [current, current],
    [current, "not-uuid"],
  ]) {
    assert.equal(readWeeklyFeedbackDecisionReturn(currentInput, previousInput), null);
  }
});

test("each submitted feedback offers a manual decision path, including the first one", () => {
  const history = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  const assessmentDetail = read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
  assert.match(history, /rawSubmittedCount > 0/);
  assert.match(history, /listRecentFinalizedAssessmentsForClient\(client\.id\)/);
  assert.match(history, /manualDecisionAssessmentChoices\(\s*finalizedAssessmentCandidates,\s*client\.id/);
  assert.match(history, /submittedPage\.items\.map\(\(feedback\) =>/);
  assert.match(history, /<details className=\{styles\.manualDecisionDisclosure\}>/);
  assert.match(history, /Continuar com decisão profissional/);
  assert.match(history, /manualAssessmentDecisionFromSubmittedFeedbackHref\(\s*assessment\.id,\s*feedback\.id/);
  assert.match(history, /Nenhuma avaliação finalizada está disponível/);
  assert.match(history, /O registro profissional exige avaliação finalizada/);
  assert.match(assessmentDetail, /readWeeklyFeedbackDecisionReturn\(\s*filters\.feedbackAtual,\s*filters\.feedbackAnterior/);
  assert.match(assessmentDetail, /submittedReturn\?\.kind === "submitted"/);
  assert.match(assessmentDetail, /receivedWeeklyFeedbackExactHref\(\{\s*id: submittedReturn\.currentId,\s*client_id: assessment\.client_id/);
  assert.match(assessmentDetail, /Voltar ao Feedback Semanal enviado/);
  assert.doesNotMatch(history, /weekly_feedback.*update|\\.insert\(["']professional_follow_ups/);
});

test("manual feedback handoff keeps the professional action and RLS constraints unchanged", () => {
  const access = read("lib/supabase/data-access.ts");
  const history = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  const action = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  const first = access.indexOf("export async function listRecentFinalizedAssessmentsForClient(");
  assert.ok(first >= 0);
  const loader = access.slice(first, first + 820);
  assert.match(loader, /createClient\(\)/);
  assert.match(loader, /\.eq\("client_id", clientId\)/);
  assert.match(loader, /\.not\("finalized_at", "is", null\)/);
  assert.match(loader, /\.limit\(5\)/);
  assert.doesNotMatch(loader, /answers|service_role|createAdminClient/);
  assert.match(history, /manualDecisionAssessmentChoices/);
  assert.match(action, /await requireRole\("admin"\)/);
  assert.match(action, /if \(!assessment\.finalized_at\)/);
  assert.match(action, /createAccessibleProfessionalFollowUp/);
  assert.doesNotMatch(action, /markWeeklyFeedbackReviewed|update.*feedback.*reviewed/i);
});
