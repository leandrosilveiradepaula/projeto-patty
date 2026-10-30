import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  manualDecisionAssessmentChoices,
  manualAssessmentDecisionFromComparisonHref,
  manualAssessmentDecisionFromSubmittedFeedbackHref,
  assessmentHistoryFromSubmittedFeedbackHref,
  readWeeklyComparisonReturn,
  readWeeklyFeedbackDecisionReturn,
  weeklyFeedbackComparisonReturnHref,
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
  assert.match(evaluation, /weeklyFeedbackComparisonReturnHref\(\s*assessment\.client_id/);
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

test("comparison handoff returns to the exact two weeks and difference-only view", () => {
  const filtered = manualAssessmentDecisionFromComparisonHref(assessment, current, previous, "diferentes");
  assert.equal(filtered,
    "/admin/avaliacoes/" + assessment + "?feedbackAtual=" + current +
    "&feedbackAnterior=" + previous + "&feedbackVisao=diferentes#acompanhamento");
  const parsed = new URL(filtered, "https://patty.invalid");
  assert.deepEqual([...parsed.searchParams.keys()],
    ["feedbackAtual","feedbackAnterior","feedbackVisao"]);
  const pair = readWeeklyComparisonReturn(parsed.searchParams.get("feedbackAtual"),
    parsed.searchParams.get("feedbackAnterior"));
  assert.ok(pair);
  assert.equal(weeklyFeedbackComparisonReturnHref(clientA, pair, parsed.searchParams.get("feedbackVisao")),
    "/admin/clientes/" + clientA +
    "/feedback-semanal/comparar?atual=" + current + "&anterior=" + previous +
    "&visao=diferentes#respostas-comparadas");

  const withoutFilter = manualAssessmentDecisionFromComparisonHref(assessment, current, previous);
  assert.equal(withoutFilter,
    "/admin/avaliacoes/" + assessment + "?feedbackAtual=" + current +
    "&feedbackAnterior=" + previous + "#acompanhamento");
  assert.equal(weeklyFeedbackComparisonReturnHref(clientA, pair, undefined),
    "/admin/clientes/" + clientA + "/feedback-semanal/comparar?atual=" + current +
    "&anterior=" + previous);
});

test("tampered view cannot inject external routes, patient answers or unrecognized filters", () => {
  const valid = readWeeklyComparisonReturn(current, previous);
  assert.ok(valid);
  for (const payload of [
    "javascript:alert(1)", "//external.example", ["diferentes","todas"],
    { location: "/cliente" }, null, "", "DIFERENTES", "resposta sintética",
  ]) {
    const back = weeklyFeedbackComparisonReturnHref(clientA, valid, payload);
    assert.equal(back,
      "/admin/clientes/" + clientA + "/feedback-semanal/comparar?atual=" + current +
      "&anterior=" + previous);
  }
  const path = manualAssessmentDecisionFromComparisonHref(
    assessment, current, previous, "javascript:alert(1)" as "diferentes",
  );
  assert.equal(path.includes("feedbackVisao"), false);
});

test("authorized comparison and finalized assessment preserve view through manual decision", () => {
  const comparison = read("app/admin/clientes/[clienteId]/feedback-semanal/comparar/page.tsx");
  const assessment = read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
  assert.match(comparison, /manualAssessmentDecisionFromComparisonHref\(assessment\.id, current\.id, previous\.id, answerView\.view\)/);
  assert.match(assessment, /feedbackVisao\?: string \| string\[\]/);
  assert.match(assessment, /weeklyFeedbackComparisonReturnHref\(/);
  assert.match(assessment, /readWeeklyComparisonReturn\(/);
  assert.match(assessment, /backToFeedback\(/);
  assert.match(assessment, /Voltar à comparação dos Feedbacks Semanais/);
  const action = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  assert.match(action, /await requireRole\("admin"\)/);
  assert.match(action, /if \(!assessment\.finalized_at\)/);
  assert.match(action, /createAccessibleProfessionalFollowUp\(/);
  assert.doesNotMatch(action, /markWeeklyFeedbackReviewed|update.*client_weekly_feedbacks|publish.*protocol/i);
});


test("feedback history handoff reaches all finalized assessments without changing the selection limit", () => {
  const href = assessmentHistoryFromSubmittedFeedbackHref(clientA, current);
  assert.equal(
    href,
    "/admin/clientes/" + clientA + "/avaliacoes?feedbackAtual=" + current + "#historico-finalizado",
  );
  assert.deepEqual([...new URL(href, "https://example.invalid").searchParams.keys()], ["feedbackAtual"]);
  for (const id of ["not-uuid", "../client", "", [current] as unknown as string]) {
    assert.equal(assessmentHistoryFromSubmittedFeedbackHref(id, current), "/admin/feedback-semanal");
    assert.equal(assessmentHistoryFromSubmittedFeedbackHref(clientA, id), "/admin/feedback-semanal");
  }
  const five = Array.from({ length: 6 }, (_, i) =>
    row("assessment-" + i, clientA, "2026-10-" + String(12 - i).padStart(2, "0"), "2026-10-12T10:00:00Z"));
  assert.equal(manualDecisionAssessmentChoices(five, clientA).length, 6); // The database, not this projection, limits recent choices.
  const dataAccess = read("lib/supabase/data-access.ts");
  const start = dataAccess.indexOf("export async function listRecentFinalizedAssessmentsForClient(");
  assert.ok(start >= 0);
  assert.match(dataAccess.slice(start, start + 800), /\.limit\(5\)/);
  const history = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  assert.match(history, /assessmentHistoryFromSubmittedFeedbackHref\(client\.id, feedback\.id\)/);
  assert.match(history, /Consultar todas as avaliações finalizadas/);
  const directory = read("app/admin/clientes/[clienteId]/avaliacoes/page.tsx");
  assert.match(directory, /findReceivedWeeklyFeedbackHeaderForClient\(client\.id, rawQuery\.feedbackAtual\)/);
  assert.match(directory, /id="historico-finalizado"/);
  assert.match(directory, /withSubmittedWeeklyFeedbackAssessmentContext/);
  const assessmentPage = read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
  assert.match(assessmentPage, /readWeeklyFeedbackDecisionReturn\(/);
  assert.match(assessmentPage, /Voltar ao Feedback Semanal enviado/);
});
