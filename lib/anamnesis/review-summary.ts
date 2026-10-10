export type AnamnesisReviewSummaryRow = {
  id: string;
  submission_id: string;
  created_at: string;
};

export function compareAnamnesisReviewChronology(
  left: AnamnesisReviewSummaryRow,
  right: AnamnesisReviewSummaryRow,
): number {
  const leftTime = Date.parse(left.created_at);
  const rightTime = Date.parse(right.created_at);
  const leftValid = Number.isFinite(leftTime);
  const rightValid = Number.isFinite(rightTime);
  if (leftValid && rightValid && leftTime !== rightTime) return leftTime - rightTime;
  // Invalid legacy timestamps remain visible but cannot supersede dated notes.
  if (leftValid !== rightValid) return leftValid ? 1 : -1;
  return left.id.localeCompare(right.id);
}

export function summarizeAnamnesisReviewHistory<T extends AnamnesisReviewSummaryRow>(
  reviews: readonly T[],
): Map<string, { count: number; latest: T }> {
  const bySubmission = new Map<string, { count: number; latest: T }>();
  for (const review of reviews) {
    const current = bySubmission.get(review.submission_id);
    if (!current) {
      bySubmission.set(review.submission_id, { count: 1, latest: review });
      continue;
    }
    const newer = compareAnamnesisReviewChronology(review, current.latest) > 0;
    bySubmission.set(review.submission_id, {
      count: current.count + 1,
      latest: newer ? review : current.latest,
    });
  }
  return bySubmission;
}
