import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("client home prioritizes factual pending feedback and targets an individual request", () => {
  const home = read("app/cliente/page.tsx");
  assert.match(home, /firstPendingClientWeeklyFeedback\(weeklyFeedbacks\)/);
  assert.match(home, /feedback-pendente-\$\{firstPendingFeedback\.id\}/);
  assert.match(home, /href: pendingFeedbackHref/);
  assert.match(home, /href=\{pendingFeedbackHref\}/);
  assert.match(home, /pendingFeedbackHref && primaryAction\.href !== pendingFeedbackHref/);
  assert.match(home, /pendingWeeklyFeedbackIds\.size/);
});

test("pending feedback card has the real deep-link anchor and opens selected newest item", () => {
  const page = read("app/cliente/feedback-semanal/page.tsx");
  assert.match(page, /orderClientWeeklyFeedbacks\(feedbacks\)/);
  assert.match(page, /orderedFeedbacks\.filter/);
  assert.match(page, /id=\{`feedback-pendente-\$\{feedback\.id\}`\}/);
  assert.match(page, /open=\{feedbackIndex === 0\}/);
  assert.match(page, /saveWeeklyFeedbackAction\.bind\(null, feedback\.id\)/);
  const controls = read("app/cliente/feedback-semanal/ClientWeeklyFeedbackSubmitControls.tsx");
  assert.match(page, /<ClientWeeklyFeedbackSubmitControls \/>/);
  assert.match(controls, /value="save"/);
  assert.match(controls, /value="submit"/);
  assert.ok(!page.includes("publishProtocolVersion"));
});

test("both submitted and unanswered clarifications remain visible on the same Anamnesis card", () => {
  const history = read("app/cliente/anamnese/page.tsx");
  assert.match(history, /\{pendingClarificationHref \? \(/);
  assert.match(history, /\{clarification && clarification\.awaitingProfessional > 0 \? \(/);
  assert.match(history, /respondido\(s\) aguardando revisão da Patty/);
  assert.match(history, /Responder \{clarification\?\.awaitingClient\} esclarecimento/);
  assert.ok(!history.includes(") : clarification && clarification.awaitingProfessional"));
});

test("client home status never asks for resubmission while Patty reviews answered clarifications", () => {
  const home = read("app/cliente/page.tsx");
  assert.match(home, /clarificationSummary\.awaitingProfessional > 0/);
  assert.match(home, /role="status"/);
  assert.match(home, /não precisa reenviar a Anamnese/);
  assert.match(home, /firstAwaitingClient\.submissionId/);
  assert.match(home, /Responder esclarecimento/);
});

test("client detail and home use identical factual clarification order", () => {
  const detail = read("app/cliente/anamnese/[anamneseId]/esclarecimentos/page.tsx");
  const summary = read("lib/follow-up/client-clarification-summary.ts");
  assert.match(detail, /orderClientClarificationRequests\(requests\)/);
  assert.match(detail, /orderedRequests\.find\(/);
  assert.match(detail, /orderedRequests\.map\(/);
  assert.match(summary, /orderClientClarificationRequests\(requests\)/);
  assert.match(detail, /\#esclarecimento-\$\{firstAwaitingClientId\}/);
});

test("client follow-up never overwrites original Anamnesis responses or auto-resolves clarification", () => {
  const detail = read("app/cliente/anamnese/[anamneseId]/esclarecimentos/page.tsx");
  const submit = read("app/cliente/anamnese/[anamneseId]/esclarecimentos/actions.ts");
  assert.match(detail, /sourceAnswer\.answer_value/);
  assert.match(detail, /resolvedRequestIds/);
  assert.match(detail, /ClientAnamnesisClarificationResponseForm/);
  assert.match(submit, /requireRole\("client"\)/);
  assert.match(submit, /createAccessibleAnamnesisClarificationResponse/);
  assert.ok(!submit.includes("createAccessibleAnamnesisClarificationResolution"));
});

test("client primary dashboard does not make submitted weekly feedback actionable", () => {
  const order = read("lib/follow-up/client-weekly-feedback-order.ts");
  const home = read("app/cliente/page.tsx");
  assert.match(order, /row\.submitted_at === null/);
  assert.match(home, /pendingFeedbackHref/);
  assert.match(home, /hasPendingDailyCheckin/);
  assert.match(home, /listPublishedProtocolsForCurrentClient/);
  assert.match(home, /latestPublishedTrainingVersion\(trainingVersions\)/);
});

test("client follow-up navigation remains RLS-authenticated and does not expose health data in URLs", () => {
  const loader = read("lib/follow-up/client-clarification-summary-loader.ts");
  const weekly = read("app/cliente/feedback-semanal/page.tsx");
  assert.match(loader, /listAccessibleAnamnesisClarificationRequestsForSubmissions/);
  assert.match(loader, /listAccessibleAnamnesisClarificationResolutions/);
  assert.match(weekly, /getCurrentClient\(\)/);
  assert.match(weekly, /listAccessibleWeeklyFeedbacksForClient\(client\.id\)/);
  assert.ok(!weekly.includes("service_role"));
  assert.ok(!loader.includes("service_role"));
  assert.match(weekly, /feedback-pendente-\$\{feedback\.id\}/);
});
