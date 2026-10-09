import assert from "node:assert/strict";
import test from "node:test";
import { orderClientClarificationRequests, summarizeClientClarifications } from "./client-clarification-summary.ts";

const request = (id: string, created_at: string) => ({ id, submission_id: "submitted", created_at });

test("oldest unanswered request compares instants, not ISO timezone text", () => {
  const input = [
    request("later", "2026-10-09T09:30:00-03:00"),
    request("earlier", "2026-10-09T12:00:00Z"),
  ];
  assert.deepEqual(orderClientClarificationRequests(input).map(r=>r.id), ["earlier", "later"]);
  assert.equal(summarizeClientClarifications(input, [], []).firstAwaitingClient?.id, "earlier");
  assert.equal(input[0].id, "later");
});

test("resolved and answered clarifications are not a new action for the client", () => {
  const rows = [request("answered", "2026-10-09T12:00:00Z"), request("resolved", "2026-10-09T13:00:00Z")];
  const result = summarizeClientClarifications(rows, [{ clarification_request_id: "answered" }], [{ clarification_request_id: "resolved" }]);
  assert.equal(result.awaitingClient, 0);
  assert.equal(result.awaitingProfessional, 1);
  assert.equal(result.firstAwaitingClient, null);
});

test("legacy invalid timestamp sorts after valid entries instead of eclipsing navigation", () => {
  const rows = [request("bad", "not-a-date"), request("good", "2026-10-09T12:00:00Z")];
  assert.deepEqual(orderClientClarificationRequests(rows).map(r=>r.id), ["good", "bad"]);
});
