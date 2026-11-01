import assert from "node:assert/strict";
import test from "node:test";
import {
  previewHistoricalClientReturn,
  type HistoricalReturnPreflightInput,
} from "./historical-client-return-preflight.ts";

const HISTORICAL = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const PROFILE = "33333333-3333-4333-8333-333333333333";

function fixture(overrides: Partial<HistoricalReturnPreflightInput> = {}): HistoricalReturnPreflightInput {
  return {
    client_id: HISTORICAL,
    confirmed_client_id: HISTORICAL,
    identity_reviewed_by_human: true,
    clients: [{ client_id: HISTORICAL, profile_id: null, status: "inactive" }],
    active_assignment_client_ids: [],
    proposed_profile_id: PROFILE,
    ...overrides,
  };
}

test("only produces a pending backend verification, never an activated account", () => {
  const result = previewHistoricalClientReturn(fixture());
  assert.deepEqual(result, {
    mode: "dry_run",
    persistence: "none",
    status: "pending_authorized_backend_verification",
    client_id: HISTORICAL,
    reasons: [],
    next_step: "authorized_identity_and_onboarding_verification",
  });
  assert.doesNotMatch(JSON.stringify(result), /password|email|token|assignment_id/);
});

test("requires explicit human identity review of the same opaque client id", () => {
  for (const changes of [
    { confirmed_client_id: null },
    { confirmed_client_id: OTHER },
    { identity_reviewed_by_human: false },
    { client_id: "invalid" },
  ]) {
    const result = previewHistoricalClientReturn(fixture(changes));
    assert.equal(result.status, "blocked");
    assert.equal(result.next_step, "manual_review");
  }
});

test("blocks missing, duplicate, linked or currently active clients", () => {
  for (const changes of [
    { clients: [] },
    { clients: [fixture().clients[0], fixture().clients[0]] },
    { clients: [{ client_id: HISTORICAL, profile_id: null, status: "active" as const }] },
    { clients: [{ client_id: HISTORICAL, profile_id: PROFILE, status: "inactive" as const }] },
    { active_assignment_client_ids: [HISTORICAL] },
  ]) {
    assert.equal(previewHistoricalClientReturn(fixture(changes)).status, "blocked");
  }
});

test("blocks profile collisions and invalid snapshots without relying on names or emails", () => {
  for (const changes of [
    { proposed_profile_id: "bad-uuid" },
    { clients: [...fixture().clients, { client_id: OTHER, profile_id: PROFILE, status: "inactive" as const }] },
    { clients: [...fixture().clients, { client_id: "bad-uuid", profile_id: null, status: "inactive" as const }] },
    { active_assignment_client_ids: ["bad-uuid"] },
  ]) {
    assert.equal(previewHistoricalClientReturn(fixture(changes)).status, "blocked");
  }
});

test("remains deterministic, including order of blocking reasons", () => {
  const input = fixture({
    clients: [fixture().clients[0], fixture().clients[0]],
    active_assignment_client_ids: [HISTORICAL],
    identity_reviewed_by_human: false,
  });
  const first = previewHistoricalClientReturn(input);
  const second = previewHistoricalClientReturn({ ...input, clients: [...input.clients].reverse() });
  assert.deepEqual(first, second);
  assert.deepEqual(first.reasons, [...first.reasons].sort());
});
