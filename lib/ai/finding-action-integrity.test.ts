import assert from "node:assert/strict";
import test from "node:test";

import { auditFindingActionLinks, findingSnapshotMatches } from "./finding-action-integrity.ts";
import type { AnamnesisReviewFinding } from "./anamnesis-review-output.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const Q = "33333333-3333-4333-8333-333333333333";
const findings: AnamnesisReviewFinding[] = [
  {
    type: "possible_contradiction",
    source_answer_ids: [A, B],
    explanation: "Conferir divergência sintética.",
  },
  {
    type: "missing_answer",
    source_answer_ids: [],
    target_question_id: Q,
    explanation: "Resposta sintética ausente.",
    suggested_follow_up_question: "Solicitar esclarecimento sintético?",
  },
];
const action = (id: string, index: number, snapshot: unknown) => ({
  id, finding_index: index, finding_snapshot: snapshot,
});

test("JSONB object key ordering does not change a correctly linked human decision", () => {
  const reordered = {
    explanation: findings[0].explanation,
    source_answer_ids: [A, B],
    type: "possible_contradiction",
  };
  assert.equal(findingSnapshotMatches(reordered, findings[0]), true);
  assert.equal(findingSnapshotMatches({
    suggested_follow_up_question: findings[1].suggested_follow_up_question,
    explanation: findings[1].explanation,
    target_question_id: Q,
    source_answer_ids: [],
    type: "missing_answer",
  }, findings[1]), true);
});

test("changed explanation, sources, type or hidden extra properties fail closed", () => {
  const original = {
    type: findings[0].type,
    source_answer_ids: [A, B],
    explanation: findings[0].explanation,
  };
  for (const snapshot of [
    null, [], "invalid",
    { ...original, explanation: "Outro achado" },
    { ...original, source_answer_ids: [B, A] },
    { ...original, source_answer_ids: [A] },
    { ...original, type: "missing_answer" },
    { ...original, diagnosis: "automatic" },
    { ...original, target_question_id: Q },
  ]) {
    assert.equal(findingSnapshotMatches(snapshot, findings[0]), false);
  }
});

test("valid actions count as reviewed; pending indices require no persisted action", () => {
  const audit = auditFindingActionLinks(findings, [
    action("decision-1", 0, { ...findings[0] }),
  ]);
  assert.equal(audit.reviewedCount, 1);
  assert.deepEqual(audit.pendingIndices, [1]);
  assert.deepEqual(audit.unmatchedActions, []);
  assert.deepEqual(audit.matchedByIndex.get(0)?.map((item) => item.id), ["decision-1"]);
});

test("a stale snapshot is never attributed to a different finding or offered as pending", () => {
  const audit = auditFindingActionLinks(findings, [
    action("stale-action", 0, { ...findings[0], explanation: "Histórico divergente" }),
    action("orphan-action", 99, { ...findings[1] }),
  ]);
  assert.equal(audit.reviewedCount, 0);
  assert.deepEqual(audit.pendingIndices, [1]);
  assert.deepEqual(audit.unmatchedActions.map((item) => item.id), [
    "stale-action", "orphan-action",
  ]);
  assert.equal(audit.lockedIndices.has(0), true);
  assert.equal(audit.matchedByIndex.has(0), false);
});

test("historical duplicate valid decisions remain separate and visible", () => {
  const audit = auditFindingActionLinks(findings, [
    action("first", 0, { ...findings[0] }),
    action("second", 0, { ...findings[0] }),
  ]);
  assert.equal(audit.reviewedCount, 1);
  assert.deepEqual(audit.matchedByIndex.get(0)?.map((item) => item.id), ["first", "second"]);
  assert.deepEqual(audit.pendingIndices, [1]);
});

test("failed or invalid output has no actionable findings, but keeps audit pointers", () => {
  const audit = auditFindingActionLinks([], [
    action("historical", 0, { ...findings[0] }),
  ]);
  assert.equal(audit.reviewedCount, 0);
  assert.deepEqual(audit.pendingIndices, []);
  assert.deepEqual(audit.unmatchedActions.map((item) => item.id), ["historical"]);
});
