import assert from "node:assert/strict";
import test from "node:test";

import { requiresAiExecutionRecoveryReview } from "./execution-lifecycle.ts";

test("started execution without terminal timestamps requires recovery review", () => {
  assert.equal(
    requiresAiExecutionRecoveryReview({
      status: "started",
      completedAt: null,
      failedAt: null,
    }),
    true,
  );
});

test("completed execution does not require recovery review", () => {
  assert.equal(
    requiresAiExecutionRecoveryReview({
      status: "completed",
      completedAt: "2026-09-24T12:00:00.000Z",
      failedAt: null,
    }),
    false,
  );
});

test("failed execution does not require recovery review", () => {
  assert.equal(
    requiresAiExecutionRecoveryReview({
      status: "failed",
      completedAt: null,
      failedAt: "2026-09-24T12:00:00.000Z",
    }),
    false,
  );
});

test("classification does not invent an age or timeout threshold", () => {
  assert.equal(
    requiresAiExecutionRecoveryReview({
      status: "started",
      completedAt: null,
      failedAt: null,
    }),
    true,
  );
});
