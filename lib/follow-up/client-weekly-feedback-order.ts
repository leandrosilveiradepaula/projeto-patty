export type ClientWeeklyFeedbackFact = {
  id: string;
  period_start: string;
  created_at: string;
  submitted_at: string | null;
};

/**
 * Latest requested period first; its calendar date is not a timestamp.
 * A request's creation instant resolves ties for the same period. This is a
 * navigation order, never a score, clinical priority, or reminder policy.
 */
export function orderClientWeeklyFeedbacks<T extends ClientWeeklyFeedbackFact>(
  rows: readonly T[],
): T[] {
  return [...rows].sort((a, b) => {
    const periodOrder = b.period_start.localeCompare(a.period_start);
    if (periodOrder !== 0) return periodOrder;
    const left = Date.parse(a.created_at);
    const right = Date.parse(b.created_at);
    const validLeft = Number.isFinite(left);
    const validRight = Number.isFinite(right);
    if (validLeft && validRight && left !== right) return right - left;
    if (validLeft !== validRight) return validLeft ? -1 : 1;
    return b.id.localeCompare(a.id);
  });
}

export function firstPendingClientWeeklyFeedback<T extends ClientWeeklyFeedbackFact>(
  rows: readonly T[],
): T | null {
  return orderClientWeeklyFeedbacks(rows).find((row) => row.submitted_at === null) ?? null;
}
