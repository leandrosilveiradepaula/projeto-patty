export type AnamnesisReviewSummaryRow = {
  id: string;
  submission_id: string;
  created_at: string;
};

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
    const reviewTime = Date.parse(review.created_at);
    const latestTime = Date.parse(current.latest.created_at);
    const reviewValid = Number.isFinite(reviewTime);
    const latestValid = Number.isFinite(latestTime);
    const newer =
      (reviewValid && !latestValid) ||
      (reviewValid && latestValid && reviewTime > latestTime) ||
      (reviewValid === latestValid &&
        ((reviewValid && reviewTime === latestTime) || (!reviewValid)) &&
        review.id.localeCompare(current.latest.id) > 0);
    bySubmission.set(review.submission_id, {
      count: current.count + 1,
      latest: newer ? review : current.latest,
    });
  }
  return bySubmission;
}
