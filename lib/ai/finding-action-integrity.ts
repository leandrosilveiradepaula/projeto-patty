import type { AnamnesisReviewFinding } from "./anamnesis-review-output.ts";

/**
 * A human action records the complete immutable finding snapshot at decision
 * time. Its numerical index alone does not prove which finding was reviewed.
 * Compare the stored JSONB fields, not JSON.stringify key order.
 */
export function findingSnapshotMatches(
  snapshot: unknown,
  finding: AnamnesisReviewFinding,
): boolean {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return false;
  }
  const stored = snapshot as Record<string, unknown>;
  const expectedKeys = [
    "type", "source_answer_ids", "explanation",
    ...(finding.target_question_id !== undefined ? ["target_question_id"] : []),
    ...(finding.suggested_follow_up_question !== undefined
      ? ["suggested_follow_up_question"] : []),
  ];
  const actualKeys = Object.keys(stored);
  if (
    actualKeys.length !== expectedKeys.length ||
    expectedKeys.some((key) => !Object.prototype.hasOwnProperty.call(stored, key))
  ) {
    return false;
  }
  const storedSources = stored.source_answer_ids;
  return (
    stored.type === finding.type &&
    stored.explanation === finding.explanation &&
    stored.target_question_id === finding.target_question_id &&
    stored.suggested_follow_up_question === finding.suggested_follow_up_question &&
    Array.isArray(storedSources) &&
    storedSources.length === finding.source_answer_ids.length &&
    storedSources.every((id, index) => id === finding.source_answer_ids[index])
  );
}

export type AiFindingActionPointer = {
  id: string;
  finding_index: number;
  finding_snapshot: unknown;
};

/** Presentation-only audit: preserves orphaned actions and blocks ambiguous indexes. */
export function auditFindingActionLinks<Action extends AiFindingActionPointer>(
  findings: readonly AnamnesisReviewFinding[],
  actions: readonly Action[],
) {
  const matchedByIndex = new Map<number, Action[]>();
  const lockedIndices = new Set<number>();
  const unmatchedActions: Action[] = [];
  for (const action of actions) {
    const index = action.finding_index;
    const validIndex =
      Number.isSafeInteger(index) && index >= 0 && index < findings.length;
    if (validIndex) lockedIndices.add(index);
    if (!validIndex || !findingSnapshotMatches(action.finding_snapshot, findings[index])) {
      unmatchedActions.push(action);
      continue;
    }
    const previous = matchedByIndex.get(index) ?? [];
    previous.push(action);
    matchedByIndex.set(index, previous);
  }
  const pendingIndices = findings
    .map((_, index) => index)
    .filter((index) => !lockedIndices.has(index));
  return {
    lockedIndices,
    matchedByIndex,
    pendingIndices,
    reviewedCount: matchedByIndex.size,
    unmatchedActions,
  };
}
