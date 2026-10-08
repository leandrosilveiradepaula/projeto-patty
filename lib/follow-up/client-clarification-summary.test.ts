import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { summarizeClientClarifications } from "./client-clarification-summary.ts";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const request = (id: string, submission: string, created_at: string) => ({
  id, submission_id: submission, created_at,
});

test("unanswered clarifications link to the oldest request, across submissions", () => {
  const items = [
    request("late", "form-a", "2026-10-08T18:00:00Z"),
    request("early", "form-b", "2026-10-01T10:00:00Z"),
    request("middle", "form-a", "2026-10-02T10:00:00Z"),
  ];
  const snapshot = structuredClone(items);
  const summary = summarizeClientClarifications(items, [], []);
  assert.equal(summary.awaitingClient, 3);
  assert.equal(summary.awaitingProfessional, 0);
  assert.deepEqual(summary.firstAwaitingClient, { id: "early", submissionId: "form-b" });
  assert.deepEqual(summary.bySubmission.get("form-a"), {
    awaitingClient: 2,
    awaitingProfessional: 0,
    firstAwaitingClientRequestId: "middle",
  });
  assert.deepEqual(items, snapshot, "no mutation of client records");
});

test("a response changes only factual follow-up status, professional resolution closes the request", () => {
  const items = [
    request("waiting", "form-a", "2026-10-01T10:00:00Z"),
    request("answered", "form-a", "2026-10-02T10:00:00Z"),
    request("closed", "form-b", "2026-10-03T10:00:00Z"),
  ];
  const statuses = summarizeClientClarifications(
    items,
    [{ clarification_request_id: "answered" }],
    [{ clarification_request_id: "closed" }],
  );
  assert.equal(statuses.awaitingClient, 1);
  assert.equal(statuses.awaitingProfessional, 1);
  assert.equal(statuses.bySubmission.has("form-b"), false);
  assert.equal(statuses.bySubmission.get("form-a")?.awaitingProfessional, 1);
  assert.equal(statuses.firstAwaitingClient?.id, "waiting");
  const resolved = summarizeClientClarifications(
    items,
    [{ clarification_request_id: "answered" }],
    [{ clarification_request_id: "answered" }, { clarification_request_id: "waiting" }, { clarification_request_id: "closed" }],
  );
  assert.equal(resolved.awaitingClient, 0);
  assert.equal(resolved.awaitingProfessional, 0);
  assert.equal(resolved.firstAwaitingClient, null);
  assert.equal(resolved.bySubmission.size, 0);
});

test("no unanswered requests means no client call to action", () => {
  const summary = summarizeClientClarifications(
    [request("submitted", "a", "2026-10-08T10:00:00Z")],
    [{ clarification_request_id: "submitted" }],
    [],
  );
  assert.equal(summary.firstAwaitingClient, null);
  assert.equal(summary.awaitingClient, 0);
  assert.equal(summary.awaitingProfessional, 1);
});

test("client home and Anamnesis history use one authenticated factual summary", () => {
  const home = read("app/cliente/page.tsx");
  const history = read("app/cliente/anamnese/page.tsx");
  const loader = read("lib/follow-up/client-clarification-summary-loader.ts");
  assert.match(home, /loadClientClarificationSummary\(/);
  assert.match(history, /loadClientClarificationSummary\(/);
  assert.match(home, /firstAwaitingClient\.submissionId/);
  assert.match(home, /esclarecimentos#esclarecimento-/);
  assert.match(home, /Responder esclarecimento/);
  assert.match(home, /Esclarecimentos \(\$\{clarificationSummary.awaitingClient\}\)/);
  assert.match(history, /pendingClarificationHref/);
  assert.match(history, /Responder \{clarification\?\.awaitingClient\} esclarecimento/);
  assert.match(history, /aguardando revisão da Patty/);
  assert.match(loader, /listAccessibleAnamnesisClarificationRequestsForSubmissions/);
  assert.match(loader, /listAccessibleAnamnesisClarificationResponses/);
  assert.match(loader, /listAccessibleAnamnesisClarificationResolutions/);
  assert.doesNotMatch(loader, /createAdminClient|service_role/);
});

test("request, response and professional resolution invalidate client Anamnesis history", () => {
  const admin = read("app/admin/anamneses/[anamneseId]/esclarecimentos/actions.ts");
  const client = read("app/cliente/anamnese/[anamneseId]/esclarecimentos/actions.ts");
  assert.equal((admin.match(/revalidatePath\("\/cliente\/anamnese"\)/g) ?? []).length, 2);
  assert.equal((client.match(/revalidatePath\("\/cliente\/anamnese"\)/g) ?? []).length, 1);
  assert.match(admin, /await createAccessibleAnamnesisClarificationRequest/);
  assert.match(admin, /await createAccessibleAnamnesisClarificationResolution/);
  assert.match(client, /await createAccessibleAnamnesisClarificationResponse/);
});
