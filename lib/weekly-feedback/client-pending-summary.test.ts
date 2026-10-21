import assert from "node:assert/strict";
import test from "node:test";
import { prepareClientPendingFeedback } from "./client-pending-summary.ts";

const version = { definition: { schema_version: 1, questions: [
  { key: "count", label: "Treinos", input_type: "integer", required: true },
  { key: "rating", label: "Nota", input_type: "rating_0_10", required: true },
  { key: "note", label: "Comentário", input_type: "text", required: false },
] } };

test("pending feedback summary counts only valid saved values, including zero", () => {
  const result = prepareClientPendingFeedback(version, { count: 0, rating: 11, note: "Texto salvo" });
  assert.deepEqual(result.initialValues, { count: "0", rating: "11", note: "Texto salvo" });
  assert.deepEqual(result.progress, {
    completed: 2, total: 3, required: 2, requiredCompleted: 1, firstMissingRequired: "rating",
  });
});

test("unavailable version does not manufacture progress or answers", () => {
  assert.deepEqual(prepareClientPendingFeedback(null, { count: 3 }), {
    definition: null, initialValues: {}, progress: null,
  });
  assert.deepEqual(prepareClientPendingFeedback({ definition: { schema_version: 1, questions: [] } }, { count: 3 }), {
    definition: null, initialValues: {}, progress: null,
  });
});

test("summary projects only versioned questions and never mutates original answers", () => {
  const original = Object.freeze({ count: 2, rating: 7, unrelated: "private" });
  const result = prepareClientPendingFeedback(version, original);
  assert.deepEqual(Object.keys(result.initialValues), ["count", "rating", "note"]);
  assert.equal(result.progress?.requiredCompleted, 2);
  assert.equal(original.unrelated, "private");
});
