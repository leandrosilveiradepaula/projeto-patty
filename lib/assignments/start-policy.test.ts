import assert from "node:assert/strict";
import test from "node:test";

import { canStartAssignmentForLinkedClient, getAssignmentStartStatus } from "./start-policy.ts";

test("does not create a second active assignment when one already exists", () => {
  assert.equal(
    getAssignmentStartStatus("550e8400-e29b-41d4-a716-446655440000"),
    "already_active",
  );
});

test("allows creation when there is no active assignment", () => {
  assert.equal(getAssignmentStartStatus(null), "create");
});

test("rejects historical Client without linked identity before assignment creation", () => {
  assert.equal(canStartAssignmentForLinkedClient(null), false);
  assert.equal(canStartAssignmentForLinkedClient({ profile_id: null }), false);
});

test("preserves assignment start eligibility for a linked Client", () => {
  assert.equal(canStartAssignmentForLinkedClient({
    profile_id: "550e8400-e29b-41d4-a716-446655440000",
  }), true);
});
