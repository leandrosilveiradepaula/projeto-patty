import { prepareClientPendingFeedback } from "@/lib/weekly-feedback/client-pending-summary";
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

/**
 * Choose the first pending request that has a usable versioned form.
 * Never infer a clinical priority or hide older requests.
 */
export function firstRespondableClientWeeklyFeedback<
  T extends ClientWeeklyFeedbackFact & { weekly_feedback_form_versions: { definition: import("@/lib/supabase/database.types").Json } | null; answers: import("@/lib/supabase/database.types").Json },
>(rows: readonly T[]): T | null {
  return orderClientWeeklyFeedbacks(rows).find((row) =>
    row.submitted_at === null &&
    prepareClientPendingFeedback(row.weekly_feedback_form_versions, row.answers).definition !== null
  ) ?? null;
}
