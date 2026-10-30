import { auditFindingActionLinks, type AiFindingActionPointer } from "./finding-action-integrity.ts";
import { presentStoredAiReview } from "./anamnesis-review-history.ts";

export function pendingReviewedFindingCount(input: {
  allowedMissingTargetQuestionIds: ReadonlySet<string> | null;
  allowedSourceAnswerIds: ReadonlySet<string>;
  completedAt: string | null;
  content: unknown;
  failedAt: string | null;
  status: string;
  actions: readonly AiFindingActionPointer[];
}): number {
  const review = presentStoredAiReview(input);
  if (review.state !== "ready") return 0;
  return auditFindingActionLinks(review.findings, input.actions).pendingIndices.length;
}
