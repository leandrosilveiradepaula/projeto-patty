import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("professional client overview reuses the same factual clarification summary as the client", () => {
  const overview = read("app/admin/clientes/[clienteId]/page.tsx");
  assert.ok(overview.includes("summarizeClientClarifications("));
  assert.ok(overview.includes("clarificationResponses,"));
  assert.ok(overview.includes("clarificationResolutions,"));
  assert.ok(overview.includes("clarificationSummary.bySubmission.get(submission.id)"));
  assert.ok(!overview.includes("clarificationResponseCountByRequestId"));
});

test("professional follow-up flags are independent for answered and unanswered sibling requests", () => {
  const overview = read("app/admin/clientes/[clienteId]/page.tsx");
  assert.ok(overview.includes("clarificationAwaitingClient: (followUp?.awaitingClient ?? 0) > 0"));
  assert.ok(overview.includes("clarificationAwaitingPatty: (followUp?.awaitingProfessional ?? 0) > 0"));
  assert.ok(!overview.includes("unresolvedClarificationRequests.length > 0 &&"));
  assert.ok(!overview.includes("!clarificationAwaitingPatty"));
  assert.ok(overview.includes("Essas pendências são independentes."));
});

test("professional next action links to the correct unanswered request rather than only a generic page", () => {
  const overview = read("app/admin/clientes/[clienteId]/page.tsx");
  assert.ok(overview.includes("clarificationSummary.firstAwaitingClient"));
  assert.ok(overview.includes("anamnesisClientWait.submissionId"));
  assert.ok(overview.includes("anamnesisClientWait.id"));
  assert.ok(overview.includes("Ver aguardando cliente ({clarificationSummary.awaitingClient})"));
});

test("answered clarification stays accessible even while professional review notes are absent", () => {
  const overview = read("app/admin/clientes/[clienteId]/page.tsx");
  assert.ok(overview.includes("anamnesisAnsweredClarification"));
  assert.ok(overview.includes("firstAwaitingProfessionalRequestId"));
  assert.ok(overview.includes("Revisar complemento(s) ({clarificationSummary.awaitingProfessional})"));
  assert.ok(overview.includes("reviewPending: !reviewedSubmissionIds.has(submission.id)"));
});

test("professional Anamnese history shows each submission's notes and two distinct clarification counts", () => {
  const page = read("app/admin/clientes/[clienteId]/anamnese/page.tsx");
  assert.ok(page.includes("listAccessibleAnamnesisReviewsForSubmissions(submittedIds)"));
  assert.ok(page.includes("loadClientClarificationSummary(submittedIds)"));
  assert.ok(page.includes("clarificationSummary.bySubmission.get(submission.id)"));
  assert.ok(page.includes("awaitingClient = clarification?.awaitingClient ?? 0"));
  assert.ok(page.includes("awaitingProfessional = clarification?.awaitingProfessional ?? 0"));
  assert.ok(page.includes("Ainda não registrada"));
  assert.ok(page.includes("Esclarecimentos aguardando cliente"));
  assert.ok(page.includes("Complementos aguardando Patty"));
  assert.ok(page.includes("alguns já foram respondidos"));
});

test("professional history navigates to exact open requests without exposing health data in links", () => {
  const page = read("app/admin/clientes/[clienteId]/anamnese/page.tsx");
  assert.ok(page.includes("clarification.firstAwaitingClientRequestId"));
  assert.ok(page.includes("clarification.firstAwaitingProfessionalRequestId"));
  assert.ok(page.includes("esclarecimentos#esclarecimento-"));
  assert.ok(page.includes("Ver respostas originais"));
  assert.ok(page.includes("Consultar correções"));
  assert.ok(!page.includes("request_text"));
  assert.ok(!page.includes("response_text"));
  assert.ok(!page.includes("service_role"));
});

test("professional clarification detail targets chronological open records, not database array order", () => {
  const detail = read("app/admin/anamneses/[anamneseId]/esclarecimentos/page.tsx");
  assert.ok(detail.includes("orderClientClarificationRequests(requests)"));
  assert.ok(detail.includes("orderedRequests.find("));
  assert.ok(detail.includes("orderedRequests.map((request) =>"));
  assert.ok(detail.includes("firstAwaitingReviewId"));
  assert.ok(detail.includes("firstAwaitingClientId"));
  assert.ok(detail.includes("#esclarecimento-"));
  assert.ok(detail.includes("AdminAnamnesisClarificationResolutionForm"));
  assert.ok(!detail.includes("createAccessibleAnamnesisClarificationResolution"));
});

test("shared summary keeps client and Patty outcomes separate from professional approval", () => {
  const summary = read("lib/follow-up/client-clarification-summary.ts");
  const clientHistory = read("app/cliente/anamnese/page.tsx");
  assert.ok(summary.includes("firstAwaitingProfessionalRequestId"));
  assert.ok(summary.includes("resolvedIds.has(request.id)"));
  assert.ok(clientHistory.includes("clarification.awaitingProfessional > 0"));
  assert.ok(!summary.includes("autoPublish"));
});
