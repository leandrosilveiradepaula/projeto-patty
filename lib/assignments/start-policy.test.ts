import assert from "node:assert/strict";
import test from "node:test";

import { getAssignmentStartStatus } from "./start-policy.ts";

test("does not create a second active assignment when one already exists", () => {
  assert.equal(
    getAssignmentStartStatus("550e8400-e29b-41d4-a716-446655440000"),
    "already_active",
  );
});

test("allows creation when there is no active assignment", () => {
  assert.equal(getAssignmentStartStatus(null), "create");
});
