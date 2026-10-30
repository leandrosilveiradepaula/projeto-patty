import assert from "node:assert/strict";
import test from "node:test";
import { pendingReviewedFindingCount } from "./pending-review-selector.ts";

const answer = "10000000-0000-4000-8000-000000000001";
const missing = "10000000-0000-4000-8000-000000000002";
const finding = { type: "clarification_needed", source_answer_ids: [answer], explanation: "Achado sintético" };
const base = {
  allowedMissingTargetQuestionIds: new Set([missing]),
  allowedSourceAnswerIds: new Set([answer]),
  status: "completed",
  completedAt: "2026-10-30T02:00:00Z",
  failedAt: null,
  content: { findings: [finding] },
  actions: [],
} as const;

test("valid completed finding without decision is discoverable", () => {
  assert.equal(pendingReviewedFindingCount(base), 1);
});
test("recorded exact human decision removes item without changing output", () => {
  assert.equal(pendingReviewedFindingCount({ ...base, actions: [{ id: "a", finding_index: 0, finding_snapshot: finding }] }), 0);
});
test("occupied mismatched historical index remains locked for technical verification", () => {
  assert.equal(pendingReviewedFindingCount({ ...base, actions: [{ id: "a", finding_index: 0, finding_snapshot: { ...finding, explanation: "divergente" } }] }), 0);
});
test("foreign source, invalid target, interrupted and missing output are not actionable", () => {
  assert.equal(pendingReviewedFindingCount({ ...base, allowedSourceAnswerIds: new Set() }), 0);
  assert.equal(pendingReviewedFindingCount({ ...base, status: "started" }), 0);
  assert.equal(pendingReviewedFindingCount({ ...base, content: null }), 0);
  assert.equal(pendingReviewedFindingCount({ ...base, allowedMissingTargetQuestionIds: null }), 0);
  assert.equal(pendingReviewedFindingCount({ ...base, content: { findings: [] } }), 0);
});
