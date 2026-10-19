import {
  type AnamnesisReviewFinding,
  validateAnamnesisReviewOutput,
} from "./anamnesis-review-output.ts";

export type StoredAiReviewState =
  | "not_completed"
  | "missing_output"
  | "invalid_output"
  | "ready";

export type StoredAiReviewPresentation = {
  findings: AnamnesisReviewFinding[];
  state: StoredAiReviewState;
};

/**
 * Read-only presentation boundary for a previously persisted AI execution.
 *
 * A completed execution is not necessarily a valid result: an absent,
 * incomplete, or cross-submission output must not become "no findings" and
 * must never offer professional action buttons.
 *
 * Allowlists here prove only that referenced IDs belong to this submission
 * and its form version. The original model-output validation remains the
 * authority on applicability at the moment the execution was recorded.
 */
export function presentStoredAiReview(input: {
  allowedQuestionIds: ReadonlySet<string>;
  allowedSourceAnswerIds: ReadonlySet<string>;
  completedAt: string | null;
  content: unknown;
  failedAt: string | null;
  status: string;
}): StoredAiReviewPresentation {
  const hidden = (state: Exclude<StoredAiReviewState, "ready">): StoredAiReviewPresentation => ({
    findings: [],
    state,
  });

  if (input.status !== "completed") {
    return hidden("not_completed");
  }

  // A mismatched terminal state must not expose controls for a stale record.
  if (
    !input.completedAt ||
    !Number.isFinite(Date.parse(input.completedAt)) ||
    input.failedAt !== null
  ) {
    return hidden("invalid_output");
  }

  if (input.content == null) {
    return hidden("missing_output");
  }

  const result = validateAnamnesisReviewOutput({
    allowedMissingTargetQuestionIds: input.allowedQuestionIds,
    allowedSourceAnswerIds: input.allowedSourceAnswerIds,
    value: input.content,
  });

  if (!result.ok) {
    return hidden("invalid_output");
  }

  return {
    findings: result.value.findings,
    state: "ready",
  };
}
