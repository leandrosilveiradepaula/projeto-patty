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
 * Source allowlists prove recorded provenance for this exact execution.
 * Missing targets are reconstructed from the submission's versioned answers
 * and deterministic applicability rules, rather than all form questions.
 * If this context is inconsistent, no historical finding is actionable.
 */
export function presentStoredAiReview(input: {
  allowedMissingTargetQuestionIds: ReadonlySet<string> | null;
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

  if (input.allowedMissingTargetQuestionIds === null) {
    return hidden("invalid_output");
  }

  if (input.content == null) {
    return hidden("missing_output");
  }

  const result = validateAnamnesisReviewOutput({
    allowedMissingTargetQuestionIds: input.allowedMissingTargetQuestionIds,
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
