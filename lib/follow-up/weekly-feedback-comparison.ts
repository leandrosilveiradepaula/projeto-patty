import { orderClientWeeklyFeedbacks } from "./client-weekly-feedback-order.ts";

export type SubmittedWeeklyFeedbackReference = {
  id: string;
  client_id: string;
  period_start: string;
  created_at: string;
  submitted_at: string | null;
};

/**
 * Chronological choices only: a submitted earlier reference period of the
 * SAME authorized client. Drafts, same-period requests and future periods
 * cannot become a comparison baseline. This does not authorize access:
 * the comparison route must independently verify both IDs under RLS.
 */
export function olderSubmittedFeedbackChoices<T extends SubmittedWeeklyFeedbackReference>(
  records: readonly T[],
  currentId: string,
): T[] {
  const current = records.find((record) =>
    record.id === currentId && record.submitted_at !== null
  );
  if (!current) return [];
  return orderClientWeeklyFeedbacks(records.filter((record) =>
    record.id !== current.id &&
    record.client_id === current.client_id &&
    record.submitted_at !== null &&
    record.period_start < current.period_start
  ));
}

/**
 * The default historical baseline is the nearest earlier submitted period,
 * not the most recently delivered notification or a draft. The professional
 * may instead explicitly choose an older submitted period.
 */
export function previousSubmittedFeedbackByPeriod<T extends SubmittedWeeklyFeedbackReference>(
  records: readonly T[],
  currentId: string,
): T | null {
  return olderSubmittedFeedbackChoices(records, currentId)[0] ?? null;
}

export type ComparedWeeklyFeedbackReference = Pick<
  SubmittedWeeklyFeedbackReference,
  "id" | "client_id" | "period_start" | "submitted_at"
>;

/**
 * Authorization must already have been applied by the authenticated RLS
 * query. This extra boundary refuses incomplete, cross-client, draft or
 * reversed pairs, including IDs supplied by someone modifying the URL.
 */
export function selectAuthorizedSubmittedFeedbackPair<T extends ComparedWeeklyFeedbackReference>(
  records: readonly T[],
  clientId: string,
  currentId: string,
  previousId: string,
): { current: T; previous: T } | null {
  if (currentId === previousId) return null;
  const current = records.find((record) => record.id === currentId);
  const previous = records.find((record) => record.id === previousId);

  if (!current || !previous ||
      current.client_id !== clientId || previous.client_id !== clientId ||
      !current.submitted_at || !previous.submitted_at ||
      !current.period_start || !previous.period_start ||
      previous.period_start >= current.period_start) return null;

  return { current, previous };
}

export function weeklyFeedbackComparisonHref(
  clientId: string,
  currentId: string,
  previousId: string,
): string {
  const params = new URLSearchParams({ atual: currentId, anterior: previousId });
  return `/admin/clientes/${encodeURIComponent(clientId)}/feedback-semanal/comparar?${params.toString()}`;
}
