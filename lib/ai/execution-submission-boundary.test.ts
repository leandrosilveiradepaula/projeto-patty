import assert from "node:assert/strict";
import test from "node:test";

import {
  AiExecutionScopeError,
  assertAiExecutionBelongsToSubmission,
} from "./execution-submission-boundary.ts";

const SUBMISSION = "11111111-1111-4111-8111-111111111111";
const EXECUTION = "22222222-2222-4222-8222-222222222222";
const submitted = { id: SUBMISSION, submitted_at: "2026-10-20T12:00:00Z" };
const completed = {
  id: EXECUTION,
  anamnesis_submission_id: SUBMISSION,
  status: "completed",
  completed_at: "2026-10-20T13:00:00Z",
  failed_at: null,
};

test("completed finding action requires a single coherent terminal state", () => {
  assert.doesNotThrow(() =>
    assertAiExecutionBelongsToSubmission(submitted, [completed], EXECUTION, "completed"),
  );
  for (const bad of [
    { ...completed, failed_at: "2026-10-20T13:00:00Z" },
    { ...completed, completed_at: null },
    { ...completed, completed_at: "corrupted-date" },
    { ...completed, status: "failed" },
  ]) {
    assert.throws(
      () => assertAiExecutionBelongsToSubmission(submitted, [bad], EXECUTION, "completed"),
      AiExecutionScopeError,
    );
  }
});

test("recovery is allowed only for a started execution without terminal timestamps", () => {
  const started = { ...completed, status: "started", completed_at: null };
  assert.doesNotThrow(() =>
    assertAiExecutionBelongsToSubmission(submitted, [started], EXECUTION, "started"),
  );
  for (const bad of [
    { ...started, completed_at: completed.completed_at },
    { ...started, failed_at: "2026-10-20T13:00:00Z" },
    { ...started, status: "completed" },
  ]) {
    assert.throws(
      () => assertAiExecutionBelongsToSubmission(submitted, [bad], EXECUTION, "started"),
      AiExecutionScopeError,
    );
  }
});

test("privileged action rejects a draft and executions from another submission", () => {
  assert.throws(
    () => assertAiExecutionBelongsToSubmission(
      { ...submitted, submitted_at: null }, [completed], EXECUTION, "completed",
    ), AiExecutionScopeError,
  );
  assert.throws(
    () => assertAiExecutionBelongsToSubmission(
      submitted, [{ ...completed, anamnesis_submission_id: "33333333-3333-4333-8333-333333333333" }],
      EXECUTION, "completed",
    ), AiExecutionScopeError,
  );
  assert.throws(
    () => assertAiExecutionBelongsToSubmission(submitted, [completed], "44444444-4444-4444-8444-444444444444", "completed"),
    AiExecutionScopeError,
  );
});
